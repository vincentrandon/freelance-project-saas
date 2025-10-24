import secrets
from typing import Iterable, List, Optional

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


def generate_token_value(prefix: str = "fta") -> str:
    """Generate a raw token value with a short, auditable prefix."""
    secret = secrets.token_urlsafe(40)
    return f"{prefix}_{secret}"


class AIServiceToken(models.Model):
    """Service token used by OpenAI Apps to act on behalf of a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ai_service_tokens")
    name = models.CharField(max_length=255, help_text="Label to identify the integration or environment.")
    key_prefix = models.CharField(
        max_length=24,
        db_index=True,
        help_text="First characters of the raw token for quicker lookup.",
    )
    token_hash = models.CharField(max_length=128)
    scopes = models.JSONField(default=list, blank=True, help_text="List of scopes granted to this token.")
    allowed_origins = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional list of allowed request origins/hostnames.",
    )
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Service Token"
        verbose_name_plural = "AI Service Tokens"
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["key_prefix"]),
        ]

    def __str__(self) -> str:
        status = "active" if self.is_active else "revoked"
        return f"{self.name} ({status})"

    # Token helpers -----------------------------------------------------------------
    def set_token(self, raw_token: str) -> None:
        """Persist a hashed version of the provided token."""
        self.key_prefix = raw_token[:24]
        self.token_hash = make_password(raw_token)

    def check_token(self, raw_token: str) -> bool:
        """Validate the provided raw token against the stored hash."""
        return check_password(raw_token, self.token_hash)

    def mark_used(self) -> None:
        """Update last_used_at when a token is consumed."""
        self.last_used_at = timezone.now()
        self.save(update_fields=["last_used_at", "updated_at"])

    def has_scopes(self, required_scopes: Optional[Iterable[str]]) -> bool:
        """Check whether the token contains each required scope."""
        if not required_scopes:
            return True
        token_scopes: List[str] = self.scopes or []
        return all(scope in token_scopes for scope in required_scopes)

    def is_expired(self) -> bool:
        """Return True when the token is no longer valid."""
        return self.expires_at is not None and timezone.now() >= self.expires_at


class AIActionLog(models.Model):
    """Audit log entry for AI-triggered actions."""

    STATUS_CHOICES = [
        ("success", "Success"),
        ("error", "Error"),
        ("denied", "Denied"),
    ]

    token = models.ForeignKey(
        AIServiceToken,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="action_logs",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_action_logs",
    )
    action_type = models.CharField(max_length=100, help_text="High-level action identifier (e.g., context.customers).")
    path = models.CharField(max_length=255)
    method = models.CharField(max_length=16)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="success")
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Action Log"
        verbose_name_plural = "AI Action Logs"
        indexes = [
            models.Index(fields=["action_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action_type} ({self.status})"
