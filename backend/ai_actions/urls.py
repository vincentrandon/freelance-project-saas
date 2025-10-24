from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AIActionViewSet, AIContextViewSet

router = DefaultRouter()
router.register(r"context", AIContextViewSet, basename="ai-context")
router.register(r"actions", AIActionViewSet, basename="ai-actions")

urlpatterns = [
    path("", include(router.urls)),
]
