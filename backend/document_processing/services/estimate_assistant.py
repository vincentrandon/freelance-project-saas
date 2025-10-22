"""
AI-powered estimate assistant service.
Analyzes historical data and generates intelligent pricing suggestions.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from django.conf import settings
from django.db.models import Avg, Sum, Count, Q
from openai import OpenAI

from projects.models import Project, Task
from invoicing.models import Invoice, Estimate

logger = logging.getLogger(__name__)


class EstimateAssistant:
    """Service for AI-powered estimate generation and pricing suggestions with TJM and margin support"""

    def __init__(self, user):
        self.user = user
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=15.0,  # 15 second timeout to prevent hanging
            max_retries=2   # Retry twice on connection errors
        )
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = 0.2  # Slightly higher for more creative suggestions

        # Get user's profile for TJM and margin settings
        try:
            self.profile = user.profile
            self.tjm_default = float(self.profile.tjm_default)
            self.default_margin = float(self.profile.default_security_margin)
            self.tjm_hours_per_day = self.profile.tjm_hours_per_day
        except:
            self.profile = None
            self.tjm_default = float(settings.DEFAULT_TJM)
            self.default_margin = float(settings.DEFAULT_SECURITY_MARGIN)
            self.tjm_hours_per_day = settings.TJM_HOURS_PER_DAY

    def analyze_historical_data(self) -> Dict[str, Any]:
        """
        Analyze user's historical project and pricing data.

        Returns:
            Dictionary with statistical analysis
        """
        # Get all completed projects
        completed_projects = Project.objects.filter(
            user=self.user,
            status='completed'
        )

        # Get all tasks with hours tracked
        tasks_with_hours = Task.objects.filter(
            project__user=self.user,
            actual_hours__isnull=False,
            actual_hours__gt=0
        )

        # Calculate average hourly rate
        avg_hourly_rate = tasks_with_hours.aggregate(
            avg_rate=Avg('hourly_rate')
        )['avg_rate'] or 0

        # Calculate most common hourly rates
        from django.db.models import Count as CountFunc
        common_rates = tasks_with_hours.values('hourly_rate').annotate(
            count=CountFunc('id')
        ).order_by('-count')[:5]

        # Analyze project durations
        projects_with_dates = completed_projects.filter(
            start_date__isnull=False,
            end_date__isnull=False
        )

        avg_project_duration_days = 0
        if projects_with_dates.exists():
            durations = [
                (p.end_date - p.start_date).days
                for p in projects_with_dates
                if p.end_date and p.start_date
            ]
            if durations:
                avg_project_duration_days = sum(durations) / len(durations)

        # Analyze common task types
        common_task_names = tasks_with_hours.values('name').annotate(
            count=CountFunc('id'),
            avg_hours=Avg('actual_hours'),
            avg_rate=Avg('hourly_rate')
        ).order_by('-count')[:10]

        # Get recent invoices/estimates for pricing trends
        recent_invoices = Invoice.objects.filter(
            user=self.user,
            issue_date__gte=datetime.now().date() - timedelta(days=365)
        ).aggregate(
            avg_total=Avg('total'),
            total_revenue=Sum('total'),
            count=Count('id')
        )

        # Analyze TJM usage in estimates
        recent_estimates = Estimate.objects.filter(
            user=self.user,
            tjm_used__isnull=False
        ).aggregate(
            avg_tjm=Avg('tjm_used'),
            avg_days=Avg('total_days'),
            count=Count('id')
        )

        # Analyze security margins used
        estimates_with_margin = Estimate.objects.filter(
            user=self.user,
            security_margin_percentage__gt=0
        ).aggregate(
            avg_margin=Avg('security_margin_percentage'),
            count=Count('id')
        )

        common_margins = Estimate.objects.filter(
            user=self.user,
            security_margin_percentage__gt=0
        ).values('security_margin_percentage').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        return {
            'average_hourly_rate': float(avg_hourly_rate),
            'common_hourly_rates': [
                {'rate': item['hourly_rate'], 'frequency': item['count']}
                for item in common_rates
            ],
            'average_project_duration_days': avg_project_duration_days,
            'completed_projects_count': completed_projects.count(),
            'total_tasks_tracked': tasks_with_hours.count(),
            'common_task_patterns': [
                {
                    'name': item['name'],
                    'frequency': item['count'],
                    'avg_hours': float(item['avg_hours'] or 0),
                    'avg_rate': float(item['avg_rate'] or 0)
                }
                for item in common_task_names
            ],
            'recent_invoices': {
                'count': recent_invoices['count'] or 0,
                'average_total': float(recent_invoices['avg_total'] or 0),
                'total_revenue': float(recent_invoices['total_revenue'] or 0)
            },
            # TJM analytics
            'tjm_analytics': {
                'user_default_tjm': self.tjm_default,
                'avg_tjm_used': float(recent_estimates['avg_tjm'] or self.tjm_default),
                'avg_days_per_estimate': float(recent_estimates['avg_days'] or 0),
                'estimates_using_tjm': recent_estimates['count'] or 0,
                'tjm_hours_per_day': self.tjm_hours_per_day
            },
            # Margin analytics
            'margin_analytics': {
                'user_default_margin': self.default_margin,
                'avg_margin_used': float(estimates_with_margin['avg_margin'] or self.default_margin),
                'estimates_with_margin': estimates_with_margin['count'] or 0,
                'common_margins': [
                    {'percentage': float(item['security_margin_percentage']), 'frequency': item['count']}
                    for item in common_margins
                ]
            }
        }

    def generate_estimate_from_prompt(
        self,
        project_description: str,
        customer_name: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete estimate from a natural language description.

        Args:
            project_description: Description of the project/work
            customer_name: Optional customer name for context
            additional_context: Any additional requirements or constraints

        Returns:
            Dictionary with generated estimate data
        """
        # Get historical data for context
        historical_data = self.analyze_historical_data()

        # Build context prompt
        context_parts = [
            f"Project Description: {project_description}",
        ]

        if customer_name:
            context_parts.append(f"Customer: {customer_name}")

        if additional_context:
            context_parts.append(f"Additional Context: {additional_context}")

        context = "\n".join(context_parts)

        # Build system prompt with historical data including TJM and margins
        tjm_analytics = historical_data.get('tjm_analytics', {})
        margin_analytics = historical_data.get('margin_analytics', {})

        system_prompt = f"""You are an expert French freelance project estimator. Based on the user's historical data and the project description, create a detailed estimate with TJM (Taux Journalier Moyen) pricing and security margin.

HISTORICAL DATA:
- Average hourly rate: €{historical_data['average_hourly_rate']:.2f}
- Most common rates: {', '.join([f"€{r['rate']}" for r in historical_data['common_hourly_rates'][:3]])}
- Average project duration: {historical_data['average_project_duration_days']:.0f} days
- Completed projects: {historical_data['completed_projects_count']}
- Common task patterns: {', '.join([t['name'] for t in historical_data['common_task_patterns'][:5]])}

TJM & PRICING:
- User's default TJM: €{tjm_analytics.get('user_default_tjm', 500)}/day
- Average TJM used: €{tjm_analytics.get('avg_tjm_used', 500)}/day
- Typical project size: {tjm_analytics.get('avg_days_per_estimate', 10):.1f} days
- Hours per day: {tjm_analytics.get('tjm_hours_per_day', 7)}

SECURITY MARGIN (Marge de sécurité):
- User's default margin: {margin_analytics.get('user_default_margin', 10)}%
- Average margin used: {margin_analytics.get('avg_margin_used', 10):.1f}%
- Common margins: {', '.join([f"{m['percentage']}%" for m in margin_analytics.get('common_margins', [])[:3]])}

TASK:
Generate a detailed, realistic estimate for the project described below. Break it down into specific tasks with time estimates using TJM-based pricing.

Return a JSON object with this structure:
{{
  "project_name": "string",
  "project_description": "string",
  "use_tjm_pricing": true,
  "tjm_rate": number (use user's default TJM),
  "estimated_duration_days": number,
  "total_days": number (sum of all task days),
  "tasks": [
    {{
      "name": "string",
      "description": "string",
      "quantity": number (days or hours),
      "unit": "days" or "hours",
      "rate": number (TJM per day or hourly rate),
      "amount": number,
      "notes": "string (optional reasoning)"
    }}
  ],
  "subtotal_before_margin": number,
  "recommended_security_margin": number (percentage, based on project risk),
  "security_margin_reasoning": "string (why this margin is recommended)",
  "security_margin_amount": number,
  "subtotal": number (after margin),
  "recommended_tax_rate": 20,
  "tax_amount": number,
  "total": number,
  "currency": "EUR",
  "assumptions": ["list of assumptions made"],
  "risks": ["potential risks or unknowns that justify the margin"],
  "recommendations": ["suggestions for the client"],
  "complexity_level": "low|medium|high",
  "confidence_level": "high|medium|low"
}}

IMPORTANT GUIDELINES:
1. **TJM Pricing**: Use day-based pricing (unit: "days") with the user's TJM rate
2. **Security Margin**: Recommend 5-30% based on:
   - Project complexity (simple = 5-10%, medium = 10-15%, complex = 15-30%)
   - Number of unknowns and risks
   - New vs repeat customer
   - Technology unfamiliarity
3. **Realistic Estimates**: Don't underestimate - include buffer for revisions, meetings, communication
4. **Task Breakdown**: Break complex work into specific, measurable deliverables
5. **Transparency**: Explain your reasoning for time estimates and security margin
6. **French Standards**: Use EUR currency, 20% TVA (VAT), French business terminology
7. **Conservative Approach**: It's better to overestimate slightly than underestimate

SECURITY MARGIN EXAMPLES:
- Simple website update (known tech): 5-8%
- New feature development (some unknowns): 10-15%
- Full application (many unknowns): 15-20%
- Cutting-edge tech/R&D: 20-30%
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            estimate_data = json.loads(content)

            # Add metadata
            estimate_data['_metadata'] = {
                'generated_at': datetime.now().isoformat(),
                'model': self.model,
                'tokens_used': response.usage.total_tokens,
                'based_on_historical_data': historical_data
            }

            return {
                'success': True,
                'estimate': estimate_data,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error generating estimate: {str(e)}", exc_info=True)
            return {
                'success': False,
                'estimate': None,
                'error': str(e)
            }

    def suggest_pricing_for_tasks(
        self,
        tasks: List[Dict[str, Any]],
        project_context: Optional[str] = None,
        quick_mode: bool = False  # New parameter for faster suggestions
    ) -> Dict[str, Any]:
        """
        Analyze provided tasks and suggest pricing/time estimates.

        Args:
            tasks: List of task objects with name, description (and optionally hours, rate)
            project_context: Optional context about the project
            quick_mode: If True, skips heavy historical analysis for faster response

        Returns:
            Dictionary with pricing suggestions for each task
        """
        # Quick mode: Skip heavy historical data analysis, use cached defaults
        if quick_mode:
            avg_rate = self.tjm_default / (self.tjm_hours_per_day or 7) if self.tjm_default else 80
            system_prompt = f"""You are a pricing expert. Suggest time and rate for this task.

DEFAULT RATE: €{avg_rate:.0f}/hour

Respond FAST with this JSON:
{{
  "tasks": [
    {{
      "suggested_hours": number,
      "suggested_hourly_rate": number,
      "suggested_amount": number,
      "confidence": "medium",
      "reasoning": "Brief 1-sentence reason"
    }}
  ]
}}"""
        else:
            # Full mode: Use historical data analysis
            historical_data = self.analyze_historical_data()
            system_prompt = f"""You are an expert freelance pricing consultant. Analyze the provided tasks and suggest realistic time estimates and hourly rates.

HISTORICAL DATA:
- Average hourly rate: €{historical_data['average_hourly_rate']:.2f}
- Most common rates: {', '.join([f"€{r['rate']}" for r in historical_data['common_hourly_rates'][:3]])}
- Common task patterns: {json.dumps(historical_data['common_task_patterns'][:3], indent=2)}

Return a JSON object:
{{
  "tasks": [
    {{
      "task_name": "string",
      "suggested_hours": number,
      "suggested_hourly_rate": number,
      "suggested_amount": number,
      "confidence": "high" | "medium" | "low",
      "reasoning": "string (max 100 chars)",
      "similar_historical_tasks": ["up to 3 similar tasks"]
    }}
  ]
}}"""

        user_content = f"""Task: {tasks[0]['name'] if tasks else 'Unknown'}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Use faster, cheaper model for line items
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=300,  # Reduced for faster response
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            suggestions = json.loads(content)

            return {
                'success': True,
                'suggestions': suggestions,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error suggesting pricing: {str(e)}", exc_info=True)
            return {
                'success': False,
                'suggestions': None,
                'error': str(e)
            }

    def suggest_pricing_with_context(
        self,
        task_description: str,
        historical_context: Dict[str, Any],
        project_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fast pricing suggestions using pre-fetched historical context.

        Args:
            task_description: The task to price
            historical_context: Pre-fetched user's historical data from frontend cache
            project_context: Optional project context

        Returns:
            Dictionary with pricing suggestions
        """
        # Extract relevant historical tasks using fuzzy matching
        common_tasks = historical_context.get('common_tasks', [])
        recent_items = historical_context.get('recent_items', [])
        default_rate = historical_context.get('default_rate', 80)

        # Find similar tasks
        similar_tasks = []
        task_lower = task_description.lower()
        for task in common_tasks:
            if any(word in task['name'].lower() for word in task_lower.split() if len(word) > 3):
                similar_tasks.append(task)

        # Build concise prompt with historical context
        historical_info = ""
        if similar_tasks:
            task_list = [f"{t['name']} ({t['avg_hours']}h @ €{t['avg_rate']}/hr)" for t in similar_tasks[:3]]
            historical_info = f"Similar past tasks: {', '.join(task_list)}"
        else:
            historical_info = f"User's default rate: €{default_rate}/hr"

        system_prompt = f"""Price this task quickly based on user's history.

{historical_info}

Respond with JSON:
{{
  "tasks": [{{
    "suggested_hours": number,
    "suggested_hourly_rate": number,
    "suggested_amount": number,
    "confidence": "high|medium|low",
    "reasoning": "1 sentence",
    "similar_historical_tasks": ["task names"]
  }}]
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Task: {task_description}"}
                ],
                max_tokens=250,
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            suggestions = json.loads(content)

            # Add matched similar tasks
            if similar_tasks:
                suggestions['tasks'][0]['similar_historical_tasks'] = [t['name'] for t in similar_tasks[:3]]

            return {
                'success': True,
                'suggestions': suggestions,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error suggesting pricing with context: {str(e)}", exc_info=True)
            return {
                'success': False,
                'suggestions': None,
                'error': str(e)
            }

    def expand_task(
        self,
        task_name: str,
        task_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Expand a high-level task into detailed subtasks.

        Args:
            task_name: Name of the task to expand
            task_description: Optional detailed description

        Returns:
            Dictionary with suggested subtasks
        """
        historical_data = self.analyze_historical_data()

        system_prompt = f"""You are an expert project manager for freelance work. Break down the given task into specific, actionable subtasks.

HISTORICAL CONTEXT:
- Average hourly rate: ${historical_data['average_hourly_rate']:.2f}
- Common task patterns: {', '.join([t['name'] for t in historical_data['common_task_patterns'][:5]])}

TASK:
Break down the provided task into 3-8 specific subtasks with time estimates.

Return a JSON object with this structure:
{{
  "original_task": "string",
  "subtasks": [
    {{
      "name": "string",
      "description": "string",
      "estimated_hours": number,
      "order": number,
      "dependencies": ["list of subtask names this depends on"]
    }}
  ],
  "total_estimated_hours": number,
  "notes": "string"
}}
"""

        user_content = f"""Task to expand:
Name: {task_name}
Description: {task_description or 'Not provided'}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=2000,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            expansion = json.loads(content)

            return {
                'success': True,
                'expansion': expansion,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error expanding task: {str(e)}", exc_info=True)
            return {
                'success': False,
                'expansion': None,
                'error': str(e)
            }

    def suggest_security_margin(
        self,
        project_description: str,
        tasks: Optional[List[Dict[str, Any]]] = None,
        customer_type: str = 'new'
    ) -> Dict[str, Any]:
        """
        Suggest appropriate security margin based on project analysis.

        Args:
            project_description: Description of the project
            tasks: Optional list of tasks to analyze
            customer_type: 'new' or 'repeat' customer

        Returns:
            Dictionary with margin suggestion and reasoning
        """
        historical_data = self.analyze_historical_data()
        margin_analytics = historical_data.get('margin_analytics', {})

        tasks_info = ""
        if tasks:
            tasks_info = f"\n\nTasks breakdown:\n{json.dumps(tasks, indent=2)}"

        system_prompt = f"""You are a risk assessment expert for freelance projects. Analyze the project and suggest an appropriate security margin (marge de sécurité).

HISTORICAL MARGIN DATA:
- User's default margin: {margin_analytics.get('user_default_margin', 10)}%
- Average margin used: {margin_analytics.get('avg_margin_used', 10):.1f}%
- Common margins: {', '.join([f"{m['percentage']}%" for m in margin_analytics.get('common_margins', [])[:3]])}

CUSTOMER TYPE: {customer_type}

TASK:
Analyze the project and recommend a security margin percentage (5-30%) based on risk factors.

Return a JSON object with this structure:
{{
  "recommended_margin_percentage": number,
  "confidence": "high|medium|low",
  "risk_factors": [
    {{
      "factor": "string (risk factor name)",
      "impact": "low|medium|high",
      "description": "string"
    }}
  ],
  "reasoning": "string (detailed explanation)",
  "margin_breakdown": {{
    "base_margin": number,
    "complexity_add": number,
    "unknowns_add": number,
    "customer_adjust": number,
    "total": number
  }}
}}

RISK FACTORS TO CONSIDER:
- Technical complexity (new tech = higher margin)
- Number of unknowns in requirements
- Customer type (new customer = slightly higher margin)
- Project size (larger = more uncertainty)
- Technology familiarity
- Integration complexity
- Tight deadline pressure
- Changing requirements risk
"""

        user_content = f"""Project Description: {project_description}{tasks_info}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=2000,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            suggestion = json.loads(content)

            return {
                'success': True,
                'suggestion': suggestion,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error suggesting security margin: {str(e)}", exc_info=True)
            return {
                'success': False,
                'suggestion': None,
                'error': str(e)
            }

    def convert_to_tjm_pricing(
        self,
        items: List[Dict[str, Any]],
        tjm_rate: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Convert hourly-based items to TJM (day-based) pricing.

        Args:
            items: List of items with hourly pricing
            tjm_rate: Optional TJM rate (uses user's default if not provided)

        Returns:
            Dictionary with converted items and totals
        """
        if tjm_rate is None:
            tjm_rate = self.tjm_default

        converted_items = []
        total_days = 0

        for item in items:
            hours = item.get('hours', 0) or item.get('quantity', 0)
            unit = item.get('unit', 'hours')

            if unit == 'hours':
                # Convert hours to days
                days = hours / self.tjm_hours_per_day
                amount = days * tjm_rate

                converted_items.append({
                    'name': item.get('name', item.get('description', '')),
                    'description': item.get('description', ''),
                    'quantity': round(days, 2),
                    'unit': 'days',
                    'rate': tjm_rate,
                    'amount': round(amount, 2),
                    'original_hours': hours
                })

                total_days += days
            else:
                # Already in days or other unit
                converted_items.append(item)
                if unit == 'days':
                    total_days += item.get('quantity', 0)

        subtotal = sum(item['amount'] for item in converted_items)

        return {
            'success': True,
            'converted_items': converted_items,
            'tjm_rate': tjm_rate,
            'total_days': round(total_days, 2),
            'subtotal_before_margin': round(subtotal, 2),
            'conversion_rate': f"1 day = {self.tjm_hours_per_day} hours = €{tjm_rate}"
        }
