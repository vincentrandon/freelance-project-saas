from django.conf import settings
from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter to customize password reset email URL
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Override to use frontend URL for email confirmation
        """
        url = f"{settings.FRONTEND_URL}/verify-email?key={emailconfirmation.key}"
        return url

    def send_mail(self, template_prefix, email, context):
        """
        Override to customize password reset URL
        """
        # Modify the password reset URL to point to frontend
        if 'password_reset_url' in context:
            # Extract uid and token from the backend URL
            backend_url = context['password_reset_url']
            # The backend URL looks like: http://localhost:8000/api/auth/password/reset/confirm/{uid}/{token}/
            # We need to extract uid and token and create a frontend URL
            try:
                parts = backend_url.rstrip('/').split('/')
                if len(parts) >= 2:
                    token = parts[-1]
                    uid = parts[-2]
                    context['password_reset_url'] = f"{settings.FRONTEND_URL}/reset-password-confirm?uid={uid}&token={token}"
            except (IndexError, AttributeError):
                pass

        return super().send_mail(template_prefix, email, context)
