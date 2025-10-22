from django.contrib import admin
from .models import ImportedDocument, DocumentParseResult, ImportPreview


@admin.register(ImportedDocument)
class ImportedDocumentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'user', 'document_type', 'status', 'uploaded_at', 'file_size']
    list_filter = ['status', 'document_type', 'uploaded_at']
    search_fields = ['file_name', 'user__username', 'user__email']
    readonly_fields = ['uploaded_at', 'processed_at', 'processing_time_seconds']


@admin.register(DocumentParseResult)
class DocumentParseResultAdmin(admin.ModelAdmin):
    list_display = ['document', 'overall_confidence', 'detected_language', 'created_at']
    list_filter = ['detected_language', 'created_at']
    search_fields = ['document__file_name']
    readonly_fields = ['created_at', 'raw_response', 'extracted_data']


@admin.register(ImportPreview)
class ImportPreviewAdmin(admin.ModelAdmin):
    list_display = ['document', 'status', 'customer_action', 'project_action', 'created_at']
    list_filter = ['status', 'customer_action', 'project_action']
    readonly_fields = ['created_at', 'reviewed_at', 'created_customer', 'created_project', 'created_invoice', 'created_estimate']
