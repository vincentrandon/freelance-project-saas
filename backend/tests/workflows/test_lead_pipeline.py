"""End-to-end workflow tests for lead pipeline."""

import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import LeadFactory, CustomerFactory, ProjectFactory


@pytest.mark.workflow
class TestLeadPipeline:
    def test_lead_progression_through_pipeline(self, authenticated_client, user):
        """Test lead moving through all stages."""
        lead = LeadFactory(user=user, status='new', probability=0)

        url = reverse('lead-detail', kwargs={'pk': lead.id})

        # Stage 1: New → Contacted
        response = authenticated_client.patch(url, {'status': 'contacted', 'probability': 25}, format='json')
        assert response.status_code == status.HTTP_200_OK

        # Stage 2: Contacted → Qualified
        response = authenticated_client.patch(url, {'status': 'qualified', 'probability': 50}, format='json')
        assert response.status_code == status.HTTP_200_OK

        # Stage 3: Qualified → Proposal
        response = authenticated_client.patch(url, {'status': 'proposal', 'probability': 75}, format='json')
        assert response.status_code == status.HTTP_200_OK

        # Stage 4: Proposal → Won
        response = authenticated_client.patch(url, {'status': 'won', 'probability': 100}, format='json')
        assert response.status_code == status.HTTP_200_OK

        lead.refresh_from_db()
        assert lead.status == 'won'
        assert lead.probability == 100

    def test_convert_won_lead_to_customer(self, authenticated_client, user):
        """Test converting won lead to customer."""
        lead = LeadFactory(
            user=user,
            status='won',
            name='John Doe',
            email='john@example.com',
            company='ACME Corp'
        )

        # Convert to customer
        customer_data = {
            'name': lead.name,
            'email': lead.email,
            'company': lead.company
        }
        response = authenticated_client.post(reverse('customer-list'), customer_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

        from customers.models import Customer
        customer = Customer.objects.get(email=lead.email)
        assert customer.name == lead.name

    def test_convert_won_lead_to_project(self, authenticated_client, user):
        """Test creating project from won lead."""
        lead = LeadFactory(user=user, status='won')
        customer = CustomerFactory(user=user)

        project_data = {
            'customer': customer.id,
            'name': f'Project from Lead: {lead.name}',
            'status': 'active'
        }
        response = authenticated_client.post(reverse('project-list'), project_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_lost_lead_workflow(self, authenticated_client, user):
        """Test marking lead as lost."""
        lead = LeadFactory(user=user, status='proposal')

        url = reverse('lead-detail', kwargs={'pk': lead.id})
        response = authenticated_client.patch(
            url,
            {'status': 'lost', 'notes': 'Chose competitor'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

    def test_lead_pipeline_analytics(self, authenticated_client, user):
        """Test lead pipeline statistics."""
        LeadFactory.create_batch(5, user=user, status='new')
        LeadFactory.create_batch(3, user=user, status='qualified')
        LeadFactory.create_batch(2, user=user, status='won')

        stats_url = reverse('lead-stats')
        response = authenticated_client.get(stats_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total'] == 10
        # assert response.data['won_count'] == 2
        # assert 'conversion_rate' in response.data
