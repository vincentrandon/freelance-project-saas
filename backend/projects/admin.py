from django.contrib import admin
from .models import Project, Task, TaskTemplate, TaskHistory


@admin.register(TaskTemplate)
class TaskTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'category', 'usage_count', 'average_estimated_hours', 'confidence_score', 'is_active', 'last_used_at']
    list_filter = ['category', 'created_from', 'is_active', 'user']
    search_fields = ['name', 'description', 'tags']
    readonly_fields = ['created_at', 'updated_at', 'usage_count', 'last_used_at', 'estimate_variance']
    list_editable = ['is_active']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'description', 'category', 'tags', 'is_active')
        }),
        ('Time Estimates', {
            'fields': ('average_estimated_hours', 'min_hours', 'max_hours', 'average_actual_hours')
        }),
        ('Pricing', {
            'fields': ('average_hourly_rate',)
        }),
        ('Statistics', {
            'fields': ('usage_count', 'last_used_at', 'confidence_score', 'estimate_variance'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_from', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskHistory)
class TaskHistoryAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'template', 'source_type', 'estimated_hours', 'actual_hours', 'variance_percentage', 'created_at']
    list_filter = ['source_type', 'user', 'created_at']
    search_fields = ['task__name', 'project_name', 'customer_name']
    readonly_fields = ['created_at', 'variance_percentage']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'task', 'template', 'source_type')
        }),
        ('Source', {
            'fields': ('source_document', 'project_name', 'customer_name')
        }),
        ('Time & Cost', {
            'fields': ('estimated_hours', 'actual_hours', 'hourly_rate', 'variance_percentage')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'customer', 'status', 'start_date', 'end_date', 'estimated_budget']
    list_filter = ['status', 'start_date']
    search_fields = ['name', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'customer', 'name', 'status')
        }),
        ('Details', {
            'fields': ('description', 'start_date', 'end_date', 'estimated_budget')
        }),
        ('Notes', {
            'fields': ('notes_json',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'template', 'status', 'estimated_hours', 'actual_hours', 'variance_percentage', 'hourly_rate', 'order']
    list_filter = ['status', 'project', 'template']
    search_fields = ['name', 'project__name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'variance_percentage']
    list_editable = ['order', 'status']
    fieldsets = (
        ('Basic Information', {
            'fields': ('project', 'template', 'name', 'description', 'status', 'order')
        }),
        ('Time & Cost', {
            'fields': ('estimated_hours', 'actual_hours', 'hourly_rate', 'variance_percentage')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
