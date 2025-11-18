from rest_framework import serializers

from customers.models import Customer
from projects.models import Project
from invoicing.models import Estimate, Invoice
from cra.models import CRA
from .models import AIServiceToken, AIActionLog


class ContextCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "company", "email", "phone", "created_at"]


class ContextProjectSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "customer",
            "customer_name",
            "status",
            "start_date",
            "end_date",
            "estimated_budget",
        ]


class ContextEstimateSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, allow_null=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)

    class Meta:
        model = Estimate
        fields = [
            "id",
            "estimate_number",
            "display_number",
            "status",
            "issue_date",
            "valid_until",
            "currency",
            "total",
            "customer",
            "customer_name",
            "project",
            "project_name",
            "is_draft",
            "is_expired",
            "signature_status",
        ]


class ContextInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "status",
            "issue_date",
            "due_date",
            "currency",
            "total",
            "customer",
            "customer_name",
            "project",
            "project_name",
            "is_credit_note",
            "is_deposit_invoice",
            "is_final_balance_invoice",
        ]


class ContextCRASerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)

    class Meta:
        model = CRA
        fields = [
            "id",
            "customer",
            "customer_name",
            "project",
            "project_name",
            "period_month",
            "period_year",
            "status",
            "total_days",
            "total_amount",
            "currency",
        ]


# Token Management Serializers


class AIServiceTokenSerializer(serializers.ModelSerializer):
    """Serializer for listing existing tokens (hides sensitive data)"""
    scopes = serializers.JSONField(read_only=True)
    last_used_display = serializers.SerializerMethodField()

    class Meta:
        model = AIServiceToken
        fields = [
            "id",
            "name",
            "key_prefix",
            "scopes",
            "created_at",
            "last_used_at",
            "last_used_display",
            "expires_at",
            "is_active",
            "allowed_origins",
        ]
        read_only_fields = ["id", "key_prefix", "created_at", "last_used_at"]

    def get_last_used_display(self, obj):
        if obj.last_used_at:
            return obj.last_used_at.isoformat()
        return None


class AIServiceTokenCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new tokens"""
    token_value = serializers.CharField(read_only=True)
    scopes = serializers.JSONField(required=False, default=list)
    # Use DateTimeField but handle date-only input in validator
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = AIServiceToken
        fields = [
            "id",
            "name",
            "scopes",
            "expires_at",
            "allowed_origins",
            "token_value",  # Only shown once on creation
        ]
        read_only_fields = ["id", "token_value"]

    def validate_scopes(self, value):
        """Validate that requested scopes are valid"""
        from django.conf import settings

        valid_scopes = set(settings.OAUTH2_PROVIDER.get('SCOPES', {}).keys())

        if not isinstance(value, list):
            raise serializers.ValidationError("Scopes must be a list")

        invalid_scopes = set(value) - valid_scopes
        if invalid_scopes:
            raise serializers.ValidationError(
                f"Invalid scopes: {', '.join(invalid_scopes)}. "
                f"Valid scopes are: {', '.join(sorted(valid_scopes))}"
            )

        return value

    def validate_expires_at(self, value):
        """Handle date-only format and convert to datetime"""
        from datetime import datetime, time, date

        # If None, return None
        if value is None:
            return None

        # If it's already a datetime, return as-is
        if isinstance(value, datetime):
            return value

        # If it's a date object, convert to datetime at end of day
        if isinstance(value, date):
            return datetime.combine(value, time(23, 59, 59))

        # If it's a string with date only (YYYY-MM-DD), convert to datetime
        if isinstance(value, str) and 'T' not in value and len(value) == 10:
            from django.utils.dateparse import parse_date
            date_obj = parse_date(value)
            if date_obj:
                return datetime.combine(date_obj, time(23, 59, 59))

        return value

    def create(self, validated_data):
        from .models import generate_token_value
        from django.contrib.auth.hashers import make_password

        # Generate token value
        token_value = generate_token_value(prefix="fta")

        # Extract prefix and hash
        key_prefix = token_value[:24]  # First 24 chars including "fta_"
        token_hash = make_password(token_value)

        # Create token (user is passed from perform_create)
        token = AIServiceToken.objects.create(
            key_prefix=key_prefix,
            token_hash=token_hash,
            **validated_data
        )

        # Attach plain token value for response (shown only once)
        token.token_value = token_value

        return token


class AIActionLogSerializer(serializers.ModelSerializer):
    """Serializer for viewing token usage logs"""
    token_name = serializers.CharField(source="token.name", read_only=True)

    class Meta:
        model = AIActionLog
        fields = [
            "id",
            "token",
            "token_name",
            "action_type",
            "path",
            "method",
            "status_code",
            "request_payload",
            "response_payload",
            "error_message",
            "created_at",
        ]
        read_only_fields = fields
