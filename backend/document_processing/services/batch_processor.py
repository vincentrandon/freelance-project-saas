"""
Batch processing service for handling multiple document imports efficiently.
Includes pattern detection, bulk operations, and smart filtering.
"""

import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict
from django.db.models import Q, Count, Avg
from django.contrib.auth.models import User

from ..models import ImportPreview, ImportedDocument
from customers.models import Customer
from projects.models import Project

logger = logging.getLogger(__name__)


class BatchProcessor:
    """Service for batch operations on import previews"""

    def __init__(self, user: User):
        self.user = user

    def get_batch_summary(self) -> Dict[str, Any]:
        """
        Get overview statistics for all pending imports.

        Returns:
            Dict with counts, scores, and recommendations
        """
        # Get all pending or needs_clarification previews
        previews = ImportPreview.objects.filter(
            document__user=self.user,
            status__in=['pending_review', 'needs_clarification']
        ).select_related('document', 'matched_customer', 'matched_project')

        total_count = previews.count()

        if total_count == 0:
            return {
                'total_pending': 0,
                'auto_approve_eligible': 0,
                'needs_attention': 0,
                'needs_clarification': 0,
                'has_conflicts': 0,
                'has_warnings': 0,
                'average_confidence': 100,
                'ready_for_batch_approve': []
            }

        # Calculate stats
        auto_approve_count = previews.filter(auto_approve_eligible=True).count()
        needs_clarification_count = previews.filter(needs_clarification=True).count()
        has_conflicts = previews.filter(conflicts__len__gt=0).count()
        has_warnings = previews.filter(warnings__len__gt=0).count()

        # Calculate average confidence
        avg_confidence = previews.aggregate(
            avg_customer=Avg('customer_match_confidence'),
            avg_task_quality=Avg('overall_task_quality_score')
        )
        average_confidence = (
            (avg_confidence['avg_customer'] or 0) +
            (avg_confidence['avg_task_quality'] or 0)
        ) // 2

        # Get IDs eligible for auto-approve
        ready_for_batch = list(
            previews.filter(auto_approve_eligible=True)
            .values_list('id', flat=True)
        )

        # Needs attention = has conflicts/warnings or low confidence
        needs_attention = has_conflicts + has_warnings

        return {
            'total_pending': total_count,
            'auto_approve_eligible': auto_approve_count,
            'needs_attention': needs_attention,
            'needs_clarification': needs_clarification_count,
            'has_conflicts': has_conflicts,
            'has_warnings': has_warnings,
            'average_confidence': average_confidence,
            'ready_for_batch_approve': ready_for_batch
        }

    def detect_patterns(self, preview_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """
        Detect patterns in pending imports (same customer, duplicates, etc.)

        Args:
            preview_ids: Optional list of preview IDs to analyze. If None, analyzes all pending.

        Returns:
            List of detected patterns with suggestions
        """
        patterns = []

        # Get previews to analyze
        queryset = ImportPreview.objects.filter(
            document__user=self.user,
            status__in=['pending_review', 'needs_clarification']
        ).select_related('document', 'matched_customer', 'matched_project')

        if preview_ids:
            queryset = queryset.filter(id__in=preview_ids)

        previews = list(queryset)

        if len(previews) < 2:
            return patterns

        # Pattern 1: Same customer multiple times
        customer_groups = defaultdict(list)
        for preview in previews:
            customer_name = preview.customer_data.get('name', '').lower().strip()
            if customer_name:
                customer_groups[customer_name].append(preview)

        for customer_name, preview_list in customer_groups.items():
            if len(preview_list) >= 2:
                # Check if they have matched customer
                matched_customer = None
                for p in preview_list:
                    if p.matched_customer:
                        matched_customer = p.matched_customer
                        break

                total_amount = sum(
                    p.invoice_estimate_data.get('total', 0)
                    for p in preview_list
                )

                patterns.append({
                    'type': 'same_customer',
                    'priority': 'high',
                    'title': f'Multiple imports for {customer_name.title()}',
                    'description': f'{len(preview_list)} documents from the same customer',
                    'preview_ids': [p.id for p in preview_list],
                    'matched_customer': {
                        'id': matched_customer.id,
                        'name': matched_customer.name
                    } if matched_customer else None,
                    'suggestion': 'Consider merging into a single project' if not matched_customer else 'Link all to existing customer',
                    'metadata': {
                        'count': len(preview_list),
                        'total_amount': float(total_amount),
                        'document_types': [p.document.document_type for p in preview_list]
                    }
                })

        # Pattern 2: Potential duplicates (same amount, similar dates)
        for i, preview1 in enumerate(previews):
            for preview2 in previews[i+1:]:
                # Check if amounts are very similar
                amount1 = preview1.invoice_estimate_data.get('total', 0)
                amount2 = preview2.invoice_estimate_data.get('total', 0)

                if amount1 > 0 and amount2 > 0:
                    diff_percentage = abs(amount1 - amount2) / max(amount1, amount2) * 100

                    if diff_percentage < 1:  # Less than 1% difference
                        # Check customer name similarity
                        name1 = preview1.customer_data.get('name', '').lower()
                        name2 = preview2.customer_data.get('name', '').lower()

                        if name1 and name2 and (name1 == name2 or name1 in name2 or name2 in name1):
                            patterns.append({
                                'type': 'potential_duplicate',
                                'priority': 'critical',
                                'title': 'Potential duplicate detected',
                                'description': f'Two documents with identical amounts ({amount1}€) and similar customer names',
                                'preview_ids': [preview1.id, preview2.id],
                                'suggestion': 'Review carefully - one might be a duplicate',
                                'metadata': {
                                    'amount': float(amount1),
                                    'customer_name': name1.title(),
                                    'file_names': [
                                        preview1.document.file_name,
                                        preview2.document.file_name
                                    ]
                                }
                            })

        # Pattern 3: High volume of estimates (might want to create project first)
        estimate_count = sum(1 for p in previews if p.document.document_type == 'estimate')
        if estimate_count >= 5:
            estimate_previews = [p for p in previews if p.document.document_type == 'estimate']
            patterns.append({
                'type': 'bulk_estimates',
                'priority': 'medium',
                'title': f'{estimate_count} estimates pending',
                'description': 'Large number of estimates detected',
                'preview_ids': [p.id for p in estimate_previews],
                'suggestion': 'Consider reviewing estimate workflow or converting to invoices',
                'metadata': {
                    'count': estimate_count,
                    'total_value': sum(p.invoice_estimate_data.get('total', 0) for p in estimate_previews)
                }
            })

        # Pattern 4: Same project name across multiple documents
        project_groups = defaultdict(list)
        for preview in previews:
            project_name = preview.project_data.get('name', '').lower().strip()
            if project_name:
                project_groups[project_name].append(preview)

        for project_name, preview_list in project_groups.items():
            if len(preview_list) >= 3:
                patterns.append({
                    'type': 'same_project',
                    'priority': 'medium',
                    'title': f'Multiple documents for project: {project_name.title()}',
                    'description': f'{len(preview_list)} documents reference the same project',
                    'preview_ids': [p.id for p in preview_list],
                    'suggestion': 'These will be merged into the same project automatically',
                    'metadata': {
                        'count': len(preview_list),
                        'project_name': project_name.title()
                    }
                })

        # Sort patterns by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        patterns.sort(key=lambda x: priority_order.get(x['priority'], 999))

        logger.info(f"Detected {len(patterns)} patterns in {len(previews)} previews")
        return patterns

    def bulk_approve(self, preview_ids: List[int]) -> Dict[str, Any]:
        """
        Approve multiple previews at once.

        Args:
            preview_ids: List of preview IDs to approve

        Returns:
            Dict with success/failure results
        """
        previews = ImportPreview.objects.filter(
            id__in=preview_ids,
            document__user=self.user,
            status='pending_review'
        )

        approved_ids = []
        failed = []

        for preview in previews:
            try:
                preview.status = 'approved'
                preview.save()

                # Trigger entity creation task
                from ..tasks import create_entities_from_preview
                create_entities_from_preview.delay(preview.id)

                approved_ids.append(preview.id)
            except Exception as e:
                logger.error(f"Failed to approve preview {preview.id}: {str(e)}")
                failed.append({
                    'preview_id': preview.id,
                    'error': str(e)
                })

        return {
            'success': len(approved_ids),
            'failed': len(failed),
            'approved_ids': approved_ids,
            'errors': failed
        }

    def bulk_reject(self, preview_ids: List[int]) -> Dict[str, Any]:
        """
        Reject multiple previews at once.

        Args:
            preview_ids: List of preview IDs to reject

        Returns:
            Dict with success/failure results
        """
        from django.utils import timezone

        previews = ImportPreview.objects.filter(
            id__in=preview_ids,
            document__user=self.user,
            status='pending_review'
        )

        rejected_ids = []
        failed = []

        for preview in previews:
            try:
                preview.status = 'rejected'
                preview.reviewed_at = timezone.now()
                preview.save()

                preview.document.status = 'rejected'
                preview.document.save()

                rejected_ids.append(preview.id)
            except Exception as e:
                logger.error(f"Failed to reject preview {preview.id}: {str(e)}")
                failed.append({
                    'preview_id': preview.id,
                    'error': str(e)
                })

        return {
            'success': len(rejected_ids),
            'failed': len(failed),
            'rejected_ids': rejected_ids,
            'errors': failed
        }

    def auto_approve_safe_batch(self, confidence_threshold: int = 90) -> Dict[str, Any]:
        """
        Automatically approve "safe" imports that meet strict criteria.

        Criteria:
        - Overall confidence >= threshold
        - No conflicts
        - Task quality >= 80%
        - auto_approve_eligible = True

        Args:
            confidence_threshold: Minimum confidence score (default 90)

        Returns:
            Dict with approval results
        """
        # Get eligible previews
        previews = ImportPreview.objects.filter(
            document__user=self.user,
            status='pending_review',
            auto_approve_eligible=True,
            overall_task_quality_score__gte=80,
            conflicts__len=0
        ).select_related('document', 'parse_result')

        # Additional filter: parse confidence >= threshold
        eligible = []
        for preview in previews:
            if preview.parse_result.overall_confidence >= confidence_threshold:
                eligible.append(preview.id)

        if not eligible:
            return {
                'success': 0,
                'message': 'No previews meet auto-approve criteria',
                'approved_ids': []
            }

        # Bulk approve
        result = self.bulk_approve(eligible)
        result['message'] = f'Auto-approved {result["success"]} safe imports'

        return result

    def get_filtered_previews(
        self,
        filters: Dict[str, Any],
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> List[ImportPreview]:
        """
        Get filtered and sorted list of previews.

        Args:
            filters: Dict with filter criteria
            sort_by: Field to sort by
            sort_order: 'asc' or 'desc'

        Returns:
            Filtered queryset
        """
        queryset = ImportPreview.objects.filter(
            document__user=self.user,
            status__in=['pending_review', 'needs_clarification']
        ).select_related('document', 'matched_customer', 'matched_project', 'parse_result')

        # Apply filters
        if filters.get('confidence') == 'high':
            queryset = queryset.filter(overall_task_quality_score__gte=90)
        elif filters.get('confidence') == 'medium':
            queryset = queryset.filter(
                overall_task_quality_score__gte=70,
                overall_task_quality_score__lt=90
            )
        elif filters.get('confidence') == 'low':
            queryset = queryset.filter(overall_task_quality_score__lt=70)

        if filters.get('document_type'):
            queryset = queryset.filter(document__document_type=filters['document_type'])

        if filters.get('has_conflicts'):
            queryset = queryset.filter(conflicts__len__gt=0)

        if filters.get('has_warnings'):
            queryset = queryset.filter(warnings__len__gt=0)

        if filters.get('auto_approve_eligible'):
            queryset = queryset.filter(auto_approve_eligible=True)

        if filters.get('customer_action'):
            queryset = queryset.filter(customer_action=filters['customer_action'])

        # Sorting
        sort_field = sort_by
        if sort_order == 'desc':
            sort_field = f'-{sort_field}'

        queryset = queryset.order_by(sort_field)

        return list(queryset)
