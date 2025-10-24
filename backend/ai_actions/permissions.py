from typing import Iterable, Optional

from rest_framework.permissions import BasePermission

from .models import AIServiceToken


class HasAIScopes(BasePermission):
    """
    Ensure the authenticated AI service token possesses all required scopes.

    Views should expose a `get_required_scopes()` helper (or `required_scopes` attr)
    returning an iterable of scope strings.
    """

    message = "AI service token does not include required scope(s)."

    def has_permission(self, request, view) -> bool:
        token = request.auth
        if not isinstance(token, AIServiceToken):
            return False

        required_scopes = self._extract_required_scopes(view)
        return token.has_scopes(required_scopes)

    def _extract_required_scopes(self, view) -> Optional[Iterable[str]]:
        if hasattr(view, "get_required_scopes"):
            return view.get_required_scopes()
        return getattr(view, "required_scopes", None)
