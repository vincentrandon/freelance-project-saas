"""
Custom Django Allauth adapters for email-only authentication.
"""
from django.contrib.auth import get_user_model
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import user_email, user_username
import uuid


User = get_user_model()


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter that generates unique usernames from email
    when ACCOUNT_USER_MODEL_USERNAME_FIELD is None.

    This prevents IntegrityError when multiple users try to register
    without providing a username.
    """

    def save_user(self, request, user, form, commit=True):
        """
        Save a new user instance using information provided in the signup form.
        Generates a unique username based on email if username is not required.
        """
        # Get the data from the form
        data = form.cleaned_data

        # Set email
        email = data.get('email')
        user_email(user, email)

        # Set password
        if 'password1' in data:
            user.set_password(data['password1'])
        else:
            user.set_unusable_password()

        # Generate unique username from email
        # Since we're using email-only auth, create a username from the email
        if email:
            # Use email local part (before @) as base username
            username_base = email.split('@')[0]
            username = username_base

            # If username already exists, append a UUID suffix
            counter = 1
            while User.objects.filter(username=username).exists():
                if counter == 1:
                    # First collision: add short UUID
                    username = f"{username_base}_{uuid.uuid4().hex[:8]}"
                else:
                    # Subsequent collisions: keep trying with new UUID
                    username = f"{username_base}_{uuid.uuid4().hex[:8]}"
                counter += 1

            user_username(user, username)

        # Set additional fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']

        # Call custom populate method if exists
        self.populate_username(request, user)

        if commit:
            # Save the user to the database
            user.save()

        return user

    def populate_username(self, request, user):
        """
        Fills in a valid username, if required and missing.
        This is called before save_user completes.
        """
        # Username is already set in save_user, so we don't need to do anything here
        pass
