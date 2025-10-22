from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    """Serializer for leads"""
    days_to_close = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'phone', 'company', 'status', 'value', 
            'probability', 'source', 'notes', 'expected_close_date', 
            'created_at', 'updated_at', 'days_to_close', 'color'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def get_days_to_close(self, obj):
        if obj.expected_close_date:
            from django.utils import timezone
            return (obj.expected_close_date - timezone.now().date()).days
        return None
    
    def get_color(self, obj):
        """Return color based on status for kanban display"""
        colors = {
            'new': '#3B82F6',  # blue
            'contacted': '#F59E0B',  # amber
            'qualified': '#10B981',  # emerald
            'proposal': '#8B5CF6',  # violet
            'negotiation': '#EF4444',  # red
            'won': '#059669',  # green
            'lost': '#6B7280',  # gray
        }
        return colors.get(obj.status, '#6B7280')


class LeadListSerializer(serializers.ModelSerializer):
    """Lighter serializer for lead lists"""
    days_to_close = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'company', 'status', 'value', 
            'probability', 'expected_close_date', 'created_at', 'days_to_close'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_days_to_close(self, obj):
        if obj.expected_close_date:
            from django.utils import timezone
            return (obj.expected_close_date - timezone.now().date()).days
        return None


class LeadStatsSerializer(serializers.Serializer):
    """Serializer for lead statistics"""
    total_leads = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    conversion_rate = serializers.FloatField()
    status_breakdown = serializers.DictField()
    source_breakdown = serializers.DictField()

