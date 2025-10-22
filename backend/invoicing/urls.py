from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, EstimateViewSet, PublicSignatureView

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'estimates', EstimateViewSet, basename='estimate')
router.register(r'sign', PublicSignatureView, basename='public-signature')

urlpatterns = [
    path('', include(router.urls)),
]
