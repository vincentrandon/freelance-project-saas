from django.contrib import admin
from .models import CRA, CRASignature


@admin.register(CRA)
class CRAAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'customer', 'period_month', 'period_year', 'status', 'total_days', 'total_amount', 'created_at']
    list_filter = ['status', 'period_year', 'period_month', 'created_at']
    search_fields = ['customer__name', 'notes']
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'validated_at', 'rejected_at']
    filter_horizontal = ['tasks']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('user', 'customer', 'project', 'period_month', 'period_year')
        }),
        ('Tâches et tarification', {
            'fields': ('tasks', 'daily_rate', 'total_days', 'total_amount', 'currency')
        }),
        ('Statut', {
            'fields': ('status', 'notes', 'rejection_reason')
        }),
        ('Fichiers', {
            'fields': ('pdf_file',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at', 'submitted_at', 'validated_at', 'rejected_at')
        }),
    )


@admin.register(CRASignature)
class CRASignatureAdmin(admin.ModelAdmin):
    list_display = ['id', 'cra', 'signer_name', 'signer_email', 'status', 'created_at', 'signed_at']
    list_filter = ['status', 'created_at', 'signed_at']
    search_fields = ['signer_name', 'signer_email', 'cra__customer__name']
    readonly_fields = ['token', 'created_at', 'signed_at', 'viewed_at', 'email_sent_at']
    
    fieldsets = (
        ('CRA', {
            'fields': ('cra',)
        }),
        ('Signataire', {
            'fields': ('signer_name', 'signer_email', 'signer_company')
        }),
        ('Statut', {
            'fields': ('status', 'token', 'expires_at')
        }),
        ('Signature', {
            'fields': ('signature_method', 'signature_image', 'signature_metadata', 'decline_reason')
        }),
        ('Audit', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Dates', {
            'fields': ('created_at', 'signed_at', 'viewed_at', 'email_sent_at')
        }),
    )
