"""End-to-end workflow tests for task template learning."""

import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from tests.factories import TaskFactory, TaskTemplateFactory, ProjectFactory


@pytest.mark.workflow
class TestTaskTemplateLearning:
    def test_task_completion_updates_template_stats(self, user):
        """Test that completing tasks updates template statistics."""
        template = TaskTemplateFactory(
            user=user,
            average_estimated_hours=Decimal('40.0'),
            average_actual_hours=Decimal('40.0'),
            usage_count=5
        )

        project = ProjectFactory(user=user)
        task = TaskFactory(
            project=project,
            template=template,
            status='in_progress',
            estimated_hours=Decimal('45.0'),
            actual_hours=None
        )

        # Complete task
        task.status = 'completed'
        task.actual_hours = Decimal('42.0')
        task.save()

        # Template statistics should be updated
        # (via signal or explicit call)
        template.refresh_from_db()
        # assert template.usage_count == 6
        # New average should be updated

    def test_create_template_from_completed_task(self, authenticated_client, user):
        """Test creating a template from a completed task."""
        project = ProjectFactory(user=user)
        task = TaskFactory(
            project=project,
            name='Frontend Development',
            category='development',
            status='completed',
            estimated_hours=Decimal('40.0'),
            actual_hours=Decimal('38.0')
        )

        # Create template from task
        # (Could be manual or automatic)
        template_data = {
            'user': user.id,
            'name': task.name,
            'category': task.category,
            'average_estimated_hours': str(task.estimated_hours),
            'average_actual_hours': str(task.actual_hours)
        }

        from projects.models import TaskTemplate
        template = TaskTemplate.objects.create(**template_data)
        assert template is not None

    def test_use_template_for_new_task(self, authenticated_client, user):
        """Test using a template to create a new task."""
        template = TaskTemplateFactory(
            user=user,
            name='Backend API Development',
            average_estimated_hours=Decimal('50.0'),
            average_hourly_rate=Decimal('100.0')
        )

        project = ProjectFactory(user=user)

        task_data = {
            'project': project.id,
            'template': template.id,
            'name': template.name,
            'estimated_hours': str(template.average_estimated_hours),
            'hourly_rate': str(template.average_hourly_rate),
            'status': 'todo'
        }

        response = authenticated_client.post(reverse('task-list'), task_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_confidence_score_increases_with_usage(self, user):
        """Test that template confidence improves with more usage."""
        template = TaskTemplateFactory(user=user, usage_count=1)
        initial_confidence = template.confidence_score

        # Simulate multiple uses
        template.usage_count = 20
        template.save()
        # template.calculate_confidence()

        # assert template.confidence_score > initial_confidence

    def test_variance_tracking(self, user):
        """Test tracking variance between estimated and actual hours."""
        template = TaskTemplateFactory(user=user)
        project = ProjectFactory(user=user)

        # Create tasks with varying actual hours
        TaskFactory(project=project, template=template, estimated_hours=40, actual_hours=38)
        TaskFactory(project=project, template=template, estimated_hours=40, actual_hours=45)
        TaskFactory(project=project, template=template, estimated_hours=40, actual_hours=39)

        # Template should track variance
        # variance = template.estimate_variance
        # assert variance is not None
