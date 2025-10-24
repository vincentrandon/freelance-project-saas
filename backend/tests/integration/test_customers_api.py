"""Integration tests for Customer API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status

from customers.models import Customer, Attachment
from tests.factories import CustomerFactory, AttachmentFactory


@pytest.mark.integration
class TestCustomerViewSet:
    """Tests for CustomerViewSet API endpoints."""

    def test_list_customers(self, authenticated_client, user):
        """Test listing customers for authenticated user."""
        CustomerFactory.create_batch(3, user=user)

        url = reverse('customer-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_list_customers_user_isolation(self, authenticated_client, user, user2):
        """Test that users only see their own customers."""
        CustomerFactory.create_batch(2, user=user)
        CustomerFactory.create_batch(3, user=user2)

        url = reverse('customer-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_retrieve_customer(self, authenticated_client, user):
        """Test retrieving a single customer."""
        customer = CustomerFactory(user=user, name='ACME Corp')

        url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'ACME Corp'

    def test_create_customer(self, authenticated_client):
        """Test creating a new customer."""
        url = reverse('customer-list')
        data = {
            'name': 'New Customer',
            'email': 'new@customer.com',
            'company': 'New Corp'
        }

        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Customer'
        assert Customer.objects.filter(name='New Customer').exists()

    def test_create_customer_requires_authentication(self, api_client):
        """Test that creating a customer requires authentication."""
        url = reverse('customer-list')
        data = {'name': 'Test Customer'}

        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_customer(self, authenticated_client, user):
        """Test updating a customer."""
        customer = CustomerFactory(user=user, name='Old Name')

        url = reverse('customer-detail', kwargs={'pk': customer.pk})
        data = {'name': 'Updated Name', 'email': customer.email}

        response = authenticated_client.patch(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Name'

        customer.refresh_from_db()
        assert customer.name == 'Updated Name'

    def test_delete_customer(self, authenticated_client, user):
        """Test deleting a customer."""
        customer = CustomerFactory(user=user)

        url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Customer.objects.filter(pk=customer.pk).exists()

    def test_cannot_access_other_user_customer(self, authenticated_client, user, user2):
        """Test that users cannot access other users' customers."""
        customer = CustomerFactory(user=user2)

        url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_filter_customers_by_name(self, authenticated_client, user):
        """Test filtering customers by name."""
        CustomerFactory(user=user, name='ACME Corp')
        CustomerFactory(user=user, name='Globex Inc')

        url = reverse('customer-list')
        response = authenticated_client.get(url, {'search': 'ACME'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'ACME Corp'

    def test_filter_customers_by_email(self, authenticated_client, user):
        """Test filtering customers by email."""
        CustomerFactory(user=user, email='test@acme.com')
        CustomerFactory(user=user, email='info@globex.com')

        url = reverse('customer-list')
        response = authenticated_client.get(url, {'search': 'test@acme.com'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_order_customers_by_created_at(self, authenticated_client, user):
        """Test ordering customers by creation date."""
        CustomerFactory.create_batch(3, user=user)

        url = reverse('customer-list')
        response = authenticated_client.get(url, {'ordering': '-created_at'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 3

    def test_upload_attachment(self, authenticated_client, user, sample_pdf):
        """Test uploading an attachment to a customer."""
        customer = CustomerFactory(user=user)

        url = reverse('customer-upload-attachment', kwargs={'pk': customer.pk})
        data = {
            'file': sample_pdf,
            'file_name': 'test_document.pdf'
        }

        response = authenticated_client.post(url, data, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert Attachment.objects.filter(customer=customer).exists()

    def test_list_customer_attachments(self, authenticated_client, user):
        """Test listing attachments for a customer."""
        customer = CustomerFactory(user=user)
        AttachmentFactory.create_batch(2, customer=customer)

        url = reverse('customer-attachments', kwargs={'pk': customer.pk})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_validate_email_format(self, authenticated_client):
        """Test that invalid email format is rejected."""
        url = reverse('customer-list')
        data = {
            'name': 'Test Customer',
            'email': 'invalid-email-format'
        }

        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_pagination(self, authenticated_client, user):
        """Test pagination of customer list."""
        CustomerFactory.create_batch(25, user=user)

        url = reverse('customer-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert 'count' in response.data
        assert response.data['count'] == 25
