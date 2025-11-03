"""
AI-powered task quality analysis and clarification service.
Analyzes extracted tasks for clarity, generates clarification questions,
and refines task descriptions based on user answers.
"""

import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


@dataclass
class TaskQualityResult:
    """Result of task quality analysis"""
    score: int  # 0-100
    clarity_level: str  # 'vague', 'needs_review', 'clear'
    issues: List[str]
    needs_clarification: bool
    suggested_improvements: List[str]


@dataclass
class ClarificationQuestion:
    """A question to clarify a vague task"""
    id: str
    question: str
    type: str  # 'multiple_choice', 'text', 'range', 'tags'
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    suggested_answer: Optional[str] = None  # AI-generated suggestion for text fields
    required: bool = True


class TaskQualityAnalyzer:
    """Service for analyzing task quality and generating clarification questions"""

    # Keywords indicating clear, specific tasks (expanded)
    CLEAR_INDICATORS = [
        # Action verbs
        'implement', 'create', 'develop', 'build', 'design', 'test', 'deploy',
        'configure', 'integrate', 'optimize', 'refactor', 'document', 'fix',
        'add', 'remove', 'update', 'migrate', 'setup', 'install', 'upgrade',
        'debug', 'validate', 'verify', 'review', 'analyze', 'investigate',
        # Technical terms (frontend)
        'component', 'page', 'form', 'button', 'modal', 'dropdown', 'table',
        'navigation', 'menu', 'sidebar', 'header', 'footer', 'dashboard',
        'responsive', 'mobile', 'desktop', 'layout', 'css', 'html',
        # Technical terms (backend)
        'api', 'endpoint', 'database', 'schema', 'migration', 'authentication',
        'authorization', 'permission', 'jwt', 'token', 'session', 'cache',
        'query', 'model', 'serializer', 'view', 'controller', 'service',
        'webhook', 'integration', 'middleware', 'validation', 'error handling',
        # Technologies
        'django', 'react', 'postgresql', 'redis', 'celery', 'docker', 'nginx',
        'rest', 'graphql', 'aws', 'stripe', 'oauth', 'ssl', 'https',
        # Business logic
        'payment', 'invoice', 'estimate', 'customer', 'user', 'order',
        'product', 'cart', 'checkout', 'subscription', 'billing',
        # Specificity indicators
        'endpoint', 'function', 'class', 'method', 'module', 'feature',
        'screen', 'workflow', 'flow', 'process', 'system'
    ]

    # Keywords indicating vague tasks (expanded)
    VAGUE_INDICATORS = [
        # Generic terms
        'stuff', 'things', 'misc', 'miscellaneous', 'various', 'several',
        'some', 'multiple', 'general', 'general purpose', 'generic',
        # Vague actions
        'work', 'work on', 'handle', 'deal with', 'take care of', 'sort out',
        'look at', 'check', 'see', 'maybe', 'possibly', 'might',
        # Vague scope
        'task', 'todo', 'item', 'other', 'etc', 'and more', 'additional',
        'related', 'associated', 'relevant', 'necessary',
        # French vague terms
        'truc', 'machin', 'divers', 'autre', 'bonus', 'script',
        'trucs', 'machins', 'bidule', 'travailler sur'
    ]

    # Action verbs that should be followed by specific objects
    ACTION_VERBS = [
        'implement', 'create', 'develop', 'build', 'design', 'deploy',
        'configure', 'integrate', 'optimize', 'refactor', 'fix', 'add'
    ]

    # Technical terms that indicate specificity
    TECHNICAL_TERMS = [
        'api', 'endpoint', 'database', 'authentication', 'component',
        'webhook', 'integration', 'migration', 'serializer', 'validation'
    ]

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.temperature = 0.3  # Lower temperature for consistent analysis
        self.use_ai_analysis = getattr(settings, 'USE_AI_TASK_ANALYSIS', True)

    def _quick_heuristic_analysis(self, task_data: Dict[str, Any]) -> Optional[TaskQualityResult]:
        """
        Enhanced fast, cost-free heuristic analysis before using AI.
        Returns TaskQualityResult if confident, None if needs AI.

        Scoring factors:
        - Name length and specificity
        - Presence of clear indicators (action verbs, technical terms)
        - Absence of vague indicators
        - Description quality
        - Reasonable time estimates
        - Category specificity
        """
        task_name = (task_data.get('name') or '').lower()
        task_description = (task_data.get('description') or '').lower()
        estimated_hours = task_data.get('estimated_hours') or task_data.get('actual_hours', 0)
        category = (task_data.get('category') or '').lower()

        combined_text = f"{task_name} {task_description}"

        # Initialize score components
        score = 50  # Start at neutral
        issues = []
        improvements = []

        # 1. NAME LENGTH CHECK
        name_words = task_name.split()
        if len(task_name) < 5:
            score -= 30
            issues.append('Task name is extremely short')
            improvements.append('Provide a more descriptive task name (aim for 8-15 words)')
        elif len(task_name) < 15:
            score -= 10
            issues.append('Task name could be more specific')
        elif len(name_words) >= 5 and len(name_words) <= 20:
            score += 15  # Good length

        # 2. VAGUE INDICATORS CHECK (penalize heavily)
        vague_matches = [v for v in self.VAGUE_INDICATORS if v in combined_text]
        if vague_matches:
            penalty = min(len(vague_matches) * 15, 40)  # Max -40 for vague terms
            score -= penalty
            issues.append(f'Contains vague terms: {", ".join(vague_matches[:3])}')
            improvements.append('Replace generic terms with specific technical details')

        # 3. CLEAR INDICATORS CHECK (reward)
        clear_matches = [c for c in self.CLEAR_INDICATORS if c in combined_text]
        if clear_matches:
            reward = min(len(clear_matches) * 8, 35)  # Max +35 for clear terms
            score += reward

        # 4. ACTION VERB + OBJECT PATTERN CHECK
        has_action_verb = any(verb in task_name for verb in self.ACTION_VERBS)
        has_technical_term = any(term in combined_text for term in self.TECHNICAL_TERMS)

        if has_action_verb and has_technical_term:
            score += 20
        elif has_action_verb and not has_technical_term:
            score -= 5
            issues.append('Action verb present but missing technical specifics')
            improvements.append('Add specific component/module/feature being worked on')

        # 5. DESCRIPTION QUALITY CHECK
        if not task_description:
            score -= 15
            issues.append('No description provided')
            improvements.append('Add description with implementation details')
        elif len(task_description) > 50:
            score += 10  # Good description length
        elif len(task_description) < 20:
            score -= 5
            issues.append('Description is too brief')

        # 6. TIME ESTIMATE VALIDATION
        if not estimated_hours or estimated_hours == 0:
            score -= 10
            issues.append('Missing time estimate')
            improvements.append('Provide realistic time estimate')
        elif estimated_hours < 0.5:
            score -= 5
            issues.append('Unusually low time estimate')
        elif estimated_hours > 200:
            score -= 10
            issues.append('Unusually high time estimate - consider breaking down')
            improvements.append('Break down into smaller, manageable tasks (8-40 hours each)')

        # 7. CATEGORY CHECK
        specific_categories = [
            'development', 'automation', 'ui_ux_design', 'graphic_design',
            'video_editing', '3d_modeling', 'content_writing', 'translation',
            'marketing', 'accounting', 'audio_production', 'testing',
            'deployment', 'consulting', 'documentation', 'maintenance', 'research'
        ]
        if category in specific_categories:
            score += 5  # Specific category
        elif category == 'other':
            score -= 5
            issues.append('Generic "other" category')
            improvements.append('Assign more specific category')

        # 8. SPECIFICITY PATTERNS
        # Check for "for X" or "to X" patterns (good specificity)
        if ' for ' in task_name or ' to ' in task_name or ' with ' in task_name:
            score += 10

        # Check for "script" without context (common vague pattern)
        if 'script' in task_name and len(task_name) < 20:
            score -= 15
            issues.append('Generic "script" reference without details')
            improvements.append('Specify what the script does and its inputs/outputs')

        # Clamp score to 0-100
        score = max(0, min(100, score))

        # Determine clarity level
        if score >= 80:
            clarity_level = 'clear'
            needs_clarification = False
        elif score >= 60:
            clarity_level = 'needs_review'
            needs_clarification = False
        else:
            clarity_level = 'vague'
            needs_clarification = True

        # CONFIDENCE THRESHOLDS
        # Only return result if we're confident (very clear or very vague)
        if score >= 85:
            # Very clear - confident result
            return TaskQualityResult(
                score=score,
                clarity_level='clear',
                issues=issues,
                needs_clarification=False,
                suggested_improvements=improvements
            )
        elif score <= 45:
            # Very vague - confident result
            return TaskQualityResult(
                score=score,
                clarity_level='vague',
                issues=['Task description is too generic', 'Missing specific details about requirements'],
                needs_clarification=True,
                suggested_improvements=['Specify what exactly needs to be done', 'Add technical details']
            )

        # Moderate case - return best heuristic guess but mark for potential AI review
        # (Between 45-85 score range - ambiguous zone)
        return TaskQualityResult(
            score=score,
            clarity_level=clarity_level,
            issues=issues if issues else ['Task quality is moderate'],
            needs_clarification=needs_clarification,
            suggested_improvements=improvements if improvements else []
        )

    def analyze_task_clarity(self, task_data: Dict[str, Any]) -> TaskQualityResult:
        """
        Analyze a task for clarity and specificity.
        Uses fast heuristics first, only calls AI if needed.

        Args:
            task_data: Task dict with name, description, estimated_hours, etc.

        Returns:
            TaskQualityResult with clarity score and recommendations
        """
        task_name = task_data.get('name') or ''

        # Quick validation
        if not task_name:
            return TaskQualityResult(
                score=0,
                clarity_level='vague',
                issues=['Task has no name'],
                needs_clarification=True,
                suggested_improvements=['Add a descriptive task name']
            )

        # Try fast heuristic analysis first (cost-free!)
        heuristic_result = self._quick_heuristic_analysis(task_data)
        if heuristic_result is not None:
            logger.info(f"Task '{task_name}' analyzed with heuristics: {heuristic_result.clarity_level}")
            return heuristic_result

        # Heuristic inconclusive - use AI only if enabled
        if not self.use_ai_analysis:
            # Fallback to conservative estimate
            return TaskQualityResult(
                score=70,
                clarity_level='needs_review',
                issues=['Task needs manual review'],
                needs_clarification=True,
                suggested_improvements=['Review and add more details']
            )

        task_description = task_data.get('description') or ''
        estimated_hours = task_data.get('estimated_hours') or task_data.get('actual_hours', 0)

        try:
            # Call OpenAI to analyze clarity
            system_prompt = """You are a task quality analyzer. Evaluate software development tasks for clarity and specificity.

Return a JSON object with this structure:
{
  "score": 0-100,
  "clarity_level": "vague" | "needs_review" | "clear",
  "issues": ["array of specific issues"],
  "suggested_improvements": ["array of specific suggestions"]
}

Scoring guidelines:
- 0-49 (vague): Generic, no actionable details (e.g., "script bonus", "fix stuff")
- 50-79 (needs_review): Some detail but missing key info (e.g., "create API endpoint" without specifying functionality)
- 80-100 (clear): Specific, actionable, well-defined (e.g., "Implement REST API endpoint for user authentication with JWT tokens")

Consider:
1. Specificity: Is the task clearly defined?
2. Scope: Is it clear what needs to be done?
3. Technology: Are relevant technologies/tools mentioned?
4. Complexity: Can hours be estimated from the description?
5. Actionability: Can a developer start work immediately?"""

            user_prompt = f"""Analyze this task:

Task Name: {task_name}
Description: {task_description or 'No description provided'}
Estimated Hours: {estimated_hours}

Provide a clarity analysis."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            result_data = json.loads(response.choices[0].message.content)

            score = result_data.get('score', 50)
            clarity_level = result_data.get('clarity_level', 'needs_review')

            # Threshold: Auto-approve >80%, needs clarification <80%
            needs_clarification = score < 80

            return TaskQualityResult(
                score=score,
                clarity_level=clarity_level,
                issues=result_data.get('issues', []),
                needs_clarification=needs_clarification,
                suggested_improvements=result_data.get('suggested_improvements', [])
            )

        except Exception as e:
            logger.error(f"Error analyzing task clarity: {str(e)}", exc_info=True)
            # Default to needs_review on error
            return TaskQualityResult(
                score=60,
                clarity_level='needs_review',
                issues=[f'Analysis error: {str(e)}'],
                needs_clarification=True,
                suggested_improvements=['Please review and clarify task details manually']
            )

    def analyze_all_tasks(self, tasks_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze all tasks in a batch and return overall quality metrics.
        Optimized to minimize AI API calls by using heuristics first.

        Args:
            tasks_data: List of task dicts

        Returns:
            Dict with overall stats and per-task results
        """
        if not tasks_data:
            return {
                'overall_score': 100,
                'needs_clarification': False,
                'task_results': [],
                'vague_count': 0,
                'needs_review_count': 0,
                'clear_count': 0,
                'ai_calls_used': 0
            }

        task_results = []
        total_score = 0
        vague_count = 0
        needs_review_count = 0
        clear_count = 0
        ai_calls_used = 0

        # First pass: Use heuristics for all tasks (fast & free)
        for idx, task_data in enumerate(tasks_data):
            heuristic_result = self._quick_heuristic_analysis(task_data)

            if heuristic_result is not None:
                # Heuristic gave confident result
                result = heuristic_result
            else:
                # Only use AI for ambiguous cases if enabled
                if self.use_ai_analysis:
                    result = self.analyze_task_clarity(task_data)
                    ai_calls_used += 1
                else:
                    # Conservative fallback
                    result = TaskQualityResult(
                        score=70,
                        clarity_level='needs_review',
                        issues=['Task needs manual review'],
                        needs_clarification=True,
                        suggested_improvements=['Review and add more details']
                    )

            task_results.append({
                'task_index': idx,
                'task_name': task_data.get('name') or '',
                'score': result.score,
                'clarity_level': result.clarity_level,
                'issues': result.issues,
                'needs_clarification': result.needs_clarification,
                'suggested_improvements': result.suggested_improvements
            })

            total_score += result.score

            if result.clarity_level == 'vague':
                vague_count += 1
            elif result.clarity_level == 'needs_review':
                needs_review_count += 1
            else:
                clear_count += 1

        overall_score = total_score // len(tasks_data) if tasks_data else 100
        needs_clarification = vague_count > 0 or needs_review_count > 0

        logger.info(f"Analyzed {len(tasks_data)} tasks: {clear_count} clear, {needs_review_count} needs review, {vague_count} vague. AI calls: {ai_calls_used}")

        return {
            'overall_score': overall_score,
            'needs_clarification': needs_clarification,
            'task_results': task_results,
            'vague_count': vague_count,
            'needs_review_count': needs_review_count,
            'clear_count': clear_count,
            'total_count': len(tasks_data),
            'ai_calls_used': ai_calls_used  # Track cost
        }

    def generate_clarification_questions(
        self,
        task_data: Dict[str, Any],
        quality_result: TaskQualityResult,
        language: str = 'en'
    ) -> List[ClarificationQuestion]:
        """
        Generate contextual clarification questions for a vague task.

        Args:
            task_data: Task dict
            quality_result: Result from analyze_task_clarity
            language: Language code ('en' or 'fr') for AI responses

        Returns:
            List of ClarificationQuestion objects
        """
        task_name = task_data.get('name') or ''
        task_description = task_data.get('description') or ''

        # Build language-specific prompt with examples in the target language
        if language == 'fr':
            system_prompt = """Vous êtes un assistant IA qui aide à clarifier les tâches de développement logiciel vagues.

IMPORTANT: Vous DEVEZ générer TOUTES les questions, options, placeholders et suggested_answer en FRANÇAIS. L'utilisateur parle français.

Générez 2-4 questions ciblées pour recueillir les informations manquantes. Retournez du JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Quel type de script est-ce ?",
      "type": "multiple_choice",
      "options": ["Frontend (JavaScript/React)", "Backend (Python/API)", "Automatisation/Calcul", "Base de données/Migration", "Autre"],
      "required": true
    },
    {
      "id": "q2",
      "question": "Quelle fonctionnalité spécifique doit-il fournir ?",
      "type": "text",
      "placeholder": "Décrivez la fonctionnalité principale...",
      "suggested_answer": "Calculer les bonus des employés en fonction des métriques de performance",
      "required": true
    },
    {
      "id": "q3",
      "question": "Quel est le niveau de complexité ?",
      "type": "multiple_choice",
      "options": ["Simple (1-4 heures)", "Moyen (8-16 heures)", "Complexe (24-40 heures)"],
      "required": true
    }
  ]
}

Types de questions:
- "multiple_choice": Boutons radio avec options prédéfinies
- "text": Saisie de texte libre avec suggested_answer

IMPORTANT pour les questions de type texte:
- Toujours fournir un champ "suggested_answer" avec une suggestion intelligente basée sur le contexte de la tâche
- Le suggested_answer doit être une phrase complète et spécifique que l'utilisateur peut modifier
- Rendez-le actionnable et pertinent pour la tâche vague à clarifier
- Les utilisateurs doivent pouvoir l'utiliser tel quel ou le modifier

Concentrez les questions sur:
1. Type/catégorie de travail
2. Fonctionnalité/exigences spécifiques
3. Technologies/outils impliqués
4. Complexité/portée

Gardez les questions conversationnelles et spécifiques à la tâche."""
        else:
            system_prompt = """You are an AI assistant helping to clarify vague software development tasks.

IMPORTANT: You MUST generate ALL questions, options, placeholders, and suggested_answer fields in ENGLISH.

Generate 2-4 targeted questions to gather missing information. Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "What type of script is this?",
      "type": "multiple_choice",
      "options": ["Frontend (JavaScript/React)", "Backend (Python/API)", "Automation/Calculation", "Database/Migration", "Other"],
      "required": true
    },
    {
      "id": "q2",
      "question": "What specific functionality should it provide?",
      "type": "text",
      "placeholder": "Describe the main functionality...",
      "suggested_answer": "Calculate employee bonuses based on performance metrics",
      "required": true
    },
    {
      "id": "q3",
      "question": "What is the complexity level?",
      "type": "multiple_choice",
      "options": ["Simple (1-4 hours)", "Medium (8-16 hours)", "Complex (24-40 hours)"],
      "required": true
    }
  ]
}

Question types:
- "multiple_choice": Radio buttons with predefined options
- "text": Free-form text input with suggested_answer

IMPORTANT for text questions:
- Always provide a "suggested_answer" field with an intelligent suggestion based on the task context
- The suggested_answer should be a complete, specific sentence that the user can edit
- Make it actionable and relevant to the vague task being clarified
- Users should be able to use it as-is or modify it

Focus questions on:
1. Type/category of work
2. Specific functionality/requirements
3. Technologies/tools involved
4. Complexity/scope

Keep questions conversational and specific to the task."""

        try:
            if language == 'fr':
                user_prompt = f"""Générez des questions de clarification pour cette tâche vague :

Nom de la Tâche : {task_name}
Description : {task_description or 'Aucune description'}
Problèmes : {', '.join(quality_result.issues)}
Améliorations Suggérées : {', '.join(quality_result.suggested_improvements)}

Générez 2-4 questions ciblées pour clarifier cette tâche."""
            else:
                user_prompt = f"""Generate clarification questions for this vague task:

Task Name: {task_name}
Description: {task_description or 'No description'}
Issues: {', '.join(quality_result.issues)}
Suggested Improvements: {', '.join(quality_result.suggested_improvements)}

Generate 2-4 targeted questions to clarify this task."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,  # Slightly higher for creative question generation
                response_format={"type": "json_object"}
            )

            result_data = json.loads(response.choices[0].message.content)
            questions_data = result_data.get('questions', [])

            questions = []
            for q_data in questions_data:
                questions.append(ClarificationQuestion(
                    id=q_data.get('id', f'q{len(questions) + 1}'),
                    question=q_data.get('question', ''),
                    type=q_data.get('type', 'text'),
                    options=q_data.get('options'),
                    placeholder=q_data.get('placeholder'),
                    suggested_answer=q_data.get('suggested_answer'),
                    required=q_data.get('required', True)
                ))

            return questions

        except Exception as e:
            logger.error(f"Error generating clarification questions: {str(e)}", exc_info=True)
            # Fallback questions in the appropriate language
            if language == 'fr':
                return [
                    ClarificationQuestion(
                        id='q1',
                        question='Quelle fonctionnalité ou caractéristique spécifique cette tâche implique-t-elle ?',
                        type='text',
                        placeholder='Décrivez la fonctionnalité principale...',
                        required=True
                    ),
                    ClarificationQuestion(
                        id='q2',
                        question='Quelle est la complexité estimée ?',
                        type='multiple_choice',
                        options=['Simple (1-4 heures)', 'Moyen (8-16 heures)', 'Complexe (24-40 heures)'],
                        required=True
                    )
                ]
            else:
                return [
                    ClarificationQuestion(
                        id='q1',
                        question='What specific functionality or feature does this task involve?',
                        type='text',
                        placeholder='Describe the main functionality...',
                        required=True
                    ),
                    ClarificationQuestion(
                        id='q2',
                        question='What is the estimated complexity?',
                        type='multiple_choice',
                        options=['Simple (1-4 hours)', 'Medium (8-16 hours)', 'Complex (24-40 hours)'],
                        required=True
                    )
                ]

    def generate_task_suggestion(
        self,
        task_data: Dict[str, Any],
        quality_result: TaskQualityResult,
        language: str = 'en'
    ) -> Dict[str, Any]:
        """
        Generate a complete refined task suggestion without Q&A flow.
        Uses AI to intelligently suggest improvements based on task context.

        Args:
            task_data: Original task dict
            quality_result: Result from analyze_task_clarity
            language: Language code ('en' or 'fr') for AI responses

        Returns:
            Dict with suggested task improvements or None if error
        """
        task_name = task_data.get('name') or ''
        task_description = task_data.get('description') or ''
        estimated_hours = task_data.get('estimated_hours') or task_data.get('actual_hours', 0)
        category = task_data.get('category', 'other')

        # Build language-specific prompt
        if language == 'fr':
            system_prompt = """Vous êtes un assistant IA expert en développement logiciel qui aide à clarifier et améliorer les descriptions de tâches vagues.

IMPORTANT: Vous DEVEZ générer tous les champs en FRANÇAIS.

Analysez la tâche donnée et suggérez des améliorations. Retournez du JSON:
{
  "name": "Nom de tâche amélioré et spécifique",
  "description": "Description détaillée et actionnable (2-4 phrases complètes)",
  "estimated_hours": 12,
  "category": "development",
  "confidence": 85,
  "reasoning": "Courte explication de vos suggestions"
}

Catégories disponibles: development, design, testing, deployment, consulting, documentation, maintenance, research, other

Directives:
1. Le nom doit être spécifique et actionnable (10-60 caractères)
2. La description doit clarifier QUOI, COMMENT, et POURQUOI
3. Ajoutez des détails techniques pertinents (technologies, outils, méthodes)
4. L'estimation d'heures doit refléter la complexité réelle
5. Utilisez un langage professionnel et précis
6. Basez vos suggestions sur les problèmes identifiés"""

            user_prompt = f"""Améliorez cette tâche vague :

Nom Actuel : {task_name}
Description Actuelle : {task_description or 'Aucune description'}
Heures Estimées : {estimated_hours}
Catégorie : {category}

Problèmes Identifiés :
{chr(10).join(['• ' + issue for issue in quality_result.issues])}

Améliorations Suggérées :
{chr(10).join(['• ' + imp for imp in quality_result.suggested_improvements])}

Générez une version améliorée de cette tâche qui soit claire, spécifique et actionnable."""
        else:
            system_prompt = """You are an expert AI assistant specialized in software development that helps clarify and improve vague task descriptions.

IMPORTANT: You MUST generate all fields in ENGLISH.

Analyze the given task and suggest improvements. Return JSON:
{
  "name": "Improved, specific task name",
  "description": "Detailed, actionable description (2-4 complete sentences)",
  "estimated_hours": 12,
  "category": "development",
  "confidence": 85,
  "reasoning": "Brief explanation of your suggestions"
}

Available categories: development, design, testing, deployment, consulting, documentation, maintenance, research, other

Guidelines:
1. Name should be specific and actionable (10-60 characters)
2. Description should clarify WHAT, HOW, and WHY
3. Add relevant technical details (technologies, tools, methods)
4. Hour estimate should reflect actual complexity
5. Use professional, precise language
6. Base suggestions on identified issues"""

            user_prompt = f"""Improve this vague task:

Current Name: {task_name}
Current Description: {task_description or 'No description'}
Estimated Hours: {estimated_hours}
Category: {category}

Identified Issues:
{chr(10).join(['• ' + issue for issue in quality_result.issues])}

Suggested Improvements:
{chr(10).join(['• ' + imp for imp in quality_result.suggested_improvements])}

Generate an improved version of this task that is clear, specific, and actionable."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )

            result_data = json.loads(response.choices[0].message.content)

            suggestion = {
                'name': result_data.get('name', task_name),
                'description': result_data.get('description', task_description),
                'estimated_hours': result_data.get('estimated_hours', estimated_hours),
                'category': result_data.get('category', category),
                'confidence': result_data.get('confidence', 75),
                'reasoning': result_data.get('reasoning', '')
            }

            logger.info(f"Generated suggestion for task '{task_name}': confidence {suggestion['confidence']}%")
            return suggestion

        except Exception as e:
            logger.error(f"Error generating task suggestion: {str(e)}", exc_info=True)
            # Return None on error - frontend will handle gracefully
            return None

    def refine_task_with_answers(
        self,
        task_data: Dict[str, Any],
        questions: List[ClarificationQuestion],
        answers: Dict[str, str],
        language: str = 'en'
    ) -> Dict[str, Any]:
        """
        Refine a task description based on user answers to clarification questions.

        Args:
            task_data: Original task dict
            questions: List of questions that were asked
            answers: Dict mapping question_id to answer
            language: Language code ('en' or 'fr') for AI responses

        Returns:
            Refined task dict with improved name, description, and hours
        """
        original_name = task_data.get('name') or ''
        original_description = task_data.get('description') or ''
        original_hours = task_data.get('estimated_hours') or task_data.get('actual_hours', 0)

        # Build Q&A context
        qa_pairs = []
        for question in questions:
            answer = answers.get(question.id, '')
            if answer:
                qa_pairs.append(f"Q: {question.question}\nA: {answer}")

        qa_context = '\n\n'.join(qa_pairs)

        # Build language-specific prompt
        if language == 'fr':
            system_prompt = """Vous êtes un assistant de raffinement de tâches. En vous basant sur les réponses de l'utilisateur aux questions de clarification, créez une description de tâche améliorée.

IMPORTANT: Vous DEVEZ générer tous les champs refined_name, refined_description et reasoning en FRANÇAIS. L'utilisateur parle français.

Retournez du JSON:
{
  "refined_name": "Nom de tâche amélioré",
  "refined_description": "Description détaillée et actionnable",
  "estimated_hours": 12,
  "category": "development",
  "confidence": 90,
  "reasoning": "Pourquoi ces estimations ont du sens"
}

Catégories: development, design, testing, deployment, consulting, documentation, maintenance, research, other

Directives:
1. Le nom doit être concis mais spécifique (5-10 mots)
2. La description doit être détaillée et actionnable (2-4 phrases)
3. Estimez les heures en fonction de la complexité indiquée dans les réponses
4. Incluez les technologies/outils pertinents mentionnés
5. Rendez-la immédiatement actionnable pour un développeur"""

            user_prompt = f"""Affinez cette tâche en vous basant sur les réponses de l'utilisateur :

Nom de Tâche Original : {original_name}
Description Originale : {original_description or 'Aucune description'}
Estimation Originale : {original_hours} heures

Réponses de l'Utilisateur :
{qa_context}

Générez une description de tâche affinée et claire."""
        else:
            system_prompt = """You are a task refinement assistant. Based on user answers to clarification questions, create an improved task description.

IMPORTANT: You MUST generate all refined_name, refined_description, and reasoning fields in ENGLISH.

Return JSON:
{
  "refined_name": "Improved task name",
  "refined_description": "Detailed, actionable description",
  "estimated_hours": 12,
  "category": "development",
  "confidence": 90,
  "reasoning": "Why these estimates make sense"
}

Categories: development, design, testing, deployment, consulting, documentation, maintenance, research, other

Guidelines:
1. Name should be concise but specific (5-10 words)
2. Description should be detailed and actionable (2-4 sentences)
3. Estimate hours based on complexity indicated in answers
4. Include relevant technologies/tools mentioned
5. Make it immediately actionable for a developer"""

            user_prompt = f"""Refine this task based on user answers:

Original Task Name: {original_name}
Original Description: {original_description or 'No description'}
Original Estimate: {original_hours} hours

User Answers:
{qa_context}

Generate a refined, clear task description."""

        try:

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )

            result_data = json.loads(response.choices[0].message.content)

            # Merge with original task data
            refined_task = task_data.copy()
            refined_task.update({
                'name': result_data.get('refined_name', original_name),
                'description': result_data.get('refined_description', original_description),
                'estimated_hours': result_data.get('estimated_hours', original_hours),
                'category': result_data.get('category', task_data.get('category', 'other')),
                'refinement_confidence': result_data.get('confidence', 85),
                'refinement_reasoning': result_data.get('reasoning', ''),
                'was_refined': True,
                'original_name': original_name,
                'original_description': original_description
            })

            logger.info(f"Refined task '{original_name}' -> '{refined_task['name']}'")
            return refined_task

        except Exception as e:
            logger.error(f"Error refining task: {str(e)}", exc_info=True)
            # Return original task on error
            return task_data
