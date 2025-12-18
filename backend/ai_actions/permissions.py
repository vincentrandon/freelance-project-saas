from typing import Iterable, Optional

from rest_framework.permissions import BasePermission

from .models import AIServiceToken
from oauth2_provider.models import AccessToken


class HasAIScopes(BasePermission):
    """
    Ensure the authenticated token possesses all required scopes.

    Views should expose a `get_required_scopes()` helper (or `required_scopes` attr)
    returning an iterable of scope strings.
    """

    message = "Authenticated token does not include required scope(s)."

    def has_permission(self, request, view) -> bool:
        token = request.auth

        required_scopes = self._extract_required_scopes(view)
        if not required_scopes:
            return True

        if isinstance(token, AIServiceToken):
            return token.has_scopes(required_scopes)

        if isinstance(token, AccessToken):
            token_scopes = set((token.scope or "").split())
            return all(scope in token_scopes for scope in required_scopes)

        return False

    def _extract_required_scopes(self, view) -> Optional[Iterable[str]]:
        if hasattr(view, "get_required_scopes"):
            return view.get_required_scopes()
        return getattr(view, "required_scopes", None)
