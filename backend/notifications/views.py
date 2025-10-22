from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notifications.

    Provides:
    - list: Get all notifications for current user
    - retrieve: Get single notification
    - read: Mark notification as read
    - mark_all_read: Mark all notifications as read
    - destroy: Delete notification
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['read', 'notification_type']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return notifications for current user only."""
        queryset = Notification.objects.filter(user=self.request.user)

        # Filter by unread status if specified
        unread = self.request.query_params.get('unread', None)
        if unread is not None and unread.lower() == 'true':
            queryset = queryset.filter(read=False)

        return queryset

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all unread notifications as read."""
        count = Notification.objects.filter(
            user=request.user,
            read=False
        ).update(
            read=True,
            read_at=timezone.now()
        )
        return Response({
            'message': f'{count} notification(s) marked as read',
            'count': count
        })

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = Notification.objects.filter(
            user=request.user,
            read=False
        ).count()
        return Response({'count': count})
