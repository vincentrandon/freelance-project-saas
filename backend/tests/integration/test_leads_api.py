"""Integration tests for Lead API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import LeadFactory


@pytest.mark.integration
class TestLeadViewSet:
    def test_list_leads(self, authenticated_client, user):
        LeadFactory.create_batch(3, user=user)
        response = authenticated_client.get(reverse('lead-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_create_lead(self, authenticated_client):
        data = {'name': 'New Lead', 'status': 'new'}
        response = authenticated_client.post(reverse('lead-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_lead(self, authenticated_client, user):
        lead = LeadFactory(user=user, status='new')
        url = reverse('lead-detail', kwargs={'pk': lead.pk})
        response = authenticated_client.patch(url, {'status': 'contacted'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        lead.refresh_from_db()
        assert lead.status == 'contacted'

    def test_delete_lead(self, authenticated_client, user):
        lead = LeadFactory(user=user)
        url = reverse('lead-detail', kwargs={'pk': lead.pk})
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_lead_stats(self, authenticated_client, user):
        LeadFactory.create_batch(5, user=user)
        url = reverse('lead-stats')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'total' in response.data

    def test_filter_by_status(self, authenticated_client, user):
        LeadFactory.create_batch(2, user=user, status='new')
        LeadFactory.create_batch(3, user=user, status='qualified')
        response = authenticated_client.get(reverse('lead-list'), {'status': 'new'})
        assert len(response.data['results']) == 2

    def test_user_isolation(self, authenticated_client, user, user2):
        LeadFactory.create_batch(2, user=user)
        LeadFactory.create_batch(3, user=user2)
        response = authenticated_client.get(reverse('lead-list'))
        assert len(response.data['results']) == 2
