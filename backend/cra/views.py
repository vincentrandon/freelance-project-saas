from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import timedelta

from .models import CRA, CRASignature
from .serializers import (
    CRAListSerializer, CRADetailSerializer, CRASignatureSerializer,
    CRASignatureSubmitSerializer, MonthlyStatsSerializer
)
from projects.models import Task
from subscriptions.permissions import RequireElite


class CRAViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing CRAs (Compte Rendu d'Activité) - requires ELITE tier.
    Provides CRUD operations plus custom actions for PDF generation,
    sending validation requests, and generating invoices.
    """

    permission_classes = [IsAuthenticated, RequireElite]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'customer', 'period_month', 'period_year']
    search_fields = ['customer__name', 'notes']
    ordering_fields = ['period_year', 'period_month', 'created_at', 'total_amount']
    ordering = ['-period_year', '-period_month', '-created_at']
    
    def get_queryset(self):
        """Filter CRAs by current user"""
        return CRA.objects.filter(user=self.request.user).select_related(
            'customer', 'project'
        ).prefetch_related('tasks')
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail views"""
        if self.action == 'list':
            return CRAListSerializer
        return CRADetailSerializer
    
    def perform_create(self, serializer):
        """Set user when creating CRA"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Only allow updates to draft CRAs"""
        if serializer.instance.status != 'draft':
            from rest_framework.exceptions import PermissionDenied
            from django.utils.translation import gettext as _
            raise PermissionDenied(_("Only draft CRAs can be edited."))
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only allow deletion of draft CRAs"""
        if instance.status != 'draft':
            from rest_framework.exceptions import PermissionDenied
            from django.utils.translation import gettext as _
            raise PermissionDenied(_("Only draft CRAs can be deleted."))
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def monthly_view(self, request):
        """
        Get CRAs for a specific month with statistics.
        Query params: month (1-12), year (YYYY)
        """
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response(
                {"error": "month and year parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {"error": "Invalid month or year"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get CRAs for the month
        cras = self.get_queryset().filter(
            period_month=month,
            period_year=year
        )
        
        # Calculate statistics
        stats = {
            'month': month,
            'year': year,
            'total_cras': cras.count(),
            'total_draft': cras.filter(status='draft').count(),
            'total_pending': cras.filter(status='pending_validation').count(),
            'total_validated': cras.filter(status='validated').count(),
            'total_rejected': cras.filter(status='rejected').count(),
            'total_amount': cras.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'total_days': cras.aggregate(Sum('total_days'))['total_days__sum'] or 0,
            'cras': CRAListSerializer(cras, many=True).data
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def available_tasks(self, request):
        """
        Get tasks available for inclusion in a CRA.
        Filters: customer_id, month, year
        Returns tasks that:
        - Belong to the specified customer
        - Were created/completed in the specified period
        - Are not already in another CRA
        """
        customer_id = request.query_params.get('customer_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        cra_id = request.query_params.get('cra_id')  # Exclude tasks from this CRA
        
        if not customer_id or not month or not year:
            return Response(
                {"error": "customer_id, month, and year parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {"error": "Invalid month or year"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build date range for the month
        from datetime import date
        from calendar import monthrange
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        
        # Get tasks for customer in the period
        tasks = Task.objects.filter(
            project__customer_id=customer_id,
            project__user=request.user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('project')
        
        # Exclude tasks already in other CRAs
        tasks_in_other_cras = Task.objects.filter(
            cras__isnull=False
        )
        if cra_id:
            # Allow tasks from the CRA being edited
            tasks_in_other_cras = tasks_in_other_cras.exclude(cras__id=cra_id)
        
        tasks = tasks.exclude(id__in=tasks_in_other_cras.values_list('id', flat=True))
        
        from projects.serializers import TaskSerializer
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for the CRA"""
        cra = self.get_object()
        
        try:
            from .services import generate_cra_pdf
            pdf_path = generate_cra_pdf(cra)
            
            return Response({
                'message': 'PDF generated successfully',
                'pdf_url': request.build_absolute_uri(cra.pdf_file.url)
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_for_validation(self, request, pk=None):
        """
        Send CRA for client validation via email.
        Creates a signature request and sends email with signature link.
        """
        cra = self.get_object()
        
        # Validate CRA is in draft status
        if cra.status != 'draft':
            return Response(
                {'error': 'Only draft CRAs can be sent for validation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate required data
        signer_email = request.data.get('signer_email')
        signer_name = request.data.get('signer_name')
        
        if not signer_email or not signer_name:
            return Response(
                {'error': 'signer_email and signer_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate PDF if not exists
        if not cra.pdf_file:
            try:
                from .services import generate_cra_pdf
                generate_cra_pdf(cra)
            except Exception as e:
                return Response(
                    {'error': f'Failed to generate PDF: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Create signature request
        signature_request = CRASignature.objects.create(
            cra=cra,
            signer_email=signer_email,
            signer_name=signer_name,
            signer_company=request.data.get('signer_company', ''),
            expires_at=timezone.now() + timedelta(days=30)
        )
        
        # Update CRA status
        cra.status = 'pending_validation'
        cra.submitted_at = timezone.now()
        cra.save()
        
        # Send email
        try:
            from .tasks import send_cra_validation_email
            send_cra_validation_email.delay(signature_request.id)
            signature_request.email_sent_at = timezone.now()
            signature_request.save()
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': 'CRA sent for validation',
            'signature_request': CRASignatureSerializer(signature_request).data
        })
    
    @action(detail=True, methods=['post'])
    def generate_invoice(self, request, pk=None):
        """
        Generate an invoice from a validated CRA.
        Only works for validated CRAs.
        """
        cra = self.get_object()
        
        # Validate CRA is validated
        if cra.status != 'validated':
            return Response(
                {'error': 'Only validated CRAs can generate invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if invoice already exists
        if cra.generated_invoices.exists():
            return Response(
                {'error': 'An invoice has already been generated from this CRA'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .services import create_invoice_from_cra
            invoice = create_invoice_from_cra(cra)
            
            from invoicing.serializers import InvoiceSerializer
            return Response({
                'message': 'Invoice generated successfully',
                'invoice': InvoiceSerializer(invoice).data
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to generate invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CRASignatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing CRA signature requests.
    Read-only for authenticated users (to view their signature requests).
    Public endpoints for signing are handled separately.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = CRASignatureSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'cra']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by user's CRAs"""
        return CRASignature.objects.filter(
            cra__user=self.request.user
        ).select_related('cra', 'cra__customer')


class PublicCRASignatureViewSet(viewsets.ViewSet):
    """
    Public viewset for CRA signature operations (no auth required).
    Accessed via secure token in URL.
    """
    
    permission_classes = [AllowAny]
    
    def retrieve(self, request, token=None):
        """
        Get CRA details for signing (public access via token).
        """
        signature_request = get_object_or_404(CRASignature, token=token)
        
        # Mark as viewed
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        signature_request.mark_viewed(ip_address, user_agent)
        
        # Check if expired
        if signature_request.is_expired:
            return Response(
                {'error': 'This signature request has expired'},
                status=status.HTTP_410_GONE
            )
        
        # Return CRA and signature request data
        return Response({
            'cra': CRADetailSerializer(signature_request.cra).data,
            'signature_request': CRASignatureSerializer(signature_request).data
        })
    
    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)/sign')
    def sign(self, request, token=None):
        """
        Submit signature for CRA validation (public access via token).
        """
        signature_request = get_object_or_404(CRASignature, token=token)
        
        # Check if already signed or expired
        if signature_request.status != 'pending':
            return Response(
                {'error': 'This signature request is no longer pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if signature_request.is_expired:
            signature_request.status = 'expired'
            signature_request.save()
            return Response(
                {'error': 'This signature request has expired'},
                status=status.HTTP_410_GONE
            )
        
        # Validate signature data
        serializer = CRASignatureSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as signed
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        signature_request.mark_signed(
            signature_method=serializer.validated_data['signature_method'],
            signature_data=serializer.validated_data.get('signature_data'),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Handle signature image if uploaded
        if serializer.validated_data.get('signature_image'):
            signature_request.signature_image = serializer.validated_data['signature_image']
            signature_request.save()
        
        return Response({
            'message': 'CRA signed successfully',
            'signature_request': CRASignatureSerializer(signature_request).data
        })
    
    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)/decline')
    def decline(self, request, token=None):
        """
        Decline CRA signature (public access via token).
        """
        signature_request = get_object_or_404(CRASignature, token=token)
        
        # Check if already processed
        if signature_request.status != 'pending':
            return Response(
                {'error': 'This signature request is no longer pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get decline reason
        reason = request.data.get('reason', '')
        
        # Mark as declined
        signature_request.mark_declined(reason)
        
        return Response({
            'message': 'CRA declined',
            'signature_request': CRASignatureSerializer(signature_request).data
        })
