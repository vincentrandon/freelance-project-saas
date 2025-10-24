"""Tests for finance Celery tasks."""

import pytest
from unittest.mock import patch
from tests.factories import BankAccountFactory


@pytest.mark.celery
@pytest.mark.external
class TestFinanceTasks:
    @patch('finance.services.bank_api.BankAPIClient.sync_transactions')
    def test_sync_bank_account(self, mock_sync, user):
        account = BankAccountFactory(user=user)
        from finance.tasks import sync_bank_account
        # result = sync_bank_account(account.id)
        # mock_sync.assert_called_once()

    @patch('finance.tasks.sync_bank_account.delay')
    def test_sync_all_bank_accounts(self, mock_task, user):
        BankAccountFactory.create_batch(3, user=user, is_active=True)
        from finance.tasks import sync_all_bank_accounts
        # result = sync_all_bank_accounts()
        # Task should be called for each active account

    def test_error_handling_api_failure(self, user):
        account = BankAccountFactory(user=user)
        with patch('finance.services.bank_api.BankAPIClient.sync_transactions') as mock:
            mock.side_effect = Exception('Bank API Error')
            # Task should handle error gracefully
