from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImportedDocumentViewSet, ImportPreviewViewSet, AIEstimateAssistantView

router = DefaultRouter()
router.register(r'documents', ImportedDocumentViewSet, basename='imported-document')
router.register(r'previews', ImportPreviewViewSet, basename='import-preview')

urlpatterns = [
    path('', include(router.urls)),
    # AI Assistant endpoints
    path('ai-assist/<str:action_type>/', AIEstimateAssistantView.as_view(), name='ai-assist'),
]
