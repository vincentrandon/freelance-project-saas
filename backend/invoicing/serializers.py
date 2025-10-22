from rest_framework import serializers
from .models import Invoice, Estimate, SignatureRequest
from customers.models import Customer
from decimal import Decimal


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    # Make invoice_number optional - will be auto-generated if not provided
    invoice_number = serializers.CharField(max_length=50, required=False)

    # Related fields
    original_invoice_number = serializers.CharField(
        source='original_invoice.invoice_number',
        read_only=True,
        allow_null=True
    )
    source_estimate_number = serializers.CharField(
        source='source_estimate.estimate_number',
        read_only=True,
        allow_null=True
    )
    parent_invoice_number = serializers.CharField(
        source='parent_invoice.invoice_number',
        read_only=True,
        allow_null=True
    )

    # Computed fields for deposit invoicing
    total_deposits_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    remaining_balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    deposit_invoices_list = serializers.SerializerMethodField()

    def get_deposit_invoices_list(self, obj):
        """Return list of deposit invoices for this parent invoice"""
        if obj.is_deposit_invoice:
            return []
        deposits = obj.deposit_invoices.all().order_by('issue_date')
        return [{
            'id': d.id,
            'invoice_number': d.invoice_number,
            'amount': float(d.total),
            'issue_date': d.issue_date.isoformat(),
            'percentage': float(d.deposit_percentage) if d.deposit_percentage else 0
        } for d in deposits]

    class Meta:
        model = Invoice
        fields = [
            'id', 'customer', 'customer_name', 'project', 'project_name',
            'invoice_number', 'issue_date', 'due_date', 'status', 'items',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency',
            'notes', 'pdf_file',
            # Credit note fields
            'is_credit_note', 'original_invoice', 'original_invoice_number', 'credit_note_reason',
            # Payment tracking
            'paid_amount', 'payment_date', 'payment_method',
            # Source estimate
            'source_estimate', 'source_estimate_number',
            # Deposit invoice fields
            'is_deposit_invoice', 'parent_invoice', 'parent_invoice_number', 'deposit_percentage',
            'total_deposits_amount', 'remaining_balance', 'deposit_invoices_list',
            # Final balance invoice field
            'is_final_balance_invoice',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'pdf_file',
            'original_invoice_number', 'source_estimate_number', 'parent_invoice_number',
            'total_deposits_amount', 'remaining_balance', 'deposit_invoices_list'
        ]


class InvoiceListSerializer(serializers.ModelSerializer):
    """Lighter serializer for invoice lists"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    days_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'customer_name', 'invoice_number', 'issue_date',
            'due_date', 'status', 'total', 'currency', 'days_overdue', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_days_overdue(self, obj):
        if obj.status == 'overdue':
            from django.utils import timezone
            return (timezone.now().date() - obj.due_date).days
        return 0


class EstimateSerializer(serializers.ModelSerializer):
    """Enhanced serializer for estimates with TJM, margins, and signatures"""
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    # Make estimate_number and customer optional for drafts
    estimate_number = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False, allow_null=True)

    # Computed fields
    display_number = serializers.ReadOnlyField()
    is_draft = serializers.ReadOnlyField()
    is_signed = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    margin_percentage_display = serializers.ReadOnlyField()

    class Meta:
        model = Estimate
        fields = [
            # Basic
            'id', 'customer', 'customer_name', 'project', 'project_name',
            'draft_uuid', 'estimate_number', 'display_number', 'is_draft',
            'issue_date', 'valid_until', 'status',

            # Line items
            'items',

            # Pricing & Margins
            'subtotal_before_margin', 'security_margin_percentage', 'security_margin_amount',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency',
            'margin_percentage_display',

            # TJM
            'tjm_used', 'total_days',

            # Versioning
            'version', 'parent_estimate',

            # AI
            'ai_generated', 'ai_metadata',

            # Signature
            'signature_status', 'signature_requested_at', 'signature_completed_at',
            'signed_pdf_file', 'signature_data', 'is_signed',

            # Files & Notes
            'pdf_file', 'notes', 'terms',

            # Metadata
            'created_at', 'updated_at', 'is_expired'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'pdf_file', 'signed_pdf_file',
            'security_margin_amount', 'subtotal', 'tax_amount', 'total',
            'is_signed', 'is_expired', 'margin_percentage_display',
            'draft_uuid', 'display_number', 'is_draft'
        ]

    def validate(self, data):
        """Validate and calculate totals"""
        # Ensure subtotal_before_margin is set
        if 'items' in data:
            # Calculate subtotal from items if not provided
            if 'subtotal_before_margin' not in data or not data['subtotal_before_margin']:
                items_total = sum(Decimal(str(item.get('amount', 0))) for item in data['items'])
                data['subtotal_before_margin'] = items_total

        return data


class EstimateListSerializer(serializers.ModelSerializer):
    """Lighter serializer for estimate lists"""
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    display_number = serializers.ReadOnlyField()
    is_draft = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_signed = serializers.ReadOnlyField()

    class Meta:
        model = Estimate
        fields = [
            'id', 'customer_name', 'estimate_number', 'display_number', 'is_draft',
            'issue_date', 'valid_until', 'status', 'signature_status', 'total', 'currency',
            'is_expired', 'is_signed', 'version', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'display_number', 'is_draft']


class SignatureRequestSerializer(serializers.ModelSerializer):
    """Serializer for signature requests"""
    estimate_number = serializers.CharField(source='estimate.estimate_number', read_only=True)
    estimate_total = serializers.DecimalField(source='estimate.total', max_digits=12, decimal_places=2, read_only=True)
    estimate_currency = serializers.CharField(source='estimate.currency', read_only=True)
    is_expired = serializers.ReadOnlyField()
    signature_url = serializers.ReadOnlyField()

    class Meta:
        model = SignatureRequest
        fields = [
            'id', 'estimate', 'estimate_number', 'estimate_total', 'estimate_currency',
            'signer_name', 'signer_email', 'signer_company',
            'token', 'signature_url', 'status', 'expires_at',
            'created_at', 'signed_at', 'viewed_at',
            'signature_method', 'signature_image', 'signature_metadata',
            'ip_address', 'decline_reason',
            'email_sent_at', 'email_opened_count',
            'is_expired'
        ]
        read_only_fields = [
            'id', 'token', 'created_at', 'signed_at', 'viewed_at',
            'signature_url', 'is_expired', 'email_sent_at', 'email_opened_count'
        ]


class SignatureRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating signature requests"""

    class Meta:
        model = SignatureRequest
        fields = [
            'estimate', 'signer_name', 'signer_email', 'signer_company', 'expires_at'
        ]

    def validate_estimate(self, value):
        """Ensure estimate can be signed"""
        if value.signature_status == 'signed':
            raise serializers.ValidationError("This estimate has already been signed.")
        if value.status == 'declined':
            raise serializers.ValidationError("Cannot request signature for a declined estimate.")
        return value


class PublicSignatureRequestSerializer(serializers.ModelSerializer):
    """Public serializer for signature page (no sensitive data)"""
    estimate = EstimateSerializer(read_only=True)
    estimate_number = serializers.CharField(source='estimate.estimate_number', read_only=True)
    estimate_total = serializers.DecimalField(source='estimate.total', max_digits=12, decimal_places=2, read_only=True)
    estimate_currency = serializers.CharField(source='estimate.currency', read_only=True)
    estimate_items = serializers.JSONField(source='estimate.items', read_only=True)
    estimate_notes = serializers.CharField(source='estimate.notes', read_only=True)
    estimate_terms = serializers.CharField(source='estimate.terms', read_only=True)
    is_expired = serializers.ReadOnlyField()

    # Company info from estimate user's profile
    company_info = serializers.SerializerMethodField()

    class Meta:
        model = SignatureRequest
        fields = [
            'estimate', 'signer_name', 'signer_email', 'signer_company',
            'status', 'expires_at', 'is_expired', 'signed_at',
            'estimate_number', 'estimate_total', 'estimate_currency',
            'estimate_items', 'estimate_notes', 'estimate_terms',
            'company_info'
        ]

    def get_company_info(self, obj):
        """Get company info from estimate owner's profile"""
        try:
            profile = obj.estimate.user.profile
            return {
                'company_name': profile.company_name,
                'address': profile.address,
                'city': profile.city,
                'postal_code': profile.postal_code,
                'country': profile.country,
                'phone': profile.phone,
                'email': profile.get_business_email(),
                'siret_siren': profile.siret_siren,
            }
        except:
            return {}
