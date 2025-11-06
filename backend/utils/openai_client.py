"""
Utility helpers for creating configured OpenAI clients.
Handles custom CA bundles and optional SSL verification overrides so that
local development environments behind corporate proxies can still connect.
"""

from typing import Optional, Union

import httpx
from django.conf import settings
from openai import OpenAI


def _determine_verify_flag() -> Optional[Union[str, bool]]:
    """
    Determine whether we should override TLS verification.

    Returns:
        - Path to a CA bundle if provided via OPENAI_CA_BUNDLE.
        - False if OPENAI_VERIFY_SSL is explicitly disabled.
        - None to use httpx/OpenAI defaults.
    """
    ca_bundle = getattr(settings, "OPENAI_CA_BUNDLE", None)
    if ca_bundle:
        return ca_bundle

    verify_ssl = getattr(settings, "OPENAI_VERIFY_SSL", True)
    if isinstance(verify_ssl, str):
        verify_ssl = verify_ssl.lower() not in {"false", "0", "no"}

    if not verify_ssl:
        return False

    return None


def create_openai_client(
    timeout: float = 15.0,
    max_retries: int = 2,
) -> OpenAI:
    """
    Create an OpenAI client that respects local TLS settings.
    """
    verify = _determine_verify_flag()
    http_client = None

    if verify is not None:
        http_client = httpx.Client(verify=verify, timeout=timeout)

    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=timeout,
        max_retries=max_retries,
        http_client=http_client,
    )

