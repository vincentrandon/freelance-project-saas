"""Unit tests for Customer and Attachment models."""

import pytest
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError

from customers.models import Customer, Attachment
from tests.factories import CustomerFactory, AttachmentFactory, UserFactory


@pytest.mark.unit
class TestCustomerModel:
    """Tests for Customer model."""

    def test_create_customer_with_required_fields(self, user):
        """Test creating a customer with minimum required fields."""
        customer = Customer.objects.create(
            user=user,
            name='ACME Corporation'
        )

        assert customer.id is not None
        assert customer.name == 'ACME Corporation'
        assert customer.user == user
        assert customer.created_at is not None
        assert customer.updated_at is not None

    def test_create_customer_with_all_fields(self):
        """Test creating a customer with all fields populated."""
        customer = CustomerFactory(
            name='Test Corp',
            email='test@testcorp.com',
            phone='+1234567890',
            company='Test Corporation',
            address='123 Main St',
            notes='Important client'
        )

        assert customer.name == 'Test Corp'
        assert customer.email == 'test@testcorp.com'
        assert customer.phone == '+1234567890'
        assert customer.company == 'Test Corporation'
        assert customer.address == '123 Main St'
        assert customer.notes == 'Important client'

    def test_customer_str_representation(self):
        """Test the string representation of a customer."""
        customer = CustomerFactory(name='ACME Corp')
        assert str(customer) == 'ACME Corp'

    def test_customer_requires_user(self, user):
        """Test that customer requires a user."""
        with pytest.raises(IntegrityError):
            Customer.objects.create(name='Test', user=None)

    def test_customer_requires_name(self, user):
        """Test that customer requires a name."""
        customer = Customer(user=user, name='')
        with pytest.raises(ValidationError):
            customer.full_clean()

    def test_customer_email_validation(self, user):
        """Test email field validation."""
        customer = Customer(user=user, name='Test', email='invalid-email')
        with pytest.raises(ValidationError) as exc_info:
            customer.full_clean()

        assert 'email' in exc_info.value.message_dict

    def test_customer_queryset_filtered_by_user(self, user, user2):
        """Test that customers are properly isolated by user."""
        customer1 = CustomerFactory(user=user, name='User1 Customer')
        customer2 = CustomerFactory(user=user2, name='User2 Customer')

        # Each user should only see their own customers
        user1_customers = Customer.objects.filter(user=user)
        user2_customers = Customer.objects.filter(user=user2)

        assert customer1 in user1_customers
        assert customer1 not in user2_customers
        assert customer2 in user2_customers
        assert customer2 not in user1_customers

    def test_customer_update_timestamp(self):
        """Test that updated_at changes when customer is modified."""
        customer = CustomerFactory(name='Original Name')
        original_updated_at = customer.updated_at

        customer.name = 'Updated Name'
        customer.save()

        assert customer.updated_at > original_updated_at

    def test_customer_deletion_cascades_to_attachments(self):
        """Test that deleting a customer deletes its attachments."""
        customer = CustomerFactory()
        attachment1 = AttachmentFactory(customer=customer)
        attachment2 = AttachmentFactory(customer=customer)

        attachment_ids = [attachment1.id, attachment2.id]
        customer.delete()

        assert not Attachment.objects.filter(id__in=attachment_ids).exists()

    def test_multiple_customers_same_name_different_users(self, user, user2):
        """Test that different users can have customers with the same name."""
        customer1 = CustomerFactory(user=user, name='ACME Corp')
        customer2 = CustomerFactory(user=user2, name='ACME Corp')

        assert customer1.id != customer2.id
        assert customer1.name == customer2.name
        assert customer1.user != customer2.user


@pytest.mark.unit
class TestAttachmentModel:
    """Tests for Attachment model."""

    def test_create_attachment(self, sample_pdf):
        """Test creating an attachment."""
        customer = CustomerFactory()
        attachment = Attachment.objects.create(
            customer=customer,
            file=sample_pdf,
            file_name='test.pdf',
            file_size=1024
        )

        assert attachment.id is not None
        assert attachment.customer == customer
        assert attachment.file_name == 'test.pdf'
        assert attachment.file_size == 1024
        assert attachment.uploaded_at is not None

    def test_attachment_str_representation(self):
        """Test the string representation of an attachment."""
        attachment = AttachmentFactory(file_name='document.pdf')
        # Attachment __str__ includes customer name: "filename - customer_name"
        assert 'document.pdf' in str(attachment)
        assert attachment.customer.name in str(attachment)

    def test_attachment_requires_customer(self, sample_pdf):
        """Test that attachment requires a customer."""
        with pytest.raises(IntegrityError):
            Attachment.objects.create(
                customer=None,
                file=sample_pdf,
                file_name='test.pdf'
            )

    def test_attachment_file_url(self):
        """Test that attachment has a file URL."""
        attachment = AttachmentFactory()
        assert attachment.file.url is not None
        assert len(attachment.file.url) > 0

    def test_attachment_belongs_to_customer(self):
        """Test attachment relationship with customer."""
        customer = CustomerFactory()
        attachment = AttachmentFactory(customer=customer)

        assert attachment.customer == customer
        assert attachment in customer.attachments.all()

    def test_multiple_attachments_per_customer(self):
        """Test that a customer can have multiple attachments."""
        customer = CustomerFactory()
        attachment1 = AttachmentFactory(customer=customer, file_name='doc1.pdf')
        attachment2 = AttachmentFactory(customer=customer, file_name='doc2.pdf')
        attachment3 = AttachmentFactory(customer=customer, file_name='doc3.pdf')

        attachments = customer.attachments.all()
        assert attachments.count() == 3
        assert attachment1 in attachments
        assert attachment2 in attachments
        assert attachment3 in attachments

    def test_attachment_ordering_by_uploaded_at(self):
        """Test that attachments are ordered by upload date."""
        customer = CustomerFactory()
        attachment1 = AttachmentFactory(customer=customer)
        attachment2 = AttachmentFactory(customer=customer)

        attachments = list(customer.attachments.all())

        # Latest uploads should come first (descending order)
        assert attachments[0].uploaded_at >= attachments[1].uploaded_at
