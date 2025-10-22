from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for User Profiles"""

    list_display = ['user', 'company_name', 'tjm_default', 'default_security_margin', 'currency', 'created_at']
    list_filter = ['currency', 'signature_enabled', 'country', 'created_at']
    search_fields = ['user__username', 'user__email', 'company_name', 'siret_siren', 'email']

    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Company Information', {
            'fields': ('company_name', 'company_logo', 'siret_siren', 'tax_id')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone', 'website', 'address', 'city', 'postal_code', 'country')
        }),
        ('Bank Details', {
            'fields': ('iban', 'bic', 'bank_name'),
            'classes': ('collapse',)
        }),
        ('Pricing Settings', {
            'fields': ('tjm_default', 'hourly_rate_default', 'tjm_hours_per_day', 'tjm_rates',
                      'default_security_margin', 'show_security_margin_on_pdf'),
            'description': 'Configure default pricing and margin settings'
        }),
        ('Payment & Tax Settings', {
            'fields': ('payment_terms_days', 'default_tax_rate', 'currency')
        }),
        ('PDF Customization', {
            'fields': ('pdf_show_logo', 'pdf_primary_color', 'pdf_footer_text'),
            'classes': ('collapse',)
        }),
        ('Digital Signature', {
            'fields': ('signature_enabled', 'signature_certificate_path'),
            'classes': ('collapse',)
        }),
        ('Terms & Conditions', {
            'fields': ('estimate_terms', 'invoice_terms'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        """Auto-calculate hourly rate when saving"""
        if obj.tjm_default and obj.tjm_hours_per_day:
            if not obj.hourly_rate_default or 'tjm_default' in form.changed_data or 'tjm_hours_per_day' in form.changed_data:
                obj.hourly_rate_default = obj.tjm_default / obj.tjm_hours_per_day
        super().save_model(request, obj, form, change)
