from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AIActionViewSet, AIContextViewSet, AIServiceTokenViewSet, AIActionLogViewSet

router = DefaultRouter()
router.register(r"context", AIContextViewSet, basename="ai-context")
router.register(r"actions", AIActionViewSet, basename="ai-actions")
router.register(r"tokens", AIServiceTokenViewSet, basename="ai-tokens")
router.register(r"logs", AIActionLogViewSet, basename="ai-logs")

urlpatterns = [
    path("", include(router.urls)),
]
