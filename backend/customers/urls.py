from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, AttachmentViewSet

router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')
router.register(r'attachments', AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('', include(router.urls)),
]

