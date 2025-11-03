"""
Lazy Stripe proxy that defers importing the Stripe SDK until it is used.
Raises a clear ImproperlyConfigured error if the SDK is missing or misconfigured.
"""

import importlib
from typing import Any

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class StripeProxy:
    """Provide attribute access to the Stripe SDK while guarding against missing dependencies."""

    def __init__(self) -> None:
        try:
            self._module = importlib.import_module("stripe")
            self._import_error = None
        except ImportError as exc:
            self._module = None
            self._import_error = exc

    def _configured_module(self):
        if self._module is None:
            raise ImproperlyConfigured(
                "Stripe SDK is not installed. Install the `stripe` package to enable billing integration."
            ) from self._import_error

        api_key = getattr(settings, "STRIPE_SECRET_KEY", None)
        if not api_key:
            raise ImproperlyConfigured("STRIPE_SECRET_KEY is missing. Configure it in your environment settings.")

        if getattr(self._module, "api_key", None) != api_key:
            self._module.api_key = api_key

        return self._module

    def __getattr__(self, name: str) -> Any:  # pragma: no cover - mirrors stripe API surface
        module = self._configured_module()
        return getattr(module, name)


stripe = StripeProxy()
