"""Integration tests for Project API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import ProjectFactory, CustomerFactory


@pytest.mark.integration
class TestProjectViewSet:
    def test_list_projects(self, authenticated_client, user):
        ProjectFactory.create_batch(3, user=user)
        response = authenticated_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_create_project(self, authenticated_client, user):
        customer = CustomerFactory(user=user)
        data = {
            'customer': customer.id,
            'name': 'New Project',
            'status': 'active'
        }
        response = authenticated_client.post(reverse('project-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_project(self, authenticated_client, user):
        project = ProjectFactory(user=user, status='active')
        url = reverse('project-detail', kwargs={'pk': project.pk})
        response = authenticated_client.patch(url, {'status': 'completed'}, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_delete_project(self, authenticated_client, user):
        project = ProjectFactory(user=user)
        url = reverse('project-detail', kwargs={'pk': project.pk})
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_status(self, authenticated_client, user):
        ProjectFactory.create_batch(2, user=user, status='active')
        ProjectFactory.create_batch(1, user=user, status='completed')
        response = authenticated_client.get(reverse('project-list'), {'status': 'active'})
        assert len(response.data['results']) == 2

    def test_user_isolation(self, authenticated_client, user, user2):
        ProjectFactory.create_batch(2, user=user)
        ProjectFactory.create_batch(3, user=user2)
        response = authenticated_client.get(reverse('project-list'))
        assert len(response.data['results']) == 2
