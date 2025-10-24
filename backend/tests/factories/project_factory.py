"""Factories for Project, Task, TaskTemplate, and TaskHistory models."""

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from projects.models import Project, Task, TaskTemplate, TaskHistory
from .user_factory import UserFactory
from .customer_factory import CustomerFactory


class ProjectFactory(DjangoModelFactory):
    """Factory for creating Project instances."""

    class Meta:
        model = Project

    user = factory.SubFactory(UserFactory)
    customer = factory.SubFactory(CustomerFactory, user=factory.SelfAttribute('..user'))
    name = factory.Faker('catch_phrase')
    description = factory.Faker('text', max_nb_chars=500)
    status = FuzzyChoice(['active', 'paused', 'completed', 'cancelled'])
    start_date = factory.Faker('past_date', start_date='-60d')
    end_date = factory.Faker('future_date', end_date='+90d')
    estimated_budget = FuzzyDecimal(5000.0, 100000.0, precision=2)
    notes_json = factory.Faker('json')  # Tiptap JSON (field name is notes_json)


class TaskTemplateFactory(DjangoModelFactory):
    """Factory for creating TaskTemplate instances."""

    class Meta:
        model = TaskTemplate

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('job')
    description = factory.Faker('text', max_nb_chars=300)
    category = FuzzyChoice([
        'development', 'design', 'testing', 'deployment',
        'consulting', 'documentation', 'maintenance', 'research', 'other'
    ])
    average_estimated_hours = FuzzyDecimal(1.0, 80.0, precision=2)
    average_actual_hours = FuzzyDecimal(1.0, 80.0, precision=2)
    min_hours = FuzzyDecimal(0.5, 40.0, precision=2)
    max_hours = FuzzyDecimal(40.0, 200.0, precision=2)
    average_hourly_rate = FuzzyDecimal(50.0, 200.0, precision=2)
    usage_count = factory.Faker('random_int', min=1, max=50)
    confidence_score = FuzzyDecimal(0.5, 1.0, precision=2)


class TaskFactory(DjangoModelFactory):
    """Factory for creating Task instances."""

    class Meta:
        model = Task

    project = factory.SubFactory(ProjectFactory)
    template = factory.Maybe(
        factory.Faker('boolean', chance_of_getting_true=30),
        yes_declaration=factory.SubFactory(
            TaskTemplateFactory,
            user=factory.SelfAttribute('...project.user')
        ),
        no_declaration=None
    )
    name = factory.Faker('job')
    description = factory.Faker('text', max_nb_chars=300)
    status = FuzzyChoice(['todo', 'in_progress', 'completed'])
    estimated_hours = FuzzyDecimal(1.0, 40.0, precision=2)
    actual_hours = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == 'completed'),
        yes_declaration=FuzzyDecimal(1.0, 40.0, precision=2),
        no_declaration=None
    )
    hourly_rate = FuzzyDecimal(50.0, 200.0, precision=2)
    order = factory.Sequence(lambda n: n)
    worked_days = factory.Faker('random_int', min=0, max=20)
    worked_dates = factory.List([])  # JSON array


class TaskHistoryFactory(DjangoModelFactory):
    """Factory for creating TaskHistory instances."""

    class Meta:
        model = TaskHistory

    template = factory.SubFactory(TaskTemplateFactory)
    task = factory.SubFactory(TaskFactory)
    project = factory.SelfAttribute('task.project')
    source = FuzzyChoice(['ai_import', 'manual', 'template'])
    estimated_hours = FuzzyDecimal(1.0, 40.0, precision=2)
    actual_hours = FuzzyDecimal(1.0, 40.0, precision=2)
    hourly_rate = FuzzyDecimal(50.0, 200.0, precision=2)
    variance = factory.LazyAttribute(
        lambda o: float(o.actual_hours) - float(o.estimated_hours)
    )
    confidence_at_creation = FuzzyDecimal(0.5, 1.0, precision=2)
