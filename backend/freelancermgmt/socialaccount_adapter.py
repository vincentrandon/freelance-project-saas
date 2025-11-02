"""
Custom Django Allauth social account adapter for OAuth handling.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.utils import user_email
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter for handling OAuth connections.

    This adapter handles the creation and connection of social accounts
    during OAuth authentication with Google and other providers.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a
        social provider, but before the login is actually processed.

        This is used to connect existing accounts with social logins.
        """
        # If the user is already signed in, link the social account
        if sociallogin.is_existing:
            return

        # Try to connect social account to an existing user account
        try:
            email = sociallogin.account.extra_data.get('email')
            if email:
                # Check if a user with this email already exists
                try:
                    user = User.objects.get(email=email)
                    # Connect this social account to the existing user
                    sociallogin.connect(request, user)
                except User.DoesNotExist:
                    # No existing user, will create a new one
                    pass
        except Exception:
            # If anything goes wrong, just proceed with normal flow
            pass

    def populate_user(self, request, sociallogin, data):
        """
        Populate user information from social provider data.

        Args:
            request: The HTTP request
            sociallogin: The SocialLogin instance
            data: Dictionary containing user data from social provider

        Returns:
            User instance with populated fields
        """
        user = super().populate_user(request, sociallogin, data)

        # Extract additional info from Google OAuth data
        if sociallogin.account.provider == 'google':
            extra_data = sociallogin.account.extra_data

            # Set first name and last name if available
            if not user.first_name and extra_data.get('given_name'):
                user.first_name = extra_data.get('given_name', '')

            if not user.last_name and extra_data.get('family_name'):
                user.last_name = extra_data.get('family_name', '')

            # Ensure email is set
            if not user.email and extra_data.get('email'):
                user_email(user, extra_data.get('email'))

        return user

    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Return whether or not auto signup is allowed.

        By default, auto signup is allowed if email is provided.
        """
        # Check if email is provided
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return False

        # Allow auto signup
        return True
