from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Customer, Attachment
from .serializers import CustomerSerializer, CustomerListSerializer, AttachmentSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customers.
    Provides CRUD operations and attachment management.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'email', 'company']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Customer.objects.filter(user=self.request.user).prefetch_related('attachments')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerSerializer
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        """Upload an attachment for a customer"""
        customer = self.get_object()
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attachment = Attachment.objects.create(
            customer=customer,
            file=file,
            file_name=file.name,
            file_type=file.content_type,
            file_size=file.size
        )
        
        serializer = AttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def attachments(self, request, pk=None):
        """List all attachments for a customer"""
        customer = self.get_object()
        attachments = customer.attachments.all()
        serializer = AttachmentSerializer(attachments, many=True)
        return Response(serializer.data)


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing attachments.
    Mainly used for deletion.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AttachmentSerializer
    http_method_names = ['get', 'delete']
    
    def get_queryset(self):
        return Attachment.objects.filter(customer__user=self.request.user)
