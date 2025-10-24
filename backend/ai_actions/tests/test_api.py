from datetime import date

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ai_actions.models import AIServiceToken, generate_token_value
from customers.models import Customer
from projects.models import Project


class AIActionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", email="alice@example.com", password="pass1234")

        self.full_scope_token = self._create_token(
            scopes=[
                "context:read",
                "context:customers",
                "context:projects",
                "context:estimates",
                "context:invoices",
                "context:cras",
                "actions:read",
                "actions:customers.create",
                "actions:estimates.create",
                "actions:invoices.create",
                "actions:cra.create",
                "actions:customers.import",
            ]
        )

    # ------------------------------------------------------------------ helpers --
    def _create_token(self, scopes):
        raw = generate_token_value()
        token = AIServiceToken.objects.create(
            user=self.user,
            name="Test Token",
            scopes=scopes,
            key_prefix="placeholder",
            token_hash="placeholder",
        )
        token.set_token(raw)
        token.save(update_fields=["key_prefix", "token_hash"])
        return raw

    def _auth_headers(self, raw_token=None):
        token_value = raw_token or self.full_scope_token
        return {"HTTP_X_AI_SERVICE_TOKEN": token_value}

    # ------------------------------------------------------------------- contexts --
    def test_context_customers_returns_results(self):
        Customer.objects.create(user=self.user, name="ACME Corp")
        url = reverse("ai-context-customers")

        response = self.client.get(url, **self._auth_headers())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "ACME Corp")

    # -------------------------------------------------------------------- actions --
    def test_create_customer_action(self):
        url = reverse("ai-actions-customers")
        payload = {
            "name": "Globex",
            "email": "sales@globex.test",
            "company": "Globex",
        }

        response = self.client.post(url, payload, format="json", **self._auth_headers())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Customer.objects.filter(user=self.user, name="Globex").exists())

    def test_create_estimate_action(self):
        customer = Customer.objects.create(user=self.user, name="ACME")
        url = reverse("ai-actions-estimates")
        payload = {
            "customer_id": customer.id,
            "issue_date": date.today().isoformat(),
            "items": [
                {"description": "Design sprint", "quantity": 2, "rate": 500},
            ],
            "notes": "Generated via AI action",
        }

        response = self.client.post(url, payload, format="json", **self._auth_headers())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["customer"], customer.id)
        self.assertTrue(response.data["ai_generated"])

    def test_create_invoice_action(self):
        customer = Customer.objects.create(user=self.user, name="Wayne Enterprises")
        url = reverse("ai-actions-invoices")
        payload = {
            "customer_id": customer.id,
            "issue_date": date.today().isoformat(),
            "due_date": date.today().isoformat(),
            "items": [
                {"description": "Consulting", "quantity": 1, "rate": 750},
            ],
            "status": "draft",
        }

        response = self.client.post(url, payload, format="json", **self._auth_headers())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["customer"], customer.id)
        self.assertEqual(response.data["status"], "draft")

    def test_create_cra_action(self):
        customer = Customer.objects.create(user=self.user, name="Stark Industries")
        project = Project.objects.create(user=self.user, customer=customer, name="Arc Reactor")
        url = reverse("ai-actions-cras")
        payload = {
            "customer_id": customer.id,
            "project_id": project.id,
            "period_month": 1,
            "period_year": 2026,
            "daily_rate": "800",
            "selected_work_dates": ["2026-01-05", "2026-01-06"],
        }

        response = self.client.post(url, payload, format="json", **self._auth_headers())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["customer"]["id"], customer.id)
        self.assertEqual(response.data["status"], "draft")

    def test_import_customer_with_missing_preview_returns_error(self):
        url = reverse("ai-actions-import-customer")
        response = self.client.post(
            url,
            {"preview_id": 9999},
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("preview_id", response.data["errors"])

    # ------------------------------------------------------------ scope handling --
    def test_action_requires_matching_scope(self):
        limited_token = self._create_token(scopes=["context:read"])
        customer = Customer.objects.create(user=self.user, name="Umbrella")
        url = reverse("ai-actions-invoices")

        response = self.client.post(
            url,
            {
                "customer_id": customer.id,
                "issue_date": date.today().isoformat(),
                "due_date": date.today().isoformat(),
                "items": [{"description": "Biohazard cleanup", "quantity": 1, "rate": 1200}],
            },
            format="json",
            **self._auth_headers(raw_token=limited_token),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
