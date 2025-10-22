from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TaskViewSet, TaskCatalogueViewSet, TaskHistoryViewSet

# Create separate routers to avoid conflicts
project_router = DefaultRouter()
project_router.register(r'', ProjectViewSet, basename='project')

task_router = DefaultRouter()
task_router.register(r'', TaskViewSet, basename='task')

task_catalogue_router = DefaultRouter()
task_catalogue_router.register(r'', TaskCatalogueViewSet, basename='task-catalogue')

task_history_router = DefaultRouter()
task_history_router.register(r'', TaskHistoryViewSet, basename='task-history')

urlpatterns = [
    path('tasks/', include(task_router.urls)),
    path('task-catalogue/', include(task_catalogue_router.urls)),
    path('task-history/', include(task_history_router.urls)),
    path('', include(project_router.urls)),
]
