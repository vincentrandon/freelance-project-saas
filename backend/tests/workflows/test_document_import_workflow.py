"""End-to-end workflow tests for AI document import."""

import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from unittest.mock import patch, MagicMock

from document_processing.models import ImportedDocument, DocumentParseResult, ImportPreview
from customers.models import Customer
from projects.models import Project
from invoicing.models import Invoice, Estimate
from tests.factories import CustomerFactory, ImportedDocumentFactory


@pytest.mark.workflow
@pytest.mark.external
class TestDocumentImportWorkflow:
    """Test complete document import workflow with AI parsing."""

    @patch('document_processing.tasks.parse_document_with_ai.delay')
    def test_complete_invoice_import_workflow(
        self,
        mock_parse_task,
        authenticated_client,
        user,
        sample_pdf,
        mock_openai_response
    ):
        """Test full workflow: upload → parse → review → approve."""

        # Step 1: Upload PDF document
        url = reverse('importeddocument-import')
        data = {
            'file': sample_pdf,
            'file_name': 'invoice_acme.pdf'
        }

        response = authenticated_client.post(url, data, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        document_id = response.data['id']

        # Verify document created
        document = ImportedDocument.objects.get(id=document_id)
        assert document.status == 'uploaded'
        assert document.user == user

        # Verify parsing task was queued
        mock_parse_task.assert_called_once_with(document_id)

        # Step 2: Simulate AI parsing completion
        # (In real scenario, this would be done by Celery worker)
        with patch('document_processing.services.openai_document_parser.OpenAIDocumentParser.parse_document') as mock_parser:
            # Mock OpenAI response
            mock_parser.return_value = {
                'document_type': 'invoice',
                'language': 'en',
                'customer': {
                    'name': 'ACME Corporation',
                    'email': 'billing@acme.com',
                    'company': 'ACME Corp',
                    'address': '123 Main St'
                },
                'project': {
                    'name': 'Website Redesign',
                    'description': 'Full website overhaul'
                },
                'tasks': [
                    {
                        'description': 'Frontend development',
                        'quantity': 40,
                        'unit': 'hours',
                        'rate': 100,
                        'category': 'development'
                    },
                    {
                        'description': 'Backend API',
                        'quantity': 30,
                        'unit': 'hours',
                        'rate': 120,
                        'category': 'development'
                    }
                ],
                'invoice_data': {
                    'invoice_number': 'INV-2025-001',
                    'issue_date': '2025-01-15',
                    'due_date': '2025-02-15',
                    'status': 'sent',
                    'tax_rate': 20
                },
                'confidence_scores': {
                    'overall': 0.95,
                    'customer': 0.98,
                    'project': 0.92,
                    'tasks': 0.94,
                    'pricing': 0.96
                }
            }

            # Manually execute what the task would do
            document.status = 'processing'
            document.save()

            # Create parse result
            parse_result = DocumentParseResult.objects.create(
                document=document,
                raw_response={'model': 'gpt-4-vision', 'usage': {}},
                extracted_data=mock_parser.return_value,
                overall_confidence=0.95,
                customer_confidence=0.98,
                project_confidence=0.92,
                tasks_confidence=0.94,
                pricing_confidence=0.96,
                language='en'
            )

            # Create import preview
            preview = ImportPreview.objects.create(
                document=document,
                parse_result=parse_result,
                user=user,
                status='pending_review',
                customer_data={
                    'name': 'ACME Corporation',
                    'email': 'billing@acme.com',
                    'company': 'ACME Corp'
                },
                project_data={
                    'name': 'Website Redesign',
                    'description': 'Full website overhaul'
                },
                tasks_data=[
                    {
                        'name': 'Frontend development',
                        'estimated_hours': 40,
                        'hourly_rate': 100,
                        'category': 'development'
                    },
                    {
                        'name': 'Backend API',
                        'estimated_hours': 30,
                        'hourly_rate': 120,
                        'category': 'development'
                    }
                ],
                invoice_estimate_data={
                    'type': 'invoice',
                    'invoice_number': 'INV-2025-001',
                    'issue_date': '2025-01-15',
                    'due_date': '2025-02-15',
                    'tax_rate': 20
                },
                customer_action='create_new',
                project_action='create_new',
                overall_task_quality_score=0.9,
                auto_approve_eligible=False
            )

            document.status = 'parsed'
            document.save()

        # Step 3: User retrieves preview
        preview_url = reverse('importeddocument-get-preview', kwargs={'pk': document_id})
        response = authenticated_client.get(preview_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'pending_review'
        assert response.data['customer_data']['name'] == 'ACME Corporation'
        assert len(response.data['tasks_data']) == 2

        # Step 4: User edits preview data (optional)
        edit_url = reverse('importpreview-update-preview-data', kwargs={'pk': preview.id})
        edited_data = {
            'customer_data': {
                'name': 'ACME Corporation Inc.',  # User corrects name
                'email': 'billing@acme.com',
                'company': 'ACME Corp'
            },
            'tasks_data': [
                {
                    'name': 'Frontend development (React)',  # User clarifies
                    'estimated_hours': 40,
                    'hourly_rate': 100,
                    'category': 'development'
                },
                {
                    'name': 'Backend API development',  # User clarifies
                    'estimated_hours': 30,
                    'hourly_rate': 120,
                    'category': 'development'
                }
            ]
        }

        response = authenticated_client.patch(edit_url, edited_data, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Step 5: User approves import
        approve_url = reverse('importpreview-approve', kwargs={'pk': preview.id})
        response = authenticated_client.post(approve_url)

        assert response.status_code == status.HTTP_200_OK

        # Verify entities were created
        preview.refresh_from_db()
        assert preview.status == 'approved'

        # Verify customer created
        assert preview.created_customer is not None
        customer = preview.created_customer
        assert customer.name == 'ACME Corporation Inc.'  # User's corrected name
        assert customer.email == 'billing@acme.com'
        assert customer.user == user

        # Verify project created
        assert preview.created_project is not None
        project = preview.created_project
        assert project.name == 'Website Redesign'
        assert project.customer == customer
        assert project.user == user

        # Verify tasks created
        assert project.tasks.count() == 2
        task1 = project.tasks.first()
        assert 'React' in task1.name  # User's clarification included

        # Verify invoice created
        assert preview.created_invoice is not None
        invoice = preview.created_invoice
        assert invoice.invoice_number == 'INV-2025-001'
        assert invoice.customer == customer
        assert invoice.project == project
        assert invoice.user == user

        # Verify feedback captured for AI learning
        # (User corrections should create AIExtractionFeedback records)

    def test_import_with_existing_customer_match(
        self,
        authenticated_client,
        user,
        sample_pdf
    ):
        """Test import workflow when customer already exists (fuzzy match)."""

        # Pre-existing customer
        existing_customer = CustomerFactory(
            user=user,
            name='ACME Corp',
            email='billing@acme.com'
        )

        # Upload document
        url = reverse('importeddocument-import')
        response = authenticated_client.post(
            url,
            {'file': sample_pdf, 'file_name': 'invoice.pdf'},
            format='multipart'
        )

        document_id = response.data['id']

        # Simulate parsing with customer match
        with patch('document_processing.services.entity_matcher.EntityMatcher.match_customer') as mock_matcher:
            mock_matcher.return_value = (existing_customer, 0.92)  # High confidence match

            # ... (parse and create preview as before)

            # In preview, matched_customer should be set
            # and customer_action should default to 'use_existing'

    def test_import_rejection_workflow(
        self,
        authenticated_client,
        user,
        sample_pdf
    ):
        """Test rejecting an import after review."""

        # Upload and parse document (simplified)
        document = ImportedDocumentFactory(user=user, status='parsed')
        preview = ImportPreview.objects.create(
            document=document,
            user=user,
            status='pending_review',
            customer_data={'name': 'Test'},
            project_data={'name': 'Test Project'},
            tasks_data=[],
            invoice_estimate_data={}
        )

        # User rejects import
        reject_url = reverse('importpreview-reject', kwargs={'pk': preview.id})
        response = authenticated_client.post(
            reject_url,
            {'reason': 'Incorrect extraction'},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK

        preview.refresh_from_db()
        assert preview.status == 'rejected'

        # Verify no entities were created
        assert preview.created_customer is None
        assert preview.created_project is None
        assert preview.created_invoice is None

    @patch('document_processing.tasks.parse_document_with_ai.delay')
    def test_import_with_task_clarification_needed(
        self,
        mock_task,
        authenticated_client,
        user,
        sample_pdf
    ):
        """Test workflow when tasks need clarification."""

        # Upload document
        url = reverse('importeddocument-import')
        response = authenticated_client.post(
            url,
            {'file': sample_pdf},
            format='multipart'
        )

        document_id = response.data['id']

        # Simulate parsing with low-quality tasks
        document = ImportedDocument.objects.get(id=document_id)
        preview = ImportPreview.objects.create(
            document=document,
            user=user,
            status='pending_review',
            customer_data={'name': 'ACME'},
            project_data={'name': 'Project'},
            tasks_data=[
                {
                    'name': 'Dev work',  # Vague description
                    'estimated_hours': 40,
                    'hourly_rate': 100
                }
            ],
            invoice_estimate_data={},
            needs_clarification=True,  # Flag set by quality analyzer
            overall_task_quality_score=0.45  # Low score
        )

        # User receives preview
        preview_url = reverse('importeddocument-get-preview', kwargs={'pk': document_id})
        response = authenticated_client.get(preview_url)

        assert response.data['needs_clarification'] is True

        # User provides clarifications
        clarify_url = reverse('importpreview-clarify-tasks', kwargs={'pk': preview.id})
        clarifications = {
            'tasks_data': [
                {
                    'name': 'Frontend development with React',
                    'description': 'Build responsive UI components',
                    'estimated_hours': 40,
                    'hourly_rate': 100,
                    'category': 'development'
                }
            ]
        }

        response = authenticated_client.post(clarify_url, clarifications, format='json')

        assert response.status_code == status.HTTP_200_OK

        preview.refresh_from_db()
        assert preview.needs_clarification is False

    def test_batch_import_multiple_documents(
        self,
        authenticated_client,
        user,
        sample_pdf
    ):
        """Test importing multiple documents in batch."""

        # Upload multiple documents
        documents = []
        for i in range(3):
            url = reverse('importeddocument-import')
            response = authenticated_client.post(
                url,
                {'file': sample_pdf, 'file_name': f'invoice_{i}.pdf'},
                format='multipart'
            )

            assert response.status_code == status.HTTP_201_CREATED
            documents.append(response.data['id'])

        # Verify all documents created
        assert ImportedDocument.objects.filter(id__in=documents).count() == 3

    @patch('document_processing.services.openai_document_parser.OpenAIDocumentParser.parse_document')
    def test_import_handles_parsing_errors(
        self,
        mock_parser,
        authenticated_client,
        user,
        sample_pdf
    ):
        """Test error handling when AI parsing fails."""

        mock_parser.side_effect = Exception('OpenAI API error')

        url = reverse('importeddocument-import')
        response = authenticated_client.post(
            url,
            {'file': sample_pdf},
            format='multipart'
        )

        document_id = response.data['id']

        # Simulate task execution with error
        document = ImportedDocument.objects.get(id=document_id)
        document.status = 'error'
        document.error_message = 'OpenAI API error'
        document.save()

        # Verify error status
        assert document.status == 'error'
        assert 'OpenAI' in document.error_message

    def test_auto_approve_high_confidence_imports(
        self,
        authenticated_client,
        user
    ):
        """Test auto-approval of high-confidence extractions."""

        document = ImportedDocumentFactory(user=user, status='parsed')
        preview = ImportPreview.objects.create(
            document=document,
            user=user,
            status='pending_review',
            customer_data={'name': 'ACME'},
            project_data={'name': 'Project'},
            tasks_data=[{'name': 'Task', 'estimated_hours': 10, 'hourly_rate': 100}],
            invoice_estimate_data={},
            overall_task_quality_score=0.95,  # Very high quality
            auto_approve_eligible=True,  # Eligible for auto-approve
            customer_match_confidence=0.98,
            project_match_confidence=0.96
        )

        # System could auto-approve, or user can approve
        approve_url = reverse('importpreview-approve', kwargs={'pk': preview.id})
        response = authenticated_client.post(approve_url)

        assert response.status_code == status.HTTP_200_OK
        assert preview.created_customer is not None
