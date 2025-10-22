import logging
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import ImportedDocument, DocumentParseResult, ImportPreview
from .serializers import (
    ImportedDocumentSerializer,
    ImportedDocumentUploadSerializer,
    DocumentParseResultSerializer,
    ImportPreviewSerializer,
    ImportPreviewEditSerializer,
)
from .tasks import parse_document_with_ai, create_entities_from_preview, parse_documents_batch
from .services.estimate_assistant import EstimateAssistant


class ImportedDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing imported documents"""

    serializer_class = ImportedDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'document_type']

    def get_queryset(self):
        return ImportedDocument.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload one or multiple PDF documents for processing.

        Accepts multipart/form-data with:
        - Single file: file field
        - Multiple files: files[] array
        """
        logger = logging.getLogger(__name__)
        
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            logger.error(f"Upload attempt by unauthenticated user: {request.user}")
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        logger.info(f"Document upload by user: {request.user.username} (id={request.user.id})")
        
        files = request.FILES.getlist('files[]') or [request.FILES.get('file')]
        files = [f for f in files if f]  # Remove None values

        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file types
        for file in files:
            if not file.name.lower().endswith('.pdf'):
                return Response(
                    {'error': f'Invalid file type for {file.name}. Only PDF files are accepted.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create ImportedDocument records
        created_documents = []
        for file in files:
            document = ImportedDocument.objects.create(
                user=request.user,
                file=file,
                file_name=file.name,
                file_size=file.size,
                status='uploaded'
            )
            logger.info(f"Created document {document.id} for user {request.user.username}")
            created_documents.append(document)

        # Trigger async parsing
        document_ids = [doc.id for doc in created_documents]
        if len(document_ids) == 1:
            parse_document_with_ai.delay(document_ids[0])
        else:
            parse_documents_batch.delay(document_ids)

        serializer = self.get_serializer(created_documents, many=True)
        return Response(
            {
                'message': f'{len(created_documents)} document(s) uploaded successfully',
                'documents': serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def reparse(self, request, pk=None):
        """Trigger re-parsing of a document"""
        document = self.get_object()

        if document.status == 'processing':
            return Response(
                {'error': 'Document is already being processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset status and trigger parsing
        document.status = 'uploaded'
        document.error_message = None
        document.save()

        parse_document_with_ai.delay(document.id)

        return Response(
            {'message': 'Document re-parsing triggered'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Get the import preview for this document"""
        document = self.get_object()

        try:
            preview = document.preview
            serializer = ImportPreviewSerializer(preview)
            return Response(serializer.data)
        except ImportPreview.DoesNotExist:
            return Response(
                {'error': 'No preview available yet. Document may still be processing.'},
                status=status.HTTP_404_NOT_FOUND
            )


class ImportPreviewViewSet(viewsets.ModelViewSet):
    """ViewSet for managing import previews"""

    serializer_class = ImportPreviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'customer_action', 'project_action']

    def get_queryset(self):
        return ImportPreview.objects.filter(document__user=self.request.user)

    @action(detail=True, methods=['patch'])
    def edit(self, request, pk=None):
        """
        Edit preview data before approval.
        User can modify extracted data and matching actions.
        """
        preview = self.get_object()

        if preview.status != 'pending_review':
            return Response(
                {'error': f'Cannot edit preview with status: {preview.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ImportPreviewEditSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Update preview with edited data
        validated_data = serializer.validated_data
        preview.customer_data = validated_data.get('customer_data', preview.customer_data)
        preview.project_data = validated_data.get('project_data', preview.project_data)
        preview.tasks_data = validated_data.get('tasks_data', preview.tasks_data)
        preview.invoice_estimate_data = validated_data.get('invoice_estimate_data', preview.invoice_estimate_data)
        preview.customer_action = validated_data.get('customer_action', preview.customer_action)
        preview.project_action = validated_data.get('project_action', preview.project_action)

        # Update matched entities if changed
        if 'matched_customer_id' in validated_data:
            from customers.models import Customer
            customer_id = validated_data['matched_customer_id']
            if customer_id:
                try:
                    preview.matched_customer = Customer.objects.get(id=customer_id, user=request.user)
                except Customer.DoesNotExist:
                    return Response(
                        {'error': f'Customer {customer_id} not found'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                preview.matched_customer = None

        if 'matched_project_id' in validated_data:
            from projects.models import Project
            project_id = validated_data['matched_project_id']
            if project_id:
                try:
                    preview.matched_project = Project.objects.get(id=project_id, user=request.user)
                except Project.DoesNotExist:
                    return Response(
                        {'error': f'Project {project_id} not found'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                preview.matched_project = None

        preview.save()

        serializer = ImportPreviewSerializer(preview)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_data(self, request, pk=None):
        """
        Update the extracted data in the preview before approval.
        Allows user to correct AI-extracted information.
        """
        preview = self.get_object()

        if preview.status != 'pending_review':
            return Response(
                {'error': f'Cannot update preview with status: {preview.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update extracted_data JSON field with corrected values
        if 'customer_data' in request.data:
            preview.extracted_data['customer'] = request.data['customer_data']
        
        if 'project_data' in request.data:
            preview.extracted_data['project'] = request.data['project_data']
        
        if 'tasks_data' in request.data:
            preview.extracted_data['tasks'] = request.data['tasks_data']
        
        if 'invoice_estimate_data' in request.data:
            preview.extracted_data['invoice_estimate_details'] = request.data['invoice_estimate_data']

        preview.save()

        serializer = ImportPreviewSerializer(preview)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve the preview and create actual entities.
        Triggers async task to create Customer, Project, Tasks, Invoice/Estimate.
        """
        preview = self.get_object()

        if preview.status != 'pending_review':
            return Response(
                {'error': f'Cannot approve preview with status: {preview.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as approved
        preview.status = 'approved'
        preview.save()

        # Trigger entity creation
        create_entities_from_preview.delay(preview.id)

        return Response(
            {
                'message': 'Import approved. Entities are being created.',
                'preview_id': preview.id
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject the import preview"""
        preview = self.get_object()

        if preview.status != 'pending_review':
            return Response(
                {'error': f'Cannot reject preview with status: {preview.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        preview.status = 'rejected'
        preview.reviewed_at = timezone.now()
        preview.save()

        preview.document.status = 'rejected'
        preview.document.save()

        return Response(
            {'message': 'Import rejected'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all previews pending review"""
        previews = self.get_queryset().filter(status='pending_review')
        serializer = self.get_serializer(previews, many=True)
        return Response(serializer.data)


class AIEstimateAssistantView(views.APIView):
    """API view for AI-powered estimate assistance"""

    permission_classes = [IsAuthenticated]

    def post(self, request, action_type):
        """
        Handle different AI assistant actions.

        Routes:
        - /generate-from-prompt/
        - /suggest-pricing/
        - /expand-task/
        - /historical-analysis/
        """
        assistant = EstimateAssistant(request.user)

        if action_type == 'generate-from-prompt':
            return self._generate_from_prompt(request, assistant)
        elif action_type == 'suggest-pricing':
            return self._suggest_pricing(request, assistant)
        elif action_type == 'expand-task':
            return self._expand_task(request, assistant)
        elif action_type == 'historical-analysis':
            return self._historical_analysis(request, assistant)
        else:
            return Response(
                {'error': f'Unknown action: {action_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _generate_from_prompt(self, request, assistant):
        """Generate complete estimate from natural language description"""
        project_description = request.data.get('project_description')
        customer_name = request.data.get('customer_name')
        additional_context = request.data.get('additional_context')

        if not project_description:
            return Response(
                {'error': 'project_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = assistant.generate_estimate_from_prompt(
            project_description=project_description,
            customer_name=customer_name,
            additional_context=additional_context
        )

        if result['success']:
            return Response(result['estimate'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _suggest_pricing(self, request, assistant):
        """Suggest pricing for provided tasks"""
        tasks = request.data.get('tasks')
        project_context = request.data.get('project_context')

        if not tasks or not isinstance(tasks, list):
            return Response(
                {'error': 'tasks array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = assistant.suggest_pricing_for_tasks(
            tasks=tasks,
            project_context=project_context
        )

        if result['success']:
            return Response(result['suggestions'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _expand_task(self, request, assistant):
        """Expand a task into subtasks"""
        task_name = request.data.get('task_name')
        task_description = request.data.get('task_description')

        if not task_name:
            return Response(
                {'error': 'task_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = assistant.expand_task(
            task_name=task_name,
            task_description=task_description
        )

        if result['success']:
            return Response(result['expansion'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _historical_analysis(self, request, assistant):
        """Get historical data analysis"""
        analysis = assistant.analyze_historical_data()
        return Response(analysis, status=status.HTTP_200_OK)
