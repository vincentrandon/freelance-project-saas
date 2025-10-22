from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'read', 'created_at']
    list_filter = ['notification_type', 'read', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    readonly_fields = ['created_at', 'read_at']
    date_hierarchy = 'created_at'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user')
