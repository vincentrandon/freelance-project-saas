"""Factory for Notification model."""

import factory
from django.contrib.contenttypes.models import ContentType
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from notifications.models import Notification
from .user_factory import UserFactory
from .invoicing_factory import InvoiceFactory


class NotificationFactory(DjangoModelFactory):
    """Factory for creating Notification instances."""

    class Meta:
        model = Notification

    user = factory.SubFactory(UserFactory)
    notification_type = FuzzyChoice([
        'pdf_generated',
        'pdf_failed',
        'import_completed',
        'import_failed',
        'email_sent',
        'email_failed',
        'entity_created'
    ])
    title = factory.Faker('sentence', nb_words=5)
    message = factory.Faker('text', max_nb_chars=200)
    read = factory.Faker('boolean', chance_of_getting_true=30)

    # Generic foreign key to related object
    content_type = factory.LazyAttribute(
        lambda o: ContentType.objects.get_for_model(InvoiceFactory._meta.model)
    )
    object_id = factory.SelfAttribute('related_object.id')

    # Related object (for testing, using Invoice as example)
    related_object = factory.SubFactory(
        InvoiceFactory,
        user=factory.SelfAttribute('..user')
    )

    @factory.lazy_attribute
    def metadata(self):
        """Generate metadata based on notification type."""
        return {
            'status': 'success' if 'generated' in self.notification_type or 'sent' in self.notification_type else 'error',
            'details': factory.Faker('sentence').generate()
        }
