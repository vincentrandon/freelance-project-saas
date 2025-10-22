"""
Signal handlers for creating notifications based on system events.

This module provides utilities for creating notifications from Celery tasks
and other parts of the application.
"""
import logging
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from .models import Notification

logger = logging.getLogger(__name__)


def create_notification(user_id, notification_type, title, message, link=None, content_object=None):
    """
    Create a notification for a user.

    Args:
        user_id: ID of the user to notify
        notification_type: Type of notification (from NOTIFICATION_TYPES)
        title: Short title for the notification
        message: Detailed message
        link: Optional link for navigation
        content_object: Optional Django model instance to link to

    Returns:
        Notification instance or None if user not found
    """
    try:
        user = User.objects.get(id=user_id)

        notification_data = {
            'user': user,
            'notification_type': notification_type,
            'title': title,
            'message': message,
            'link': link,
        }

        # Add generic relation if content_object provided
        if content_object:
            notification_data['content_type'] = ContentType.objects.get_for_model(content_object)
            notification_data['object_id'] = content_object.id

        notification = Notification.objects.create(**notification_data)
        logger.info(f"Created notification {notification.id} for user {user.username}: {title}")
        return notification

    except User.DoesNotExist:
        logger.error(f"Cannot create notification: User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None


# Notification helper functions for common use cases

def notify_pdf_generated(user_id, document_type, document_number, link=None, content_object=None):
    """Notify user that a PDF was successfully generated."""
    return create_notification(
        user_id=user_id,
        notification_type='pdf_generated',
        title=f'{document_type} #{document_number} PDF Ready',
        message=f'Your {document_type.lower()} PDF has been generated and is ready to download.',
        link=link,
        content_object=content_object
    )


def notify_pdf_failed(user_id, document_type, document_number, error_message=None):
    """Notify user that PDF generation failed."""
    message = f'Failed to generate PDF for {document_type.lower()} #{document_number}.'
    if error_message:
        message += f' Error: {error_message}'

    return create_notification(
        user_id=user_id,
        notification_type='pdf_failed',
        title=f'{document_type} PDF Generation Failed',
        message=message,
    )


def notify_import_completed(user_id, document_name, link=None, content_object=None):
    """Notify user that AI document import completed."""
    return create_notification(
        user_id=user_id,
        notification_type='import_completed',
        title='Document Import Complete',
        message=f'"{document_name}" has been processed and is ready for review.',
        link=link,
        content_object=content_object
    )


def notify_import_failed(user_id, document_name, error_message=None):
    """Notify user that AI document import failed."""
    message = f'Failed to process document "{document_name}".'
    if error_message:
        message += f' Error: {error_message}'

    return create_notification(
        user_id=user_id,
        notification_type='import_failed',
        title='Document Import Failed',
        message=message,
    )


def notify_email_sent(user_id, document_type, document_number, recipient, content_object=None):
    """Notify user that an email was successfully sent."""
    return create_notification(
        user_id=user_id,
        notification_type='email_sent',
        title=f'{document_type} Sent Successfully',
        message=f'{document_type} #{document_number} was sent to {recipient}.',
        content_object=content_object
    )


def notify_email_failed(user_id, document_type, document_number, recipient, error_message=None):
    """Notify user that email sending failed."""
    message = f'Failed to send {document_type.lower()} #{document_number} to {recipient}.'
    if error_message:
        message += f' Error: {error_message}'

    return create_notification(
        user_id=user_id,
        notification_type='email_failed',
        title=f'{document_type} Send Failed',
        message=message,
    )


def notify_entity_created(user_id, entity_type, entity_name, link=None, content_object=None):
    """Notify user that entities were created from import."""
    return create_notification(
        user_id=user_id,
        notification_type='entity_created',
        title=f'{entity_type} Created',
        message=f'Successfully created {entity_type.lower()}: {entity_name}',
        link=link,
        content_object=content_object
    )
