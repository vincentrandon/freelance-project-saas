from celery import shared_task
from django.utils import timezone
from .models import BankAccount, Transaction
import logging

logger = logging.getLogger(__name__)


@shared_task
def sync_all_bank_accounts():
    """Sync all active bank accounts with Open Banking provider"""
    active_accounts = BankAccount.objects.filter(is_active=True)
    
    for account in active_accounts:
        sync_bank_account.delay(account.id)


@shared_task
def sync_bank_account(account_id):
    """Sync a specific bank account with Open Banking provider"""
    try:
        account = BankAccount.objects.get(id=account_id)
        
        # This will be implemented with actual Open Banking API (e.g., Qonto)
        # For now, we just mark the last sync time
        
        # Example implementation with Open Banking API:
        # transactions_data = open_banking_api.get_transactions(
        #     account.connection_id,
        #     since=account.last_synced or timezone.now() - timedelta(days=90)
        # )
        # 
        # for transaction_data in transactions_data:
        #     Transaction.objects.get_or_create(
        #         transaction_id=transaction_data['id'],
        #         defaults={
        #             'bank_account': account,
        #             'date': transaction_data['date'],
        #             'amount': transaction_data['amount'],
        #             'currency': transaction_data['currency'],
        #             'description': transaction_data['description'],
        #             'category': determine_category(transaction_data),
        #             'counterparty_name': transaction_data.get('counterparty', ''),
        #         }
        #     )
        
        account.last_synced = timezone.now()
        account.save()
        
        logger.info(f'Bank account {account.id} synced successfully')
    except BankAccount.DoesNotExist:
        logger.error(f'Bank account {account_id} not found')
    except Exception as e:
        logger.error(f'Error syncing bank account {account_id}: {str(e)}')


def determine_category(transaction_data):
    """Determine transaction category based on description"""
    description = transaction_data.get('description', '').lower()
    
    if any(word in description for word in ['salary', 'payment', 'income', 'deposit']):
        return 'income'
    elif any(word in description for word in ['expense', 'charge', 'fee', 'purchase']):
        return 'expense'
    elif any(word in description for word in ['transfer', 'send']):
        return 'transfer'
    else:
        return 'other'
