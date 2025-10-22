"""
Smart entity matching service for customers, projects, and tasks.
Uses fuzzy matching to identify existing entities and suggest merge actions.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from fuzzywuzzy import fuzz
from django.db.models import Q

from customers.models import Customer
from projects.models import Project, Task

logger = logging.getLogger(__name__)


class EntityMatcher:
    """Service for matching extracted entities with existing database records"""

    # Matching thresholds
    CUSTOMER_EMAIL_EXACT_MATCH = 100
    CUSTOMER_NAME_HIGH_MATCH = 85
    CUSTOMER_NAME_MEDIUM_MATCH = 70
    PROJECT_NAME_MERGE_THRESHOLD = 80
    PROJECT_NAME_LOW_MATCH = 60

    def __init__(self, user):
        self.user = user

    def _normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number for comparison.
        Removes spaces, dashes, parentheses, and leading + or 00.
        """
        if not phone:
            return ''
        # Remove common separators and formatting
        normalized = ''.join(c for c in phone if c.isdigit())
        # Remove leading country code prefixes (00 or +)
        if normalized.startswith('00'):
            normalized = normalized[2:]
        return normalized

    def match_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Match customer data against existing customers.
        Uses multiple strategies (in order):
        1. Email (exact match)
        2. Phone (exact match)
        3. Name + Company (exact match) - prevents duplicates
        4. Name only (exact match when no company)
        5. Fuzzy matching on name + company + address

        Args:
            customer_data: Dictionary with customer fields (name, email, company, phone, address, etc.)

        Returns:
            Dictionary with match results:
            {
                'matched_customer': Customer object or None,
                'confidence': 0-100,
                'action': 'create_new' | 'use_existing' | 'merge',
                'reason': string explanation
            }
        """
        email = (customer_data.get('email') or '').strip().lower()
        name = (customer_data.get('name') or '').strip()
        company = (customer_data.get('company') or '').strip()
        phone = (customer_data.get('phone') or '').strip()
        address = (customer_data.get('address') or '').strip()

        # Strategy 1: Exact email match (highest confidence)
        if email:
            exact_email_match = Customer.objects.filter(
                user=self.user,
                email__iexact=email
            ).first()

            if exact_email_match:
                return {
                    'matched_customer': exact_email_match,
                    'confidence': self.CUSTOMER_EMAIL_EXACT_MATCH,
                    'action': 'use_existing',
                    'reason': f'Exact email match: {email}'
                }

        # Strategy 2: Exact phone match (high confidence)
        if phone:
            normalized_phone = self._normalize_phone(phone)
            if normalized_phone:
                potential_phone_matches = Customer.objects.filter(
                    user=self.user,
                    phone__isnull=False
                ).exclude(phone='')

                for customer in potential_phone_matches:
                    if self._normalize_phone(customer.phone) == normalized_phone:
                        return {
                            'matched_customer': customer,
                            'confidence': 95,
                            'action': 'use_existing',
                            'reason': f'Exact phone match: {phone}'
                        }

        # Strategy 3: Exact name+company match (prevents duplicates when no contact info)
        if name and company:
            # Case-insensitive exact match on name AND company
            exact_name_company_match = Customer.objects.filter(
                user=self.user,
                name__iexact=name.strip(),
                company__iexact=company.strip()
            ).first()

            if exact_name_company_match:
                return {
                    'matched_customer': exact_name_company_match,
                    'confidence': 90,
                    'action': 'use_existing',
                    'reason': f'Exact name and company match: {name} / {company}'
                }

        # Strategy 4: Exact name match (when no company provided)
        if name and not company:
            exact_name_match = Customer.objects.filter(
                user=self.user,
                name__iexact=name.strip()
            ).filter(
                Q(company__isnull=True) | Q(company='')
            ).first()

            if exact_name_match:
                return {
                    'matched_customer': exact_name_match,
                    'confidence': 85,
                    'action': 'use_existing',
                    'reason': f'Exact name match (no company): {name}'
                }

        # Strategy 5: Fuzzy match on name + company + address
        if name or company or address:
            potential_matches = Customer.objects.filter(user=self.user)

            best_match = None
            best_score = 0
            best_reason = ''

            for customer in potential_matches:
                score = 0
                reasons = []

                # Compare names (40% weight)
                if name and customer.name:
                    name_score = fuzz.ratio(name.lower(), customer.name.lower())
                    score += name_score * 0.4
                    if name_score > self.CUSTOMER_NAME_MEDIUM_MATCH:
                        reasons.append(f'Name similarity: {name_score}%')

                # Compare companies (20% weight)
                if company and customer.company:
                    company_score = fuzz.ratio(company.lower(), customer.company.lower())
                    score += company_score * 0.2
                    if company_score > self.CUSTOMER_NAME_MEDIUM_MATCH:
                        reasons.append(f'Company similarity: {company_score}%')

                # Compare addresses (30% weight) - NEW
                if address and customer.address:
                    address_score = fuzz.token_set_ratio(address.lower(), customer.address.lower())
                    score += address_score * 0.3
                    if address_score > self.CUSTOMER_NAME_MEDIUM_MATCH:
                        reasons.append(f'Address similarity: {address_score}%')

                # Compare phones (10% weight if not exact match) - NEW
                if phone and customer.phone:
                    phone_score = fuzz.ratio(
                        self._normalize_phone(phone),
                        self._normalize_phone(customer.phone)
                    )
                    score += phone_score * 0.1
                    if phone_score > 80:
                        reasons.append(f'Phone similarity: {phone_score}%')

                if score > best_score:
                    best_score = score
                    best_match = customer
                    best_reason = ', '.join(reasons)

            # Determine action based on score
            if best_score >= self.CUSTOMER_NAME_HIGH_MATCH:
                return {
                    'matched_customer': best_match,
                    'confidence': int(best_score),
                    'action': 'use_existing',
                    'reason': best_reason
                }
            elif best_score >= self.CUSTOMER_NAME_MEDIUM_MATCH:
                return {
                    'matched_customer': best_match,
                    'confidence': int(best_score),
                    'action': 'merge',  # User should decide
                    'reason': f'Possible match: {best_reason}'
                }

        # No good match found
        return {
            'matched_customer': None,
            'confidence': 0,
            'action': 'create_new',
            'reason': 'No matching customer found'
        }

    def match_project(
        self,
        project_data: Dict[str, Any],
        customer: Customer
    ) -> Dict[str, Any]:
        """
        Match project data against existing projects for the customer.
        IMPROVED: Uses upsert logic - if >85% match, use existing project.

        Args:
            project_data: Dictionary with project fields (name, description, etc.)
            customer: Customer object to search projects for

        Returns:
            Dictionary with match results:
            {
                'matched_project': Project object or None,
                'confidence': 0-100,
                'action': 'create_new' | 'use_existing',
                'reason': string explanation,
                'should_upsert': bool  # NEW - indicates upsert recommended
            }
        """
        project_name = (project_data.get('name') or '').strip()

        if not project_name:
            return {
                'matched_project': None,
                'confidence': 0,
                'action': 'create_new',
                'reason': 'No project name provided',
                'should_upsert': False
            }

        # Find projects for this customer
        existing_projects = Project.objects.filter(
            user=self.user,
            customer=customer
        )

        best_match = None
        best_score = 0
        best_reason = ''

        for project in existing_projects:
            # Fuzzy match on project name
            name_score = fuzz.ratio(project_name.lower(), project.name.lower())

            # Also check token sort ratio (handles word order differences)
            token_score = fuzz.token_sort_ratio(project_name.lower(), project.name.lower())

            # Partial ratio (for substring matches like "Website Redesign" vs "Redesign")
            partial_score = fuzz.partial_ratio(project_name.lower(), project.name.lower())

            # Use the higher score
            score = max(name_score, token_score, partial_score)

            if score > best_score:
                best_score = score
                best_match = project
                best_reason = f'Project name similarity: {score}%'

        # IMPROVED: Determine action based on score with upsert logic
        if best_score >= self.PROJECT_NAME_MERGE_THRESHOLD:  # 80%
            return {
                'matched_project': best_match,
                'confidence': int(best_score),
                'action': 'use_existing',  # CHANGED: use existing instead of merge
                'reason': best_reason,
                'should_upsert': True  # Upsert tasks into this project
            }
        elif best_score >= self.PROJECT_NAME_LOW_MATCH:  # 60%
            return {
                'matched_project': best_match,
                'confidence': int(best_score),
                'action': 'create_new',  # Too uncertain, create new but show warning
                'reason': f'Similar project exists but confidence low: {best_reason}',
                'should_upsert': False,
                'warning': f'A similar project "{best_match.name}" exists. Consider reviewing before import.'
            }
        else:
            return {
                'matched_project': None,
                'confidence': 0,
                'action': 'create_new',
                'reason': 'No matching project found',
                'should_upsert': False
            }

    def match_tasks(
        self,
        new_tasks: List[Dict[str, Any]],
        project: Project
    ) -> List[Dict[str, Any]]:
        """
        Match and deduplicate tasks against existing tasks in a project.
        IMPROVED: Implements upsert logic for tasks.

        Args:
            new_tasks: List of task dictionaries from extracted data
            project: Project object to match tasks against

        Returns:
            List of task match results:
            [{
                'task_data': Dict,  # Original task data
                'matched_task': Task object or None,
                'confidence': 0-100,
                'action': 'create_new' | 'merge' | 'skip',
                'reason': string,
                'should_upsert': bool
            }]
        """
        if not new_tasks:
            return []

        # Get existing tasks for this project
        existing_tasks = Task.objects.filter(project=project)

        task_matches = []
        TASK_NAME_MATCH_THRESHOLD = 80  # 80% similarity = same task

        for new_task in new_tasks:
            task_name = (new_task.get('name') or '').strip()

            if not task_name:
                task_matches.append({
                    'task_data': new_task,
                    'matched_task': None,
                    'confidence': 0,
                    'action': 'skip',
                    'reason': 'No task name provided',
                    'should_upsert': False
                })
                continue

            best_match = None
            best_score = 0

            # Compare with existing tasks
            for existing_task in existing_tasks:
                # Multiple fuzzy matching strategies
                ratio_score = fuzz.ratio(task_name.lower(), existing_task.name.lower())
                token_score = fuzz.token_sort_ratio(task_name.lower(), existing_task.name.lower())
                partial_score = fuzz.partial_ratio(task_name.lower(), existing_task.name.lower())

                score = max(ratio_score, token_score, partial_score)

                if score > best_score:
                    best_score = score
                    best_match = existing_task

            # Determine action
            if best_score >= TASK_NAME_MATCH_THRESHOLD:
                # High match - merge hours/amounts into existing task
                task_matches.append({
                    'task_data': new_task,
                    'matched_task': best_match,
                    'confidence': int(best_score),
                    'action': 'merge',
                    'reason': f'Task "{best_match.name}" already exists ({best_score}% match)',
                    'should_upsert': True
                })
            else:
                # Create new task
                task_matches.append({
                    'task_data': new_task,
                    'matched_task': None,
                    'confidence': int(best_score),
                    'action': 'create_new',
                    'reason': 'No matching task found' if best_score == 0 else f'Low match ({best_score}%), creating new task',
                    'should_upsert': False
                })

        return task_matches

    def detect_conflicts(
        self,
        customer_match: Dict[str, Any],
        project_match: Dict[str, Any],
        extracted_data: Dict[str, Any]
    ) -> List[str]:
        """
        Detect conflicts between extracted data and existing entities.

        Args:
            customer_match: Customer match results
            project_match: Project match results
            extracted_data: All extracted data from document

        Returns:
            List of conflict descriptions
        """
        conflicts = []

        # Customer conflicts
        if customer_match['matched_customer'] and customer_match['action'] == 'merge':
            matched = customer_match['matched_customer']
            new_data = extracted_data.get('customer', {})

            if new_data.get('email') and matched.email and new_data['email'].lower() != matched.email.lower():
                conflicts.append(
                    f"Email mismatch: existing '{matched.email}' vs. new '{new_data['email']}'"
                )

            if new_data.get('phone') and matched.phone and new_data['phone'] != matched.phone:
                conflicts.append(
                    f"Phone mismatch: existing '{matched.phone}' vs. new '{new_data['phone']}'"
                )

        # Project conflicts
        if project_match['matched_project'] and project_match['action'] == 'merge':
            matched_project = project_match['matched_project']
            new_project = extracted_data.get('project', {})

            # Check if project is completed/cancelled
            if matched_project.status in ['completed', 'cancelled']:
                conflicts.append(
                    f"Project '{matched_project.name}' is {matched_project.status}. "
                    "Adding tasks to a closed project may not be intended."
                )

            # Check estimated budget mismatch
            new_total = extracted_data.get('invoice_estimate_details', {}).get('total', 0)
            if matched_project.estimated_budget and new_total:
                if abs(matched_project.estimated_budget - new_total) > (matched_project.estimated_budget * 0.2):
                    conflicts.append(
                        f"Budget mismatch: existing project budget ${matched_project.estimated_budget} "
                        f"vs. document total ${new_total}"
                    )

        return conflicts

    def generate_warnings(
        self,
        customer_match: Dict[str, Any],
        project_match: Dict[str, Any],
        extracted_data: Dict[str, Any]
    ) -> List[str]:
        """
        Generate warnings about the import.

        Args:
            customer_match: Customer match results
            project_match: Project match results
            extracted_data: All extracted data from document

        Returns:
            List of warning messages
        """
        warnings = []

        # Warn about low confidence extractions
        confidence = extracted_data.get('confidence_scores', {})
        if confidence.get('overall', 100) < 70:
            warnings.append(
                f"Low extraction confidence ({confidence.get('overall')}%). "
                "Please review all fields carefully."
            )

        # Warn about missing critical data
        customer_data = extracted_data.get('customer', {})
        if not customer_data.get('email') and not customer_data.get('phone'):
            warnings.append("No contact information (email/phone) found for customer")

        # Warn about tasks without hours/pricing
        tasks = extracted_data.get('tasks', [])
        tasks_without_hours = [t for t in tasks if not t.get('estimated_hours') and not t.get('actual_hours')]
        if tasks_without_hours:
            warnings.append(
                f"{len(tasks_without_hours)} task(s) have no time estimates. "
                "You may need to add them manually."
            )

        # Warn if creating new customer when similar exists
        if customer_match['action'] == 'create_new' and customer_match['confidence'] > 50:
            warnings.append(
                "Creating new customer but a similar one exists. "
                "Check if this is a duplicate."
            )

        return warnings

    def prepare_preview_data(
        self,
        extracted_data: Dict[str, Any],
        customer_match: Dict[str, Any],
        project_match: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepare complete preview data for user review.

        Args:
            extracted_data: Extracted data from document
            customer_match: Customer match results
            project_match: Project match results

        Returns:
            Complete preview data structure
        """
        conflicts = self.detect_conflicts(customer_match, project_match, extracted_data)
        warnings = self.generate_warnings(customer_match, project_match, extracted_data)

        return {
            'customer_data': extracted_data.get('customer', {}),
            'project_data': extracted_data.get('project', {}),
            'tasks_data': extracted_data.get('tasks', []),
            'invoice_estimate_data': extracted_data.get('invoice_estimate_details', {}),
            'matched_customer': customer_match['matched_customer'],
            'customer_match_confidence': customer_match['confidence'],
            'customer_action': customer_match['action'],
            'matched_project': project_match['matched_project'],
            'project_match_confidence': project_match['confidence'],
            'project_action': project_match['action'],
            'conflicts': conflicts,
            'warnings': warnings,
            'document_type': extracted_data.get('document_type'),
            'language': extracted_data.get('language'),
        }
