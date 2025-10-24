"""Tests for CRA Celery tasks."""

import pytest
from unittest.mock import patch
from tests.factories import CRAFactory, TaskFactory


@pytest.mark.celery
class TestCRATasks:
    def test_generate_invoice_from_cra(self, user):
        from tests.factories import CustomerFactory, ProjectFactory
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)
        cra = CRAFactory(user=user, customer=customer, project=project, status='validated')

        task1 = TaskFactory(project=project)
        task2 = TaskFactory(project=project)
        cra.tasks.add(task1, task2)

        from cra.tasks import generate_invoice_from_cra
        # result = generate_invoice_from_cra(cra.id)
        # Verify invoice created
        # Verify line items from tasks
        # Verify CRA linked to invoice

    def test_triggered_by_signature(self, user):
        cra = CRAFactory(user=user, status='validated')
        # When CRA signature is completed
        # Task should be triggered automatically

    def test_invoice_creation_details(self, user):
        cra = CRAFactory(user=user)
        # Verify invoice has correct:
        # - customer
        # - project
        # - line items (from tasks)
        # - tax calculation
        # - total amount
