from django.contrib import admin
from .models import BankAccount, Transaction


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['account_name', 'bank_name', 'balance', 'currency', 'is_active', 'last_synced']
    list_filter = ['is_active', 'bank_name', 'currency']
    search_fields = ['account_name', 'bank_name']
    readonly_fields = ['created_at', 'updated_at', 'last_synced']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'amount', 'category', 'is_reconciled']
    list_filter = ['category', 'is_reconciled', 'date']
    search_fields = ['description', 'counterparty_name']
    readonly_fields = ['created_at', 'updated_at']
