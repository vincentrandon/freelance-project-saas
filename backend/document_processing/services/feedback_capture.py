"""
Feedback capture service for AI learning.
Automatically captures user corrections and ratings.
"""

import logging
from typing import Dict, Any, Optional
from deepdiff import DeepDiff
from django.contrib.auth.models import User
from django.db import models

from ..models import (
    ImportedDocument,
    ImportPreview,
    AIExtractionFeedback,
    AIModelVersion
)

logger = logging.getLogger(__name__)


class FeedbackCaptureService:
    """Service for capturing user corrections and feedback"""

    @staticmethod
    def calculate_edit_magnitude(original: Any, corrected: Any) -> str:
        """
        Calculate the severity of an edit.

        Returns: 'none', 'minor', 'moderate', or 'major'
        """
        if original == corrected:
            return 'none'

        # Convert to strings for comparison
        orig_str = str(original)
        corr_str = str(corrected)

        # Calculate character difference percentage
        if len(orig_str) == 0:
            return 'major'

        diff_ratio = abs(len(orig_str) - len(corr_str)) / len(orig_str)

        # Check similarity
        from difflib import SequenceMatcher
        similarity = SequenceMatcher(None, orig_str, corr_str).ratio()

        if similarity > 0.9:
            return 'minor'
        elif similarity > 0.6:
            return 'moderate'
        else:
            return 'major'

    @staticmethod
    def get_active_model_version() -> Optional[AIModelVersion]:
        """Get the currently active AI model version"""
        return AIModelVersion.objects.filter(is_active=True).first()

    @classmethod
    def capture_task_clarification(
        cls,
        user: User,
        preview: ImportPreview,
        task_index: int,
        original_task: Dict[str, Any],
        refined_task: Dict[str, Any],
        original_clarity_score: int,
        new_clarity_score: int,
        qa_pairs: Dict[str, str]
    ) -> AIExtractionFeedback:
        """
        Capture feedback from task clarification flow.

        Args:
            user: User who refined the task
            preview: ImportPreview instance
            task_index: Index of the task in tasks array
            original_task: Original task data from AI
            refined_task: Refined task after Q&A
            original_clarity_score: Original clarity score (0-100)
            new_clarity_score: New clarity score after refinement
            qa_pairs: Dictionary of question IDs to answers

        Returns:
            Created AIExtractionFeedback instance
        """
        # Calculate edit magnitude
        magnitude = cls.calculate_edit_magnitude(
            original_task.get('name', ''),
            refined_task.get('name', '')
        )

        # Determine auto-rating based on improvement
        improvement = new_clarity_score - original_clarity_score
        if improvement >= 30:
            auto_rating = 'excellent'
        elif improvement >= 20:
            auto_rating = 'good'
        else:
            auto_rating = 'needs_improvement'

        feedback = AIExtractionFeedback.objects.create(
            user=user,
            document=preview.document,
            preview=preview,
            feedback_type='task_clarification',
            original_data={
                'name': original_task.get('name', ''),
                'description': original_task.get('description', ''),
                'estimated_hours': original_task.get('estimated_hours'),
                'clarity_score': original_clarity_score
            },
            corrected_data={
                'name': refined_task.get('name', ''),
                'description': refined_task.get('description', ''),
                'estimated_hours': refined_task.get('estimated_hours'),
                'clarity_score': new_clarity_score,
                'qa_pairs': qa_pairs,
                'refinement_confidence': refined_task.get('refinement_confidence', 0)
            },
            field_path=f'tasks[{task_index}]',
            original_confidence=original_clarity_score,
            was_edited=True,
            edit_magnitude=magnitude,
            user_rating=auto_rating,  # Auto-assigned for clarifications
            model_version_used=cls.get_active_model_version()
        )

        logger.info(
            f"Captured task clarification feedback: {feedback.id} "
            f"(improvement: +{improvement}%, magnitude: {magnitude})"
        )

        return feedback

    @classmethod
    def capture_manual_edits(
        cls,
        user: User,
        preview: ImportPreview,
        original_data: Dict[str, Any],
        updated_data: Dict[str, Any]
    ) -> list:
        """
        Capture feedback from manual edits in preview.
        Uses DeepDiff to detect all changes.

        Args:
            user: User who made edits
            preview: ImportPreview instance
            original_data: Original extracted data
            updated_data: User-edited data

        Returns:
            List of created AIExtractionFeedback instances
        """
        feedbacks = []

        # Detect changes using DeepDiff
        diff = DeepDiff(
            original_data,
            updated_data,
            ignore_order=True,
            verbose_level=2
        )

        # Process value changes
        if 'values_changed' in diff:
            for path, change_data in diff['values_changed'].items():
                # Clean path (remove DeepDiff notation)
                clean_path = path.replace("root['", "").replace("']", "").replace("[", ".").replace("]", "")

                old_value = change_data.get('old_value')
                new_value = change_data.get('new_value')

                magnitude = cls.calculate_edit_magnitude(old_value, new_value)

                feedback = AIExtractionFeedback.objects.create(
                    user=user,
                    document=preview.document,
                    preview=preview,
                    feedback_type='manual_edit',
                    original_data={'value': old_value},
                    corrected_data={'value': new_value},
                    field_path=clean_path,
                    original_confidence=preview.parse_result.overall_confidence,
                    was_edited=True,
                    edit_magnitude=magnitude,
                    # Rating will be set later via rating modal
                    model_version_used=cls.get_active_model_version()
                )

                feedbacks.append(feedback)

        # Process added items
        if 'dictionary_item_added' in diff:
            for path in diff['dictionary_item_added']:
                clean_path = path.replace("root['", "").replace("']", "").replace("[", ".").replace("]", "")

                feedback = AIExtractionFeedback.objects.create(
                    user=user,
                    document=preview.document,
                    preview=preview,
                    feedback_type='field_correction',
                    original_data={'status': 'missing'},
                    corrected_data={'status': 'added', 'path': clean_path},
                    field_path=clean_path,
                    original_confidence=preview.parse_result.overall_confidence,
                    was_edited=True,
                    edit_magnitude='moderate',
                    model_version_used=cls.get_active_model_version()
                )

                feedbacks.append(feedback)

        logger.info(f"Captured {len(feedbacks)} manual edit feedbacks for preview {preview.id}")

        return feedbacks

    @classmethod
    def capture_approval_without_edits(
        cls,
        user: User,
        preview: ImportPreview
    ) -> AIExtractionFeedback:
        """
        Capture implicit positive feedback when user approves without making edits.
        This is a strong signal that AI extraction was excellent.

        Args:
            user: User who approved
            preview: ImportPreview instance

        Returns:
            Created AIExtractionFeedback instance
        """
        feedback = AIExtractionFeedback.objects.create(
            user=user,
            document=preview.document,
            preview=preview,
            feedback_type='implicit_positive',
            original_data={
                'customer': preview.customer_data,
                'project': preview.project_data,
                'tasks': preview.tasks_data,
                'invoice_estimate': preview.invoice_estimate_data
            },
            corrected_data={
                'customer': preview.customer_data,
                'project': preview.project_data,
                'tasks': preview.tasks_data,
                'invoice_estimate': preview.invoice_estimate_data
            },
            field_path='all',
            original_confidence=preview.parse_result.overall_confidence,
            was_edited=False,
            edit_magnitude='none',
            user_rating='excellent',  # Auto-assign excellent rating
            model_version_used=cls.get_active_model_version()
        )

        logger.info(f"Captured implicit positive feedback for preview {preview.id}")

        return feedback

    @classmethod
    def add_user_rating(
        cls,
        feedback_id: int,
        rating: str,
        comment: Optional[str] = None
    ) -> AIExtractionFeedback:
        """
        Add user rating to existing feedback.

        Args:
            feedback_id: ID of feedback to rate
            rating: User rating (poor, needs_improvement, good, excellent)
            comment: Optional user comment

        Returns:
            Updated AIExtractionFeedback instance
        """
        feedback = AIExtractionFeedback.objects.get(id=feedback_id)
        feedback.user_rating = rating

        if comment:
            feedback.rating_comment = comment

        feedback.save()

        logger.info(f"Added user rating '{rating}' to feedback {feedback_id}")

        return feedback

    @classmethod
    def bulk_rate_preview(
        cls,
        preview: ImportPreview,
        rating: str,
        comment: Optional[str] = None
    ) -> int:
        """
        Add rating to all feedback items for a preview.
        Used when user rates the entire import.

        Args:
            preview: ImportPreview instance
            rating: User rating
            comment: Optional comment

        Returns:
            Number of feedback items updated
        """
        feedbacks = AIExtractionFeedback.objects.filter(
            preview=preview,
            user_rating__isnull=True  # Only update unrated items
        )

        count = feedbacks.update(
            user_rating=rating,
            rating_comment=comment
        )

        logger.info(f"Bulk rated {count} feedback items for preview {preview.id} as '{rating}'")

        return count

    @classmethod
    def get_preview_feedback_summary(cls, preview: ImportPreview) -> Dict[str, Any]:
        """
        Get summary of feedback collected for a preview.

        Returns:
            Dict with feedback statistics
        """
        feedbacks = AIExtractionFeedback.objects.filter(preview=preview)

        total_count = feedbacks.count()

        if total_count == 0:
            return {
                'total_feedback': 0,
                'has_edits': False,
                'needs_rating': False
            }

        rated_count = feedbacks.filter(user_rating__isnull=False).count()

        return {
            'total_feedback': total_count,
            'has_edits': feedbacks.filter(was_edited=True).exists(),
            'needs_rating': rated_count < total_count,
            'rated_count': rated_count,
            'unrated_count': total_count - rated_count,
            'average_rating': feedbacks.exclude(user_rating__isnull=True).aggregate(
                avg=models.Avg('user_rating')
            )['avg']
        }
