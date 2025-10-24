"""Unit tests for Finance models."""

import pytest
from decimal import Decimal
from finance.models import BankAccount, Transaction
from tests.factories import BankAccountFactory, TransactionFactory


@pytest.mark.unit
class TestBankAccountModel:
    def test_create_bank_account(self, user):
        account = BankAccount.objects.create(
            user=user,
            account_name='Main Account',
            bank_name='Test Bank',
            balance=Decimal('10000.00'),
            currency='EUR'
        )
        assert account.id is not None

    def test_user_isolation(self, user, user2):
        acc1 = BankAccountFactory(user=user)
        acc2 = BankAccountFactory(user=user2)
        assert acc1 not in BankAccount.objects.filter(user=user2)


@pytest.mark.unit
class TestTransactionModel:
    def test_create_transaction(self):
        account = BankAccountFactory()
        txn = Transaction.objects.create(
            bank_account=account,
            transaction_id='txn123',
            date='2025-01-15',
            description='Payment received',
            amount=Decimal('1000.00'),
            currency='EUR',
            category='income'
        )
        assert txn.id is not None

    def test_transaction_categories(self):
        for cat in ['income', 'expense', 'transfer', 'other']:
            txn = TransactionFactory(category=cat)
            txn.full_clean()

    def test_reconciliation(self):
        txn = TransactionFactory(is_reconciled=False)
        txn.is_reconciled = True
        txn.save()
        assert txn.is_reconciled is True
