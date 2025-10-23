from rest_framework import serializers
from .models import CRA, CRASignature
from customers.serializers import CustomerSerializer
from projects.serializers import ProjectSerializer, TaskSerializer
from django.utils.translation import gettext_lazy as _


class CRAListSerializer(serializers.ModelSerializer):
    """Serializer for listing CRAs (lightweight)"""
    
    customer = CustomerSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    period_display = serializers.ReadOnlyField()
    can_edit = serializers.ReadOnlyField()
    can_delete = serializers.ReadOnlyField()
    
    class Meta:
        model = CRA
        fields = [
            'id', 'customer', 'project', 'period_month', 'period_year', 
            'period_display', 'status', 'daily_rate', 'total_days', 
            'total_amount', 'currency', 'pdf_file', 'created_at', 
            'updated_at', 'submitted_at', 'validated_at', 'rejected_at',
            'can_edit', 'can_delete'
        ]


class TaskDataSerializer(serializers.Serializer):
    """Serializer for inline task creation/update in CRA

    worked_dates now supports both full days and half-days:
    - Full day: "2025-10-15"
    - Morning: "2025-10-15:AM"
    - Afternoon: "2025-10-15:PM"
    """
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    worked_dates = serializers.ListField(
        child=serializers.CharField(),  # Changed to CharField to support :AM/:PM suffixes
        required=False,
        default=list
    )


class CRADetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed CRA view"""

    customer = CustomerSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    period_display = serializers.ReadOnlyField()
    can_edit = serializers.ReadOnlyField()
    can_delete = serializers.ReadOnlyField()

    # Write-only fields for creating/updating
    customer_id = serializers.IntegerField(write_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    # New: inline task creation/update
    tasks_data = TaskDataSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = CRA
        fields = [
            'id', 'customer', 'customer_id', 'project', 'project_id',
            'period_month', 'period_year', 'period_display', 'status',
            'tasks', 'task_ids', 'tasks_data', 'daily_rate', 'total_days', 'total_amount',
            'currency', 'selected_work_dates', 'notes', 'pdf_file', 'created_at', 'updated_at',
            'submitted_at', 'validated_at', 'rejected_at', 'rejection_reason',
            'can_edit', 'can_delete'
        ]
        read_only_fields = [
            'total_days', 'total_amount', 'submitted_at', 'validated_at',
            'rejected_at', 'pdf_file'
        ]
    
    def validate(self, data):
        """Validate CRA data"""
        # Check unique constraint: one CRA per customer per month
        user = self.context['request'].user
        customer_id = data.get('customer_id')
        period_month = data.get('period_month')
        period_year = data.get('period_year')

        if customer_id and period_month and period_year:
            qs = CRA.objects.filter(
                user=user,
                customer_id=customer_id,
                period_month=period_month,
                period_year=period_year
            )

            # Exclude current instance when updating
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    _("A CRA already exists for this customer and period.")
                )

        # Validate period_month
        if period_month and not (1 <= period_month <= 12):
            raise serializers.ValidationError(
                {"period_month": _("Month must be between 1 and 12.")}
            )

        # Validate selected_work_dates vs tasks_data assigned dates
        selected_work_dates = data.get('selected_work_dates', [])
        tasks_data = data.get('tasks_data', [])

        if tasks_data and selected_work_dates:
            # Calculate total assigned days from tasks
            all_assigned_dates = []
            for task_data in tasks_data:
                all_assigned_dates.extend(task_data.get('worked_dates', []))

            # Check if assigned dates exceed selected dates
            if len(all_assigned_dates) > len(selected_work_dates):
                raise serializers.ValidationError(
                    {"tasks_data": _("Cannot assign more days than selected in calendar.")}
                )

        # Validate tasks belong to customer and not in other CRAs (for existing tasks)
        task_ids = data.get('task_ids', [])
        if task_ids:
            from projects.models import Task
            tasks = Task.objects.filter(id__in=task_ids, project__user=user)

            # Check tasks belong to the selected customer
            if customer_id:
                invalid_tasks = tasks.exclude(project__customer_id=customer_id)
                if invalid_tasks.exists():
                    raise serializers.ValidationError(
                        {"task_ids": _("All tasks must belong to the selected customer.")}
                    )

            # Check tasks are not already in another CRA (excluding current)
            for task in tasks:
                existing_cra_qs = task.cras.all()
                if self.instance:
                    existing_cra_qs = existing_cra_qs.exclude(pk=self.instance.pk)

                if existing_cra_qs.exists():
                    raise serializers.ValidationError(
                        {"task_ids": _(f"Task '{task.name}' is already included in another CRA.")}
                    )

        return data
    
    def _get_or_create_default_project(self, user, customer):
        """Get or create default project for customer"""
        from projects.models import Project

        project = Project.objects.filter(customer=customer, user=user).first()
        if not project:
            project = Project.objects.create(
                user=user,
                customer=customer,
                name=f"CRA - {customer.name}",
                description="Auto-created project for CRA tasks"
            )
        return project

    def _calculate_worked_days(self, worked_dates):
        """
        Calculate total worked days from date strings.
        Supports:
        - Full day: "2025-10-15" = 1 day
        - Morning: "2025-10-15:AM" = 0.5 days
        - Afternoon: "2025-10-15:PM" = 0.5 days
        """
        total_days = 0
        for date_str in worked_dates:
            if ':AM' in date_str or ':PM' in date_str:
                total_days += 0.5
            else:
                total_days += 1
        return total_days

    def create(self, validated_data):
        """Create CRA and associate tasks"""
        from projects.models import Task

        task_ids = validated_data.pop('task_ids', [])
        tasks_data = validated_data.pop('tasks_data', [])
        validated_data['user'] = self.context['request'].user
        user = validated_data['user']

        cra = CRA.objects.create(**validated_data)

        created_tasks = []

        # Handle inline task creation/update
        if tasks_data:
            customer = cra.customer
            project = self._get_or_create_default_project(user, customer)

            for task_data in tasks_data:
                task_id = task_data.get('id')
                worked_dates = task_data.get('worked_dates', [])
                worked_days = self._calculate_worked_days(worked_dates)

                if task_id:
                    # Update existing task
                    task = Task.objects.get(id=task_id, project__user=user)
                    task.worked_dates = [str(d) for d in worked_dates]
                    task.worked_days = worked_days
                    task.save()
                    created_tasks.append(task)
                else:
                    # Create new task
                    task = Task.objects.create(
                        project=project,
                        name=task_data['name'],
                        description=task_data.get('description', ''),
                        worked_dates=[str(d) for d in worked_dates],
                        worked_days=worked_days
                    )
                    created_tasks.append(task)

        # Handle existing task IDs (legacy support)
        if task_ids:
            existing_tasks = Task.objects.filter(id__in=task_ids)
            created_tasks.extend(list(existing_tasks))

        if created_tasks:
            cra.tasks.set(created_tasks)
            cra.calculate_totals()

        return cra

    def update(self, instance, validated_data):
        """Update CRA and tasks"""
        from projects.models import Task

        task_ids = validated_data.pop('task_ids', None)
        tasks_data = validated_data.pop('tasks_data', None)

        # Update CRA fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        updated_tasks = []

        # Handle inline task creation/update
        if tasks_data is not None:
            customer = instance.customer
            user = self.context['request'].user
            project = self._get_or_create_default_project(user, customer)

            for task_data in tasks_data:
                task_id = task_data.get('id')
                worked_dates = task_data.get('worked_dates', [])
                worked_days = self._calculate_worked_days(worked_dates)

                if task_id:
                    # Update existing task
                    task = Task.objects.get(id=task_id, project__user=user)
                    task.worked_dates = [str(d) for d in worked_dates]
                    task.worked_days = worked_days
                    task.save()
                    updated_tasks.append(task)
                else:
                    # Create new task
                    task = Task.objects.create(
                        project=project,
                        name=task_data['name'],
                        description=task_data.get('description', ''),
                        worked_dates=[str(d) for d in worked_dates],
                        worked_days=worked_days
                    )
                    updated_tasks.append(task)

        # Handle existing task IDs (legacy support)
        elif task_ids is not None:
            existing_tasks = Task.objects.filter(id__in=task_ids)
            updated_tasks.extend(list(existing_tasks))

        if updated_tasks or tasks_data is not None:
            instance.tasks.set(updated_tasks)
            instance.calculate_totals()

        return instance


class CRASignatureSerializer(serializers.ModelSerializer):
    """Serializer for CRA signature requests"""
    
    cra = CRAListSerializer(read_only=True)
    signature_url = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = CRASignature
        fields = [
            'id', 'cra', 'signer_name', 'signer_email', 'signer_company',
            'token', 'status', 'created_at', 'expires_at', 'signed_at',
            'viewed_at', 'signature_method', 'signature_image',
            'decline_reason', 'email_sent_at', 'signature_url', 'is_expired'
        ]
        read_only_fields = [
            'token', 'status', 'signed_at', 'viewed_at', 'signature_method',
            'signature_image', 'email_sent_at'
        ]


class CRASignatureSubmitSerializer(serializers.Serializer):
    """Serializer for submitting a signature"""
    
    signature_method = serializers.ChoiceField(
        choices=['draw', 'upload', 'type', 'digital']
    )
    signature_data = serializers.JSONField(required=False)
    signature_image = serializers.ImageField(required=False)
    
    def validate(self, data):
        """Ensure required fields based on signature method"""
        method = data.get('signature_method')
        
        if method == 'draw' and not data.get('signature_data'):
            raise serializers.ValidationError(
                {"signature_data": _("Signature data is required for drawn signatures.")}
            )
        
        if method == 'upload' and not data.get('signature_image'):
            raise serializers.ValidationError(
                {"signature_image": _("Signature image is required for uploaded signatures.")}
            )
        
        if method == 'type' and not data.get('signature_data', {}).get('typed_name'):
            raise serializers.ValidationError(
                {"signature_data": _("Typed name is required for typed signatures.")}
            )
        
        return data


class MonthlyStatsSerializer(serializers.Serializer):
    """Serializer for monthly CRA statistics"""
    
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_cras = serializers.IntegerField()
    total_draft = serializers.IntegerField()
    total_pending = serializers.IntegerField()
    total_validated = serializers.IntegerField()
    total_rejected = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_days = serializers.DecimalField(max_digits=10, decimal_places=2)
    cras = CRAListSerializer(many=True)
