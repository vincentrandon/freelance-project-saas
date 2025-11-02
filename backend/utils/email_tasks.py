"""
Celery tasks for asynchronous email sending
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from .email_service import EmailService

User = get_user_model()


@shared_task(bind=True, max_retries=3)
def send_welcome_email_task(self, user_id):
    """
    Celery task to send welcome email asynchronously

    Args:
        user_id: ID of the user to send welcome email to

    Returns:
        dict: Status of email send operation
    """
    try:
        user = User.objects.get(id=user_id)
        result = EmailService.send_welcome_email(user)

        return {
            'status': 'success' if result > 0 else 'failed',
            'user_email': user.email,
            'emails_sent': result
        }
    except User.DoesNotExist:
        return {'status': 'error', 'message': f'User with ID {user_id} not found'}
    except Exception as exc:
        # Retry on failure with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_password_reset_email_task(self, user_id, password_reset_url, language=None):
    """
    Celery task to send password reset email asynchronously

    Args:
        user_id: ID of the user
        password_reset_url: Full URL for password reset
        language: Language code (optional)

    Returns:
        dict: Status of email send operation
    """
    try:
        user = User.objects.get(id=user_id)
        result = EmailService.send_password_reset_email(user, password_reset_url, language)

        return {
            'status': 'success' if result > 0 else 'failed',
            'user_email': user.email,
            'emails_sent': result
        }
    except User.DoesNotExist:
        return {'status': 'error', 'message': f'User with ID {user_id} not found'}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_email_confirmation_task(self, user_id, activate_url, language=None):
    """
    Celery task to send email verification email asynchronously

    Args:
        user_id: ID of the user
        activate_url: Full URL for email verification
        language: Language code (optional)

    Returns:
        dict: Status of email send operation
    """
    try:
        user = User.objects.get(id=user_id)
        result = EmailService.send_email_confirmation(user, activate_url, language)

        return {
            'status': 'success' if result > 0 else 'failed',
            'user_email': user.email,
            'emails_sent': result
        }
    except User.DoesNotExist:
        return {'status': 'error', 'message': f'User with ID {user_id} not found'}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_password_changed_email_task(self, user_id, language=None):
    """
    Celery task to send password changed notification asynchronously

    Args:
        user_id: ID of the user
        language: Language code (optional)

    Returns:
        dict: Status of email send operation
    """
    try:
        user = User.objects.get(id=user_id)
        result = EmailService.send_password_changed_email(user, language)

        return {
            'status': 'success' if result > 0 else 'failed',
            'user_email': user.email,
            'emails_sent': result
        }
    except User.DoesNotExist:
        return {'status': 'error', 'message': f'User with ID {user_id} not found'}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_invoice_email_task(self, invoice_id, recipient_email, language=None):
    """
    Celery task to send invoice email with PDF attachment

    Args:
        invoice_id: ID of the invoice
        recipient_email: Email address of recipient
        language: Language code (optional)

    Returns:
        dict: Status of email send operation
    """
    try:
        from invoicing.models import Invoice
        from django.core.mail import EmailMessage
        from django.template.loader import render_to_string
        from django.conf import settings

        invoice = Invoice.objects.get(id=invoice_id)

        # Determine language
        if language is None and hasattr(invoice.user, 'profile'):
            language = invoice.user.profile.language
        elif language is None:
            language = settings.LANGUAGE_CODE

        # Prepare context
        context = {
            'invoice': invoice,
            'user': invoice.user,
            'customer': invoice.customer,
            'language_code': language,
            'frontend_url': settings.FRONTEND_URL
        }

        # Render email (simplified - would need actual invoice email template)
        subject = f"Invoice #{invoice.invoice_number}" if language == 'en' else f"Facture #{invoice.invoice_number}"

        email = EmailMessage(
            subject=subject,
            body=f"Please find attached invoice #{invoice.invoice_number}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email]
        )

        # Attach PDF if exists
        if invoice.pdf_file:
            email.attach_file(invoice.pdf_file.path)

        result = email.send()

        return {
            'status': 'success' if result > 0 else 'failed',
            'recipient_email': recipient_email,
            'invoice_number': invoice.invoice_number,
            'emails_sent': result
        }
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
