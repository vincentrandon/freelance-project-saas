from rest_framework import serializers
from .models import BankAccount, Transaction


class BankAccountSerializer(serializers.ModelSerializer):
    """Serializer for bank accounts"""
    
    class Meta:
        model = BankAccount
        fields = [
            'id', 'account_name', 'bank_name', 'account_number_masked', 
            'balance', 'currency', 'is_active', 'last_synced', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_synced', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions"""
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'bank_account', 'bank_account_name', 'transaction_id', 'date', 
            'amount', 'currency', 'description', 'category', 'counterparty_name', 
            'is_reconciled', 'project', 'project_name', 'invoice', 'notes', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TransactionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for transaction lists"""
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'bank_account_name', 'date', 'amount', 'currency', 
            'description', 'category', 'is_reconciled', 'project_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FinanceDashboardSerializer(serializers.Serializer):
    """Serializer for financial dashboard overview"""
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=15, decimal_places=2)
    accounts_count = serializers.IntegerField()
    unreconciled_transactions = serializers.IntegerField()
