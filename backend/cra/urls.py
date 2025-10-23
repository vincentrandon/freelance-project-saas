from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CRAViewSet, CRASignatureViewSet, PublicCRASignatureViewSet

router = DefaultRouter()
router.register(r'cras', CRAViewSet, basename='cra')
router.register(r'signature-requests', CRASignatureViewSet, basename='cra-signature')

# Public signature URLs (no auth required)
public_router = DefaultRouter()
public_router.register(r'sign', PublicCRASignatureViewSet, basename='public-cra-signature')

urlpatterns = [
    path('', include(router.urls)),
    path('public/', include(public_router.urls)),
]
