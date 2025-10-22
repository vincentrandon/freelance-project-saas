from django.db import models
from django.contrib.auth.models import User


class Customer(models.Model):
    """Model representing a customer/client"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True)
    company = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.name


class Attachment(models.Model):
    """Model for customer attachments stored in S3"""
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='customer_attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.IntegerField(default=0)  # Size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} - {self.customer.name}"
