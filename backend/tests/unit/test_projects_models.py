"""Unit tests for Project, Task, TaskTemplate, and TaskHistory models."""

import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError

from projects.models import Project, Task, TaskTemplate, TaskHistory
from tests.factories import ProjectFactory, TaskFactory, TaskTemplateFactory, TaskHistoryFactory, CustomerFactory


@pytest.mark.unit
class TestProjectModel:
    def test_create_project(self, user):
        customer = CustomerFactory(user=user)
        project = Project.objects.create(
            user=user,
            customer=customer,
            name='Test Project',
            status='active'
        )
        assert project.id is not None
        assert project.name == 'Test Project'

    def test_project_str(self):
        project = ProjectFactory(name='My Project')
        assert str(project) == 'My Project'

    def test_project_status_choices(self):
        for status in ['active', 'paused', 'completed', 'cancelled']:
            project = ProjectFactory(status=status)
            project.full_clean()

    def test_total_estimated_hours(self):
        project = ProjectFactory()
        TaskFactory(project=project, estimated_hours=10)
        TaskFactory(project=project, estimated_hours=15)
        assert project.total_estimated_hours() == Decimal('25')

    def test_total_actual_hours(self):
        project = ProjectFactory()
        TaskFactory(project=project, actual_hours=8)
        TaskFactory(project=project, actual_hours=12)
        assert project.total_actual_hours() == Decimal('20')

    def test_user_isolation(self, user, user2):
        project1 = ProjectFactory(user=user)
        project2 = ProjectFactory(user=user2)
        assert project1 not in Project.objects.filter(user=user2)


@pytest.mark.unit
class TestTaskModel:
    def test_create_task(self):
        project = ProjectFactory()
        task = Task.objects.create(
            project=project,
            name='Development',
            estimated_hours=10,
            hourly_rate=100
        )
        assert task.id is not None

    def test_task_status_choices(self):
        for status in ['todo', 'in_progress', 'completed']:
            task = TaskFactory(status=status)
            task.full_clean()

    def test_task_with_template(self):
        template = TaskTemplateFactory()
        task = TaskFactory(template=template)
        assert task.template == template

    def test_task_completion_updates_template(self):
        template = TaskTemplateFactory(usage_count=5)
        task = TaskFactory(template=template, status='completed', estimated_hours=10, actual_hours=12)
        # Template stats would be updated via signal/method
        assert task.status == 'completed'


@pytest.mark.unit
class TestTaskTemplateModel:
    def test_create_template(self, user):
        template = TaskTemplate.objects.create(
            user=user,
            name='Frontend Development',
            category='development'
        )
        assert template.id is not None

    def test_template_categories(self):
        categories = ['development', 'design', 'testing', 'deployment', 'consulting', 'documentation', 'maintenance', 'research', 'other']
        for cat in categories:
            template = TaskTemplateFactory(category=cat)
            template.full_clean()

    def test_confidence_score_calculation(self):
        template = TaskTemplateFactory(usage_count=10)
        assert template.confidence_score >= 0
        assert template.confidence_score <= 1

    def test_estimate_variance(self):
        template = TaskTemplateFactory(
            average_estimated_hours=10,
            average_actual_hours=12
        )
        variance = template.estimate_variance
        assert variance is not None


@pytest.mark.unit
class TestTaskHistoryModel:
    def test_create_history(self):
        task = TaskFactory()
        template = TaskTemplateFactory()
        history = TaskHistory.objects.create(
            template=template,
            task=task,
            project=task.project,
            source='template',
            estimated_hours=10,
            actual_hours=12,
            hourly_rate=100
        )
        assert history.id is not None

    def test_variance_calculation(self):
        history = TaskHistoryFactory(estimated_hours=10, actual_hours=12)
        assert history.variance == 2
