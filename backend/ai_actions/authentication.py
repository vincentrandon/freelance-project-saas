from typing import Optional, Tuple

from django.utils.translation import gettext_lazy as _
from rest_framework import authentication, exceptions

from .models import AIServiceToken


class AIServiceTokenAuthentication(authentication.BaseAuthentication):
    """
    Authentication backend that validates requests coming from the OpenAI App.

    The raw token must be provided either via:
      - `Authorization: Bearer <token>`
      - `X-AI-Service-Token: <token>`
    """

    keyword = "Bearer"
    header = "HTTP_AUTHORIZATION"

    def authenticate(self, request) -> Optional[Tuple[object, object]]:
        raw_token = (
            request.META.get("HTTP_X_AI_SERVICE_TOKEN")
            or self._get_authorization_token(request.META.get(self.header))
        )

        if not raw_token:
            return None

        token = self._resolve_token(raw_token)
        if token is None:
            raise exceptions.AuthenticationFailed(_("Invalid AI service token."))

        if not token.is_active or token.is_expired():
            raise exceptions.AuthenticationFailed(_("AI service token is inactive or expired."))

        if not token.check_token(raw_token):
            raise exceptions.AuthenticationFailed(_("AI service token mismatch."))

        token.mark_used()
        return (token.user, token)

    # --------------------------------------------------------------------- helpers
    def _get_authorization_token(self, header_value: Optional[str]) -> Optional[str]:
        if not header_value:
            return None
        parts = header_value.split()
        if len(parts) != 2 or parts[0].lower() != self.keyword.lower():
            return None
        return parts[1].strip()

    def _resolve_token(self, raw_token: str) -> Optional[AIServiceToken]:
        prefix = raw_token[:24]
        try:
            return AIServiceToken.objects.select_related("user").get(key_prefix=prefix)
        except AIServiceToken.DoesNotExist:
            return None
