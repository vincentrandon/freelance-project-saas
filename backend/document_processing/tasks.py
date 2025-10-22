"""
Celery tasks for async document processing.
"""

import logging
import time
from datetime import datetime
from django.utils import timezone
from celery import shared_task
from django.contrib.auth.models import User

from .models import ImportedDocument, DocumentParseResult, ImportPreview
from .services.openai_document_parser import OpenAIDocumentParser
from .services.entity_matcher import EntityMatcher
from customers.models import Customer
from projects.models import Project, Task
from invoicing.models import Invoice, Estimate
from notifications.signals import (
    notify_import_completed,
    notify_import_failed,
    notify_entity_created
)

logger = logging.getLogger(__name__)


@shared_task
def parse_document_with_ai(document_id: int):
    """
    Parse a document using OpenAI and create parse result and preview.

    Args:
        document_id: ID of ImportedDocument to process
    """
    try:
        document = ImportedDocument.objects.get(id=document_id)
        document.status = 'processing'
        document.save()

        start_time = time.time()

        # Parse document with OpenAI
        parser = OpenAIDocumentParser()
        result = parser.parse_document(document.file.path)

        processing_time = time.time() - start_time

        if not result['success']:
            document.status = 'error'
            document.error_message = result['error']
            document.processing_time_seconds = processing_time
            document.save()

            # Send failure notification
            document_name = document.file_name or f'Document {document.id}'
            notify_import_failed(
                user_id=document.user.id,
                document_name=document_name,
                error_message=result['error']
            )
            return

        extracted_data = result['extracted_data']

        # Validate extracted data
        is_valid, errors = parser.validate_extracted_data(extracted_data)

        if not is_valid:
            error_msg = f"Validation failed: {', '.join(errors)}"
            document.status = 'error'
            document.error_message = error_msg
            document.processing_time_seconds = processing_time
            document.save()

            # Send failure notification
            document_name = document.file_name or f'Document {document.id}'
            notify_import_failed(
                user_id=document.user.id,
                document_name=document_name,
                error_message=error_msg
            )
            return

        # Create or update DocumentParseResult (in case of reparse)
        parse_result, created = DocumentParseResult.objects.update_or_create(
            document=document,
            defaults={
                'raw_response': result,
                'extracted_data': extracted_data,
                'overall_confidence': extracted_data.get('confidence_scores', {}).get('overall', 0),
                'customer_confidence': extracted_data.get('confidence_scores', {}).get('customer', 0),
                'project_confidence': extracted_data.get('confidence_scores', {}).get('project', 0),
                'tasks_confidence': extracted_data.get('confidence_scores', {}).get('tasks', 0),
                'pricing_confidence': extracted_data.get('confidence_scores', {}).get('pricing', 0),
                'detected_language': extracted_data.get('language', 'en')
            }
        )

        # Match entities
        matcher = EntityMatcher(document.user)
        customer_match = matcher.match_customer(extracted_data.get('customer', {}))

        # For project matching, we need a customer first
        customer = customer_match['matched_customer']
        if customer:
            project_match = matcher.match_project(extracted_data.get('project', {}), customer)
        else:
            # No customer match, so project will be new
            project_match = {
                'matched_project': None,
                'confidence': 0,
                'action': 'create_new',
                'reason': 'No customer match, will create new project'
            }

        # Prepare preview data
        preview_data = matcher.prepare_preview_data(
            extracted_data,
            customer_match,
            project_match
        )

        # Create or update ImportPreview (in case of reparse)
        preview, created = ImportPreview.objects.update_or_create(
            document=document,
            defaults={
                'parse_result': parse_result,
                'status': 'pending_review',
                'customer_data': preview_data['customer_data'],
                'project_data': preview_data['project_data'],
                'tasks_data': preview_data['tasks_data'],
                'invoice_estimate_data': preview_data['invoice_estimate_data'],
                'matched_customer': preview_data['matched_customer'],
                'customer_match_confidence': preview_data['customer_match_confidence'],
                'customer_action': preview_data['customer_action'],
                'matched_project': preview_data['matched_project'],
                'project_match_confidence': preview_data['project_match_confidence'],
                'project_action': preview_data['project_action'],
                'conflicts': preview_data['conflicts'],
                'warnings': preview_data['warnings']
            }
        )

        # Update document status
        document.status = 'parsed'
        document.document_type = extracted_data.get('document_type', 'unknown')
        document.processed_at = timezone.now()
        document.processing_time_seconds = processing_time
        document.save()

        logger.info(f"Successfully parsed document {document_id} in {processing_time:.2f}s")

        # Send success notification
        document_name = document.file_name or f'Document {document.id}'
        notify_import_completed(
            user_id=document.user.id,
            document_name=document_name,
            link=f'/documents/preview/{preview.id}',
            content_object=document
        )

    except ImportedDocument.DoesNotExist:
        logger.error(f"Document {document_id} not found")
    except Exception as e:
        logger.error(f"Error parsing document {document_id}: {str(e)}", exc_info=True)
        try:
            document = ImportedDocument.objects.get(id=document_id)
            document.status = 'error'
            document.error_message = str(e)
            document.save()

            # Send failure notification
            document_name = document.file_name or f'Document {document.id}'
            notify_import_failed(
                user_id=document.user.id,
                document_name=document_name,
                error_message=str(e)
            )
        except:
            pass


@shared_task
def create_entities_from_preview(preview_id: int):
    """
    Create actual entities (Customer, Project, Tasks, Invoice/Estimate) from approved preview.

    Args:
        preview_id: ID of ImportPreview to process
    """
    try:
        preview = ImportPreview.objects.get(id=preview_id)

        if preview.status != 'approved':
            logger.error(f"Preview {preview_id} not approved, status: {preview.status}")
            return

        user = preview.document.user

        # Step 1: Handle Customer
        if preview.customer_action == 'use_existing' and preview.matched_customer:
            customer = preview.matched_customer
        elif preview.customer_action == 'merge' and preview.matched_customer:
            # Merge: Update existing customer with new data
            customer = preview.matched_customer
            customer_data = preview.customer_data
            if customer_data.get('email'):
                customer.email = customer_data['email']
            if customer_data.get('phone'):
                customer.phone = customer_data['phone']
            if customer_data.get('company'):
                customer.company = customer_data['company']
            if customer_data.get('address'):
                customer.address = customer_data['address']
            if customer_data.get('notes'):
                customer.notes = customer_data.get('notes', customer.notes)
            customer.save()
        else:
            # Create new customer
            customer_data = preview.customer_data
            customer = Customer.objects.create(
                user=user,
                name=customer_data.get('name') or '',
                email=customer_data.get('email') or None,  # Use None instead of empty string
                phone=customer_data.get('phone') or '',
                company=customer_data.get('company') or '',  # Ensure empty string, not None
                address=customer_data.get('address') or '',
                notes=customer_data.get('notes') or ''
            )

        preview.created_customer = customer
        preview.save()

        # Step 2: Handle Project
        if preview.project_action in ['use_existing', 'merge'] and preview.matched_project:
            # Use existing project (will add/merge tasks)
            project = preview.matched_project
        else:
            # Create new project
            project_data = preview.project_data
            project = Project.objects.create(
                user=user,
                customer=customer,
                name=project_data.get('name') or 'Imported Project',
                description=project_data.get('description') or '',
                status='active',
                start_date=project_data.get('start_date') or None,
                end_date=project_data.get('end_date') or None,
                estimated_budget=preview.invoice_estimate_data.get('total') or 0
            )

        preview.created_project = project
        preview.save()

        # Step 3: Handle Tasks with smart deduplication
        tasks_data = preview.tasks_data
        matcher = EntityMatcher(user)

        # Match tasks against existing tasks in the project
        task_matches = matcher.match_tasks(tasks_data, project)

        for idx, task_match in enumerate(task_matches):
            task_data = task_match['task_data']

            if task_match['action'] == 'merge' and task_match['matched_task']:
                # Task already exists - update/merge hours and amounts
                existing_task = task_match['matched_task']
                new_hours = task_data.get('estimated_hours') or task_data.get('actual_hours') or 0
                new_amount = task_data.get('amount') or 0

                # Add to existing hours
                existing_task.estimated_hours = (existing_task.estimated_hours or 0) + new_hours
                existing_task.actual_hours = (existing_task.actual_hours or 0) + new_hours

                # Update description if new one is more detailed
                if task_data.get('description') and len(task_data.get('description', '')) > len(existing_task.description or ''):
                    existing_task.description = task_data.get('description')

                existing_task.save()
                logger.info(f"Merged task '{task_data.get('name')}' into existing task (ID: {existing_task.id})")

            elif task_match['action'] == 'create_new':
                # Create new task
                task = Task.objects.create(
                    project=project,
                    name=task_data.get('name') or f'Task {idx + 1}',
                    description=task_data.get('description') or '',
                    status='todo',
                    estimated_hours=task_data.get('estimated_hours') or task_data.get('actual_hours') or 0,
                    actual_hours=task_data.get('actual_hours') or 0,
                    hourly_rate=task_data.get('hourly_rate') or 0,
                    order=idx
                )
                logger.info(f"Created new task '{task_data.get('name')}'")

                # Auto-save task to catalogue
                try:
                    from projects.services.task_catalogue_service import TaskCatalogueService
                    catalogue_service = TaskCatalogueService(user)

                    # Get category from AI extraction or auto-detect
                    category = task_data.get('category', None)
                    if not category:
                        category = catalogue_service.auto_categorize_task(
                            task.name,
                            task.description
                        )

                    # Extract or auto-generate tags
                    tags = catalogue_service.extract_tags_from_task(
                        task.name,
                        task.description
                    )

                    # Create or update template in catalogue
                    template, created = catalogue_service.create_or_update_template_from_task(
                        task_name=task.name,
                        task_description=task.description,
                        estimated_hours=task.estimated_hours,
                        actual_hours=task.actual_hours if task.status == 'completed' else None,
                        hourly_rate=task.hourly_rate,
                        category=category,
                        tags=tags,
                        source='ai_import'
                    )

                    # Link task to template
                    task.template = template
                    task.save()

                    # Create history entry
                    catalogue_service.create_task_history_entry(
                        task=task,
                        template=template,
                        source_type='ai_import',
                        source_document=preview.document
                    )

                    logger.info(f"Task '{task.name}' {'added to' if created else 'updated in'} catalogue (template ID: {template.id})")

                except Exception as catalogue_error:
                    logger.warning(f"Failed to add task to catalogue: {str(catalogue_error)}")
                    # Don't fail the entire import if catalogue fails
                    pass

            # Skip action means invalid/empty task data
            elif task_match['action'] == 'skip':
                logger.warning(f"Skipped invalid task data: {task_match['reason']}")

        # Step 4: Create Invoice or Estimate
        invoice_estimate_data = preview.invoice_estimate_data
        document_type = preview.document.document_type

        # Prepare items JSON
        items = []
        for task_data in tasks_data:
            items.append({
                'description': task_data.get('name') or '',
                'quantity': task_data.get('estimated_hours') or task_data.get('actual_hours') or 1,
                'unit_price': task_data.get('hourly_rate') or 0,
                'amount': task_data.get('amount') or 0
            })

        if document_type == 'invoice':
            # Generate unique invoice number
            base_invoice_number = invoice_estimate_data.get('number') or f'IMP-{preview_id}'
            invoice_number = base_invoice_number
            counter = 1

            # Check if invoice number already exists and append counter if needed
            while Invoice.objects.filter(invoice_number=invoice_number).exists():
                invoice_number = f"{base_invoice_number}-DUP{counter}"
                counter += 1
                logger.warning(f"Invoice number '{base_invoice_number}' already exists, using '{invoice_number}' instead")

            # Create Invoice
            invoice = Invoice.objects.create(
                user=user,
                customer=customer,
                project=project,
                invoice_number=invoice_number,
                issue_date=invoice_estimate_data.get('issue_date') or timezone.now().date(),
                due_date=invoice_estimate_data.get('due_date') or timezone.now().date(),
                status='draft',
                items=items,
                subtotal=invoice_estimate_data.get('subtotal') or 0,
                tax_rate=invoice_estimate_data.get('tax_rate') or 0,
                tax_amount=invoice_estimate_data.get('tax_amount') or 0,
                total=invoice_estimate_data.get('total') or 0,
                currency=invoice_estimate_data.get('currency') or 'EUR'
            )
            preview.created_invoice = invoice
        else:
            # Generate unique estimate number
            base_estimate_number = invoice_estimate_data.get('number') or f'EST-{preview_id}'
            estimate_number = base_estimate_number
            counter = 1

            # Check if estimate number already exists and append counter if needed
            while Estimate.objects.filter(estimate_number=estimate_number).exists():
                estimate_number = f"{base_estimate_number}-DUP{counter}"
                counter += 1
                logger.warning(f"Estimate number '{base_estimate_number}' already exists, using '{estimate_number}' instead")

            # Create Estimate
            estimate = Estimate.objects.create(
                user=user,
                customer=customer,
                project=project,
                estimate_number=estimate_number,
                issue_date=invoice_estimate_data.get('issue_date') or timezone.now().date(),
                valid_until=invoice_estimate_data.get('valid_until') or timezone.now().date(),
                status='draft',
                items=items,
                subtotal=invoice_estimate_data.get('subtotal') or 0,
                tax_rate=invoice_estimate_data.get('tax_rate') or 0,
                tax_amount=invoice_estimate_data.get('tax_amount') or 0,
                total=invoice_estimate_data.get('total') or 0,
                currency=invoice_estimate_data.get('currency') or 'EUR'
            )
            preview.created_estimate = estimate

        # Mark document as approved
        preview.document.status = 'approved'
        preview.document.save()

        preview.reviewed_at = timezone.now()
        preview.save()

        logger.info(f"Successfully created entities from preview {preview_id}")

        # Send success notification
        entity_type = 'Invoice' if document_type == 'invoice' else 'Estimate'
        entity_name = f"{customer.name} - {project.name}"
        notify_entity_created(
            user_id=user.id,
            entity_type=entity_type,
            entity_name=entity_name,
            link=f'/invoices' if document_type == 'invoice' else f'/invoices?tab=estimates',
            content_object=preview.created_invoice if document_type == 'invoice' else preview.created_estimate
        )

    except ImportPreview.DoesNotExist:
        logger.error(f"Preview {preview_id} not found")
    except Exception as e:
        logger.error(f"Error creating entities from preview {preview_id}: {str(e)}", exc_info=True)

        # Send failure notification
        try:
            preview = ImportPreview.objects.get(id=preview_id)
            document_name = preview.document.file_name or f'Document {preview.document.id}'
            notify_import_failed(
                user_id=preview.document.user.id,
                document_name=f"Failed to create entities from {document_name}",
                error_message=str(e)
            )
        except:
            pass

        raise


@shared_task
def parse_documents_batch(document_ids: list):
    """
    Parse multiple documents in parallel.

    Args:
        document_ids: List of ImportedDocument IDs
    """
    for doc_id in document_ids:
        parse_document_with_ai.delay(doc_id)
