"""
Task Catalogue Service - Manages task template matching, suggestions, and auto-cataloguing.
Uses fuzzy matching to find similar task templates and provides AI-powered suggestions.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal
from django.db.models import Q, Avg, Count, Sum
from fuzzywuzzy import fuzz, process

from projects.models import TaskTemplate, Task, TaskHistory

logger = logging.getLogger(__name__)

# Matching thresholds
TASK_NAME_MATCH_THRESHOLD = 80  # 80% similarity = potential match
TASK_NAME_MERGE_THRESHOLD = 90  # 90% similarity = auto-merge


class TaskCatalogueService:
    """Service for managing task templates and providing intelligent suggestions"""

    def __init__(self, user):
        self.user = user

    def find_similar_templates(
        self,
        task_name: str,
        task_description: str = "",
        category: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar task templates using fuzzy matching.

        Args:
            task_name: Name of the task to match
            task_description: Optional description for better matching
            category: Optional category filter
            limit: Maximum number of results

        Returns:
            List of similar templates with match scores
        """
        # Get all active templates for user
        queryset = TaskTemplate.objects.filter(user=self.user, is_active=True)

        if category:
            queryset = queryset.filter(category=category)

        templates = list(queryset)

        if not templates:
            return []

        # Perform fuzzy matching on names
        template_names = {template.name: template for template in templates}
        matches = process.extract(
            task_name,
            template_names.keys(),
            scorer=fuzz.token_sort_ratio,
            limit=limit
        )

        results = []
        for matched_name, score in matches:
            if score >= TASK_NAME_MATCH_THRESHOLD:
                template = template_names[matched_name]
                results.append({
                    'template': template,
                    'match_score': score,
                    'match_type': 'exact' if score >= 95 else 'fuzzy',
                    'suggested_hours': float(template.average_estimated_hours),
                    'suggested_rate': float(template.average_hourly_rate),
                    'confidence': float(template.confidence_score),
                    'usage_count': template.usage_count
                })

        # Sort by match score, then by usage count
        results.sort(key=lambda x: (x['match_score'], x['usage_count']), reverse=True)

        return results

    def match_task_to_template(
        self,
        task_name: str,
        task_description: str = "",
        estimated_hours: Decimal = Decimal(0),
        category: Optional[str] = None
    ) -> Tuple[Optional[TaskTemplate], str, int]:
        """
        Match a task to an existing template or suggest creating a new one.

        Args:
            task_name: Name of the task
            task_description: Description of the task
            estimated_hours: Estimated hours for the task
            category: Task category

        Returns:
            Tuple of (template, action, match_score)
            action can be: 'merge', 'create_new', 'suggest'
        """
        similar = self.find_similar_templates(task_name, task_description, category, limit=1)

        if not similar:
            return None, 'create_new', 0

        best_match = similar[0]
        score = best_match['match_score']

        if score >= TASK_NAME_MERGE_THRESHOLD:
            return best_match['template'], 'merge', score
        elif score >= TASK_NAME_MATCH_THRESHOLD:
            return best_match['template'], 'suggest', score
        else:
            return None, 'create_new', 0

    def create_or_update_template_from_task(
        self,
        task_name: str,
        task_description: str = "",
        estimated_hours: Decimal = Decimal(0),
        actual_hours: Optional[Decimal] = None,
        hourly_rate: Decimal = Decimal(0),
        category: str = 'other',
        tags: List[str] = None,
        source: str = 'ai_import'
    ) -> Tuple[TaskTemplate, bool]:
        """
        Create a new template or update existing one from task data.

        Args:
            task_name: Task name
            task_description: Task description
            estimated_hours: Estimated hours
            actual_hours: Actual hours (if completed)
            hourly_rate: Hourly rate
            category: Task category
            tags: Tags for categorization
            source: Where this task came from (ai_import, manual, etc.)

        Returns:
            Tuple of (template, created) where created is True if new template
        """
        # Try to find existing template
        template, action, score = self.match_task_to_template(
            task_name,
            task_description,
            estimated_hours,
            category
        )

        if action == 'merge' and template:
            # Update existing template
            template.update_statistics(
                estimated_hours=estimated_hours,
                actual_hours=actual_hours,
                hourly_rate=hourly_rate
            )
            return template, False

        # Create new template
        try:
            template = TaskTemplate.objects.create(
                user=self.user,
                name=task_name,
                description=task_description,
                category=category,
                tags=tags or [],
                average_estimated_hours=estimated_hours,
                min_hours=estimated_hours,
                max_hours=estimated_hours,
                average_actual_hours=actual_hours,
                average_hourly_rate=hourly_rate,
                usage_count=1,
                confidence_score=Decimal('50.0'),  # Start with medium confidence
                created_from=source
            )
            logger.info(f"Created new task template: {task_name} for user {self.user.id}")
            return template, True

        except Exception as e:
            # Handle unique constraint violation (duplicate name)
            logger.warning(f"Template creation failed, attempting update: {str(e)}")
            template = TaskTemplate.objects.get(user=self.user, name=task_name)
            template.update_statistics(
                estimated_hours=estimated_hours,
                actual_hours=actual_hours,
                hourly_rate=hourly_rate
            )
            return template, False

    def auto_categorize_task(self, task_name: str, task_description: str = "") -> str:
        """
        Auto-categorize a task based on keywords.

        Args:
            task_name: Task name
            task_description: Task description

        Returns:
            Category string
        """
        text = f"{task_name} {task_description}".lower()

        # Keyword mapping for categories
        category_keywords = {
            'development': ['develop', 'code', 'program', 'implement', 'api', 'backend', 'frontend', 'feature', 'bug', 'fix'],
            'design': ['design', 'ui', 'ux', 'mockup', 'wireframe', 'prototype', 'graphic', 'logo', 'branding'],
            'testing': ['test', 'qa', 'quality', 'validation', 'verify', 'debug'],
            'deployment': ['deploy', 'release', 'publish', 'launch', 'production', 'server', 'hosting'],
            'consulting': ['consult', 'advice', 'strategy', 'plan', 'meeting', 'review', 'analysis'],
            'documentation': ['document', 'doc', 'write', 'manual', 'guide', 'readme', 'wiki'],
            'maintenance': ['maintain', 'update', 'upgrade', 'patch', 'support', 'monitoring'],
            'research': ['research', 'investigate', 'explore', 'study', 'analysis', 'poc', 'proof of concept'],
        }

        # Score each category
        category_scores = {}
        for category, keywords in category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                category_scores[category] = score

        # Return category with highest score, or 'other'
        if category_scores:
            return max(category_scores, key=category_scores.get)

        return 'other'

    def extract_tags_from_task(self, task_name: str, task_description: str = "") -> List[str]:
        """
        Extract tags from task name and description using keywords.

        Args:
            task_name: Task name
            task_description: Task description

        Returns:
            List of tags
        """
        text = f"{task_name} {task_description}".lower()
        tags = set()

        # Common technology/domain tags
        tag_keywords = {
            'react': ['react', 'jsx', 'redux'],
            'vue': ['vue', 'vuex', 'nuxt'],
            'angular': ['angular', 'ng'],
            'python': ['python', 'django', 'flask', 'fastapi'],
            'javascript': ['javascript', 'js', 'typescript', 'ts'],
            'database': ['database', 'sql', 'postgres', 'mysql', 'mongodb'],
            'api': ['api', 'rest', 'graphql', 'endpoint'],
            'frontend': ['frontend', 'ui', 'css', 'html'],
            'backend': ['backend', 'server', 'api'],
            'mobile': ['mobile', 'ios', 'android', 'app'],
            'urgent': ['urgent', 'asap', 'critical', 'emergency'],
            'optional': ['optional', 'nice to have', 'enhancement'],
        }

        for tag, keywords in tag_keywords.items():
            if any(keyword in text for keyword in keywords):
                tags.add(tag)

        return list(tags)

    def get_catalogue_analytics(self) -> Dict[str, Any]:
        """
        Get analytics about the task catalogue.

        Returns:
            Dictionary with catalogue statistics
        """
        templates = TaskTemplate.objects.filter(user=self.user, is_active=True)

        # Category distribution
        category_stats = templates.values('category').annotate(
            count=Count('id'),
            avg_hours=Avg('average_estimated_hours'),
            avg_rate=Avg('average_hourly_rate')
        ).order_by('-count')

        # Most used templates
        most_used = templates.order_by('-usage_count')[:10].values(
            'name', 'usage_count', 'average_estimated_hours', 'confidence_score'
        )

        # Recent additions
        recent = templates.order_by('-created_at')[:5].values(
            'name', 'category', 'created_at', 'created_from'
        )

        # Overall stats
        total_templates = templates.count()
        total_usage = templates.aggregate(total=Sum('usage_count'))['total'] or 0
        avg_confidence = templates.aggregate(avg=Avg('confidence_score'))['avg'] or 0

        # High confidence templates (>75%)
        high_confidence_count = templates.filter(confidence_score__gte=75).count()

        return {
            'total_templates': total_templates,
            'total_usage': total_usage,
            'average_confidence': float(avg_confidence),
            'high_confidence_templates': high_confidence_count,
            'category_distribution': list(category_stats),
            'most_used_templates': list(most_used),
            'recent_templates': list(recent),
        }

    def suggest_tasks_for_project(
        self,
        project_description: str,
        customer_name: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Suggest task templates based on project description.

        Args:
            project_description: Description of the project
            customer_name: Optional customer name for context
            limit: Maximum number of suggestions

        Returns:
            List of suggested task templates with relevance scores
        """
        # Get all active templates
        templates = TaskTemplate.objects.filter(user=self.user, is_active=True)

        # Simple keyword matching (can be enhanced with AI later)
        description_lower = project_description.lower()
        suggestions = []

        for template in templates:
            # Calculate relevance score based on keyword overlap
            template_text = f"{template.name} {template.description}".lower()
            common_words = set(description_lower.split()) & set(template_text.split())

            # Filter out common words
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
            relevant_words = common_words - stop_words

            if len(relevant_words) > 0:
                # Calculate relevance score
                relevance_score = (len(relevant_words) * 20) + (template.usage_count * 2)

                suggestions.append({
                    'template': template,
                    'relevance_score': min(relevance_score, 100),  # Cap at 100
                    'matching_keywords': list(relevant_words),
                    'suggested_hours': float(template.average_estimated_hours),
                    'suggested_rate': float(template.average_hourly_rate),
                    'confidence': float(template.confidence_score)
                })

        # Sort by relevance score and usage count
        suggestions.sort(key=lambda x: (x['relevance_score'], x['template'].usage_count), reverse=True)

        return suggestions[:limit]

    def create_task_history_entry(
        self,
        task: Task,
        template: Optional[TaskTemplate],
        source_type: str,
        source_document=None
    ) -> TaskHistory:
        """
        Create a history entry for a task.

        Args:
            task: The task instance
            template: Associated template (if any)
            source_type: Type of source (ai_import, manual, template)
            source_document: Source document (if applicable)

        Returns:
            Created TaskHistory instance
        """
        history = TaskHistory.objects.create(
            user=self.user,
            task=task,
            template=template,
            source_type=source_type,
            source_document=source_document,
            project_name=task.project.name,
            customer_name=task.project.customer.name,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours if task.status == 'completed' else None,
            hourly_rate=task.hourly_rate
        )

        # Calculate variance if task is completed
        if task.status == 'completed' and task.actual_hours > 0:
            history.calculate_variance()

        return history
