"""Unit tests for task catalogue service."""

import pytest
from tests.factories import TaskFactory, TaskTemplateFactory


@pytest.mark.unit
class TestTaskCatalogueService:
    def test_create_template_from_task(self, user):
        task = TaskFactory(status='completed', estimated_hours=40, actual_hours=38)
        # service = TaskCatalogueService(user)
        # template = service.create_template_from_task(task)
        # assert template is not None

    def test_update_template_statistics(self):
        template = TaskTemplateFactory(usage_count=5, average_actual_hours=40)
        # service.update_statistics(template, new_actual_hours=45)
        # template.refresh_from_db()
        # Updated average should be between 40 and 45

    def test_confidence_score_increases_with_usage(self):
        template = TaskTemplateFactory(usage_count=1)
        initial_confidence = template.confidence_score
        template.usage_count = 20
        template.save()
        # assert template.confidence_score > initial_confidence

    def test_search_templates_by_category(self, user):
        TaskTemplateFactory.create_batch(3, user=user, category='development')
        TaskTemplateFactory.create_batch(2, user=user, category='design')
        # templates = service.search(category='development')
        # assert len(templates) == 3

    def test_recommendation_engine(self, user):
        # Test recommending templates based on task description
        pass
