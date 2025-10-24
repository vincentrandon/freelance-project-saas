from rest_framework import serializers

from customers.models import Customer
from projects.models import Project
from invoicing.models import Estimate, Invoice
from cra.models import CRA


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
