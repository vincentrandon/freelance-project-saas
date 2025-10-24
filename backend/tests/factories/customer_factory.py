"""Factories for Customer and Attachment models."""

import factory
from django.core.files.base import ContentFile
from factory.django import DjangoModelFactory

from customers.models import Customer, Attachment
from .user_factory import UserFactory


class CustomerFactory(DjangoModelFactory):
    """Factory for creating Customer instances."""

    class Meta:
        model = Customer

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('company')
    email = factory.Faker('company_email')
    phone = factory.Faker('phone_number')
    company = factory.Faker('company')
    address = factory.Faker('street_address')
    notes = factory.Faker('text', max_nb_chars=200)


class AttachmentFactory(DjangoModelFactory):
    """Factory for creating Attachment instances."""

    class Meta:
        model = Attachment

    customer = factory.SubFactory(CustomerFactory)
    file = factory.LazyAttribute(
        lambda _: ContentFile(b'fake file content', name='test_file.pdf')
    )
    file_name = factory.Faker('file_name', extension='pdf')
    file_size = factory.Faker('random_int', min=1000, max=5000000)
