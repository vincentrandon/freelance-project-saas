from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import json

from .models import Project, Task, TaskTemplate, TaskHistory
from .serializers import (
    ProjectSerializer, ProjectListSerializer, TaskSerializer,
    TaskTemplateSerializer, TaskTemplateListSerializer, TaskHistorySerializer
)
from .services.task_catalogue_service import TaskCatalogueService
from invoicing.serializers import InvoiceSerializer, EstimateSerializer
from subscriptions.permissions import RequireCoreOrElite


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing projects.
    Provides CRUD operations and Tiptap notes support.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description', 'customer__name']
    filterset_fields = ['status', 'customer']
    ordering_fields = ['name', 'start_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).select_related('customer').prefetch_related('tasks', 'invoices', 'estimates')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer
    
    @action(detail=True, methods=['put'])
    def update_notes(self, request, pk=None):
        """Update project notes (Tiptap JSON content)"""
        project = self.get_object()

        # Check if notes_json key exists in request data
        if 'notes_json' not in request.data:
            return Response(
                {'error': 'notes_json is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes_json = request.data.get('notes_json')

        # Allow null or empty string to clear notes
        if notes_json is None or notes_json == '':
            project.notes_json = None
            project.save()
        else:
            # Validate it's valid JSON
            if isinstance(notes_json, str):
                try:
                    notes_json = json.loads(notes_json)
                except json.JSONDecodeError:
                    return Response(
                        {'error': 'Invalid JSON format for notes_json'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            project.notes_json = notes_json
            project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """Get all projects for a specific customer"""
        customer_id = request.query_params.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': 'customer_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        projects = self.get_queryset().filter(customer_id=customer_id)
        serializer = self.get_serializer(projects, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active projects"""
        projects = self.get_queryset().filter(status='active')
        serializer = self.get_serializer(projects, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """Get all invoices for a specific project"""
        project = self.get_object()
        invoices = project.invoices.all()
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def estimates(self, request, pk=None):
        """Get all estimates for a specific project"""
        project = self.get_object()
        estimates = project.estimates.all()
        serializer = EstimateSerializer(estimates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Get project metrics and dashboard data"""
        project = self.get_object()
        
        return Response({
            'total_estimated_hours': project.total_estimated_hours,
            'total_actual_hours': project.total_actual_hours,
            'total_invoiced': project.total_invoiced,
            'profit_margin': project.profit_margin,
            'estimated_budget': project.estimated_budget,
            'task_count': project.tasks.count(),
            'invoice_count': project.invoices.count(),
            'estimate_count': project.estimates.count(),
            'completed_tasks': project.tasks.filter(status='completed').count(),
        })


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks within projects.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'created_at', 'name']
    ordering = ['order', 'created_at']
    
    def get_queryset(self):
        return Task.objects.filter(project__user=self.request.user).select_related('project')
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder tasks"""
        task_ids = request.data.get('task_ids', [])
        
        for index, task_id in enumerate(task_ids):
            try:
                task = Task.objects.get(id=task_id, project__user=request.user)
                task.order = index
                task.save()
            except Task.DoesNotExist:
                pass
        
        return Response({'status': 'tasks reordered'})


class TaskCatalogueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing task catalogue (task templates) - requires CORE or ELITE tier.
    Provides search, suggestions, analytics, and template management.
    """
    permission_classes = [IsAuthenticated, RequireCoreOrElite]
    pagination_class = None  # Disable pagination for task catalogue
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'created_from', 'is_active']
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['name', 'usage_count', 'confidence_score', 'average_estimated_hours', 'created_at']
    ordering = ['-usage_count', '-last_used_at']

    def get_queryset(self):
        return TaskTemplate.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskTemplateListSerializer
        return TaskTemplateSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search for task templates by name with fuzzy matching.
        Query params: q (search query), category, limit (default 10)
        """
        query = request.query_params.get('q', '')
        category = request.query_params.get('category', None)
        limit = int(request.query_params.get('limit', 10))

        if not query:
            return Response(
                {'error': 'Search query "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = TaskCatalogueService(request.user)
        results = service.find_similar_templates(
            task_name=query,
            category=category,
            limit=limit
        )

        # Serialize templates
        serialized_results = []
        for result in results:
            template_data = TaskTemplateSerializer(result['template']).data
            template_data['match_score'] = result['match_score']
            template_data['match_type'] = result['match_type']
            serialized_results.append(template_data)

        return Response({
            'query': query,
            'results': serialized_results,
            'count': len(serialized_results)
        })

    @action(detail=False, methods=['post'])
    def suggest(self, request):
        """
        Get task template suggestions based on project description.
        Body: { "project_description": "...", "customer_name": "..." }
        """
        project_description = request.data.get('project_description', '')
        customer_name = request.data.get('customer_name', None)
        limit = request.data.get('limit', 10)

        if not project_description:
            return Response(
                {'error': 'project_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = TaskCatalogueService(request.user)
        suggestions = service.suggest_tasks_for_project(
            project_description=project_description,
            customer_name=customer_name,
            limit=limit
        )

        # Serialize suggestions
        serialized_suggestions = []
        for suggestion in suggestions:
            template_data = TaskTemplateSerializer(suggestion['template']).data
            template_data['relevance_score'] = suggestion['relevance_score']
            template_data['matching_keywords'] = suggestion['matching_keywords']
            serialized_suggestions.append(template_data)

        return Response({
            'project_description': project_description,
            'suggestions': serialized_suggestions,
            'count': len(serialized_suggestions)
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Get analytics about the task catalogue.
        Returns statistics, category distribution, most used templates, etc.
        """
        service = TaskCatalogueService(request.user)
        analytics_data = service.get_catalogue_analytics()

        return Response(analytics_data)

    @action(detail=False, methods=['post'])
    def from_task(self, request):
        """
        Create a task template from an existing task.
        Body: {
            "task_name": "...",
            "task_description": "...",
            "estimated_hours": 10,
            "actual_hours": 12 (optional),
            "hourly_rate": 80,
            "category": "development" (optional, will auto-detect if not provided),
            "tags": ["react", "frontend"] (optional, will auto-extract if not provided)
        }
        """
        task_name = request.data.get('task_name')
        task_description = request.data.get('task_description', '')
        estimated_hours = request.data.get('estimated_hours', 0)
        actual_hours = request.data.get('actual_hours', None)
        hourly_rate = request.data.get('hourly_rate', 0)
        category = request.data.get('category', None)
        tags = request.data.get('tags', None)

        if not task_name:
            return Response(
                {'error': 'task_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = TaskCatalogueService(request.user)

        # Auto-categorize if not provided
        if not category:
            category = service.auto_categorize_task(task_name, task_description)

        # Auto-extract tags if not provided
        if not tags:
            tags = service.extract_tags_from_task(task_name, task_description)

        # Create or update template
        template, created = service.create_or_update_template_from_task(
            task_name=task_name,
            task_description=task_description,
            estimated_hours=estimated_hours,
            actual_hours=actual_hours,
            hourly_rate=hourly_rate,
            category=category,
            tags=tags,
            source='manual'
        )

        serializer = TaskTemplateSerializer(template)

        return Response({
            'template': serializer.data,
            'created': created,
            'message': 'Template created successfully' if created else 'Existing template updated'
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """
        Create a task from this template for a project.
        Body: {
            "project_id": 123,
            "adjust_hours": 10 (optional, override estimated hours),
            "adjust_rate": 90 (optional, override hourly rate)
        }
        """
        template = self.get_object()
        project_id = request.data.get('project_id')

        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify project belongs to user
        from .models import Project
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create task from template
        task = Task.objects.create(
            project=project,
            template=template,
            name=template.name,
            description=template.description,
            estimated_hours=request.data.get('adjust_hours', template.average_estimated_hours),
            hourly_rate=request.data.get('adjust_rate', template.average_hourly_rate),
            status='todo'
        )

        # Update template usage statistics
        template.update_statistics(
            estimated_hours=task.estimated_hours,
            hourly_rate=task.hourly_rate
        )

        # Create history entry
        service = TaskCatalogueService(request.user)
        service.create_task_history_entry(
            task=task,
            template=template,
            source_type='template'
        )

        task_serializer = TaskSerializer(task)
        return Response({
            'task': task_serializer.data,
            'message': 'Task created from template successfully'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def deactivate(self, request, pk=None):
        """Soft delete (deactivate) a template"""
        template = self.get_object()
        template.is_active = False
        template.save()

        return Response({
            'message': f'Template "{template.name}" deactivated successfully'
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Reactivate a deactivated template"""
        template = self.get_object()
        template.is_active = True
        template.save()

        return Response({
            'message': f'Template "{template.name}" activated successfully'
        })


class TaskHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for task history.
    Provides insights into task estimation accuracy over time.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TaskHistorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['source_type', 'template']
    search_fields = ['task__name', 'project_name', 'customer_name']
    ordering_fields = ['created_at', 'variance_percentage', 'estimated_hours']
    ordering = ['-created_at']

    def get_queryset(self):
        return TaskHistory.objects.filter(user=self.request.user).select_related('task', 'template')

    @action(detail=False, methods=['get'])
    def accuracy_report(self, request):
        """
        Get a report on estimation accuracy.
        Shows tasks with variance analysis.
        """
        history = self.get_queryset().filter(
            actual_hours__isnull=False,
            variance_percentage__isnull=False
        )

        # Calculate statistics
        from django.db.models import Avg, Count, Q

        stats = {
            'total_completed_tasks': history.count(),
            'average_variance': float(history.aggregate(Avg('variance_percentage'))['variance_percentage__avg'] or 0),
            'underestimated_count': history.filter(variance_percentage__gt=0).count(),
            'overestimated_count': history.filter(variance_percentage__lt=0).count(),
            'accurate_count': history.filter(variance_percentage__gte=-10, variance_percentage__lte=10).count(),
        }

        # Most inaccurate estimates (need attention)
        worst_estimates = history.order_by('-variance_percentage')[:10]
        worst_serialized = TaskHistorySerializer(worst_estimates, many=True).data

        # Best estimates (within 5%)
        best_estimates = history.filter(
            variance_percentage__gte=-5,
            variance_percentage__lte=5
        ).order_by('-created_at')[:10]
        best_serialized = TaskHistorySerializer(best_estimates, many=True).data

        return Response({
            'statistics': stats,
            'worst_estimates': worst_serialized,
            'best_estimates': best_serialized
        })
