import logging
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.translation import gettext as _
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
from .services.task_quality_analyzer import TaskQualityAnalyzer
from .services.batch_processor import BatchProcessor
from .services.feedback_capture import FeedbackCaptureService
from subscriptions.permissions import RequireElite
from subscriptions.decorators import check_usage_limit_method


class ImportedDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing imported documents (requires ELITE tier)"""

    serializer_class = ImportedDocumentSerializer
    permission_classes = [IsAuthenticated, RequireElite]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'document_type']

    def get_queryset(self):
        return ImportedDocument.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    @check_usage_limit_method('document_import')
    def upload(self, request):
        """
        Upload one or multiple PDF documents for processing (usage tracked for FREE tier).

        Accepts multipart/form-data with:
        - Single file: file field
        - Multiple files: files[] array
        """
        logger = logging.getLogger(__name__)
        
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            logger.error(f"Upload attempt by unauthenticated user: {request.user}")
            return Response(
                {'error': _('Authentication required')},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        logger.info(f"Document upload by user: {request.user.username} (id={request.user.id})")
        
        files = request.FILES.getlist('files[]') or [request.FILES.get('file')]
        files = [f for f in files if f]  # Remove None values

        if not files:
            return Response(
                {'error': _('No files provided')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file types
        for file in files:
            if not file.name.lower().endswith('.pdf'):
                return Response(
                    {'error': _('Invalid file type for %(filename)s. Only PDF files are accepted.') % {'filename': file.name}},
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
                {'error': _('Document is already being processed')},
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
                {'error': _('No preview available yet. Document may still be processing.')},
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
                {'error': _('Cannot edit preview with status: %(status)s') % {'status': preview.status}},
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
                        {'error': _('Customer %(id)s not found') % {'id': customer_id}},
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
                        {'error': _('Project %(id)s not found') % {'id': project_id}},
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
                {'error': _('Cannot update preview with status: %(status)s') % {'status': preview.status}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store original data for feedback capture
        original_data = {
            'customer': preview.customer_data,
            'project': preview.project_data,
            'tasks': preview.tasks_data,
            'invoice_estimate': preview.invoice_estimate_data
        }

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

        # Capture manual edits for AI learning
        updated_data = {
            'customer': preview.customer_data,
            'project': preview.project_data,
            'tasks': preview.tasks_data,
            'invoice_estimate': preview.invoice_estimate_data
        }

        try:
            FeedbackCaptureService.capture_manual_edits(
                user=request.user,
                preview=preview,
                original_data=original_data,
                updated_data=updated_data
            )
        except Exception as e:
            # Don't fail the request if feedback capture fails
            logging.getLogger(__name__).error(f"Failed to capture manual edit feedback: {e}")

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
                {'error': _('Cannot approve preview with status: %(status)s') % {'status': preview.status}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user made any edits (has any feedback items)
        from .models import AIExtractionFeedback
        has_edits = AIExtractionFeedback.objects.filter(
            preview=preview,
            was_edited=True
        ).exists()

        # Capture implicit positive feedback if no edits were made
        if not has_edits:
            try:
                FeedbackCaptureService.capture_approval_without_edits(
                    user=request.user,
                    preview=preview
                )
            except Exception as e:
                # Don't fail the request if feedback capture fails
                logging.getLogger(__name__).error(f"Failed to capture implicit positive feedback: {e}")

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
                {'error': _('Cannot reject preview with status: %(status)s') % {'status': preview.status}},
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

    @action(detail=True, methods=['post'])
    def rate_extraction(self, request, pk=None):
        """
        Add user rating to the AI extraction.
        Can rate the entire preview or specific feedback items.

        POST /api/document-processing/previews/{id}/rate_extraction/
        Body: {
            "rating": "excellent",  // poor, needs_improvement, good, excellent
            "comment": "Optional comment",  // Optional
            "feedback_id": 123  // Optional: rate specific feedback item
        }
        """
        preview = self.get_object()
        rating = request.data.get('rating')
        comment = request.data.get('comment')
        feedback_id = request.data.get('feedback_id')

        if not rating:
            return Response(
                {'error': _('rating is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_ratings = ['poor', 'needs_improvement', 'good', 'excellent']
        if rating not in valid_ratings:
            return Response(
                {'error': _('Invalid rating. Must be one of: %(ratings)s') % {'ratings': ", ".join(valid_ratings)}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if feedback_id:
                # Rate specific feedback item
                feedback = FeedbackCaptureService.add_user_rating(
                    feedback_id=feedback_id,
                    rating=rating,
                    comment=comment
                )
                return Response({
                    'message': 'Rating saved successfully',
                    'feedback_id': feedback.id
                })
            else:
                # Rate all feedback items for this preview
                count = FeedbackCaptureService.bulk_rate_preview(
                    preview=preview,
                    rating=rating,
                    comment=comment
                )
                return Response({
                    'message': f'Rating saved for {count} feedback items',
                    'rated_count': count
                })
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to save rating: {e}")
            return Response(
                {'error': _('Failed to save rating')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def feedback_summary(self, request, pk=None):
        """
        Get feedback summary for a preview.

        GET /api/document-processing/previews/{id}/feedback_summary/
        """
        preview = self.get_object()
        summary = FeedbackCaptureService.get_preview_feedback_summary(preview)
        return Response(summary)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all previews pending review"""
        previews = self.get_queryset().filter(status='pending_review')
        serializer = self.get_serializer(previews, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def get_clarification_questions(self, request, pk=None):
        """
        Get AI-generated clarification questions for a specific vague task.

        POST /api/document-processing/previews/{id}/get_clarification_questions/
        Body: {
            "task_index": 2
        }
        """
        preview = self.get_object()
        task_index = request.data.get('task_index')

        if task_index is None:
            return Response(
                {'error': _('task_index is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get task data and quality result
        tasks_data = preview.tasks_data
        task_quality_scores = preview.task_quality_scores

        if task_index >= len(tasks_data):
            return Response(
                {'error': _('Invalid task_index: %(index)s') % {'index': task_index}},
                status=status.HTTP_400_BAD_REQUEST
            )

        task_data = tasks_data[task_index]
        quality_result_dict = task_quality_scores.get(str(task_index), {})

        # Convert dict to TaskQualityResult object
        from .services.task_quality_analyzer import TaskQualityResult
        quality_result = TaskQualityResult(
            score=quality_result_dict.get('score', 50),
            clarity_level=quality_result_dict.get('clarity_level', 'needs_review'),
            issues=quality_result_dict.get('issues', []),
            needs_clarification=quality_result_dict.get('needs_clarification', True),
            suggested_improvements=quality_result_dict.get('suggested_improvements', [])
        )

        # Extract language from Accept-Language header
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')
        # Parse language code (e.g., 'fr-FR' -> 'fr', 'en-US' -> 'en')
        language = accept_language.split(',')[0].split('-')[0].lower() if accept_language else 'en'
        # Only support 'fr' and 'en', default to 'en'
        language = 'fr' if language == 'fr' else 'en'

        # Generate questions
        analyzer = TaskQualityAnalyzer()
        questions = analyzer.generate_clarification_questions(task_data, quality_result, language=language)

        # Convert to JSON-serializable format
        questions_data = [
            {
                'id': q.id,
                'question': q.question,
                'type': q.type,
                'options': q.options,
                'placeholder': q.placeholder,
                'suggested_answer': q.suggested_answer,
                'required': q.required
            }
            for q in questions
        ]

        return Response({
            'task_index': task_index,
            'task_name': task_data.get('name'),
            'clarity_score': quality_result.score,
            'issues': quality_result.issues,
            'questions': questions_data
        })

    @action(detail=True, methods=['post'])
    def refine_task(self, request, pk=None):
        """
        Refine a task based on user answers to clarification questions.

        POST /api/document-processing/previews/{id}/refine_task/
        Body: {
            "task_index": 2,
            "questions": [{"id": "q1", "question": "...", ...}],
            "answers": {"q1": "Backend (Python/API)", "q2": "Calculate bonuses", ...}
        }
        """
        preview = self.get_object()
        task_index = request.data.get('task_index')
        questions_data = request.data.get('questions', [])
        answers = request.data.get('answers', {})

        if task_index is None:
            return Response(
                {'error': _('task_index is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks_data = preview.tasks_data.copy()

        if task_index >= len(tasks_data):
            return Response(
                {'error': _('Invalid task_index: %(index)s') % {'index': task_index}},
                status=status.HTTP_400_BAD_REQUEST
            )

        task_data = tasks_data[task_index]
        original_task = task_data.copy()  # Store original for feedback

        # Convert questions_data to ClarificationQuestion objects
        from .services.task_quality_analyzer import ClarificationQuestion
        questions = [
            ClarificationQuestion(
                id=q['id'],
                question=q['question'],
                type=q['type'],
                options=q.get('options'),
                placeholder=q.get('placeholder'),
                required=q.get('required', True)
            )
            for q in questions_data
        ]

        # Get original clarity score
        task_quality_scores = preview.task_quality_scores
        original_clarity_score = task_quality_scores.get(str(task_index), {}).get('score', 50)

        # Extract language from Accept-Language header
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')
        # Parse language code (e.g., 'fr-FR' -> 'fr', 'en-US' -> 'en')
        language = accept_language.split(',')[0].split('-')[0].lower() if accept_language else 'en'
        # Only support 'fr' and 'en', default to 'en'
        language = 'fr' if language == 'fr' else 'en'

        # Refine the task
        analyzer = TaskQualityAnalyzer()
        refined_task = analyzer.refine_task_with_answers(task_data, questions, answers, language=language)

        # Update the task in preview
        tasks_data[task_index] = refined_task
        preview.tasks_data = tasks_data

        # Re-analyze quality for this specific task
        new_quality_result = analyzer.analyze_task_clarity(refined_task)

        # Capture feedback for AI learning
        try:
            FeedbackCaptureService.capture_task_clarification(
                user=request.user,
                preview=preview,
                task_index=task_index,
                original_task=original_task,
                refined_task=refined_task,
                original_clarity_score=original_clarity_score,
                new_clarity_score=new_quality_result.score,
                qa_pairs=answers
            )
        except Exception as e:
            # Don't fail the request if feedback capture fails
            logging.getLogger(__name__).error(f"Failed to capture task clarification feedback: {e}")

        # Update task_quality_scores
        task_quality_scores = preview.task_quality_scores.copy()
        task_quality_scores[str(task_index)] = {
            'task_index': task_index,
            'task_name': refined_task.get('name'),
            'score': new_quality_result.score,
            'clarity_level': new_quality_result.clarity_level,
            'issues': new_quality_result.issues,
            'needs_clarification': new_quality_result.needs_clarification,
            'suggested_improvements': new_quality_result.suggested_improvements
        }
        preview.task_quality_scores = task_quality_scores

        # Recalculate overall stats
        all_scores = [v['score'] for v in task_quality_scores.values()]
        preview.overall_task_quality_score = sum(all_scores) // len(all_scores) if all_scores else 100
        preview.needs_clarification = any(v['needs_clarification'] for v in task_quality_scores.values())

        # Update status if all clarifications are complete
        if not preview.needs_clarification:
            preview.status = 'pending_review'
            preview.clarification_completed_at = timezone.now()

        preview.save()

        return Response({
            'message': 'Task refined successfully',
            'refined_task': refined_task,
            'new_quality_score': new_quality_result.score,
            'new_clarity_level': new_quality_result.clarity_level,
            'all_clarifications_complete': not preview.needs_clarification
        })

    @action(detail=True, methods=['get'])
    def get_all_clarification_suggestions(self, request, pk=None):
        """
        Get AI-generated suggestions for ALL tasks needing clarification at once.
        This replaces the one-by-one question flow with a batch approach.

        GET /api/document-processing/previews/{id}/get_all_clarification_suggestions/
        """
        preview = self.get_object()
        tasks_data = preview.tasks_data
        task_quality_scores = preview.task_quality_scores

        # Filter tasks that need clarification
        tasks_needing_clarification = []
        for task_index_str, quality_dict in task_quality_scores.items():
            if quality_dict.get('needs_clarification', False):
                task_index = int(task_index_str)
                if task_index < len(tasks_data):
                    tasks_needing_clarification.append({
                        'index': task_index,
                        'task_data': tasks_data[task_index],
                        'quality': quality_dict
                    })

        if not tasks_needing_clarification:
            return Response({
                'tasks': [],
                'message': 'No tasks need clarification'
            })

        # Extract language from Accept-Language header
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')
        language = accept_language.split(',')[0].split('-')[0].lower() if accept_language else 'en'
        language = 'fr' if language == 'fr' else 'en'

        # Generate AI suggestions for all tasks
        analyzer = TaskQualityAnalyzer()
        results = []

        for item in tasks_needing_clarification:
            task_data = item['task_data']
            quality_dict = item['quality']
            task_index = item['index']

            try:
                # Generate refined suggestion using AI
                from .services.task_quality_analyzer import TaskQualityResult
                quality_result = TaskQualityResult(
                    score=quality_dict.get('score', 50),
                    clarity_level=quality_dict.get('clarity_level', 'needs_review'),
                    issues=quality_dict.get('issues', []),
                    needs_clarification=True,
                    suggested_improvements=quality_dict.get('suggested_improvements', [])
                )

                # Generate a refined suggestion directly (skip Q&A flow)
                # We'll create a smart AI prompt that suggests improvements
                ai_suggestion = analyzer.generate_task_suggestion(
                    task_data=task_data,
                    quality_result=quality_result,
                    language=language
                )

                results.append({
                    'index': task_index,
                    'original': {
                        'name': task_data.get('name', ''),
                        'description': task_data.get('description', ''),
                        'estimated_hours': task_data.get('estimated_hours', 0),
                        'category': task_data.get('category', 'other')
                    },
                    'ai_suggestion': ai_suggestion,
                    'clarity_score': quality_dict.get('score', 50),
                    'clarity_level': quality_dict.get('clarity_level', 'needs_review'),
                    'issues': quality_dict.get('issues', []),
                    'suggested_improvements': quality_dict.get('suggested_improvements', [])
                })

            except Exception as e:
                logger.error(f"Error generating suggestion for task {task_index}: {e}")
                # Fallback: return original with empty suggestion
                results.append({
                    'index': task_index,
                    'original': {
                        'name': task_data.get('name', ''),
                        'description': task_data.get('description', ''),
                        'estimated_hours': task_data.get('estimated_hours', 0),
                        'category': task_data.get('category', 'other')
                    },
                    'ai_suggestion': None,
                    'clarity_score': quality_dict.get('score', 50),
                    'clarity_level': quality_dict.get('clarity_level', 'needs_review'),
                    'issues': quality_dict.get('issues', []),
                    'suggested_improvements': quality_dict.get('suggested_improvements', [])
                })

        return Response({
            'tasks': results,
            'total_count': len(results)
        })

    @action(detail=True, methods=['post'])
    def bulk_refine_tasks(self, request, pk=None):
        """
        Bulk update multiple tasks at once after user review/editing.

        POST /api/document-processing/previews/{id}/bulk_refine_tasks/
        Body: {
            "tasks": [
                {
                    "index": 0,
                    "name": "Updated task name",
                    "description": "Updated description",
                    "estimated_hours": 12,
                    "category": "development"
                },
                ...
            ]
        }
        """
        preview = self.get_object()
        tasks_updates = request.data.get('tasks', [])

        if not tasks_updates:
            return Response(
                {'error': _('tasks array is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks_data = preview.tasks_data.copy()
        task_quality_scores = preview.task_quality_scores.copy()

        # Track original tasks for feedback capture
        original_tasks = {}

        # Apply updates
        for task_update in tasks_updates:
            task_index = task_update.get('index')
            if task_index is None or task_index >= len(tasks_data):
                continue

            # Store original for feedback
            original_tasks[task_index] = tasks_data[task_index].copy()

            # Update task data
            task = tasks_data[task_index]
            if 'name' in task_update:
                task['name'] = task_update['name']
            if 'description' in task_update:
                task['description'] = task_update['description']
            if 'estimated_hours' in task_update:
                task['estimated_hours'] = task_update['estimated_hours']
            if 'category' in task_update:
                task['category'] = task_update['category']

            # Mark as refined
            task['was_refined'] = True
            task['refined_at'] = timezone.now().isoformat()

            # Re-analyze quality
            analyzer = TaskQualityAnalyzer()
            new_quality_result = analyzer.analyze_task_clarity(task)

            # Update quality scores
            task_quality_scores[str(task_index)] = {
                'task_index': task_index,
                'task_name': task.get('name'),
                'score': new_quality_result.score,
                'clarity_level': new_quality_result.clarity_level,
                'issues': new_quality_result.issues,
                'needs_clarification': new_quality_result.needs_clarification,
                'suggested_improvements': new_quality_result.suggested_improvements
            }

            # Capture feedback for AI learning
            try:
                FeedbackCaptureService.capture_task_clarification(
                    user=request.user,
                    preview=preview,
                    task_index=task_index,
                    original_task=original_tasks[task_index],
                    refined_task=task,
                    original_clarity_score=preview.task_quality_scores.get(str(task_index), {}).get('score', 50),
                    new_clarity_score=new_quality_result.score,
                    qa_pairs={'bulk_edit': True}
                )
            except Exception as e:
                logger.error(f"Failed to capture feedback for task {task_index}: {e}")

        # Update preview
        preview.tasks_data = tasks_data
        preview.task_quality_scores = task_quality_scores

        # Recalculate overall stats
        all_scores = [v['score'] for v in task_quality_scores.values()]
        preview.overall_task_quality_score = sum(all_scores) // len(all_scores) if all_scores else 100
        preview.needs_clarification = any(v['needs_clarification'] for v in task_quality_scores.values())

        # Update status if all clarifications complete
        if not preview.needs_clarification:
            preview.status = 'pending_review'
            preview.clarification_completed_at = timezone.now()

        preview.save()

        return Response({
            'message': f'Successfully updated {len(tasks_updates)} tasks',
            'updated_count': len(tasks_updates),
            'needs_clarification': preview.needs_clarification,
            'overall_quality_score': preview.overall_task_quality_score,
            'status': preview.status
        })

    @action(detail=True, methods=['post'])
    def skip_clarification(self, request, pk=None):
        """
        Skip clarification for a specific task or all tasks.

        POST /api/document-processing/previews/{id}/skip_clarification/
        Body: {
            "task_index": 2,  // Optional: skip specific task, or omit to skip all
            "skip_all": false  // Set to true to skip all remaining tasks
        }
        """
        preview = self.get_object()
        task_index = request.data.get('task_index')
        skip_all = request.data.get('skip_all', False)

        if skip_all:
            # Mark all tasks as not needing clarification
            preview.needs_clarification = False
            preview.status = 'pending_review'
            preview.clarification_completed_at = timezone.now()
            preview.save()

            return Response({
                'message': 'All clarifications skipped',
                'status': 'pending_review'
            })

        elif task_index is not None:
            # Skip specific task
            task_quality_scores = preview.task_quality_scores.copy()
            if str(task_index) in task_quality_scores:
                task_quality_scores[str(task_index)]['needs_clarification'] = False
                preview.task_quality_scores = task_quality_scores

                # Recalculate if all are done
                preview.needs_clarification = any(v['needs_clarification'] for v in task_quality_scores.values())
                if not preview.needs_clarification:
                    preview.status = 'pending_review'
                    preview.clarification_completed_at = timezone.now()

                preview.save()

                return Response({
                    'message': 'Task clarification skipped',
                    'needs_clarification': preview.needs_clarification
                })

        return Response(
            {'error': _('Either task_index or skip_all is required')},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def batch_summary(self, request):
        """
        Get batch processing summary with statistics.

        GET /api/document-processing/previews/batch_summary/
        """
        processor = BatchProcessor(request.user)
        summary = processor.get_batch_summary()
        return Response(summary)

    @action(detail=False, methods=['post'])
    def detect_patterns(self, request):
        """
        Detect patterns in pending imports.

        POST /api/document-processing/previews/detect_patterns/
        Body: {
            "preview_ids": [1, 2, 3]  // Optional: specific previews to analyze
        }
        """
        processor = BatchProcessor(request.user)
        preview_ids = request.data.get('preview_ids')
        patterns = processor.detect_patterns(preview_ids)
        return Response({'patterns': patterns})

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """
        Approve multiple previews at once.

        POST /api/document-processing/previews/bulk_approve/
        Body: {
            "preview_ids": [1, 2, 3, 4, 5]
        }
        """
        preview_ids = request.data.get('preview_ids', [])

        if not preview_ids or not isinstance(preview_ids, list):
            return Response(
                {'error': _('preview_ids array is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        processor = BatchProcessor(request.user)
        result = processor.bulk_approve(preview_ids)

        return Response(result)

    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        """
        Reject multiple previews at once.

        POST /api/document-processing/previews/bulk_reject/
        Body: {
            "preview_ids": [1, 2, 3]
        }
        """
        preview_ids = request.data.get('preview_ids', [])

        if not preview_ids or not isinstance(preview_ids, list):
            return Response(
                {'error': _('preview_ids array is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        processor = BatchProcessor(request.user)
        result = processor.bulk_reject(preview_ids)

        return Response(result)

    @action(detail=False, methods=['post'])
    def auto_approve_safe(self, request):
        """
        Auto-approve all safe imports that meet strict criteria.

        POST /api/document-processing/previews/auto_approve_safe/
        Body: {
            "confidence_threshold": 90  // Optional, defaults to 90
        }
        """
        confidence_threshold = request.data.get('confidence_threshold', 90)

        processor = BatchProcessor(request.user)
        result = processor.auto_approve_safe_batch(confidence_threshold)

        return Response(result)

    @action(detail=False, methods=['get'])
    def batch_list(self, request):
        """
        Get filtered and sorted list of previews for batch review.

        GET /api/document-processing/previews/batch_list/?confidence=high&sort_by=created_at&sort_order=desc
        """
        # Parse query parameters
        filters = {
            'confidence': request.query_params.get('confidence'),  # high, medium, low
            'document_type': request.query_params.get('document_type'),  # invoice, estimate
            'has_conflicts': request.query_params.get('has_conflicts') == 'true',
            'has_warnings': request.query_params.get('has_warnings') == 'true',
            'auto_approve_eligible': request.query_params.get('auto_approve_eligible') == 'true',
            'customer_action': request.query_params.get('customer_action'),  # create_new, use_existing
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None and v != ''}

        sort_by = request.query_params.get('sort_by', 'created_at')
        sort_order = request.query_params.get('sort_order', 'desc')

        processor = BatchProcessor(request.user)
        previews = processor.get_filtered_previews(filters, sort_by, sort_order)

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
                {'error': _('Unknown action: %(action)s') % {'action': action_type}},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _generate_from_prompt(self, request, assistant):
        """Generate complete estimate from natural language description"""
        project_description = request.data.get('project_description')
        customer_name = request.data.get('customer_name')
        additional_context = request.data.get('additional_context')

        if not project_description:
            return Response(
                {'error': _('project_description is required')},
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
                {'error': _('tasks array is required')},
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
                {'error': _('task_name is required')},
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
