from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Invoice, Estimate, SignatureRequest
from .serializers import (
    InvoiceSerializer, InvoiceListSerializer,
    EstimateSerializer, EstimateListSerializer,
    SignatureRequestSerializer, PublicSignatureRequestSerializer
)
from subscriptions.decorators import check_usage_limit_method, require_feature


def create_final_balance_invoice(user, parent_invoice, final_deposit):
    """
    Create a final balance invoice (SOLDE-YYYY-NNNN) when deposits cover the full invoice amount.

    This invoice consolidates all deposit payments and serves as the final payment record,
    showing that the original invoice has been fully settled through progressive deposits.

    Args:
        user: User creating the invoice
        parent_invoice: Original invoice that has been fully paid via deposits
        final_deposit: The last deposit invoice that brought balance to zero

    Returns:
        Invoice: The created SOLDE invoice
    """
    from django.utils import timezone
    from decimal import Decimal
    import re

    # Generate SOLDE invoice number: SOLDE-YYYY-NNNN
    current_year = timezone.now().year
    latest_solde = Invoice.objects.filter(
        user=user,
        invoice_number__startswith=f'SOLDE-{current_year}-'
    ).order_by('-invoice_number').first()

    if latest_solde:
        match = re.search(r'SOLDE-(\d{4})-(\d+)', latest_solde.invoice_number)
        sequence = int(match.group(2)) + 1 if match else 1
    else:
        sequence = 1

    solde_number = f'SOLDE-{current_year}-{sequence:04d}'

    # Get all deposit invoices for this parent invoice
    deposits = parent_invoice.deposit_invoices.all().order_by('issue_date')

    # Create line items: one for each deposit
    solde_items = []
    for dep in deposits:
        solde_items.append({
            'description': f"Acompte {dep.invoice_number} ({dep.issue_date.strftime('%d/%m/%Y')}) - {dep.deposit_percentage:.0f}%",
            'quantity': float(1),
            'rate': float(dep.subtotal),
            'amount': float(dep.subtotal)
        })

    # Calculate totals (should equal parent invoice totals)
    solde_subtotal = sum(item['amount'] for item in solde_items)
    solde_tax = (solde_subtotal * parent_invoice.tax_rate) / 100
    solde_total = solde_subtotal + solde_tax

    # Create description mentioning all deposits
    deposit_refs = ', '.join([d.invoice_number for d in deposits])

    # Create SOLDE invoice
    solde_invoice = Invoice.objects.create(
        user=user,
        customer=parent_invoice.customer,
        project=parent_invoice.project,
        invoice_number=solde_number,
        issue_date=final_deposit.issue_date,
        due_date=final_deposit.due_date,
        status='paid',  # SOLDE invoices are already paid (consolidated from deposits)
        items=solde_items,
        subtotal=solde_subtotal,
        tax_rate=parent_invoice.tax_rate,
        tax_amount=solde_tax,
        total=solde_total,
        currency=parent_invoice.currency,
        notes=f"Règlement complet de la facture {parent_invoice.invoice_number} par acomptes successifs: {deposit_refs}",
        # Mark as final balance invoice
        is_final_balance_invoice=True,
        parent_invoice=parent_invoice,
        # Mark as paid (deposits already received)
        paid_amount=solde_total,
        payment_date=final_deposit.payment_date,
        payment_method=final_deposit.payment_method
    )

    return solde_invoice


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices.
    Provides CRUD operations, PDF generation, and email sending.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['invoice_number', 'customer__name']
    filterset_fields = ['status', 'customer', 'due_date']
    ordering_fields = ['issue_date', 'due_date', 'total', 'created_at']
    ordering = ['-issue_date']

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user).select_related('customer', 'project')

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    @check_usage_limit_method('invoice_creation')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Auto-generate invoice_number if not provided
        if 'invoice_number' not in serializer.validated_data or not serializer.validated_data.get('invoice_number'):
            from django.utils import timezone
            from django.db import transaction
            import re

            current_year = timezone.now().year

            # Use database transaction and locking to prevent race conditions
            with transaction.atomic():
                # Get all invoices for current year and extract sequence numbers
                invoices = Invoice.objects.filter(
                    user=self.request.user,
                    invoice_number__startswith=f'INV-{current_year}-'
                ).values_list('invoice_number', flat=True)

                # Extract all sequence numbers and find the max
                max_sequence = 0
                for inv_num in invoices:
                    match = re.search(r'INV-(\d{4})-(\d+)', inv_num)
                    if match:
                        seq = int(match.group(2))
                        if seq > max_sequence:
                            max_sequence = seq

                # Next sequence number
                sequence = max_sequence + 1

                invoice_number = f'INV-{current_year}-{sequence:04d}'
                serializer.validated_data['invoice_number'] = invoice_number

        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for invoice"""
        invoice = self.get_object()
        # This will trigger a Celery task to generate PDF
        from .tasks import generate_invoice_pdf
        generate_invoice_pdf.delay(invoice.id)
        
        return Response({
            'message': 'PDF generation initiated',
            'invoice_id': invoice.id
        })
    
    @action(detail=True, methods=['post'])
    @require_feature('email_sending')
    def send_email(self, request, pk=None):
        """Send invoice via email (requires CORE tier)"""
        invoice = self.get_object()
        # This will trigger a Celery task to send email
        from .tasks import send_invoice_email
        send_invoice_email.delay(invoice.id)

        return Response({
            'message': 'Email sent',
            'invoice_id': invoice.id,
            'recipient': invoice.customer.email
        })
    
    @action(detail=True, methods=['patch'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices"""
        from django.utils import timezone
        today = timezone.now().date()
        invoices = self.get_queryset().filter(
            due_date__lt=today,
            status__in=['sent', 'overdue']
        )
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get invoice statistics"""
        invoices = self.get_queryset()
        from django.db.models import Sum

        stats = {
            'total_invoices': invoices.count(),
            'total_revenue': invoices.aggregate(Sum('total'))['total__sum'] or 0,
            'paid': invoices.filter(status='paid').count(),
            'pending': invoices.filter(status__in=['draft', 'sent']).count(),
            'overdue': invoices.filter(status='overdue').count(),
        }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def next_number(self, request):
        """
        Generate next invoice number in format INV-YYYY-NNNN.

        Returns:
        {
          "invoice_number": "INV-2025-0042",
          "year": 2025,
          "sequence": 42
        }
        """
        from django.utils import timezone
        import re

        current_year = timezone.now().year

        # Get latest invoice for current year
        latest_invoice = self.get_queryset().filter(
            invoice_number__startswith=f'INV-{current_year}-'
        ).order_by('-invoice_number').first()

        if latest_invoice:
            # Extract sequence number from latest invoice
            match = re.search(r'INV-(\d{4})-(\d+)', latest_invoice.invoice_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        invoice_number = f'INV-{current_year}-{sequence:04d}'

        return Response({
            'invoice_number': invoice_number,
            'year': current_year,
            'sequence': sequence
        })

    @action(detail=True, methods=['post'])
    def create_credit_note(self, request, pk=None):
        """
        Create a credit note (facture d'avoir) for this invoice.

        French law compliance: Instead of deleting invoices, we create
        a credit note with negative amounts to cancel the original invoice.

        POST data:
        {
          "reason": "Reason for cancellation"
        }

        Returns the created credit note invoice.
        """
        from django.utils import timezone
        from decimal import Decimal
        import re

        original_invoice = self.get_object()
        reason = request.data.get('reason', '')

        # Validate that we can create a credit note
        if original_invoice.is_credit_note:
            return Response(
                {'error': 'Cannot create credit note for a credit note'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if original_invoice.status == 'cancelled':
            return Response(
                {'error': 'This invoice has already been cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate credit note number with AVOIR- prefix
        current_year = timezone.now().year

        # Get latest credit note for current year
        latest_credit_note = Invoice.objects.filter(
            user=request.user,
            invoice_number__startswith=f'AVOIR-{current_year}-'
        ).order_by('-invoice_number').first()

        if latest_credit_note:
            # Extract sequence number from latest credit note
            match = re.search(r'AVOIR-(\d{4})-(\d+)', latest_credit_note.invoice_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        credit_note_number = f'AVOIR-{current_year}-{sequence:04d}'

        # Create negative items (credit note has negative amounts)
        credit_note_items = []
        for item in original_invoice.items:
            credit_item = item.copy()
            # Convert to float for JSON serialization
            credit_item['quantity'] = float(-abs(Decimal(str(item.get('quantity', 0)))))
            credit_item['rate'] = float(item.get('rate', 0))
            credit_item['amount'] = float(-abs(Decimal(str(item.get('amount', 0)))))
            credit_note_items.append(credit_item)

        # Create the credit note
        credit_note = Invoice.objects.create(
            user=request.user,
            customer=original_invoice.customer,
            project=original_invoice.project,
            invoice_number=credit_note_number,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date(),  # Credit notes don't have due dates
            status='credit_note',
            items=credit_note_items,
            subtotal=-abs(original_invoice.subtotal),
            tax_rate=original_invoice.tax_rate,
            tax_amount=-abs(original_invoice.tax_amount),
            total=-abs(original_invoice.total),
            currency=original_invoice.currency,
            notes=f"Credit note for invoice {original_invoice.invoice_number}. Reason: {reason}",
            is_credit_note=True,
            original_invoice=original_invoice,
            credit_note_reason=reason
        )

        # Update original invoice status
        original_invoice.status = 'cancelled'
        original_invoice.save()

        serializer = self.get_serializer(credit_note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a duplicate of an existing invoice.

        Creates a new draft invoice with:
        - Same customer, project, items, pricing
        - New auto-generated invoice number
        - Status set to 'draft'
        - No PDF file
        - New creation date
        """
        from django.utils import timezone
        import re

        original = self.get_object()

        # Don't allow duplicating credit notes
        if original.is_credit_note:
            return Response(
                {'error': 'Cannot duplicate a credit note'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate new invoice number
        current_year = timezone.now().year

        # Get latest invoice for current year
        latest_invoice = self.get_queryset().filter(
            invoice_number__startswith=f'INV-{current_year}-'
        ).order_by('-invoice_number').first()

        if latest_invoice:
            # Extract sequence number from latest invoice
            match = re.search(r'INV-(\d{4})-(\d+)', latest_invoice.invoice_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        new_invoice_number = f'INV-{current_year}-{sequence:04d}'

        # Create duplicate
        duplicate = Invoice.objects.create(
            user=request.user,
            customer=original.customer,
            project=original.project,
            invoice_number=new_invoice_number,
            issue_date=timezone.now().date(),
            due_date=original.due_date,
            status='draft',
            items=original.items,  # Copy the JSON field
            subtotal=original.subtotal,
            tax_rate=original.tax_rate,
            tax_amount=original.tax_amount,
            total=original.total,
            currency=original.currency,
            notes=original.notes,
            # Don't copy payment data or credit note fields
            # PDF is NOT copied - must be regenerated
            pdf_file=None
        )

        serializer = self.get_serializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def create_deposit_invoice(self, request, pk=None):
        """
        Create a deposit invoice (facture d'acompte) for a payment received.

        French law compliance: Article 289 CGI requires every deposit payment
        to have a corresponding facture d'acompte with TVA calculated.

        POST data:
        {
          "deposit_amount": 300.00,  // Amount of deposit received (TTC)
          "payment_date": "2025-10-22",  // Date deposit was received
          "payment_method": "bank_transfer",
          "deposit_percentage": 30.00  // Optional: percentage this represents
        }

        Returns the created deposit invoice.
        """
        from django.utils import timezone
        from decimal import Decimal
        import re

        parent_invoice = self.get_object()
        deposit_amount = Decimal(str(request.data.get('deposit_amount')))
        payment_date = request.data.get('payment_date')
        payment_method = request.data.get('payment_method', 'bank_transfer')
        deposit_percentage = request.data.get('deposit_percentage')

        # Validations
        if parent_invoice.is_deposit_invoice:
            return Response(
                {'error': 'Cannot create deposit invoice for a deposit invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if parent_invoice.is_credit_note:
            return Response(
                {'error': 'Cannot create deposit invoice for a credit note'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if deposit_amount <= 0:
            return Response(
                {'error': 'Deposit amount must be greater than 0'},
                status=status.HTTP_400_BAD_REQUEST
            )

        remaining = parent_invoice.remaining_balance
        if deposit_amount > remaining:
            return Response(
                {'error': f'Deposit amount ({deposit_amount}€) exceeds remaining balance ({remaining}€)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate deposit invoice number: ACOMPTE-YYYY-NNNN
        current_year = timezone.now().year
        latest_deposit = Invoice.objects.filter(
            user=request.user,
            invoice_number__startswith=f'ACOMPTE-{current_year}-'
        ).order_by('-invoice_number').first()

        if latest_deposit:
            match = re.search(r'ACOMPTE-(\d{4})-(\d+)', latest_deposit.invoice_number)
            sequence = int(match.group(2)) + 1 if match else 1
        else:
            sequence = 1

        deposit_number = f'ACOMPTE-{current_year}-{sequence:04d}'

        # Calculate percentage if not provided
        if not deposit_percentage:
            deposit_percentage = (deposit_amount / parent_invoice.total) * 100

        # Calculate tax amounts proportionally
        # deposit_amount is TTC (total including tax)
        # We need to extract HT (excluding tax) and tax separately
        deposit_subtotal = deposit_amount / (1 + (parent_invoice.tax_rate / 100))
        deposit_tax_amount = deposit_amount - deposit_subtotal

        # Create single line item following French law requirements
        deposit_items = [{
            'description': f"Acompte de {deposit_percentage:.0f}% sur facture {parent_invoice.invoice_number}",
            'quantity': float(1),
            'rate': float(deposit_subtotal),
            'amount': float(deposit_subtotal)
        }]

        # Create deposit invoice
        deposit_invoice = Invoice.objects.create(
            user=request.user,
            customer=parent_invoice.customer,
            project=parent_invoice.project,
            invoice_number=deposit_number,
            issue_date=payment_date or timezone.now().date(),
            due_date=payment_date or timezone.now().date(),  # Deposits are paid immediately
            status='paid',  # Deposits are paid when issued
            items=deposit_items,
            subtotal=deposit_subtotal,
            tax_rate=parent_invoice.tax_rate,
            tax_amount=deposit_tax_amount,
            total=deposit_amount,
            currency=parent_invoice.currency,
            notes=f"Acompte sur facture {parent_invoice.invoice_number}",
            # Deposit-specific fields
            is_deposit_invoice=True,
            parent_invoice=parent_invoice,
            deposit_percentage=deposit_percentage,
            # Payment tracking (deposit is paid when issued)
            paid_amount=deposit_amount,
            payment_date=payment_date,
            payment_method=payment_method
        )

        # Update parent invoice status
        if parent_invoice.status == 'draft':
            parent_invoice.status = 'sent'

        # Check if fully paid via deposits
        solde_invoice = None
        if parent_invoice.remaining_balance <= Decimal('0.01'):  # Account for rounding
            # Balance reached zero - create final balance invoice (SOLDE)
            solde_invoice = create_final_balance_invoice(
                user=request.user,
                parent_invoice=parent_invoice,
                final_deposit=deposit_invoice
            )
            parent_invoice.status = 'paid'
        elif parent_invoice.total_deposits_amount > 0:
            parent_invoice.status = 'partially_invoiced'

        parent_invoice.save()

        # Return response including SOLDE invoice info if created
        response_data = {
            'deposit_invoice': self.get_serializer(deposit_invoice).data,
            'created_solde_invoice': solde_invoice is not None,
            'solde_invoice_number': solde_invoice.invoice_number if solde_invoice else None,
            'solde_invoice_id': solde_invoice.id if solde_invoice else None
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class EstimateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing estimates.
    Provides CRUD operations, PDF generation, and email sending.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['estimate_number', 'customer__name']
    filterset_fields = ['status', 'customer', 'valid_until']
    ordering_fields = ['issue_date', 'valid_until', 'total', 'created_at']
    ordering = ['-issue_date']

    def get_queryset(self):
        return Estimate.objects.filter(user=self.request.user).select_related('customer')

    def get_serializer_class(self):
        if self.action == 'list':
            return EstimateListSerializer
        return EstimateSerializer

    @check_usage_limit_method('estimate_creation')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Generate UUID for drafts (no estimate_number yet)
        if 'estimate_number' not in serializer.validated_data or not serializer.validated_data.get('estimate_number'):
            import uuid

            # Generate UUID for draft
            draft_uuid = uuid.uuid4()
            serializer.validated_data['draft_uuid'] = draft_uuid
            serializer.validated_data['estimate_number'] = None

            print(f"DEBUG: Creating draft with UUID: {draft_uuid}")

        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        Finalize a draft estimate by assigning it a final estimate number.
        Only drafts (with UUID, no estimate_number) can be finalized.
        """
        from django.utils import timezone
        from django.db import transaction
        import re

        estimate = self.get_object()

        # Validate it's a draft
        if estimate.estimate_number:
            return Response(
                {'error': 'This estimate has already been finalized'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not estimate.draft_uuid:
            return Response(
                {'error': 'Invalid draft state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate required fields
        if not estimate.customer:
            return Response(
                {'error': 'Customer is required to finalize estimate'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate final estimate number
        current_year = timezone.now().year

        with transaction.atomic():
            # Get all finalized estimates for current year
            estimates = Estimate.objects.filter(
                user=request.user,
                estimate_number__isnull=False,
                estimate_number__startswith=f'DEVIS-{current_year}-'
            ).values_list('estimate_number', flat=True)

            # Extract all sequence numbers and find the max
            max_sequence = 0
            for est_num in estimates:
                match = re.search(r'DEVIS-(\d{4})-(\d+)', est_num)
                if match:
                    seq = int(match.group(2))
                    if seq > max_sequence:
                        max_sequence = seq

            sequence = max_sequence + 1
            estimate_number = f'DEVIS-{current_year}-{sequence:04d}'

            print(f"DEBUG: Finalizing draft {estimate.draft_uuid} with number {estimate_number}")

            # Update estimate
            estimate.estimate_number = estimate_number
            estimate.draft_uuid = None  # Clear UUID once finalized
            estimate.save()

        serializer = self.get_serializer(estimate)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for estimate"""
        estimate = self.get_object()
        # This will trigger a Celery task to generate PDF
        from .tasks import generate_estimate_pdf
        generate_estimate_pdf.delay(estimate.id)
        
        return Response({
            'message': 'PDF generation initiated',
            'estimate_id': estimate.id
        })
    
    @action(detail=True, methods=['post'])
    @require_feature('email_sending')
    def send_email(self, request, pk=None):
        """Send estimate via email (requires CORE tier)"""
        estimate = self.get_object()
        # This will trigger a Celery task to send email
        from .tasks import send_estimate_email
        send_estimate_email.delay(estimate.id)
        
        return Response({
            'message': 'Email sent',
            'estimate_id': estimate.id,
            'recipient': estimate.customer.email
        })
    
    @action(detail=True, methods=['patch'])
    def mark_accepted(self, request, pk=None):
        """Mark estimate as accepted"""
        estimate = self.get_object()
        estimate.status = 'accepted'
        estimate.save()
        
        serializer = self.get_serializer(estimate)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired estimates"""
        from django.utils import timezone
        today = timezone.now().date()
        estimates = self.get_queryset().filter(
            valid_until__lt=today,
            status__in=['sent', 'expired']
        )
        serializer = self.get_serializer(estimates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def next_number(self, request):
        """
        Generate next estimate number in format DEVIS-YYYY-NNNN.

        Returns:
        {
          "estimate_number": "DEVIS-2025-0042",
          "year": 2025,
          "sequence": 42
        }
        """
        from django.utils import timezone
        import re

        current_year = timezone.now().year

        # Get latest estimate for current year
        latest_estimate = self.get_queryset().filter(
            estimate_number__startswith=f'DEVIS-{current_year}-'
        ).order_by('-estimate_number').first()

        if latest_estimate:
            # Extract sequence number from latest estimate
            match = re.search(r'DEVIS-(\d{4})-(\d+)', latest_estimate.estimate_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        estimate_number = f'DEVIS-{current_year}-{sequence:04d}'

        return Response({
            'estimate_number': estimate_number,
            'year': current_year,
            'sequence': sequence
        })

    @action(detail=False, methods=['get'])
    def historical_context(self, request):
        """
        Get lightweight historical context for AI suggestions (cached on frontend).

        Returns user's common tasks, rates, and patterns for personalized AI suggestions.
        Optimized to return only essential data quickly.
        """
        from projects.models import Task
        from django.db.models import Avg, Count

        # Get user's most common tasks with their average rates and hours
        common_tasks = Task.objects.filter(
            project__user=request.user,
            actual_hours__isnull=False,
            actual_hours__gt=0
        ).values('name').annotate(
            count=Count('id'),
            avg_hours=Avg('actual_hours'),
            avg_rate=Avg('hourly_rate')
        ).order_by('-count')[:15]  # Top 15 most common tasks

        # Get user's recent line items from estimates/invoices
        recent_estimates = self.get_queryset().order_by('-created_at')[:10]
        recent_items = []
        for estimate in recent_estimates:
            for item in estimate.items[:5]:  # Max 5 items per estimate
                if 'description' in item and item.get('quantity'):
                    recent_items.append({
                        'description': item.get('description', item.get('name', '')),
                        'quantity': float(item.get('quantity', 0)),
                        'rate': float(item.get('rate', 0)),
                        'unit': item.get('unit', 'hours')
                    })

        # Get user's default rates from profile
        try:
            profile = request.user.profile
            default_rate = float(profile.tjm_default / (profile.tjm_hours_per_day or 7))
        except:
            default_rate = 80.0

        return Response({
            'common_tasks': [
                {
                    'name': task['name'],
                    'frequency': task['count'],
                    'avg_hours': float(task['avg_hours'] or 0),
                    'avg_rate': float(task['avg_rate'] or default_rate)
                }
                for task in common_tasks
            ],
            'recent_items': recent_items[:20],  # Max 20 recent items
            'default_rate': default_rate,
            'total_tasks_analyzed': len(common_tasks)
        })

    @action(detail=False, methods=['post'])
    @require_feature('ai_suggestions')
    def suggest_items(self, request):
        """
        Get AI suggestions for line items based on description (requires ELITE tier).

        POST data:
        {
          "item_description": "React dashboard development",
          "project_context": "E-commerce platform",  // optional
          "customer_id": 123  // optional
        }

        Returns pricing suggestions with similar historical tasks.
        """
        from document_processing.services.estimate_assistant import EstimateAssistant

        item_description = request.data.get('item_description')
        if not item_description:
            return Response(
                {'error': 'item_description is required'},
                status=status.HTTP_BAD_REQUEST
            )

        project_context = request.data.get('project_context', '')
        historical_context = request.data.get('historical_context')  # Pre-fetched from frontend

        # Add customer context if provided
        customer_id = request.data.get('customer_id')
        if customer_id:
            try:
                from customers.models import Customer
                customer = Customer.objects.get(id=customer_id, user=request.user)
                project_context += f"\nCustomer: {customer.name}"
            except Customer.DoesNotExist:
                pass

        # Use historical context if provided (from cache), otherwise fetch it
        if not historical_context:
            assistant = EstimateAssistant(request.user)
            result = assistant.suggest_pricing_for_tasks(
                tasks=[{
                    'name': item_description,
                    'description': item_description
                }],
                project_context=project_context if project_context else None,
                quick_mode=True  # Enable fast mode for real-time suggestions
            )
        else:
            # Use cached historical context for personalized, fast suggestions
            assistant = EstimateAssistant(request.user)
            result = assistant.suggest_pricing_with_context(
                task_description=item_description,
                historical_context=historical_context,
                project_context=project_context
            )

        if result['success']:
            suggestions = result['suggestions']
            # Extract first task suggestion
            if suggestions.get('tasks') and len(suggestions['tasks']) > 0:
                task_suggestion = suggestions['tasks'][0]
                return Response({
                    'suggested_hours': task_suggestion.get('suggested_hours', 0),
                    'suggested_rate': task_suggestion.get('suggested_hourly_rate', 0),
                    'suggested_amount': task_suggestion.get('suggested_amount', 0),
                    'confidence': task_suggestion.get('confidence', 'medium'),
                    'reasoning': task_suggestion.get('reasoning', ''),
                    'similar_historical_tasks': task_suggestion.get('similar_historical_tasks', []),
                    'full_context': suggestions
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'No suggestions generated'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    @require_feature('ai_generation')
    def ai_generate(self, request):
        """
        Generate estimate using AI from natural language description (requires ELITE tier).

        POST data:
        {
          "prompt": "Build a React dashboard with authentication",  // or project_description
          "customer": 123,  // optional customer ID for better context
          "project": 456,   // optional project ID for better context
          "additional_context": "Optional additional requirements"
        }
        """
        from document_processing.services.estimate_assistant import EstimateAssistant

        # Accept both 'prompt' (from frontend) and 'project_description' for compatibility
        project_description = request.data.get('prompt') or request.data.get('project_description')

        if not project_description:
            return Response(
                {'error': 'prompt or project_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get customer name if customer ID provided
        customer_name = None
        customer_id = request.data.get('customer')
        if customer_id:
            try:
                from customers.models import Customer
                customer = Customer.objects.get(id=customer_id, user=request.user)
                customer_name = customer.name
            except Customer.DoesNotExist:
                pass

        # Get project context if project ID provided
        additional_context = request.data.get('additional_context', '')
        project_id = request.data.get('project')
        if project_id:
            try:
                from projects.models import Project
                project = Project.objects.get(id=project_id, user=request.user)
                additional_context += f"\nProject: {project.name}"
                if project.description:
                    additional_context += f"\n{project.description}"
            except Project.DoesNotExist:
                pass

        assistant = EstimateAssistant(request.user)
        result = assistant.generate_estimate_from_prompt(
            project_description=project_description,
            customer_name=customer_name,
            additional_context=additional_context if additional_context else None
        )

        if result['success']:
            return Response(result['estimate'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def apply_security_margin(self, request, pk=None):
        """
        Apply or update security margin on an estimate.

        POST data:
        {
          "security_margin_percentage": 15
        }
        """
        estimate = self.get_object()
        margin_pct = request.data.get('security_margin_percentage')

        if margin_pct is None:
            return Response(
                {'error': 'security_margin_percentage is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            margin_pct = float(margin_pct)
            if margin_pct < 0 or margin_pct > 50:
                return Response(
                    {'error': 'security_margin_percentage must be between 0 and 50'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            estimate.security_margin_percentage = margin_pct
            estimate.save()  # Will auto-calculate margin amount and totals

            serializer = self.get_serializer(estimate)
            return Response(serializer.data)

        except ValueError:
            return Response(
                {'error': 'Invalid security_margin_percentage value'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    @require_feature('ai_suggestions')
    def suggest_margin(self, request):
        """
        Get AI suggestion for appropriate security margin (standalone - no estimate ID required, requires ELITE tier).

        POST data:
        {
          "project_description": "Project details...",
          "items": [{...}],  // optional
          "customer_type": "new" or "repeat"  // optional
        }
        """
        from document_processing.services.estimate_assistant import EstimateAssistant

        project_description = request.data.get('project_description')
        if not project_description:
            return Response(
                {'error': 'project_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        customer_type = request.data.get('customer_type', 'new')
        items = request.data.get('items', [])

        assistant = EstimateAssistant(request.user)
        result = assistant.suggest_security_margin(
            project_description=project_description,
            tasks=items,
            customer_type=customer_type
        )

        if result['success']:
            return Response(result['suggestion'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    @require_feature('ai_suggestions')
    def suggest_margin_for_estimate(self, request, pk=None):
        """
        Get AI suggestion for appropriate security margin for an existing estimate (requires ELITE tier).

        POST data:
        {
          "customer_type": "new" or "repeat"  // optional
        }
        """
        from document_processing.services.estimate_assistant import EstimateAssistant

        estimate = self.get_object()
        customer_type = request.data.get('customer_type', 'new')

        # Build project description from estimate
        project_description = f"{estimate.project.name if estimate.project else 'Project'}"
        if estimate.notes:
            project_description += f"\n{estimate.notes}"

        assistant = EstimateAssistant(request.user)
        result = assistant.suggest_security_margin(
            project_description=project_description,
            tasks=estimate.items,
            customer_type=customer_type
        )

        if result['success']:
            return Response(result['suggestion'], status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def convert_to_tjm(self, request, pk=None):
        """
        Convert estimate from hourly to TJM-based pricing.

        POST data:
        {
          "tjm_rate": 500  // optional, uses user's default if not provided
        }
        """
        from document_processing.services.estimate_assistant import EstimateAssistant

        estimate = self.get_object()
        tjm_rate = request.data.get('tjm_rate')

        assistant = EstimateAssistant(request.user)
        result = assistant.convert_to_tjm_pricing(
            items=estimate.items,
            tjm_rate=float(tjm_rate) if tjm_rate else None
        )

        if result['success']:
            # Update estimate with converted items
            estimate.items = result['converted_items']
            estimate.tjm_used = result['tjm_rate']
            estimate.total_days = result['total_days']
            estimate.subtotal_before_margin = result['subtotal_before_margin']
            estimate.save()

            serializer = self.get_serializer(estimate)
            return Response({
                'estimate': serializer.data,
                'conversion_info': {
                    'tjm_rate': result['tjm_rate'],
                    'total_days': result['total_days'],
                    'conversion_rate': result['conversion_rate']
                }
            })
        else:
            return Response(
                {'error': 'Conversion failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a duplicate of an existing estimate.

        Creates a new draft estimate with:
        - Same customer, project, items, pricing
        - New auto-generated estimate number
        - Status set to 'draft'
        - No PDF file
        - No signature data
        - New creation date
        """
        from django.utils import timezone
        import re

        original = self.get_object()

        # Generate new estimate number
        current_year = timezone.now().year

        # Get latest estimate for current year
        latest_estimate = self.get_queryset().filter(
            estimate_number__startswith=f'DEVIS-{current_year}-'
        ).order_by('-estimate_number').first()

        if latest_estimate:
            # Extract sequence number from latest estimate
            match = re.search(r'DEVIS-(\d{4})-(\d+)', latest_estimate.estimate_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        new_estimate_number = f'DEVIS-{current_year}-{sequence:04d}'

        # Create duplicate
        duplicate = Estimate.objects.create(
            user=request.user,
            customer=original.customer,
            project=original.project,
            estimate_number=new_estimate_number,
            issue_date=timezone.now().date(),
            valid_until=original.valid_until,
            status='draft',
            items=original.items,  # Copy the JSON field
            subtotal=original.subtotal,
            tax_rate=original.tax_rate,
            tax_amount=original.tax_amount,
            total=original.total,
            notes=original.notes,
            terms=original.terms,
            security_margin_percentage=original.security_margin_percentage,
            security_margin_amount=original.security_margin_amount,
            subtotal_before_margin=original.subtotal_before_margin,
            tjm_used=original.tjm_used,
            total_days=original.total_days,
            # Signature fields are NOT copied - new estimate has no signature
            signature_status='none',
            signature_requested_at=None,
            signature_signed_at=None,
            # PDF is NOT copied - must be regenerated
            pdf_file=None
        )

        serializer = self.get_serializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download_signed_pdf(self, request, pk=None):
        """
        Download the signed estimate PDF with signature proof.

        Returns the original PDF with signature metadata appended.
        Only available for signed estimates.
        """
        estimate = self.get_object()

        if estimate.signature_status != 'signed':
            return Response(
                {'error': 'This estimate has not been signed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not estimate.pdf_file:
            return Response(
                {'error': 'PDF file not found. Please generate the PDF first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get signature request details
        try:
            sig_request = SignatureRequest.objects.get(estimate=estimate, status='signed')

            # For now, return the original PDF
            # TODO: In the future, use pyHanko to add digital signature to PDF
            from django.http import FileResponse
            import os

            pdf_path = estimate.pdf_file.path
            response = FileResponse(
                open(pdf_path, 'rb'),
                content_type='application/pdf'
            )
            filename = f"{estimate.estimate_number}_signed.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'

            # Add signature metadata as headers for tracking
            response['X-Signature-Date'] = sig_request.signed_at.isoformat() if sig_request.signed_at else ''
            response['X-Signer-Name'] = sig_request.signer_name or ''
            response['X-Signer-Email'] = sig_request.signer_email or ''

            return response

        except SignatureRequest.DoesNotExist:
            return Response(
                {'error': 'Signature request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    @require_feature('signature_request')
    def request_signature(self, request, pk=None):
        """
        Create a signature request for this estimate (requires CORE tier).

        POST data:
        {
          "signer_name": "John Doe",
          "signer_email": "john@example.com",
          "signer_company": "Optional company name",
          "expires_in_days": 30  // optional, defaults to settings
        }
        """
        from django.utils import timezone
        from datetime import timedelta
        from .models import SignatureRequest
        from .serializers import SignatureRequestSerializer
        from django.conf import settings

        estimate = self.get_object()

        # Validate estimate can be signed
        if estimate.signature_status == 'signed':
            return Response(
                {'error': 'This estimate has already been signed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create signature request
        expires_in_days = request.data.get('expires_in_days', settings.SIGNATURE_LINK_EXPIRY_DAYS)

        signature_request = SignatureRequest.objects.create(
            estimate=estimate,
            signer_name=request.data.get('signer_name'),
            signer_email=request.data.get('signer_email'),
            signer_company=request.data.get('signer_company', ''),
            expires_at=timezone.now() + timedelta(days=expires_in_days)
        )

        # Update estimate status
        estimate.signature_status = 'requested'
        estimate.signature_requested_at = timezone.now()
        estimate.save()

        # Send email with signature link
        from .tasks import send_signature_request_email
        send_signature_request_email.delay(signature_request.id)

        serializer = SignatureRequestSerializer(signature_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PublicSignatureView(viewsets.ViewSet):
    """
    Public viewset for signature requests (no authentication required).
    Used by customers to view and sign estimates.
    """
    permission_classes = []  # No authentication required

    @action(detail=False, methods=['get'], url_path='(?P<token>[^/.]+)')
    def retrieve_by_token(self, request, token=None):
        """
        Get signature request by token (public access).

        GET /api/invoices/sign/{token}/
        """
        try:
            signature_request = SignatureRequest.objects.get(token=token)
        except SignatureRequest.DoesNotExist:
            return Response(
                {'error': 'Signature request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if expired
        if signature_request.is_expired and signature_request.status == 'pending':
            signature_request.status = 'expired'
            signature_request.save()

        # Mark as viewed (track analytics)
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        signature_request.mark_viewed(ip_address=ip_address, user_agent=user_agent)

        serializer = PublicSignatureRequestSerializer(signature_request)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)/sign')
    def sign(self, request, token=None):
        """
        Submit signature for an estimate (public access).

        POST /api/invoices/sign/{token}/sign/

        POST data:
        {
          "signature_method": "draw|upload|type",
          "signature_data": {
            "typed_name": "John Doe",  // if method=type
            "signature_image": "base64..."  // if method=draw/upload
          }
        }
        """
        try:
            signature_request = SignatureRequest.objects.get(token=token)
        except SignatureRequest.DoesNotExist:
            return Response(
                {'error': 'Signature request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate status
        if signature_request.status != 'pending':
            return Response(
                {'error': f'Cannot sign: status is {signature_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if signature_request.is_expired:
            signature_request.status = 'expired'
            signature_request.save()
            return Response(
                {'error': 'Signature request has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get signature data
        signature_method = request.data.get('signature_method')
        signature_data = request.data.get('signature_data', {})

        if not signature_method:
            return Response(
                {'error': 'signature_method is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get audit info
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Mark as signed
        signature_request.mark_signed(
            signature_method=signature_method,
            signature_data=signature_data,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # TODO: Trigger PDF signature with pyHanko
        # from .tasks import apply_signature_to_pdf
        # apply_signature_to_pdf.delay(signature_request.id)

        return Response({
            'message': 'Estimate signed successfully',
            'signature_request_id': signature_request.id,
            'estimate_number': signature_request.estimate.estimate_number
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)/decline')
    def decline(self, request, token=None):
        """
        Decline an estimate (public access).

        POST /api/invoices/sign/{token}/decline/

        POST data:
        {
          "reason": "Optional decline reason"
        }
        """
        try:
            signature_request = SignatureRequest.objects.get(token=token)
        except SignatureRequest.DoesNotExist:
            return Response(
                {'error': 'Signature request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate status
        if signature_request.status != 'pending':
            return Response(
                {'error': f'Cannot decline: status is {signature_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        signature_request.mark_declined(reason=reason)

        return Response({
            'message': 'Estimate declined',
            'estimate_number': signature_request.estimate.estimate_number
        }, status=status.HTTP_200_OK)


# Add convert_to_invoice method to EstimateViewSet
class EstimateViewSetExtension:
    """Extension methods for EstimateViewSet"""

    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """
        Convert an estimate to an invoice.

        POST data (optional):
        {
          "due_days": 30  // Number of days until due date (default: 30)
        }

        Returns the created invoice.
        """
        from django.utils import timezone
        from datetime import timedelta
        import re

        estimate = self.get_object()

        # Validate that we can convert this estimate
        if not estimate.customer:
            return Response(
                {'error': 'Cannot convert estimate to invoice: estimate must have a customer assigned'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if estimate.status == 'declined':
            return Response(
                {'error': 'Cannot convert a declined estimate to invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if estimate.status == 'converted':
            return Response(
                {'error': 'This estimate has already been converted to an invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get due date parameters
        due_days = request.data.get('due_days', 30)

        # Generate invoice number
        current_year = timezone.now().year

        # Get latest invoice for current year
        latest_invoice = Invoice.objects.filter(
            user=request.user,
            invoice_number__startswith=f'INV-{current_year}-'
        ).order_by('-invoice_number').first()

        if latest_invoice:
            # Extract sequence number from latest invoice
            match = re.search(r'INV-(\d{4})-(\d+)', latest_invoice.invoice_number)
            if match:
                sequence = int(match.group(2)) + 1
            else:
                sequence = 1
        else:
            sequence = 1

        invoice_number = f'INV-{current_year}-{sequence:04d}'

        # Create invoice from estimate
        invoice = Invoice.objects.create(
            user=request.user,
            customer=estimate.customer,
            project=estimate.project,
            invoice_number=invoice_number,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=due_days),
            status='draft',
            items=estimate.items,  # Copy items from estimate
            subtotal=estimate.subtotal,
            tax_rate=estimate.tax_rate,
            tax_amount=estimate.tax_amount,
            total=estimate.total,
            currency=estimate.currency,
            notes=estimate.notes,
            source_estimate=estimate
        )

        # Update estimate status
        estimate.status = 'converted'
        estimate.save()

        # Serialize and return the invoice
        from .serializers import InvoiceSerializer
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Inject the convert_to_invoice method into EstimateViewSet
EstimateViewSet.convert_to_invoice = EstimateViewSetExtension.convert_to_invoice
