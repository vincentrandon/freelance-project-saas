"""Unit tests for Notification model."""

import pytest
from notifications.models import Notification
from tests.factories import NotificationFactory, InvoiceFactory


@pytest.mark.unit
class TestNotificationModel:
    def test_create_notification(self, user):
        invoice = InvoiceFactory(user=user)
        notif = Notification.objects.create(
            user=user,
            notification_type='pdf_generated',
            title='PDF Generated',
            message='Your invoice PDF is ready',
            content_object=invoice
        )
        assert notif.id is not None

    def test_notification_types(self):
        types = ['pdf_generated', 'pdf_failed', 'import_completed', 'import_failed', 'email_sent', 'email_failed', 'entity_created']
        for ntype in types:
            notif = NotificationFactory(notification_type=ntype)
            notif.full_clean()

    def test_mark_as_read(self):
        notif = NotificationFactory(read=False)
        notif.read = True
        notif.save()
        assert notif.read is True
        assert notif.read_at is not None

    def test_user_isolation(self, user, user2):
        notif1 = NotificationFactory(user=user)
        notif2 = NotificationFactory(user=user2)
        assert notif1 not in Notification.objects.filter(user=user2)
