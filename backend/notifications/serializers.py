from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""

    is_success = serializers.BooleanField(read_only=True)
    is_error = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'link',
            'read',
            'created_at',
            'read_at',
            'is_success',
            'is_error',
        ]
        read_only_fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'link',
            'created_at',
            'read_at',
        ]
