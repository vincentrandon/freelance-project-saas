from django.contrib import admin
from .models import Customer, Attachment


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'company', 'created_at']
    search_fields = ['name', 'email', 'company']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'email', 'phone', 'company')
        }),
        ('Details', {
            'fields': ('address', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'customer', 'file_type', 'uploaded_at']
    search_fields = ['file_name', 'customer__name']
    readonly_fields = ['uploaded_at']
