from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'status', 'value', 'expected_close_date']
    list_filter = ['status', 'source', 'probability']
    search_fields = ['name', 'email', 'company']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'email', 'phone', 'company')
        }),
        ('Lead Details', {
            'fields': ('status', 'value', 'probability', 'source')
        }),
        ('Timeline', {
            'fields': ('expected_close_date', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
