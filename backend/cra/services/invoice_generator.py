"""
Invoice generation service from validated CRAs.
Auto-generates draft invoices with line items from CRA tasks.
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def create_invoice_from_cra(cra):
    """
    Create an invoice from a validated CRA.
    
    Args:
        cra: CRA model instance (must be validated)
        
    Returns:
        Invoice: The created invoice instance
        
    Raises:
        ValueError: If CRA is not validated or invoice already exists
        Exception: If invoice creation fails
    """
    from invoicing.models import Invoice
    
    try:
        # Validate CRA status
        if cra.status != 'validated':
            raise ValueError(f"CRA must be validated before generating invoice (current status: {cra.status})")
        
        # Check if invoice already exists
        if cra.generated_invoices.exists():
            raise ValueError("An invoice has already been generated from this CRA")
        
        # Generate invoice number
        current_year = timezone.now().year
        latest_invoice = Invoice.objects.filter(
            user=cra.user,
            invoice_number__startswith=f'INV-{current_year}-'
        ).order_by('-invoice_number').first()
        
        if latest_invoice:
            import re
            match = re.search(r'INV-(\d{4})-(\d+)', latest_invoice.invoice_number)
            sequence = int(match.group(2)) + 1 if match else 1
        else:
            sequence = 1
        
        invoice_number = f'INV-{current_year}-{sequence:04d}'
        
        # Calculate dates
        issue_date = cra.validated_at.date() if cra.validated_at else timezone.now().date()
        due_date = issue_date + timedelta(days=30)  # Default 30 days payment term
        
        # Build line items from tasks
        items = []
        for task in cra.tasks.all():
            items.append({
                'description': f"{task.name} - {task.description if task.description else ''}",
                'quantity': float(task.worked_days),
                'unit': 'jour(s)',
                'rate': float(cra.daily_rate),
                'amount': float(task.worked_days * cra.daily_rate)
            })
        
        # Alternative: Single line item for the whole CRA
        # items = [{
        #     'description': f"Prestations - {cra.period_display}",
        #     'quantity': float(cra.total_days),
        #     'unit': 'jour(s)',
        #     'rate': float(cra.daily_rate),
        #     'amount': float(cra.total_amount)
        # }]
        
        # Create invoice
        invoice = Invoice.objects.create(
            user=cra.user,
            customer=cra.customer,
            project=cra.project,
            invoice_number=invoice_number,
            issue_date=issue_date,
            due_date=due_date,
            status='draft',  # Start as draft so user can review
            items=items,
            subtotal=cra.total_amount,
            tax_rate=Decimal('0.00'),  # User can add tax if needed
            tax_amount=Decimal('0.00'),
            total=cra.total_amount,
            currency=cra.currency,
            notes=f"Facture générée depuis CRA {cra.period_display}",
            source_cra=cra
        )
        
        logger.info(f'Invoice {invoice.invoice_number} created from CRA {cra.id}')
        
        # Send notification to user
        try:
            from notifications.signals import notify_invoice_generated_from_cra
            notify_invoice_generated_from_cra(
                user_id=cra.user.id,
                cra_period=cra.period_display,
                invoice_number=invoice.invoice_number,
                amount=float(cra.total_amount),
                content_object=invoice
            )
        except Exception as e:
            logger.warning(f'Failed to send notification for invoice {invoice.id}: {str(e)}')
        
        return invoice
        
    except Exception as e:
        logger.error(f'Error creating invoice from CRA {cra.id}: {str(e)}', exc_info=True)
        raise
