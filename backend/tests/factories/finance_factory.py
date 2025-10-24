"""Factories for BankAccount and Transaction models."""

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from finance.models import BankAccount, Transaction
from .user_factory import UserFactory
from .customer_factory import CustomerFactory
from .project_factory import ProjectFactory


class BankAccountFactory(DjangoModelFactory):
    """Factory for creating BankAccount instances."""

    class Meta:
        model = BankAccount

    user = factory.SubFactory(UserFactory)
    account_name = factory.Faker('word')
    bank_name = factory.Faker('company')
    account_number_masked = factory.Faker('credit_card_number')
    balance = FuzzyDecimal(1000.0, 100000.0, precision=2)
    currency = FuzzyChoice(['EUR', 'USD', 'GBP'])
    connection_id = factory.Faker('uuid4')
    is_active = True
    last_synced = factory.Faker('date_time_this_month')


class TransactionFactory(DjangoModelFactory):
    """Factory for creating Transaction instances."""

    class Meta:
        model = Transaction

    bank_account = factory.SubFactory(BankAccountFactory)
    transaction_id = factory.Faker('uuid4')
    date = factory.Faker('date_this_year')
    description = factory.Faker('sentence')
    amount = FuzzyDecimal(-5000.0, 5000.0, precision=2)
    currency = factory.SelfAttribute('bank_account.currency')
    category = FuzzyChoice(['income', 'expense', 'transfer', 'other'])
    counterparty = factory.Faker('company')
    is_reconciled = factory.Faker('boolean', chance_of_getting_true=30)

    # Optional foreign keys
    customer = factory.Maybe(
        factory.Faker('boolean', chance_of_getting_true=20),
        yes_declaration=factory.SubFactory(
            CustomerFactory,
            user=factory.SelfAttribute('...bank_account.user')
        ),
        no_declaration=None
    )
    project = factory.Maybe(
        factory.Faker('boolean', chance_of_getting_true=20),
        yes_declaration=factory.SubFactory(
            ProjectFactory,
            user=factory.SelfAttribute('...bank_account.user')
        ),
        no_declaration=None
    )
