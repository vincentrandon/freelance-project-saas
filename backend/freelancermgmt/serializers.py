"""
Custom serializers for authentication and password reset
"""
from django.conf import settings
from dj_rest_auth.serializers import PasswordResetSerializer as DefaultPasswordResetSerializer


class CustomPasswordResetSerializer(DefaultPasswordResetSerializer):
    """
    Custom password reset serializer that generates frontend URLs
    instead of Django backend URLs
    """

    def get_email_options(self):
        """Override to use custom URL generator"""
        return {
            'email_template_name': 'account/email/password_reset_key_message.txt',
            'html_email_template_name': 'account/email/password_reset_key_message.html',
            'subject_template_name': 'account/email/password_reset_key_subject.txt',
            'extra_email_context': {
                'frontend_url': settings.FRONTEND_URL,
            }
        }

    def save(self):
        """Override save to use custom URL generator that points to frontend"""
        request = self.context.get('request')
        # Set up form with custom URL generator
        opts = self.get_email_options()
        opts['url_generator'] = self.custom_url_generator
        self.reset_form.save(**opts)

    @staticmethod
    def custom_url_generator(request, user, temp_key):
        """
        Generate password reset URL that points to frontend instead of backend

        Args:
            request: HTTP request object
            user: User instance
            temp_key: Password reset token

        Returns:
            str: Full URL to frontend password reset confirm page
        """
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        # Generate uid and token like allauth does
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Build frontend URL
        frontend_url = settings.FRONTEND_URL
        reset_path = f'/reset-password-confirm?uid={uid}&token={token}'

        return f'{frontend_url}{reset_path}'
