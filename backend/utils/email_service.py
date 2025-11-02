"""
Centralized email service for kiik.app
Handles email sending with language detection, template selection, and Celery integration
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import translation


class EmailService:
    """Centralized service for sending emails with HTML templates and i18n support"""

    @staticmethod
    def get_user_language(user):
        """
        Detect user's preferred language from profile or use default

        Args:
            user: User instance

        Returns:
            str: Language code ('en' or 'fr')
        """
        if hasattr(user, 'profile') and user.profile.preferred_language:
            return user.profile.preferred_language
        return settings.LANGUAGE_CODE

    @staticmethod
    def get_template_name(base_name, language, html=True):
        """
        Get appropriate template name based on language

        Args:
            base_name: Base template name (e.g., 'password_reset_key')
            language: Language code ('en' or 'fr')
            html: Whether to get HTML template (vs plain text)

        Returns:
            str: Full template path
        """
        ext = 'html' if html else 'txt'

        if language == 'fr':
            # Try French template first
            template = f'account/email/{base_name}_fr.{ext}'
        else:
            # Use English template
            template = f'account/email/{base_name}.{ext}'

        return template

    @classmethod
    def send_templated_email(
        cls,
        to_email,
        subject_template,
        text_template,
        html_template=None,
        context=None,
        from_email=None,
        user=None,
        language=None
    ):
        """
        Send an email using Django templates with optional HTML version

        Args:
            to_email: Recipient email address(es) - can be string or list
            subject_template: Path to subject template
            text_template: Path to plain text template
            html_template: Path to HTML template (optional)
            context: Dictionary of template context variables
            from_email: Sender email (uses DEFAULT_FROM_EMAIL if None)
            user: User instance for language detection (optional)
            language: Force specific language (optional, overrides user preference)

        Returns:
            int: Number of emails sent (1 on success, 0 on failure)
        """
        if context is None:
            context = {}

        # Determine language
        if language is None and user is not None:
            language = cls.get_user_language(user)
        elif language is None:
            language = settings.LANGUAGE_CODE

        # Add language to context
        context['language_code'] = language

        # Add frontend URL to context
        context.setdefault('frontend_url', settings.FRONTEND_URL)

        # Activate language for template rendering
        with translation.override(language):
            # Render subject (must not contain newlines)
            subject = render_to_string(subject_template, context).strip()

            # Render plain text body
            text_body = render_to_string(text_template, context)

            # Create email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email or settings.DEFAULT_FROM_EMAIL,
                to=[to_email] if isinstance(to_email, str) else to_email
            )

            # Attach HTML version if template provided
            if html_template:
                html_body = render_to_string(html_template, context)
                email.attach_alternative(html_body, "text/html")

            # Send email
            try:
                return email.send()
            except Exception as e:
                # Log error but don't crash
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send email to {to_email}: {str(e)}")
                return 0

    @classmethod
    def send_password_reset_email(cls, user, password_reset_url, language=None):
        """
        Send password reset email

        Args:
            user: User instance
            password_reset_url: Full URL for password reset
            language: Language code (optional, auto-detected from user if not provided)

        Returns:
            int: Number of emails sent
        """
        if language is None:
            language = cls.get_user_language(user)

        subject_template = cls.get_template_name('password_reset_key_subject', language, html=False)
        text_template = cls.get_template_name('password_reset_key_message', language, html=False)
        html_template = cls.get_template_name('password_reset_key_message', language, html=True)

        context = {
            'user': user,
            'password_reset_url': password_reset_url,
        }

        return cls.send_templated_email(
            to_email=user.email,
            subject_template=subject_template,
            text_template=text_template,
            html_template=html_template,
            context=context,
            user=user,
            language=language
        )

    @classmethod
    def send_welcome_email(cls, user, language=None):
        """
        Send welcome email to new user

        Args:
            user: User instance
            language: Language code (optional)

        Returns:
            int: Number of emails sent
        """
        if language is None:
            language = cls.get_user_language(user)

        subject_template = cls.get_template_name('welcome_subject', language, html=False)
        html_template = cls.get_template_name('welcome_message', language, html=True)

        # For welcome email, we'll use a simple text fallback
        text_body = f"Welcome to kiik.app! Visit {settings.FRONTEND_URL}/dashboard to get started."

        context = {
            'user': user,
        }

        return cls.send_templated_email(
            to_email=user.email,
            subject_template=subject_template,
            text_template='account/email/welcome_message.html',  # Will use same as HTML for plain text
            html_template=html_template,
            context=context,
            user=user,
            language=language
        )

    @classmethod
    def send_email_confirmation(cls, user, activate_url, language=None):
        """
        Send email verification email

        Args:
            user: User instance
            activate_url: Full URL for email verification
            language: Language code (optional)

        Returns:
            int: Number of emails sent
        """
        if language is None:
            language = cls.get_user_language(user)

        subject_template = cls.get_template_name('email_confirmation_subject', language, html=False)
        html_template = cls.get_template_name('email_confirmation_message', language, html=True)

        context = {
            'user': user,
            'activate_url': activate_url,
        }

        # Simple text fallback
        text_body = f"Please verify your email address by visiting: {activate_url}"

        return cls.send_templated_email(
            to_email=user.email,
            subject_template=subject_template,
            text_template='account/email/email_confirmation_message.html',
            html_template=html_template,
            context=context,
            user=user,
            language=language
        )

    @classmethod
    def send_password_changed_email(cls, user, language=None):
        """
        Send password changed notification

        Args:
            user: User instance
            language: Language code (optional)

        Returns:
            int: Number of emails sent
        """
        if language is None:
            language = cls.get_user_language(user)

        subject_template = cls.get_template_name('password_changed_subject', language, html=False)
        html_template = cls.get_template_name('password_changed_message', language, html=True)

        context = {
            'user': user,
        }

        return cls.send_templated_email(
            to_email=user.email,
            subject_template=subject_template,
            text_template='account/email/password_changed_message.html',
            html_template=html_template,
            context=context,
            user=user,
            language=language
        )
