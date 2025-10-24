"""Test user isolation across all models and API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status

from customers.models import Customer
from leads.models import Lead
from projects.models import Project
from invoicing.models import Invoice, Estimate
from tests.factories import (
    CustomerFactory, LeadFactory, ProjectFactory, TaskFactory,
    InvoiceFactory, EstimateFactory, BankAccountFactory,
    CRAFactory, ImportedDocumentFactory
)


@pytest.mark.permissions
class TestCustomerUserIsolation:
    """Test that users can only access their own customers."""

    def test_list_only_own_customers(self, authenticated_client, user, user2):
        """Test that users only see their own customers in list."""
        my_customers = CustomerFactory.create_batch(3, user=user)
        other_customers = CustomerFactory.create_batch(2, user=user2)

        url = reverse('customer-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [c['id'] for c in response.data['results']]

        # Should include my customers
        for customer in my_customers:
            assert customer.id in returned_ids

        # Should NOT include other user's customers
        for customer in other_customers:
            assert customer.id not in returned_ids

    def test_cannot_retrieve_other_user_customer(self, authenticated_client, user, user2):
        """Test that users cannot retrieve another user's customer."""
        other_customer = CustomerFactory(user=user2)

        url = reverse('customer-detail', kwargs={'pk': other_customer.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_user_customer(self, authenticated_client, user, user2):
        """Test that users cannot update another user's customer."""
        other_customer = CustomerFactory(user=user2, name='Original Name')

        url = reverse('customer-detail', kwargs={'pk': other_customer.id})
        response = authenticated_client.patch(
            url,
            {'name': 'Hacked Name'},
            format='json'
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Verify customer was not modified
        other_customer.refresh_from_db()
        assert other_customer.name == 'Original Name'

    def test_cannot_delete_other_user_customer(self, authenticated_client, user, user2):
        """Test that users cannot delete another user's customer."""
        other_customer = CustomerFactory(user=user2)

        url = reverse('customer-detail', kwargs={'pk': other_customer.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Verify customer still exists
        assert Customer.objects.filter(id=other_customer.id).exists()


@pytest.mark.permissions
class TestLeadUserIsolation:
    """Test that users can only access their own leads."""

    def test_list_only_own_leads(self, authenticated_client, user, user2):
        """Test leads are filtered by user."""
        my_leads = LeadFactory.create_batch(2, user=user)
        other_leads = LeadFactory.create_batch(3, user=user2)

        url = reverse('lead-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [lead['id'] for lead in response.data['results']]

        for lead in my_leads:
            assert lead.id in returned_ids

        for lead in other_leads:
            assert lead.id not in returned_ids

    def test_cannot_access_other_user_lead(self, authenticated_client, user2):
        """Test cannot access another user's lead."""
        other_lead = LeadFactory(user=user2)

        url = reverse('lead-detail', kwargs={'pk': other_lead.id})
        # authenticated_client is for user (not user2)
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.permissions
class TestProjectUserIsolation:
    """Test that users can only access their own projects."""

    def test_list_only_own_projects(self, authenticated_client, user, user2):
        """Test projects are filtered by user."""
        my_customer = CustomerFactory(user=user)
        other_customer = CustomerFactory(user=user2)

        my_projects = ProjectFactory.create_batch(2, user=user, customer=my_customer)
        other_projects = ProjectFactory.create_batch(2, user=user2, customer=other_customer)

        url = reverse('project-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [p['id'] for p in response.data['results']]

        for project in my_projects:
            assert project.id in returned_ids

        for project in other_projects:
            assert project.id not in returned_ids

    def test_cannot_access_other_user_project(self, authenticated_client, user2):
        """Test cannot access another user's project."""
        other_customer = CustomerFactory(user=user2)
        other_project = ProjectFactory(user=user2, customer=other_customer)

        url = reverse('project-detail', kwargs={'pk': other_project.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_create_task_on_other_user_project(self, authenticated_client, user, user2):
        """Test cannot create tasks on another user's project."""
        other_customer = CustomerFactory(user=user2)
        other_project = ProjectFactory(user=user2, customer=other_customer)

        url = reverse('task-list')
        task_data = {
            'project': other_project.id,
            'name': 'Malicious Task',
            'estimated_hours': 10,
            'hourly_rate': 100
        }

        response = authenticated_client.post(url, task_data, format='json')

        # Should either be 404 or 400 (validation error on project)
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]

    def test_cannot_access_other_user_tasks(self, authenticated_client, user, user2):
        """Test cannot access tasks from another user's project."""
        my_customer = CustomerFactory(user=user)
        my_project = ProjectFactory(user=user, customer=my_customer)
        my_task = TaskFactory(project=my_project)

        other_customer = CustomerFactory(user=user2)
        other_project = ProjectFactory(user=user2, customer=other_customer)
        other_task = TaskFactory(project=other_project)

        # List tasks - should only see my tasks
        url = reverse('task-list')
        response = authenticated_client.get(url)

        returned_ids = [t['id'] for t in response.data['results']]
        assert my_task.id in returned_ids
        assert other_task.id not in returned_ids


@pytest.mark.permissions
class TestInvoiceUserIsolation:
    """Test that users can only access their own invoices."""

    def test_list_only_own_invoices(self, authenticated_client, user, user2):
        """Test invoices are filtered by user."""
        my_invoices = InvoiceFactory.create_batch(3, user=user)
        other_invoices = InvoiceFactory.create_batch(2, user=user2)

        url = reverse('invoice-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [i['id'] for i in response.data['results']]

        for invoice in my_invoices:
            assert invoice.id in returned_ids

        for invoice in other_invoices:
            assert invoice.id not in returned_ids

    def test_cannot_generate_pdf_for_other_user_invoice(self, authenticated_client, user2):
        """Test cannot generate PDF for another user's invoice."""
        other_invoice = InvoiceFactory(user=user2)

        url = reverse('invoice-generate-pdf', kwargs={'pk': other_invoice.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_mark_other_user_invoice_as_paid(self, authenticated_client, user2):
        """Test cannot mark another user's invoice as paid."""
        other_invoice = InvoiceFactory(user=user2, status='sent')

        url = reverse('invoice-mark-paid', kwargs={'pk': other_invoice.id})
        payment_data = {
            'paid_amount': '1000.00',
            'payment_date': '2025-01-15'
        }

        response = authenticated_client.post(url, payment_data, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Verify invoice was not modified
        other_invoice.refresh_from_db()
        assert other_invoice.status == 'sent'


@pytest.mark.permissions
class TestEstimateUserIsolation:
    """Test that users can only access their own estimates."""

    def test_list_only_own_estimates(self, authenticated_client, user, user2):
        """Test estimates are filtered by user."""
        my_estimates = EstimateFactory.create_batch(2, user=user)
        other_estimates = EstimateFactory.create_batch(3, user=user2)

        url = reverse('estimate-list')
        response = authenticated_client.get(url)

        returned_ids = [e['id'] for e in response.data['results']]

        for estimate in my_estimates:
            assert estimate.id in returned_ids

        for estimate in other_estimates:
            assert estimate.id not in returned_ids

    def test_cannot_convert_other_user_estimate_to_invoice(self, authenticated_client, user2):
        """Test cannot convert another user's estimate to invoice."""
        other_estimate = EstimateFactory(user=user2, status='accepted')

        url = reverse('estimate-convert-to-invoice', kwargs={'pk': other_estimate.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.permissions
class TestBankAccountUserIsolation:
    """Test that users can only access their own bank accounts."""

    def test_list_only_own_bank_accounts(self, authenticated_client, user, user2):
        """Test bank accounts are filtered by user."""
        my_accounts = BankAccountFactory.create_batch(2, user=user)
        other_accounts = BankAccountFactory.create_batch(2, user=user2)

        url = reverse('bankaccount-list')
        response = authenticated_client.get(url)

        returned_ids = [a['id'] for a in response.data['results']]

        for account in my_accounts:
            assert account.id in returned_ids

        for account in other_accounts:
            assert account.id not in returned_ids


@pytest.mark.permissions
class TestCRAUserIsolation:
    """Test that users can only access their own CRAs."""

    def test_list_only_own_cras(self, authenticated_client, user, user2):
        """Test CRAs are filtered by user."""
        my_cras = CRAFactory.create_batch(2, user=user)
        other_cras = CRAFactory.create_batch(2, user=user2)

        url = reverse('cra-list')
        response = authenticated_client.get(url)

        returned_ids = [c['id'] for c in response.data['results']]

        for cra in my_cras:
            assert cra.id in returned_ids

        for cra in other_cras:
            assert cra.id not in returned_ids


@pytest.mark.permissions
class TestDocumentProcessingUserIsolation:
    """Test that users can only access their own imported documents."""

    def test_list_only_own_documents(self, authenticated_client, user, user2):
        """Test imported documents are filtered by user."""
        my_docs = ImportedDocumentFactory.create_batch(2, user=user)
        other_docs = ImportedDocumentFactory.create_batch(2, user=user2)

        url = reverse('importeddocument-list')
        response = authenticated_client.get(url)

        returned_ids = [d['id'] for d in response.data['results']]

        for doc in my_docs:
            assert doc.id in returned_ids

        for doc in other_docs:
            assert doc.id not in returned_ids


@pytest.mark.permissions
class TestCrossModelUserIsolation:
    """Test user isolation across related models."""

    def test_cannot_link_invoice_to_other_user_customer(self, authenticated_client, user, user2):
        """Test cannot create invoice with another user's customer."""
        my_customer = CustomerFactory(user=user)
        other_customer = CustomerFactory(user=user2)

        url = reverse('invoice-list')
        invoice_data = {
            'customer': other_customer.id,  # Attempting to use other user's customer
            'invoice_number': 'INV-HACK-001',
            'issue_date': '2025-01-15',
            'due_date': '2025-02-15',
            'status': 'draft',
            'items': [],
            'subtotal': '0.00',
            'tax_rate': '20.00',
            'total': '0.00'
        }

        response = authenticated_client.post(url, invoice_data, format='json')

        # Should fail validation
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_link_project_to_other_user_customer(self, authenticated_client, user, user2):
        """Test cannot create project with another user's customer."""
        other_customer = CustomerFactory(user=user2)

        url = reverse('project-list')
        project_data = {
            'customer': other_customer.id,
            'name': 'Malicious Project',
            'status': 'active'
        }

        response = authenticated_client.post(url, project_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
