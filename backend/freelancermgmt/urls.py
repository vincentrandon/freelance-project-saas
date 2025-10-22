"""
URL configuration for freelancermgmt project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('rosetta/', include('rosetta.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # Authentication
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/social/', include('allauth.socialaccount.urls')),
    
    # App URLs
    path('api/customers/', include('customers.urls')),
    path('api/leads/', include('leads.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/invoices/', include('invoicing.urls')),
    path('api/document-processing/', include('document_processing.urls')),
    path('api/profile/', include('profiles.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
