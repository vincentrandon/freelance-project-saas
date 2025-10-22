from django.db import models
from django.contrib.auth.models import User
from django.db.models import Sum, F
from customers.models import Customer


class Project(models.Model):
    """Model representing a project for a customer"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    estimated_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Estimated project budget")
    notes_json = models.JSONField(default=dict, blank=True, help_text="Tiptap editor content in JSON format")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['customer']),
        ]

    def __str__(self):
        return f"{self.name} - {self.customer.name}"

    @property
    def total_estimated_hours(self):
        """Calculate total estimated hours from tasks"""
        return self.tasks.aggregate(total=Sum('estimated_hours'))['total'] or 0

    @property
    def total_actual_hours(self):
        """Calculate total actual hours from tasks"""
        return self.tasks.aggregate(total=Sum('actual_hours'))['total'] or 0

    @property
    def total_invoiced(self):
        """Calculate total invoiced amount from paid/sent invoices"""
        return self.invoices.filter(status__in=['sent', 'paid']).aggregate(total=Sum('total'))['total'] or 0

    @property
    def profit_margin(self):
        """Calculate profit margin (invoiced - task costs)"""
        task_cost = self.tasks.aggregate(
            total=Sum(F('actual_hours') * F('hourly_rate'))
        )['total'] or 0
        
        invoiced = float(self.total_invoiced)
        if invoiced == 0:
            return 0
        
        profit = invoiced - float(task_cost)
        return (profit / invoiced) * 100


class TaskTemplate(models.Model):
    """Model representing a reusable task template in the catalogue"""

    CATEGORY_CHOICES = [
        ('development', 'Development'),
        ('design', 'Design'),
        ('testing', 'Testing'),
        ('deployment', 'Deployment'),
        ('consulting', 'Consulting'),
        ('documentation', 'Documentation'),
        ('maintenance', 'Maintenance'),
        ('research', 'Research'),
        ('other', 'Other'),
    ]

    SOURCE_CHOICES = [
        ('manual', 'Manual Creation'),
        ('ai_import', 'AI Import'),
        ('task_conversion', 'Converted from Task'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_templates')
    name = models.CharField(max_length=255, help_text="Template name")
    description = models.TextField(blank=True, help_text="Detailed description of the task")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization (array of strings)")

    # Time estimates based on historical data
    average_estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Average estimated hours across all uses")
    min_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Minimum hours observed")
    max_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Maximum hours observed")
    average_actual_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Average actual hours from completed tasks")

    # Pricing
    average_hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Average hourly rate used")

    # Usage statistics
    usage_count = models.IntegerField(default=0, help_text="Number of times this template has been used")
    last_used_at = models.DateTimeField(null=True, blank=True, help_text="Last time this template was used")

    # Confidence and accuracy
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=50.0, help_text="Confidence score 0-100 based on estimate accuracy")

    # Metadata
    created_from = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete
    is_active = models.BooleanField(default=True, help_text="Whether this template is active")

    class Meta:
        ordering = ['-usage_count', '-last_used_at', 'name']
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['usage_count']),
            models.Index(fields=['last_used_at']),
        ]
        unique_together = [['user', 'name']]

    def __str__(self):
        return f"{self.name} ({self.usage_count} uses)"

    @property
    def estimate_variance(self):
        """Calculate variance between estimated and actual hours as percentage"""
        if not self.average_actual_hours or self.average_estimated_hours == 0:
            return None
        variance = ((float(self.average_actual_hours) - float(self.average_estimated_hours)) / float(self.average_estimated_hours)) * 100
        return round(variance, 2)

    def update_statistics(self, estimated_hours, actual_hours=None, hourly_rate=None):
        """Update template statistics with new data from a task"""
        # Update usage count
        self.usage_count += 1
        self.last_used_at = models.functions.Now()

        # Update average estimated hours
        if self.usage_count == 1:
            self.average_estimated_hours = estimated_hours
            if self.min_hours == 0:
                self.min_hours = estimated_hours
            if self.max_hours == 0:
                self.max_hours = estimated_hours
        else:
            # Running average
            current_total = float(self.average_estimated_hours) * (self.usage_count - 1)
            self.average_estimated_hours = (current_total + float(estimated_hours)) / self.usage_count

        # Update min/max
        if estimated_hours < self.min_hours or self.min_hours == 0:
            self.min_hours = estimated_hours
        if estimated_hours > self.max_hours:
            self.max_hours = estimated_hours

        # Update actual hours average if provided
        if actual_hours is not None and actual_hours > 0:
            if self.average_actual_hours is None:
                self.average_actual_hours = actual_hours
            else:
                # Running average (approximate - we don't track completed count separately)
                current_total = float(self.average_actual_hours) * (self.usage_count - 1)
                self.average_actual_hours = (current_total + float(actual_hours)) / self.usage_count

            # Update confidence score based on accuracy
            if self.average_estimated_hours > 0:
                accuracy = 100 - min(abs(self.estimate_variance or 0), 100)
                # Weighted average: 70% current confidence, 30% new accuracy
                self.confidence_score = (float(self.confidence_score) * 0.7) + (accuracy * 0.3)

        # Update hourly rate average if provided
        if hourly_rate is not None and hourly_rate > 0:
            if self.average_hourly_rate == 0:
                self.average_hourly_rate = hourly_rate
            else:
                current_total = float(self.average_hourly_rate) * (self.usage_count - 1)
                self.average_hourly_rate = (current_total + float(hourly_rate)) / self.usage_count

        self.save()


class TaskHistory(models.Model):
    """Model tracking historical task usage for analytics and learning"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_history')
    template = models.ForeignKey(TaskTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='history_entries')
    task = models.OneToOneField('Task', on_delete=models.CASCADE, null=True, blank=True, related_name='history')

    # Source tracking
    source_type = models.CharField(max_length=50, help_text="Where this task came from (ai_import, manual, template)")
    source_document = models.ForeignKey('document_processing.ImportedDocument', on_delete=models.SET_NULL, null=True, blank=True)

    # Context
    project_name = models.CharField(max_length=255, blank=True)
    customer_name = models.CharField(max_length=255, blank=True)

    # Time tracking
    estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    actual_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Accuracy metrics
    variance_percentage = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Difference between estimated and actual as percentage")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'template']),
            models.Index(fields=['created_at']),
        ]
        verbose_name_plural = 'Task histories'

    def __str__(self):
        return f"History: {self.task.name if self.task else 'Unknown'} ({self.created_at.date()})"

    def calculate_variance(self):
        """Calculate and update variance percentage"""
        if self.actual_hours and self.estimated_hours > 0:
            self.variance_percentage = ((float(self.actual_hours) - float(self.estimated_hours)) / float(self.estimated_hours)) * 100
            self.save()


class Task(models.Model):
    """Model representing a task within a project"""

    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    template = models.ForeignKey(TaskTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks', help_text="Task template this was created from")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Estimated hours for this task")
    actual_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Actual hours spent on this task")
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Hourly rate for this task")
    order = models.IntegerField(default=0, help_text="Order of task in list")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['order']),
            models.Index(fields=['template']),
        ]

    def __str__(self):
        return f"{self.name} - {self.project.name}"

    @property
    def amount(self):
        """Calculate amount based on actual hours and hourly rate"""
        return float(self.actual_hours) * float(self.hourly_rate)

    @property
    def variance_percentage(self):
        """Calculate variance between estimated and actual hours"""
        if self.actual_hours == 0 or self.estimated_hours == 0:
            return None
        return ((float(self.actual_hours) - float(self.estimated_hours)) / float(self.estimated_hours)) * 100

    def save(self, *args, **kwargs):
        """Override save to update template statistics when task is completed"""
        is_new = self.pk is None
        was_completed = False

        if not is_new:
            old_task = Task.objects.filter(pk=self.pk).first()
            if old_task and old_task.status != 'completed' and self.status == 'completed':
                was_completed = True

        super().save(*args, **kwargs)

        # Update template statistics when task is completed
        if was_completed and self.template and self.actual_hours > 0:
            self.template.update_statistics(
                estimated_hours=self.estimated_hours,
                actual_hours=self.actual_hours,
                hourly_rate=self.hourly_rate
            )
