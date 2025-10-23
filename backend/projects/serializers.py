from rest_framework import serializers
from .models import Project, Task, TaskTemplate, TaskHistory


class TaskTemplateSerializer(serializers.ModelSerializer):
    """Serializer for task templates in the catalogue"""
    estimate_variance = serializers.ReadOnlyField()
    template_name = serializers.CharField(source='name', read_only=True)

    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'name', 'template_name', 'description', 'category', 'tags',
            'average_estimated_hours', 'min_hours', 'max_hours', 'average_actual_hours',
            'average_hourly_rate', 'usage_count', 'last_used_at',
            'confidence_score', 'estimate_variance', 'created_from', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'last_used_at', 'estimate_variance', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TaskTemplateListSerializer(serializers.ModelSerializer):
    """Lighter serializer for task template lists"""
    estimate_variance = serializers.ReadOnlyField()

    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'name', 'category', 'tags',
            'average_estimated_hours', 'average_hourly_rate',
            'usage_count', 'confidence_score', 'estimate_variance', 'is_active'
        ]
        read_only_fields = ['id', 'usage_count', 'estimate_variance']


class TaskHistorySerializer(serializers.ModelSerializer):
    """Serializer for task history entries"""
    task_name = serializers.CharField(source='task.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = TaskHistory
        fields = [
            'id', 'task', 'task_name', 'template', 'template_name',
            'source_type', 'source_document', 'project_name', 'customer_name',
            'estimated_hours', 'actual_hours', 'hourly_rate', 'variance_percentage',
            'created_at'
        ]
        read_only_fields = ['id', 'variance_percentage', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for tasks"""
    amount = serializers.ReadOnlyField()
    variance_percentage = serializers.ReadOnlyField()
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'template', 'template_name', 'name', 'description', 'status',
            'estimated_hours', 'actual_hours', 'hourly_rate', 'amount', 'variance_percentage',
            'worked_days', 'worked_dates',
            'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'variance_percentage', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Full serializer for projects with all details"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    total_estimated_hours = serializers.ReadOnlyField()
    total_actual_hours = serializers.ReadOnlyField()
    total_invoiced = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    tasks = TaskSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    invoice_count = serializers.SerializerMethodField()
    estimate_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'customer', 'customer_name', 'name', 'description', 'status', 
            'start_date', 'end_date', 'estimated_budget', 'notes_json', 
            'total_estimated_hours', 'total_actual_hours', 'total_invoiced', 'profit_margin',
            'tasks', 'task_count', 'invoice_count', 'estimate_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_invoice_count(self, obj):
        return obj.invoices.count()
    
    def get_estimate_count(self, obj):
        return obj.estimates.count()
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ProjectListSerializer(serializers.ModelSerializer):
    """Lighter serializer for project lists"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    total_estimated_hours = serializers.ReadOnlyField()
    total_actual_hours = serializers.ReadOnlyField()
    total_invoiced = serializers.ReadOnlyField()
    task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'customer', 'customer_name', 'name', 'description', 'status', 
            'start_date', 'end_date', 'estimated_budget', 'notes_json',
            'total_estimated_hours', 'total_actual_hours', 'total_invoiced', 'task_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_task_count(self, obj):
        return obj.tasks.count()
