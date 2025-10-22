from django.db import models
from django.contrib.auth.models import User
from projects.models import Project


class BankAccount(models.Model):
    """Model for connected bank accounts via Open Banking"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=255)
    account_number_masked = models.CharField(max_length=50, help_text="Last 4 digits only")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='EUR')
    connection_id = models.CharField(max_length=255, blank=True, help_text="Open Banking connection ID")
    last_synced = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.bank_name} - {self.account_number_masked}"


class Transaction(models.Model):
    """Model for bank transactions"""
    
    CATEGORY_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
        ('other', 'Other'),
    ]

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_id = models.CharField(max_length=255, unique=True, help_text="External transaction ID")
    date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    counterparty_name = models.CharField(max_length=255, blank=True)
    is_reconciled = models.BooleanField(default=False)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    invoice = models.ForeignKey('invoicing.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['bank_account', '-date']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['is_reconciled']),
        ]

    def __str__(self):
        return f"{self.date} - {self.description} ({self.amount} {self.currency})"
