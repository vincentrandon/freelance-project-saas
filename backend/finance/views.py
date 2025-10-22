from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Q

from .models import BankAccount, Transaction
from .serializers import (
    BankAccountSerializer, TransactionSerializer, 
    TransactionListSerializer, FinanceDashboardSerializer
)


class BankAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bank accounts.
    Provides CRUD operations and Open Banking connection.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def connect_bank(self, request):
        """Initiate Open Banking connection (to be implemented with actual Open Banking provider)"""
        # This will be implemented with Qonto or similar Open Banking API
        return Response({
            'message': 'Open Banking connection flow initiated',
            'redirect_url': 'https://banking-provider.com/connect'
        })
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Trigger manual sync for a bank account"""
        bank_account = self.get_object()
        # This will trigger a Celery task to sync transactions
        from .tasks import sync_bank_account
        sync_bank_account.delay(bank_account.id)
        
        return Response({
            'message': 'Sync initiated',
            'account_id': bank_account.id
        })


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing transactions.
    Provides filtering, reconciliation, and project linking.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['description', 'counterparty_name']
    filterset_fields = ['bank_account', 'category', 'is_reconciled', 'date']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']
    
    def get_queryset(self):
        return Transaction.objects.filter(
            bank_account__user=self.request.user
        ).select_related('bank_account', 'project', 'invoice')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TransactionListSerializer
        return TransactionSerializer
    
    @action(detail=True, methods=['patch'])
    def reconcile(self, request, pk=None):
        """Mark transaction as reconciled"""
        transaction = self.get_object()
        is_reconciled = request.data.get('is_reconciled', True)
        project_id = request.data.get('project_id')
        invoice_id = request.data.get('invoice_id')
        
        transaction.is_reconciled = is_reconciled
        if project_id:
            transaction.project_id = project_id
        if invoice_id:
            transaction.invoice_id = invoice_id
        
        transaction.save()
        serializer = self.get_serializer(transaction)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unreconciled(self, request):
        """Get all unreconciled transactions"""
        transactions = self.get_queryset().filter(is_reconciled=False)
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get financial dashboard overview"""
        user_transactions = self.get_queryset()
        
        total_balance = BankAccount.objects.filter(
            user=request.user,
            is_active=True
        ).aggregate(Sum('balance'))['balance__sum'] or 0
        
        total_income = user_transactions.filter(
            category='income'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        total_expense = user_transactions.filter(
            category='expense'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        accounts_count = BankAccount.objects.filter(
            user=request.user,
            is_active=True
        ).count()
        
        unreconciled_count = user_transactions.filter(
            is_reconciled=False
        ).count()
        
        data = {
            'total_balance': total_balance,
            'total_income': total_income,
            'total_expense': total_expense,
            'accounts_count': accounts_count,
            'unreconciled_transactions': unreconciled_count
        }
        
        serializer = FinanceDashboardSerializer(data)
        return Response(serializer.data)
