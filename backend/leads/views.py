from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q
from decimal import Decimal

from .models import Lead
from .serializers import LeadSerializer, LeadListSerializer, LeadStatsSerializer


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing leads.
    Provides CRUD operations, kanban status management, and pipeline statistics.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'email', 'company']
    filterset_fields = ['status', 'source']
    ordering_fields = ['name', 'value', 'expected_close_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Lead.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LeadListSerializer
        elif self.action == 'stats':
            return LeadStatsSerializer
        return LeadSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get lead pipeline statistics"""
        leads = self.get_queryset()
        
        total_value = leads.aggregate(Sum('value'))['value__sum'] or Decimal('0')
        won_leads = leads.filter(status='won').count()
        total_leads = leads.count()
        conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
        
        # Status breakdown
        status_breakdown = {}
        for status_choice, status_label in Lead.STATUS_CHOICES:
            count = leads.filter(status=status_choice).count()
            status_breakdown[status_choice] = {
                'label': status_label,
                'count': count,
                'value': float(leads.filter(status=status_choice).aggregate(Sum('value'))['value__sum'] or 0)
            }
        
        # Source breakdown
        source_breakdown = {}
        for source_choice, source_label in Lead.SOURCE_CHOICES:
            count = leads.filter(source=source_choice).count()
            source_breakdown[source_choice] = {
                'label': source_label,
                'count': count
            }
        
        data = {
            'total_leads': total_leads,
            'total_value': total_value,
            'conversion_rate': conversion_rate,
            'status_breakdown': status_breakdown,
            'source_breakdown': source_breakdown
        }
        
        serializer = self.get_serializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update lead status (for kanban drag-drop)"""
        lead = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': _('Status is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in dict(Lead.STATUS_CHOICES):
            return Response(
                {'error': _('Invalid status: %(status)s') % {'status': new_status}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lead.status = new_status
        lead.save()
        
        serializer = self.get_serializer(lead)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def kanban_board(self, request):
        """Get leads organized by status for kanban board"""
        leads = self.get_queryset()
        
        kanban_data = {}
        for status_choice, status_label in Lead.STATUS_CHOICES:
            status_leads = leads.filter(status=status_choice).values(
                'id', 'name', 'email', 'company', 'value', 'probability', 
                'expected_close_date', 'created_at'
            )
            kanban_data[status_choice] = {
                'label': status_label,
                'leads': list(status_leads),
                'count': len(status_leads)
            }
        
        return Response(kanban_data)
