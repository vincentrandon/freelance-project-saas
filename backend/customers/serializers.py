from rest_framework import serializers
from .models import Customer, Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for customer attachments"""
    
    class Meta:
        model = Attachment
        fields = ['id', 'file', 'file_name', 'file_type', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for customers"""
    attachments = AttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'company', 'address', 
            'notes', 'created_at', 'updated_at', 'attachments'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CustomerListSerializer(serializers.ModelSerializer):
    """Lighter serializer for customer lists"""
    attachments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'company', 
            'created_at', 'updated_at', 'attachments_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()

