"""
URL configuration for freelancermgmt project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import GoogleLogin, google_login_redirect, google_callback, company_lookup, health_check

urlpatterns = [
    path('admin/', admin.site.urls),

    # Health Check (for monitoring/load balancers)
    path('health/', health_check, name='health_check'),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # Authentication
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/social/', include('allauth.socialaccount.urls')),

    # OAuth2 Provider (for ChatGPT and third-party integrations)
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),

    # Social Authentication (Google OAuth)
    path('api/auth/google/', google_login_redirect, name='google_login'),
    path('api/auth/google/callback/', google_callback, name='google_callback'),
    path('api/auth/google/login/', GoogleLogin.as_view(), name='google_login_view'),

    # Company Lookup (INSEE API)
    path('api/company-lookup/', company_lookup, name='company_lookup'),

    # App URLs
    path('api/customers/', include('customers.urls')),
    path('api/leads/', include('leads.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/invoices/', include('invoicing.urls')),
    path('api/document-processing/', include('document_processing.urls')),
    path('api/profile/', include('profiles.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/cra/', include('cra.urls')),
    path('api/ai-actions/', include('ai_actions.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
]

try:
    import rosetta  # noqa: F401
except ImportError:
    pass
else:
    urlpatterns.insert(1, path('rosetta/', include('rosetta.urls')))

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
