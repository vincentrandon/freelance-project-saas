from rest_framework import serializers
from .models import ImportedDocument, DocumentParseResult, ImportPreview
from customers.serializers import CustomerSerializer
from projects.serializers import ProjectSerializer
from invoicing.serializers import InvoiceSerializer, EstimateSerializer


class ImportedDocumentSerializer(serializers.ModelSerializer):
    """Serializer for ImportedDocument model"""

    class Meta:
        model = ImportedDocument
        fields = [
            'id', 'file', 'file_name', 'file_size', 'status', 'document_type',
            'uploaded_at', 'processed_at', 'error_message', 'processing_time_seconds'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'processed_at', 'status', 'document_type',
            'error_message', 'processing_time_seconds'
        ]


class ImportedDocumentUploadSerializer(serializers.Serializer):
    """Serializer for batch document upload"""
    files = serializers.ListField(
        child=serializers.FileField(max_length=100000000, allow_empty_file=False),
        allow_empty=False
    )


class DocumentParseResultSerializer(serializers.ModelSerializer):
    """Serializer for DocumentParseResult model"""

    class Meta:
        model = DocumentParseResult
        fields = [
            'id', 'document', 'raw_response', 'extracted_data',
            'overall_confidence', 'customer_confidence', 'project_confidence',
            'tasks_confidence', 'pricing_confidence', 'detected_language', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ImportPreviewSerializer(serializers.ModelSerializer):
    """Serializer for ImportPreview model"""

    document = ImportedDocumentSerializer(read_only=True)
    parse_result = DocumentParseResultSerializer(read_only=True)
    matched_customer = CustomerSerializer(read_only=True)
    matched_project = ProjectSerializer(read_only=True)
    created_customer = CustomerSerializer(read_only=True)
    created_project = ProjectSerializer(read_only=True)
    created_invoice = InvoiceSerializer(read_only=True)
    created_estimate = EstimateSerializer(read_only=True)

    class Meta:
        model = ImportPreview
        fields = [
            'id', 'document', 'parse_result', 'status',
            'customer_data', 'project_data', 'tasks_data', 'invoice_estimate_data',
            'matched_customer', 'customer_match_confidence', 'customer_action',
            'matched_project', 'project_match_confidence', 'project_action',
            'conflicts', 'warnings',
            'created_customer', 'created_project', 'created_invoice', 'created_estimate',
            'created_at', 'reviewed_at'
        ]
        read_only_fields = [
            'id', 'document', 'parse_result', 'created_customer', 'created_project',
            'created_invoice', 'created_estimate', 'created_at', 'reviewed_at'
        ]


class ImportPreviewEditSerializer(serializers.Serializer):
    """Serializer for editing preview data before approval"""

    customer_data = serializers.JSONField()
    project_data = serializers.JSONField()
    tasks_data = serializers.JSONField()
    invoice_estimate_data = serializers.JSONField()
    customer_action = serializers.ChoiceField(choices=['create_new', 'use_existing', 'merge'])
    project_action = serializers.ChoiceField(choices=['create_new', 'merge'])
    matched_customer_id = serializers.IntegerField(required=False, allow_null=True)
    matched_project_id = serializers.IntegerField(required=False, allow_null=True)


class ImportApprovalSerializer(serializers.Serializer):
    """Serializer for approving an import"""

    preview_id = serializers.IntegerField()
    customer_action = serializers.ChoiceField(choices=['create_new', 'use_existing', 'merge'])
    project_action = serializers.ChoiceField(choices=['create_new', 'merge'])
