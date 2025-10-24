from django.contrib import admin

from .models import AIActionLog, AIServiceToken


@admin.register(AIServiceToken)
class AIServiceTokenAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_active", "expires_at", "last_used_at", "created_at")
    list_filter = ("is_active", "expires_at")
    search_fields = ("name", "user__username", "key_prefix")
    readonly_fields = ("key_prefix", "token_hash", "last_used_at", "created_at", "updated_at")


@admin.register(AIActionLog)
class AIActionLogAdmin(admin.ModelAdmin):
    list_display = ("action_type", "user", "status", "created_at")
    list_filter = ("status", "action_type")
    search_fields = ("action_type", "user__username", "path")
    readonly_fields = ("request_payload", "response_payload", "error_message", "metadata", "created_at")
