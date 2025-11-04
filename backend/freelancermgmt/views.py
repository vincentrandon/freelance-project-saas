"""
Custom views for social authentication with JWT token support.
"""
from django.conf import settings
from django.shortcuts import redirect
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
import requests
import re
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancing.

    Checks:
        - Database connectivity (PostgreSQL)
        - Redis/cache connectivity
        - Overall application health

    Returns:
        JSON response with status 200 if healthy, 503 if unhealthy
    """
    health_status = {
        'status': 'healthy',
        'checks': {}
    }
    is_healthy = True

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'ok'
    except Exception as e:
        health_status['checks']['database'] = f'error: {str(e)}'
        is_healthy = False
        logger.error(f"Health check: Database connection failed: {str(e)}")

    # Check Redis/cache connection
    try:
        cache.set('health_check', 'ok', 10)
        cache_value = cache.get('health_check')
        if cache_value == 'ok':
            health_status['checks']['cache'] = 'ok'
        else:
            health_status['checks']['cache'] = 'error: value mismatch'
            is_healthy = False
    except Exception as e:
        health_status['checks']['cache'] = f'error: {str(e)}'
        is_healthy = False
        logger.error(f"Health check: Cache connection failed: {str(e)}")

    # Set overall status
    if not is_healthy:
        health_status['status'] = 'unhealthy'

    return JsonResponse(
        health_status,
        status=200 if is_healthy else 503
    )


class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login view that returns JWT tokens.

    This view handles the OAuth2 callback from Google and returns
    JWT access and refresh tokens for the authenticated user.
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.FRONTEND_URL + '/auth/google/callback'
    client_class = OAuth2Client


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login_redirect(request):
    """
    Initiate Google OAuth2 login by redirecting to Google's consent screen.

    Returns:
        Response: JSON with the authorization URL
    """
    try:
        # Get Google OAuth app credentials from settings
        google_provider = settings.SOCIALACCOUNT_PROVIDERS.get('google', {})
        client_id = google_provider.get('APP', {}).get('client_id')

        if not client_id:
            return Response(
                {'error': 'Google OAuth is not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Build Google OAuth2 authorization URL
        redirect_uri = f"{settings.FRONTEND_URL}/auth/google/callback"
        scope = 'email profile openid'

        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&response_type=code"
            f"&scope={scope}"
            f"&access_type=online"
        )

        return Response({'auth_url': auth_url})

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Handle Google OAuth2 callback and return JWT tokens.

    Expects:
        - code: Authorization code from Google

    Returns:
        Response: JSON with access and refresh JWT tokens
    """
    code = request.data.get('code')

    if not code:
        return Response(
            {'error': 'Authorization code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get Google OAuth credentials from settings
        google_provider = settings.SOCIALACCOUNT_PROVIDERS.get('google', {})
        client_id = google_provider.get('APP', {}).get('client_id')
        client_secret = google_provider.get('APP', {}).get('secret')

        if not client_id or not client_secret:
            return Response(
                {'error': 'Google OAuth is not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Exchange authorization code for access token
        redirect_uri = f"{settings.FRONTEND_URL}/auth/google/callback"
        token_url = 'https://oauth2.googleapis.com/token'

        token_data = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }

        # Log the request for debugging (remove in production)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Exchanging code for token with redirect_uri: {redirect_uri}")

        token_response = requests.post(token_url, data=token_data)

        # If token exchange fails, log the error details
        if token_response.status_code != 200:
            error_detail = token_response.json() if token_response.content else {}
            logger.error(f"Token exchange failed: {token_response.status_code} - {error_detail}")
            return Response(
                {
                    'error': 'Failed to exchange authorization code',
                    'details': error_detail.get('error_description', str(error_detail))
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        token_json = token_response.json()
        access_token = token_json.get('access_token')

        if not access_token:
            return Response(
                {'error': 'Failed to obtain access token from Google'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Now use dj-rest-auth to handle the social login
        # We need to pass the access_token in the expected format
        from django.http import QueryDict
        from rest_framework.request import Request

        # Create a new request with the access_token
        social_login_data = {'access_token': access_token}

        # Create the login view and process the social login
        login_view = GoogleLogin.as_view()

        # Create a new request object for the social login
        from django.test import RequestFactory
        from django.contrib.sessions.middleware import SessionMiddleware
        from django.contrib.messages.storage.fallback import FallbackStorage

        factory = RequestFactory()
        social_request = factory.post('/api/auth/google/login/', social_login_data)

        # Copy important attributes from original request
        social_request.user = request.user
        social_request._force_auth_user = getattr(request, '_force_auth_user', None)
        social_request.META['SERVER_NAME'] = request.META.get('SERVER_NAME', 'localhost')
        social_request.META['SERVER_PORT'] = request.META.get('SERVER_PORT', '80')

        # Attach session (required by allauth)
        if hasattr(request, 'session'):
            social_request.session = request.session
        else:
            session_middleware = SessionMiddleware(lambda req: None)
            session_middleware.process_request(social_request)
            social_request.session.save()

        # Attach messages storage expected by allauth
        setattr(social_request, '_messages', FallbackStorage(social_request))

        # Process the social login
        response = login_view(social_request)

        # Return the response data
        if hasattr(response, 'data'):
            return Response(response.data, status=response.status_code)
        else:
            return response

    except requests.RequestException as e:
        logger.error(f"Google API error: {str(e)}")
        error_message = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                error_message = f"{error_message}: {error_detail}"
            except:
                error_message = f"{error_message}: {e.response.text}"

        return Response(
            {'error': f'Google API error: {error_message}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error in google_callback: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_lookup(request):
    """
    Lookup French company information by SIREN number using INSEE API Sirene V3.

    Query params:
        - siren: 9-digit SIREN number (can include spaces/hyphens)

    Returns:
        JSON with company information:
        - company_name: Legal company name
        - address: Street address
        - city: City name
        - postal_code: Postal code
        - siren: Formatted SIREN number
        - siret: SIRET number (if available)
    """
    siren = request.GET.get('siren', '').strip()

    if not siren:
        return Response(
            {'error': 'SIREN number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Clean SIREN: remove spaces, dashes, and non-digits
    clean_siren = re.sub(r'[^\d]', '', siren)

    # Validate SIREN format (must be 9 digits)
    if len(clean_siren) != 9:
        return Response(
            {'error': 'SIREN must be exactly 9 digits'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check cache first (cache for 7 days to reduce API calls)
    cache_key = f'company_siren_{clean_siren}'
    cached_data = cache.get(cache_key)

    if cached_data:
        logger.info(f"Returning cached company data for SIREN {clean_siren}")
        return Response(cached_data)

    # Get INSEE API key from settings
    insee_api_key = getattr(settings, 'INSEE_API_KEY', None)

    if not insee_api_key:
        return Response(
            {'error': 'Company lookup service is not configured. Please contact support.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Call INSEE API (using new API endpoint format)
    api_url = f'https://api.insee.fr/api-sirene/3.11/siren/{clean_siren}'

    try:
        response = requests.get(
            api_url,
            headers={'X-INSEE-Api-Key-Integration': insee_api_key},
            timeout=10
        )

        if response.status_code == 404:
            return Response(
                {'error': f'No company found with SIREN {clean_siren}'},
                status=status.HTTP_404_NOT_FOUND
            )

        if response.status_code == 429:
            return Response(
                {'error': 'Too many requests. Please try again in a moment.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if response.status_code != 200:
            logger.error(f"INSEE API error: {response.status_code} - {response.text}")
            return Response(
                {'error': 'Failed to lookup company information'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Parse INSEE response
        data = response.json()

        # Get company information
        unite_legale = data.get('uniteLegale', {})
        periode_unite = unite_legale.get('periodesUniteLegale', [{}])[0]

        # Get company name
        company_name = (
            periode_unite.get('denominationUniteLegale') or
            f"{periode_unite.get('prenomUsuelUniteLegale', '')} {periode_unite.get('nomUniteLegale', '')}".strip()
        )

        # Check if company data is not diffusible (privacy protected)
        if not company_name or company_name == '[ND]' or company_name.strip() == '':
            return Response(
                {'error': 'Company information is not publicly available (protected by privacy laws). Please enter information manually.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the NIC of the headquarters (siege social)
        nic_siege = periode_unite.get('nicSiegeUniteLegale')

        # Default values in case we can't get establishment data
        address = ''
        city = ''
        postal_code = ''
        siret = None

        # If we have the NIC, fetch establishment data
        if nic_siege:
            siret = f"{clean_siren}{nic_siege}"

            # Call SIRET endpoint to get address information
            siret_url = f'https://api.insee.fr/api-sirene/3.11/siret/{siret}'

            try:
                siret_response = requests.get(
                    siret_url,
                    headers={'X-INSEE-Api-Key-Integration': insee_api_key},
                    timeout=10
                )

                if siret_response.status_code == 200:
                    siret_data = siret_response.json()
                    etablissement = siret_data.get('etablissement', {})
                    adresse = etablissement.get('adresseEtablissement', {})

                    # Build address string
                    address_parts = []
                    if adresse.get('numeroVoieEtablissement'):
                        address_parts.append(adresse.get('numeroVoieEtablissement'))
                    if adresse.get('indiceRepetitionEtablissement'):
                        address_parts.append(adresse.get('indiceRepetitionEtablissement'))
                    if adresse.get('typeVoieEtablissement'):
                        address_parts.append(adresse.get('typeVoieEtablissement'))
                    if adresse.get('libelleVoieEtablissement'):
                        address_parts.append(adresse.get('libelleVoieEtablissement'))
                    if adresse.get('complementAdresseEtablissement'):
                        address_parts.append(adresse.get('complementAdresseEtablissement'))

                    address = ' '.join(filter(None, address_parts))
                    city = adresse.get('libelleCommuneEtablissement', '')
                    postal_code = adresse.get('codePostalEtablissement', '')

            except requests.RequestException as e:
                logger.warning(f"Failed to fetch SIRET data for {siret}: {str(e)}")
                # Continue with company name only

        # Build response
        company_data = {
            'company_name': company_name,
            'address': address,
            'city': city,
            'postal_code': postal_code,
            'siren': clean_siren,
            'siret': siret,
        }

        # Cache the result for 7 days
        cache.set(cache_key, company_data, timeout=7 * 24 * 3600)

        logger.info(f"Successfully looked up company for SIREN {clean_siren}")
        return Response(company_data)

    except requests.Timeout:
        return Response(
            {'error': 'Request timeout. Please try again.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except requests.RequestException as e:
        logger.error(f"INSEE API request error: {str(e)}")
        return Response(
            {'error': 'Failed to connect to company lookup service'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"Error parsing INSEE response: {str(e)}")
        return Response(
            {'error': 'Invalid response from company lookup service'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
