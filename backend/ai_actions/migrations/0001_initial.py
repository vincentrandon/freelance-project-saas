from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AIServiceToken",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Label to identify the integration or environment.",
                        max_length=255,
                    ),
                ),
                (
                    "key_prefix",
                    models.CharField(
                        db_index=True,
                        help_text="First characters of the raw token for quicker lookup.",
                        max_length=24,
                    ),
                ),
                ("token_hash", models.CharField(max_length=128)),
                (
                    "scopes",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of scopes granted to this token.",
                    ),
                ),
                (
                    "allowed_origins",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Optional list of allowed request origins/hostnames.",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_service_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "AI Service Token",
                "verbose_name_plural": "AI Service Tokens",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="AIActionLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "action_type",
                    models.CharField(
                        help_text="High-level action identifier (e.g., context.customers).",
                        max_length=100,
                    ),
                ),
                ("path", models.CharField(max_length=255)),
                ("method", models.CharField(max_length=16)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("success", "Success"),
                            ("error", "Error"),
                            ("denied", "Denied"),
                        ],
                        default="success",
                        max_length=16,
                    ),
                ),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "token",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="action_logs",
                        to="ai_actions.aiservicetoken",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ai_action_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "AI Action Log",
                "verbose_name_plural": "AI Action Logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="aiservicetoken",
            index=models.Index(fields=["user", "is_active"], name="ai_action_u_user_i_7091f5_idx"),
        ),
        migrations.AddIndex(
            model_name="aiservicetoken",
            index=models.Index(fields=["key_prefix"], name="ai_action_k_key_pre_3bfad0_idx"),
        ),
        migrations.AddIndex(
            model_name="aiactionlog",
            index=models.Index(fields=["action_type"], name="ai_action_a_action__800ee1_idx"),
        ),
        migrations.AddIndex(
            model_name="aiactionlog",
            index=models.Index(fields=["status"], name="ai_action_a_status__e363a7_idx"),
        ),
        migrations.AddIndex(
            model_name="aiactionlog",
            index=models.Index(fields=["created_at"], name="ai_action_a_created_315050_idx"),
        ),
    ]
