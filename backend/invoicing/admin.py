from django.contrib import admin
from .models import Invoice, Estimate, SignatureRequest


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'total', 'status', 'due_date']
    list_filter = ['status', 'due_date', 'currency']
    search_fields = ['invoice_number', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ['estimate_number', 'customer', 'total', 'status', 'signature_status', 'version', 'valid_until']
    list_filter = ['status', 'signature_status', 'ai_generated', 'valid_until', 'currency']
    search_fields = ['estimate_number', 'customer__name']
    readonly_fields = ['created_at', 'updated_at', 'security_margin_amount', 'subtotal', 'tax_amount', 'total']

    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'customer', 'project', 'estimate_number', 'issue_date', 'valid_until', 'status')
        }),
        ('Pricing & Margins', {
            'fields': ('items', 'subtotal_before_margin', 'security_margin_percentage', 'security_margin_amount',
                      'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency'),
            'description': 'Security margin and pricing calculations'
        }),
        ('TJM Settings', {
            'fields': ('tjm_used', 'total_days'),
            'classes': ('collapse',),
        }),
        ('Versioning', {
            'fields': ('version', 'parent_estimate'),
            'classes': ('collapse',),
        }),
        ('AI Metadata', {
            'fields': ('ai_generated', 'ai_metadata'),
            'classes': ('collapse',),
        }),
        ('Digital Signature', {
            'fields': ('signature_status', 'signature_requested_at', 'signature_completed_at',
                      'signed_pdf_file', 'signature_data'),
            'classes': ('collapse',),
        }),
        ('Files & Notes', {
            'fields': ('pdf_file', 'notes', 'terms'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(SignatureRequest)
class SignatureRequestAdmin(admin.ModelAdmin):
    list_display = ['estimate', 'signer_name', 'signer_email', 'status', 'created_at', 'signed_at']
    list_filter = ['status', 'signature_method', 'created_at', 'signed_at']
    search_fields = ['signer_name', 'signer_email', 'estimate__estimate_number']
    readonly_fields = ['token', 'created_at', 'signed_at', 'viewed_at', 'signature_url_display']

    fieldsets = (
        ('Estimate', {
            'fields': ('estimate',)
        }),
        ('Signer Information', {
            'fields': ('signer_name', 'signer_email', 'signer_company')
        }),
        ('Access & Status', {
            'fields': ('token', 'signature_url_display', 'status', 'expires_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'viewed_at', 'signed_at', 'email_sent_at'),
            'classes': ('collapse',),
        }),
        ('Signature Data', {
            'fields': ('signature_method', 'signature_image', 'signature_metadata'),
            'classes': ('collapse',),
        }),
        ('Audit Trail', {
            'fields': ('ip_address', 'user_agent', 'email_opened_count'),
            'classes': ('collapse',),
        }),
        ('Decline', {
            'fields': ('decline_reason',),
            'classes': ('collapse',),
        }),
    )

    def signature_url_display(self, obj):
        """Display clickable signature URL"""
        if obj.token:
            url = obj.signature_url
            return f'<a href="{url}" target="_blank">{url}</a>'
        return '-'
    signature_url_display.short_description = 'Signature URL'
    signature_url_display.allow_tags = True
