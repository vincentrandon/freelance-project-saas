from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from customers.models import Customer
from customers.serializers import CustomerSerializer
from projects.models import Project
from invoicing.models import Estimate, Invoice
from invoicing.serializers import EstimateSerializer, InvoiceSerializer
from cra.models import CRA
from cra.serializers import CRADetailSerializer
from document_processing.models import ImportPreview
from document_processing.serializers import ImportPreviewSerializer, ImportPreviewEditSerializer
from document_processing.tasks import create_entities_from_preview

from .authentication import AIServiceTokenAuthentication
from .models import AIActionLog, AIServiceToken
from .permissions import HasAIScopes
from .serializers import (
    ContextCRASerializer,
    ContextCustomerSerializer,
    ContextEstimateSerializer,
    ContextInvoiceSerializer,
    ContextProjectSerializer,
)


class AIActionLoggingMixin:
    """Shared helpers for logging AI-triggered requests."""

    def _serialize_params(self, params: Any) -> Dict[str, Any]:
        if params is None:
            return {}
        if isinstance(params, dict):
            return params
        if hasattr(params, "lists"):
            return {key: (values if len(values) > 1 else values[0]) for key, values in params.lists()}
        if hasattr(params, "items"):
            return {key: value for key, value in params.items()}
        return {}

    def _stringify_errors(self, errors: Any) -> str:
        if isinstance(errors, (list, tuple)):
            return "; ".join(self._stringify_errors(err) for err in errors)
        if isinstance(errors, dict):
            return "; ".join(f"{key}: {self._stringify_errors(value)}" for key, value in errors.items())
        return str(errors)

    def _log_action(
        self,
        request,
        action_type: str,
        request_payload: Optional[Dict[str, Any]] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        status_override: Optional[str] = None,
        error_message: str = "",
    ) -> None:
        token = request.auth if isinstance(request.auth, AIServiceToken) else None
        AIActionLog.objects.create(
            token=token,
            user=request.user if request.user.is_authenticated else None,
            action_type=action_type,
            path=request.path,
            method=request.method,
            status=status_override or ("error" if error_message else "success"),
            request_payload=request_payload or {},
            response_payload=response_payload or {},
            error_message=error_message,
        )

    def _success_response(
        self,
        request,
        action_type: str,
        request_payload: Dict[str, Any],
        response_payload: Dict[str, Any],
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        self._log_action(
            request,
            action_type,
            request_payload=request_payload,
            response_payload=response_payload,
        )
        return Response(response_payload, status=status_code)

    def _error_response(
        self,
        request,
        action_type: str,
        request_payload: Dict[str, Any],
        errors: Any,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> Response:
        error_message = self._stringify_errors(errors)
        response_payload = {"errors": errors}
        self._log_action(
            request,
            action_type,
            request_payload=request_payload,
            response_payload=response_payload,
            status_override="error",
            error_message=error_message,
        )
        return Response(response_payload, status=status_code)


class AIContextViewSet(AIActionLoggingMixin, viewsets.ViewSet):
    """
    Read-only endpoints that surface the current state of the workspace to ChatGPT.
    These endpoints do not mutate state and are protected with AI service tokens.
    """

    authentication_classes = [AIServiceTokenAuthentication]
    permission_classes = [IsAuthenticated, HasAIScopes]

    default_scope = "context:read"
    scope_map = {
        "list": ["context:read"],
        "customers": ["context:customers", "context:read"],
        "projects": ["context:projects", "context:read"],
        "estimates": ["context:estimates", "context:read"],
        "invoices": ["context:invoices", "context:read"],
        "cras": ["context:cras", "context:read"],
    }

    def get_required_scopes(self) -> Optional[list[str]]:
        return self.scope_map.get(self.action, [self.default_scope])

    # ---------------------------------------------------------------- summary -----
    def list(self, request):
        """Return aggregate counts to give the assistant a quick overview."""
        customer_count = Customer.objects.filter(user=request.user).count()
        project_count = Project.objects.filter(user=request.user).count()
        estimate_count = Estimate.objects.filter(user=request.user).count()
        invoice_count = Invoice.objects.filter(user=request.user).count()
        cra_count = CRA.objects.filter(user=request.user).count()

        payload = {
            "customers": customer_count,
            "projects": project_count,
            "estimates": estimate_count,
            "invoices": invoice_count,
            "cra": cra_count,
        }
        request_payload = self._serialize_params(request.query_params)
        return self._success_response(
            request,
            "context.summary",
            request_payload=request_payload,
            response_payload=payload,
        )

    # ---------------------------------------------------------------- customers ---
    @action(detail=False, methods=["get"])
    def customers(self, request):
        queryset = Customer.objects.filter(user=request.user)
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(company__icontains=search) | Q(email__icontains=search)
            )

        limit = self._get_limit(request)
        queryset = queryset.order_by("-created_at")[:limit]
        serializer = ContextCustomerSerializer(queryset, many=True)
        response_payload = {"results": serializer.data}
        request_payload = {"search": search, "limit": limit}
        return self._success_response(
            request,
            "context.customers",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- projects ----
    @action(detail=False, methods=["get"])
    def projects(self, request):
        queryset = Project.objects.filter(user=request.user).select_related("customer")
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")

        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(customer__name__icontains=search))
        if status_param:
            queryset = queryset.filter(status=status_param)

        limit = self._get_limit(request)
        queryset = queryset.order_by("-created_at")[:limit]
        serializer = ContextProjectSerializer(queryset, many=True)
        response_payload = {"results": serializer.data}
        request_payload = {"search": search, "status": status_param, "limit": limit}
        return self._success_response(
            request,
            "context.projects",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- estimates ---
    @action(detail=False, methods=["get"])
    def estimates(self, request):
        queryset = Estimate.objects.filter(user=request.user).select_related("customer", "project")
        status_param = request.query_params.get("status")
        customer_id = request.query_params.get("customer")

        if status_param:
            queryset = queryset.filter(status=status_param)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        limit = self._get_limit(request)
        queryset = queryset.order_by("-issue_date")[:limit]
        serializer = ContextEstimateSerializer(queryset, many=True)
        response_payload = {"results": serializer.data}
        request_payload = {"status": status_param, "customer": customer_id, "limit": limit}
        return self._success_response(
            request,
            "context.estimates",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- invoices ----
    @action(detail=False, methods=["get"])
    def invoices(self, request):
        queryset = Invoice.objects.filter(user=request.user).select_related("customer", "project")
        status_param = request.query_params.get("status")
        customer_id = request.query_params.get("customer")

        if status_param:
            queryset = queryset.filter(status=status_param)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        limit = self._get_limit(request)
        queryset = queryset.order_by("-issue_date")[:limit]
        serializer = ContextInvoiceSerializer(queryset, many=True)
        response_payload = {"results": serializer.data}
        request_payload = {"status": status_param, "customer": customer_id, "limit": limit}
        return self._success_response(
            request,
            "context.invoices",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- cras --------
    @action(detail=False, methods=["get"])
    def cras(self, request):
        queryset = CRA.objects.filter(user=request.user).select_related("customer", "project")
        status_param = request.query_params.get("status")
        customer_id = request.query_params.get("customer")
        period_year = request.query_params.get("year")

        if status_param:
            queryset = queryset.filter(status=status_param)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if period_year:
            queryset = queryset.filter(period_year=period_year)

        limit = self._get_limit(request)
        queryset = queryset.order_by("-period_year", "-period_month")[:limit]
        serializer = ContextCRASerializer(queryset, many=True)
        response_payload = {"results": serializer.data}
        request_payload = {
            "status": status_param,
            "customer": customer_id,
            "year": period_year,
            "limit": limit,
        }
        return self._success_response(
            request,
            "context.cras",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- utilities ---
    def _get_limit(self, request) -> int:
        try:
            limit = int(request.query_params.get("limit", 25))
        except ValueError:
            return 25
        return max(1, min(limit, 100))


class AIActionViewSet(AIActionLoggingMixin, viewsets.ViewSet):
    """
    Mutation endpoints that allow ChatGPT to create domain entities on behalf of the user.
    Each action performs additional guards and calculations before delegating to serializers.
    """

    authentication_classes = [AIServiceTokenAuthentication]
    permission_classes = [IsAuthenticated, HasAIScopes]

    scope_map = {
        "list": ["actions:read"],
        "create_customer": ["actions:customers.create"],
        "create_estimate": ["actions:estimates.create"],
        "create_invoice": ["actions:invoices.create"],
        "create_cra": ["actions:cra.create"],
        "import_customer": ["actions:customers.import"],
    }

    def get_required_scopes(self) -> Optional[list[str]]:
        return self.scope_map.get(self.action, ["actions:execute"])

    def list(self, request):
        """Expose the available action endpoints and required scopes."""
        response_payload = {
            "actions": [
                {"name": "create_customer", "url": "customers", "scopes": self.scope_map["create_customer"]},
                {"name": "create_estimate", "url": "estimates", "scopes": self.scope_map["create_estimate"]},
                {"name": "create_invoice", "url": "invoices", "scopes": self.scope_map["create_invoice"]},
                {"name": "create_cra", "url": "cras", "scopes": self.scope_map["create_cra"]},
                {"name": "import_customer", "url": "import-customer", "scopes": self.scope_map["import_customer"]},
            ]
        }
        request_payload = self._serialize_params(request.query_params)
        return self._success_response(
            request,
            "actions.summary",
            request_payload=request_payload,
            response_payload=response_payload,
        )

    # ---------------------------------------------------------------- customers ---
    @action(detail=False, methods=["post"], url_path="customers")
    def create_customer(self, request):
        action_type = "actions.customers.create"
        request_payload = self._serialize_params(request.data)
        serializer = CustomerSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return self._error_response(request, action_type, request_payload, serializer.errors)

        customer = serializer.save()
        response_serializer = CustomerSerializer(customer, context={"request": request})
        return self._success_response(
            request,
            action_type,
            request_payload=request_payload,
            response_payload=response_serializer.data,
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------------------------------------------------------- estimates ---
    @action(detail=False, methods=["post"], url_path="estimates")
    def create_estimate(self, request):
        action_type = "actions.estimates.create"
        request_payload = self._serialize_params(request.data)

        items_input = request_payload.get("items")
        try:
            items, subtotal_before_margin = self._normalize_line_items(items_input)
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"items": [str(exc)]})

        margin_pct = self._safe_decimal(
            request_payload.get("security_margin_percentage"),
            "security_margin_percentage",
            default=self._default_security_margin(request.user),
            allow_zero=True,
        )
        tax_rate = self._safe_decimal(
            request_payload.get("tax_rate"),
            "tax_rate",
            default=self._default_tax_rate(),
            allow_zero=True,
        )

        try:
            issue_date = self._parse_date(
                request_payload.get("issue_date"),
                "issue_date",
                default=timezone.now().date(),
            )
            valid_until = self._parse_date(
                request_payload.get("valid_until"),
                "valid_until",
                default=issue_date + timedelta(days=self._valid_days_default(request_payload.get("valid_days"))),
            )
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"date": [str(exc)]})

        estimate_payload: Dict[str, Any] = {
            "customer": request_payload.get("customer_id"),
            "project": request_payload.get("project_id"),
            "estimate_number": request_payload.get("estimate_number"),
            "issue_date": issue_date,
            "valid_until": valid_until,
            "status": request_payload.get("status", "draft"),
            "items": items,
            "subtotal_before_margin": str(subtotal_before_margin),
            "security_margin_percentage": str(margin_pct),
            "tax_rate": str(tax_rate),
            "currency": request_payload.get("currency", "EUR"),
            "notes": request_payload.get("notes", ""),
            "terms": request_payload.get("terms", ""),
            "ai_generated": True,
            "ai_metadata": self._build_ai_metadata(request_payload),
        }

        if estimate_payload.get("estimate_number"):
            estimate_payload["draft_uuid"] = None
        else:
            estimate_payload["draft_uuid"] = str(uuid.uuid4())

        if request_payload.get("tjm_used") is not None:
            try:
                estimate_payload["tjm_used"] = str(
                    self._safe_decimal(request_payload.get("tjm_used"), "tjm_used", allow_zero=False)
                )
            except ValueError as exc:
                return self._error_response(request, action_type, request_payload, {"tjm_used": [str(exc)]})

        if request_payload.get("total_days") is not None:
            try:
                estimate_payload["total_days"] = str(
                    self._safe_decimal(request_payload.get("total_days"), "total_days", allow_zero=False)
                )
            except ValueError as exc:
                return self._error_response(request, action_type, request_payload, {"total_days": [str(exc)]})

        serializer = EstimateSerializer(data=estimate_payload, context={"request": request})
        if not serializer.is_valid():
            return self._error_response(request, action_type, request_payload, serializer.errors)

        estimate = serializer.save(user=request.user)
        response_serializer = EstimateSerializer(estimate, context={"request": request})
        return self._success_response(
            request,
            action_type,
            request_payload=estimate_payload,
            response_payload=response_serializer.data,
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------------------------------------------------------- invoices ----
    @action(detail=False, methods=["post"], url_path="invoices")
    def create_invoice(self, request):
        action_type = "actions.invoices.create"
        request_payload = self._serialize_params(request.data)

        items_input = request_payload.get("items")
        try:
            items, subtotal = self._normalize_line_items(items_input)
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"items": [str(exc)]})

        tax_rate = self._safe_decimal(
            request_payload.get("tax_rate"),
            "tax_rate",
            default=self._default_tax_rate(),
            allow_zero=True,
        )
        tax_amount = self._quantize(subtotal * tax_rate / Decimal("100"))
        total = self._quantize(subtotal + tax_amount)

        try:
            issue_date = self._parse_date(
                request_payload.get("issue_date"),
                "issue_date",
                default=timezone.now().date(),
            )
            due_date = self._parse_date(
                request_payload.get("due_date"),
                "due_date",
                default=issue_date + timedelta(days=self._valid_days_default(request_payload.get("due_in_days"), default_days=30)),
            )
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"date": [str(exc)]})

        try:
            invoice_number = request_payload.get("invoice_number") or self._generate_invoice_number(request.user)
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"invoice_number": [str(exc)]})

        invoice_payload: Dict[str, Any] = {
            "customer": request_payload.get("customer_id"),
            "project": request_payload.get("project_id"),
            "source_estimate": request_payload.get("source_estimate_id"),
            "source_cra": request_payload.get("source_cra_id"),
            "invoice_number": invoice_number,
            "issue_date": issue_date,
            "due_date": due_date,
            "status": request_payload.get("status", "draft"),
            "items": items,
            "subtotal": str(subtotal),
            "tax_rate": str(tax_rate),
            "tax_amount": str(tax_amount),
            "total": str(total),
            "currency": request_payload.get("currency", "EUR"),
            "notes": request_payload.get("notes", ""),
        }

        if request_payload.get("is_deposit_invoice") is not None:
            invoice_payload["is_deposit_invoice"] = bool(request_payload.get("is_deposit_invoice"))
        if request_payload.get("deposit_percentage") is not None:
            try:
                invoice_payload["deposit_percentage"] = str(
                    self._safe_decimal(
                        request_payload.get("deposit_percentage"),
                        "deposit_percentage",
                        allow_zero=False,
                    )
                )
            except ValueError as exc:
                return self._error_response(request, action_type, request_payload, {"deposit_percentage": [str(exc)]})
        if request_payload.get("parent_invoice_id"):
            invoice_payload["parent_invoice"] = request_payload.get("parent_invoice_id")

        if request_payload.get("paid_amount") is not None:
            try:
                paid_amount = self._safe_decimal(
                    request_payload.get("paid_amount"),
                    "paid_amount",
                    allow_zero=True,
                )
            except ValueError as exc:
                return self._error_response(request, action_type, request_payload, {"paid_amount": [str(exc)]})
            if paid_amount > total:
                return self._error_response(
                    request,
                    action_type,
                    request_payload,
                    {"paid_amount": ["Paid amount cannot exceed invoice total."]},
                )
            invoice_payload["paid_amount"] = str(paid_amount)

        if request_payload.get("payment_date"):
            try:
                invoice_payload["payment_date"] = self._parse_date(
                    request_payload.get("payment_date"),
                    "payment_date",
                )
            except ValueError as exc:
                return self._error_response(request, action_type, request_payload, {"payment_date": [str(exc)]})

        if request_payload.get("payment_method"):
            invoice_payload["payment_method"] = request_payload.get("payment_method")

        serializer = InvoiceSerializer(data=invoice_payload, context={"request": request})
        if not serializer.is_valid():
            return self._error_response(request, action_type, request_payload, serializer.errors)

        invoice = serializer.save(user=request.user)
        response_serializer = InvoiceSerializer(invoice, context={"request": request})
        return self._success_response(
            request,
            action_type,
            request_payload=invoice_payload,
            response_payload=response_serializer.data,
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------------------------------------------------------- cra ----------
    @action(detail=False, methods=["post"], url_path="cras")
    def create_cra(self, request):
        action_type = "actions.cra.create"
        request_payload = self._serialize_params(request.data)

        period_month = request_payload.get("period_month")
        period_year = request_payload.get("period_year")
        if period_month is None or period_year is None:
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"period": ["Both period_month and period_year are required."]},
            )

        try:
            period_month = int(period_month)
            period_year = int(period_year)
        except (TypeError, ValueError):
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"period": ["period_month and period_year must be valid integers."]},
            )

        try:
            daily_rate = self._safe_decimal(
                request_payload.get("daily_rate"),
                "daily_rate",
                default=self._default_daily_rate(request.user),
                allow_zero=False,
            )
        except ValueError as exc:
            return self._error_response(request, action_type, request_payload, {"daily_rate": [str(exc)]})

        cra_payload: Dict[str, Any] = {
            "customer_id": request_payload.get("customer_id"),
            "project_id": request_payload.get("project_id"),
            "period_month": period_month,
            "period_year": period_year,
            "status": request_payload.get("status", "draft"),
            "daily_rate": str(daily_rate),
            "currency": request_payload.get("currency", "EUR"),
            "notes": request_payload.get("notes", ""),
            "selected_work_dates": request_payload.get("selected_work_dates", []),
            "task_ids": request_payload.get("task_ids", []),
            "tasks_data": request_payload.get("tasks_data", []),
        }

        serializer = CRADetailSerializer(data=cra_payload, context={"request": request})
        if not serializer.is_valid():
            return self._error_response(request, action_type, request_payload, serializer.errors)

        cra = serializer.save()
        response_serializer = CRADetailSerializer(cra, context={"request": request})
        return self._success_response(
            request,
            action_type,
            request_payload=cra_payload,
            response_payload=response_serializer.data,
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------------------------------------------------------- helpers ------
    def _normalize_line_items(self, items: Any) -> Tuple[list[Dict[str, Any]], Decimal]:
        if not isinstance(items, list) or not items:
            raise ValueError("At least one line item must be provided.")

        normalized: list[Dict[str, Any]] = []
        subtotal = Decimal("0")

        for index, raw in enumerate(items, start=1):
            if not isinstance(raw, dict):
                raise ValueError(f"Line item #{index} must be an object.")

            description = str(raw.get("description", "")).strip()
            if not description:
                raise ValueError(f"Line item #{index} is missing a description.")

            quantity = self._safe_decimal(raw.get("quantity", 1), f"items[{index}].quantity", allow_zero=False)
            rate_value = raw.get("rate", raw.get("unit_price"))
            amount_value = raw.get("amount", raw.get("total"))

            if amount_value is None and rate_value is None:
                raise ValueError(f"Provide either rate or amount for line item #{index}.")

            if amount_value is None:
                rate = self._safe_decimal(rate_value, f"items[{index}].rate", allow_zero=False)
                amount = quantity * rate
            else:
                amount = self._safe_decimal(amount_value, f"items[{index}].amount", allow_zero=False)
                if rate_value is None:
                    rate = amount / quantity
                else:
                    rate = self._safe_decimal(rate_value, f"items[{index}].rate", allow_zero=False)

            quantity = self._quantize(quantity, places="0.01")
            rate = self._quantize(rate)
            amount = self._quantize(amount)
            subtotal += amount

            normalized.append(
                {
                    "description": description,
                    "quantity": float(quantity),
                    "unit": raw.get("unit") or raw.get("unit_label") or "unit",
                    "rate": float(rate),
                    "amount": float(amount),
                }
            )

        subtotal = self._quantize(subtotal)
        return normalized, subtotal

    def _safe_decimal(
        self,
        value: Any,
        field: str,
        *,
        default: Optional[Decimal] = None,
        allow_zero: bool = True,
    ) -> Decimal:
        if value in (None, "", []):
            if default is not None:
                return Decimal(str(default))
            raise ValueError(f"{field} is required.")
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise ValueError(f"{field} must be a valid number.")
        if not allow_zero and decimal_value <= 0:
            raise ValueError(f"{field} must be greater than zero.")
        return decimal_value

    def _quantize(self, value: Decimal, places: str = "0.01") -> Decimal:
        if not isinstance(value, Decimal):
            value = Decimal(str(value))
        return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)

    def _parse_date(self, value: Any, field: str, default: Optional[date] = None) -> date:
        if value in (None, "", []):
            if default is not None:
                return default
            raise ValueError(f"{field} is required.")
        if isinstance(value, date):
            return value
        try:
            # Support both date strings and full ISO datetimes
            parsed = datetime.fromisoformat(str(value))
        except ValueError:
            raise ValueError(f"{field} must use ISO format (YYYY-MM-DD).")
        return parsed.date()

    def _default_security_margin(self, user) -> Decimal:
        try:
            profile = user.profile
            if profile and profile.default_security_margin is not None:
                return Decimal(str(profile.default_security_margin))
        except Exception:
            pass
        return Decimal(str(getattr(settings, "DEFAULT_SECURITY_MARGIN", 10)))

    def _default_tax_rate(self) -> Decimal:
        return Decimal(str(getattr(settings, "DEFAULT_TAX_RATE", 20)))

    def _default_daily_rate(self, user) -> Decimal:
        try:
            profile = user.profile
            if profile and profile.tjm_default:
                return Decimal(str(profile.tjm_default))
        except Exception:
            pass
        return Decimal(str(getattr(settings, "DEFAULT_TJM", 500)))

    def _valid_days_default(self, value: Any, default_days: int = 30) -> int:
        if value in (None, "", []):
            return default_days
        try:
            return max(1, int(value))
        except (TypeError, ValueError):
            return default_days

    def _generate_invoice_number(self, user) -> str:
        current_year = timezone.now().year
        prefix = f"INV-{current_year}-"

        with transaction.atomic():
            latest = (
                Invoice.objects.filter(user=user, invoice_number__startswith=prefix)
                .select_for_update()
                .order_by("-invoice_number")
                .first()
            )

            if latest:
                sequence_part = latest.invoice_number.replace(prefix, "")
                try:
                    next_sequence = int(sequence_part) + 1
                except ValueError:
                    next_sequence = 1
            else:
                next_sequence = 1

            return f"{prefix}{next_sequence:04d}"

    def _build_ai_metadata(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        metadata = payload.get("ai_metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {"raw_ai_metadata": metadata}
        metadata.setdefault("source", "openai_app")
        metadata.setdefault("generated_at", timezone.now().isoformat())
        return metadata

    # ---------------------------------------------------------------- imports ------
    @action(detail=False, methods=["post"], url_path="import-customer")
    def import_customer(self, request):
        action_type = "actions.customers.import"
        request_payload = self._serialize_params(request.data)

        preview_id = request_payload.get("preview_id")
        if not preview_id:
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"preview_id": ["preview_id is required."]},
            )

        try:
            preview = ImportPreview.objects.select_related("document").get(
                id=preview_id,
                document__user=request.user,
            )
        except ImportPreview.DoesNotExist:
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"preview_id": [f"Preview {preview_id} not found."]},
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if preview.status not in ["pending_review", "needs_clarification"]:
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"status": [f"Preview status must be pending_review or needs_clarification (current: {preview.status})."]},
            )

        edit_fields = {}
        for key in ["customer_data", "project_data", "tasks_data", "invoice_estimate_data",
                    "customer_action", "project_action", "matched_customer_id", "matched_project_id"]:
            if key in request_payload:
                edit_fields[key] = request_payload[key]

        if edit_fields:
            serializer = ImportPreviewEditSerializer(data=edit_fields, partial=True)
            if not serializer.is_valid():
                return self._error_response(request, action_type, request_payload, serializer.errors)

            validated = serializer.validated_data

            if "customer_data" in validated:
                preview.customer_data = validated["customer_data"]
            if "project_data" in validated:
                preview.project_data = validated["project_data"]
            if "tasks_data" in validated:
                preview.tasks_data = validated["tasks_data"]
            if "invoice_estimate_data" in validated:
                preview.invoice_estimate_data = validated["invoice_estimate_data"]
            if "customer_action" in validated:
                preview.customer_action = validated["customer_action"]
            if "project_action" in validated:
                preview.project_action = validated["project_action"]

            if "matched_customer_id" in validated:
                customer_id = validated["matched_customer_id"]
                if customer_id:
                    try:
                        matched_customer = Customer.objects.get(id=customer_id, user=request.user)
                    except Customer.DoesNotExist:
                        return self._error_response(
                            request,
                            action_type,
                            request_payload,
                            {"matched_customer_id": [f"Customer {customer_id} not found."]},
                        )
                    preview.matched_customer = matched_customer
                else:
                    preview.matched_customer = None

            if "matched_project_id" in validated:
                project_id = validated["matched_project_id"]
                if project_id:
                    try:
                        matched_project = Project.objects.get(id=project_id, user=request.user)
                    except Project.DoesNotExist:
                        return self._error_response(
                            request,
                            action_type,
                            request_payload,
                            {"matched_project_id": [f"Project {project_id} not found."]},
                        )
                    preview.matched_project = matched_project
                else:
                    preview.matched_project = None

        if "customer_action" in request_payload:
            preview.customer_action = request_payload["customer_action"]
        if "project_action" in request_payload:
            preview.project_action = request_payload["project_action"]

        preview.status = "approved"
        preview.reviewed_at = timezone.now()
        preview.document.status = "approved"

        try:
            preview.document.save(update_fields=["status"])
            preview.save()
            create_entities_from_preview.run(preview.id)
        except Exception as exc:
            preview.status = "pending_review"
            preview.reviewed_at = None
            preview.document.status = "parsed"
            preview.document.save(update_fields=["status"])
            preview.save(update_fields=["status", "reviewed_at"])
            return self._error_response(
                request,
                action_type,
                request_payload,
                {"detail": [f"Failed to import preview: {exc}"]},
            )

        preview.refresh_from_db()
        response_payload = ImportPreviewSerializer(preview, context={"request": request}).data
        return self._success_response(
            request,
            action_type,
            request_payload={"preview_id": preview_id},
            response_payload=response_payload,
            status_code=status.HTTP_201_CREATED,
        )
