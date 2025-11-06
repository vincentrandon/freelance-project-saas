"""
OpenAI-powered document parsing service for invoices and estimates.
Extracts structured data from PDF documents using GPT-4o Vision API.
"""

import base64
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from django.conf import settings

from utils.openai_client import create_openai_client
import PyPDF2
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)


class OpenAIDocumentParser:
    """Service for parsing invoice and estimate PDFs using OpenAI GPT-4o Vision"""

    def __init__(self):
        self.client = create_openai_client()
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
        self.reasoning_effort = settings.OPENAI_REASONING_EFFORT

    def parse_document(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a PDF document and extract structured data.

        Args:
            file_path: Path to the PDF file

        Returns:
            Dictionary containing extracted data and metadata
        """
        try:
            # Convert PDF to base64 images
            images_base64 = self._pdf_to_base64_images(file_path)

            if not images_base64:
                raise ValueError("Could not convert PDF to images")

            # Use only first page for now (most invoices/estimates are 1-2 pages)
            # If needed, we can extend to multi-page analysis
            first_page_base64 = images_base64[0]

            # Call OpenAI API with vision
            extraction_result = self._call_openai_vision(first_page_base64)

            # Extract context-aware tags for all tasks
            if extraction_result.get('tasks'):
                logger.info(f"Extracting AI-powered tags for {len(extraction_result['tasks'])} tasks...")
                extraction_result['tasks'] = self.extract_tags_for_tasks(extraction_result['tasks'])
                logger.info("Tag extraction complete")

            return {
                'success': True,
                'extracted_data': extraction_result,
                'error': None
            }

        except Exception as e:
            logger.error(f"Error parsing document: {str(e)}", exc_info=True)
            return {
                'success': False,
                'extracted_data': None,
                'error': str(e)
            }

    def _pdf_to_base64_images(self, file_path: str, max_pages: int = 3) -> list:
        """
        Convert PDF pages to base64-encoded images.

        Args:
            file_path: Path to PDF file
            max_pages: Maximum number of pages to convert

        Returns:
            List of base64-encoded image strings
        """
        try:
            # Convert PDF to PIL images
            images = convert_from_path(file_path, dpi=150, first_page=1, last_page=max_pages)

            base64_images = []
            for img in images:
                # Convert PIL image to base64
                import io
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                base64_images.append(img_base64)

            return base64_images

        except Exception as e:
            logger.error(f"Error converting PDF to images: {str(e)}")
            return []

    def _call_openai_vision(self, image_base64: str) -> Dict[str, Any]:
        """
        Call OpenAI GPT-4o Vision API to extract structured data from document image.

        Args:
            image_base64: Base64-encoded image

        Returns:
            Extracted structured data
        """

        system_prompt = """You are an expert document parser specialized in extracting structured data from invoices and estimates (devis).
You must extract ALL relevant information accurately, supporting both French and English documents.

Return a JSON object with the following structure:
{
  "document_type": "invoice" or "estimate",
  "language": "en" or "fr",
  "confidence_scores": {
    "overall": 0-100,
    "customer": 0-100,
    "project": 0-100,
    "tasks": 0-100,
    "pricing": 0-100
  },
  "customer": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "company": "string",
    "address": "string"
  },
  "project": {
    "name": "string",
    "description": "string",
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null"
  },
  "tasks": [
    {
      "name": "string",
      "description": "string",
      "estimated_hours": number (REQUIRED - must provide estimate),
      "actual_hours": number or null,
      "hourly_rate": number (REQUIRED - calculate if not explicit),
      "amount": number,
      "category": "development|automation|ui_ux_design|graphic_design|video_editing|3d_modeling|content_writing|translation|marketing|accounting|audio_production|testing|deployment|consulting|documentation|maintenance|research|other"
    }
  ],
  "invoice_estimate_details": {
    "number": "string",
    "issue_date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD or null",
    "valid_until": "YYYY-MM-DD or null",
    "subtotal": number,
    "tax_rate": number,
    "tax_amount": number,
    "total": number,
    "currency": "EUR" or "USD" or other,
    "payment_terms": "string or null",
    "notes": "string or null"
  }
}

IMPORTANT RULES:
1. Extract ALL visible information, don't skip anything

2. **CRITICAL - Task Extraction from Line Items**:
   ⚠️ MANDATORY RULE: When extracting tasks from line items with dashes/bullets:

   ❌ WRONG: Create 1 combined task from all dashed sub-items
   ✅ CORRECT: Create SEPARATE tasks - one task per dash/bullet/number

   Examples:
   • Line item: "Development work"
     - Sub-task 1
     - Sub-task 2
     - Sub-task 3
     → Extract 3 SEPARATE tasks (NOT 1 combined task)

   • Line item: "Single description without dashes"
     → Extract 1 task

   This is NON-NEGOTIABLE. See detailed separation logic in Rule #8 below.

3. **CRITICAL - Task Name Quality**: Task names MUST be specific, actionable, and clear
   ❌ BAD Examples (NEVER extract like this):
      - "Development" (too generic)
      - "Work on project" (vague)
      - "Script bonus" (unclear what it does)
      - "Integration" (missing technical details)
      - "Updates" (what kind of updates?)

   ✅ GOOD Examples (ALWAYS aim for this clarity):
      - "Implement REST API endpoint for user authentication with JWT tokens"
      - "Design responsive homepage with hero section and navigation menu"
      - "Fix critical bug in payment processing causing transaction failures"
      - "Deploy application to AWS EC2 with SSL certificate configuration"
      - "Write technical documentation for API endpoints with code examples"
      - "Calculate employee performance bonuses based on quarterly metrics"

   RULES for task names:
   - Include WHAT is being done (action verb: implement, design, fix, deploy, etc.)
   - Include WHERE it applies (specific component, module, feature)
   - Include WHY or CONTEXT if mentioned (purpose, business need)
   - If task is vague in document, use description field to infer specifics
   - Typical length: 8-15 words (not too short, not too long)

4. **CRITICAL - Task Description Enhancement**: Descriptions MUST add technical context
   - If document has minimal description, YOU must expand it based on task name
   - Include technical approach, technologies, or implementation details if inferable
   - Mention dependencies, prerequisites, or related tasks if visible
   - Reference specific features, screens, or user flows if applicable

   Example transformations:
   Document says: "API integration - 2 days"
   YOU extract:
   {
     "name": "Integrate third-party payment API (Stripe) into checkout flow",
     "description": "Implement Stripe API integration including webhook handling for payment confirmation, error handling for failed transactions, and frontend UI updates for payment status. Requires testing with sandbox environment and production API keys.",
     "estimated_hours": 16
   }

5. **CRITICAL - Time Estimation with Industry Benchmarks**: For EVERY task, provide realistic estimated_hours

   A. If hours/days EXPLICITLY stated: Use that value (convert days: 1 day = 8 hours)

   B. If only amount given: Calculate backwards
      estimated_hours = amount / hourly_rate
      Example: €800 at €50/hr = 16 hours

   C. If NOTHING stated, use these INDUSTRY BENCHMARKS by task type:

   **Frontend Development:**
   - Simple UI component (button, form field): 2-4 hours
   - Complex component (data table, chart): 8-12 hours
   - Full page layout (responsive): 12-16 hours
   - Complete feature (multi-page flow): 24-40 hours

   **Backend Development:**
   - Simple CRUD endpoint: 4-6 hours
   - Complex business logic endpoint: 8-16 hours
   - Database schema design + migrations: 4-8 hours
   - Authentication/authorization system: 16-24 hours
   - Third-party API integration: 12-20 hours

   **Design Work:**
   - Logo design: 8-16 hours
   - Mockup (single page): 4-8 hours
   - Full UI/UX design (10-page app): 40-80 hours
   - Design system creation: 40-60 hours

   **Testing/QA:**
   - Unit tests for module: 4-8 hours
   - Integration test suite: 12-16 hours
   - Full QA testing cycle: 16-24 hours

   **Deployment/DevOps:**
   - Server setup + configuration: 8-12 hours
   - CI/CD pipeline setup: 12-16 hours
   - Production deployment: 4-8 hours

   **Bug Fixes:**
   - Minor bug (cosmetic, non-critical): 1-2 hours
   - Medium bug (functional issue): 4-8 hours
   - Critical bug (security, data loss): 8-16 hours

   **Consulting/Planning:**
   - Initial project consultation: 2-4 hours
   - Technical architecture planning: 8-16 hours
   - Code review: 2-4 hours per 1000 lines

   D. Apply COMPLEXITY MULTIPLIERS:
   - Legacy codebase (>5 years old): +30%
   - Unclear requirements: +50%
   - New technology/framework: +40%
   - Multiple integrations: +25% per integration
   - Performance optimization: +50%
   - Security-critical features: +40%

   E. Apply PROJECT BUFFER:
   - Add 20% to raw estimates for realistic planning
   - Round to realistic increments: 0.5, 1, 2, 4, 8, 12, 16, 24, 32, 40, 80 hours
   - NEVER estimate: 3, 5, 7, 9, 11 hours (use rounded increments)

   F. VALIDATION CHECKS (flag low confidence if violated):
   - Hourly rate for simple task > 100 hours = likely wrong
   - Hourly rate < 1 hour for complex task = likely wrong
   - Hourly rate > €150/hour = flag as high (unless specialized expertise)
   - Hourly rate < €30/hour = flag as low (possible junior rate)

6. **CRITICAL - Hourly Rate Calculation**: Calculate realistic hourly_rate for EVERY task

   A. If EXPLICIT in document: Use stated rate

   B. If TJM (Taux Journalier Moyen) mentioned:
      hourly_rate = TJM / 8 hours
      Example: TJM €600 = €75/hour

   C. If only total amount given:
      hourly_rate = amount / estimated_hours
      Example: €1200 for 16 hours = €75/hour

   D. If NOTHING stated, use MARKET RATES by region/expertise:

   **French Market (typical for freelancers):**
   - Junior developer: €40-€55/hour (TJM €320-€440)
   - Mid-level developer: €55-€75/hour (TJM €440-€600)
   - Senior developer: €75-€100/hour (TJM €600-€800)
   - Specialist/Expert: €100-€150/hour (TJM €800-€1200)

   **US Market:**
   - Junior: $50-$75/hour
   - Mid-level: $75-$125/hour
   - Senior: $125-$200/hour
   - Specialist: $200-$350/hour

   **Task Type Adjustments:**
   - Strategy/consulting: +20% to base rate
   - Emergency/urgent work: +50% to base rate
   - Specialized tech (AI/ML, blockchain): +30% to base rate
   - Simple maintenance: -20% to base rate

   E. CONSISTENCY CHECK:
   - All tasks in same document should have similar hourly rates (±20%)
   - If rates vary wildly, flag in confidence scores

7. **CRITICAL - Task Categorization with Comprehensive Keywords (ALL Freelancer Types)**:
   Assign the MOST SPECIFIC category. Prioritize specialized categories over generic ones.

   **DEVELOPMENT** (Code, programming, software engineering):
   - Keywords: code, coding, develop, programming, implement, build, API, REST, GraphQL, backend,
     frontend, full-stack, database, SQL, NoSQL, PostgreSQL, MongoDB, MySQL, integration, webhook,
     endpoint, function, module, component, feature, system, application, app, algorithm, software
   - Technologies: React, Vue, Angular, Python, Django, Flask, JavaScript, TypeScript, Node.js,
     PHP, Laravel, Ruby, Rails, Java, Spring, C#, .NET, Go, Rust, Swift, Kotlin, Git, Docker
   - Exclude if: paired with "no-code" or automation platforms (→ automation instead)

   **AUTOMATION** (No-code/low-code workflow automation):
   - Keywords: Make, Make.com, Zapier, Integromat, n8n, automation, workflow, no-code, low-code,
     nocode, lowcode, IFTTT, Power Automate, Automate.io, Workato, Tray.io, scenario, flow,
     trigger, action, integration platform, workflow automation, process automation, Airtable automation
   - Use this INSTEAD of development when: Make.com, Zapier, or other no-code tools mentioned

   **UI_UX_DESIGN** (User interface & experience design):
   - Keywords: UI design, UX design, user interface, user experience, wireframe, mockup, prototype,
     user research, usability testing, user flow, information architecture, interaction design,
     persona, user journey, app design, mobile app UI, web app design, design system, component library
   - Tools: Figma, Sketch, Adobe XD, Framer, InVision, Principle, ProtoPie, Axure, Balsamiq
   - Exclude: logo, branding, print design (→ graphic_design), video (→ video_editing)

   **GRAPHIC_DESIGN** (Visual design, branding, print):
   - Keywords: graphic design, logo design, logo, branding, brand identity, visual identity, print design,
     poster, flyer, brochure, business card, packaging design, banner, social media graphics, illustration,
     vector art, typography, font design, color palette, brand guidelines, visual design, creative direction
   - Tools: Adobe Photoshop, Illustrator, InDesign, Affinity Designer, CorelDRAW, Canva Pro, Procreate
   - Exclude: UI/UX design (→ ui_ux_design), video/motion (→ video_editing)

   **VIDEO_EDITING** (Video production, motion graphics):
   - Keywords: video editing, video edit, motion graphics, animation, After Effects, Premiere,
     Final Cut, DaVinci Resolve, color grading, sound design, video production, montage, transitions,
     effects, visual effects, VFX, compositing, titling, subtitles, video content, YouTube video,
     social media video, explainer video, promotional video, cinematic, footage, rendering
   - Tools: Adobe Premiere Pro, After Effects, Final Cut Pro, DaVinci Resolve, Filmora, CapCut,
     Vegas Pro, Camtasia, iMovie

   **3D_MODELING** (3D graphics, rendering, animation):
   - Keywords: 3D modeling, 3D model, 3D design, Blender, Maya, 3ds Max, Cinema 4D, ZBrush,
     rendering, 3D rendering, texturing, rigging, 3D animation, polygon modeling, sculpting,
     3D visualization, product rendering, architectural visualization, character modeling,
     environment design, UV mapping, lighting, materials, shaders
   - Tools: Blender, Autodesk Maya, 3ds Max, Cinema 4D, Houdini, ZBrush, Substance Painter, Unity, Unreal Engine

   **CONTENT_WRITING** (Writing, copywriting, content creation):
   - Keywords: content writing, blog post, article, copywriting, copy, SEO writing, web content,
     product description, case study, white paper, ebook, newsletter, email copy, landing page copy,
     website copy, creative writing, ghostwriting, editorial, proofreading, editing, content strategy,
     content creation, storytelling, headline, call-to-action, content marketing
   - Exclude: technical documentation (→ documentation), translation (→ translation)

   **TRANSLATION** (Language services, localization):
   - Keywords: translation, translate, localization, localize, multilingual, French to English,
     English to Spanish, German translation, subtitle translation, document translation, transcription,
     transcribe, proofreading in [language], language services, bilingual, interpreter, cultural adaptation,
     MTPE, machine translation post-editing, certified translation, legal translation, medical translation

   **MARKETING** (Digital marketing, social media, advertising):
   - Keywords: marketing, digital marketing, social media, social media management, Facebook ads,
     Instagram ads, Google Ads, PPC, paid advertising, SEO, SEM, search engine optimization,
     email marketing, newsletter, campaign, marketing campaign, content marketing, influencer marketing,
     community management, engagement, analytics, marketing strategy, brand awareness, lead generation,
     conversion optimization, A/B testing, marketing automation, HubSpot, Mailchimp
   - Tools: Meta Business Suite, Google Analytics, Hootsuite, Buffer, Mailchimp, HubSpot, SEMrush, Ahrefs
   - Exclude: content writing (→ content_writing if focused on writing), graphic design (→ graphic_design if focused on visuals)

   **ACCOUNTING** (Finance, bookkeeping, tax):
   - Keywords: accounting, bookkeeping, accountant, bookkeeper, invoicing, expense tracking,
     financial reporting, QuickBooks, Xero, Sage, payroll, tax preparation, tax filing, VAT,
     reconciliation, balance sheet, P&L, profit and loss, income statement, cash flow, budget,
     budgeting, financial analysis, audit, accounts payable, accounts receivable, general ledger,
     month-end close, year-end close, financial statements, tax return
   - Tools: QuickBooks, Xero, Sage, FreshBooks, Wave, Excel, Google Sheets

   **AUDIO_PRODUCTION** (Audio editing, music, podcasts):
   - Keywords: audio editing, audio production, podcast editing, podcast, music production, sound design,
     mixing, audio mixing, mastering, audio mastering, voiceover, voice-over, VO, narration,
     audio restoration, noise reduction, audio engineering, sound effects, foley, music composition,
     beat making, audio post-production, audio for video, soundtrack, jingle, radio commercial
   - Tools: Audacity, Adobe Audition, Logic Pro, Pro Tools, Ableton Live, FL Studio, Cubase, Reaper

   **TESTING** (QA, quality assurance):
   - Keywords: test, testing, QA, quality assurance, validation, verification, debug, debugging, bug fix,
     unit test, integration test, E2E test, end-to-end, automated testing, manual testing, test coverage,
     test plan, test case, regression testing, performance testing, load testing, security testing,
     penetration testing, UAT, user acceptance testing, test automation, Selenium, Cypress, Jest

   **DEPLOYMENT** (DevOps, infrastructure, hosting):
   - Keywords: deploy, deployment, release, production, prod, hosting, server, infrastructure,
     AWS, Azure, GCP, Google Cloud, cloud hosting, Docker, Kubernetes, K8s, CI/CD, DevOps, pipeline,
     staging, environment, configuration, SSL, HTTPS, DNS, domain, CDN, scaling, load balancer,
     server setup, VPS, dedicated server, containerization, orchestration, monitoring setup

   **CONSULTING** (Strategy, advisory, planning):
   - Keywords: consulting, consultant, consultation, strategy, strategic planning, advice, advisory,
     planning, architecture, technical spec, requirements gathering, discovery, workshop, brainstorming,
     review, audit, assessment, roadmap, proposal, estimate, scoping, feasibility study, business analysis,
     process improvement, optimization consulting, digital transformation
   - Exclude: specific execution work (→ use specific category like development, design, etc.)

   **DOCUMENTATION** (Technical writing, documentation):
   - Keywords: documentation, technical documentation, docs, manual, user manual, guide, tutorial,
     README, wiki, knowledge base, API documentation, technical writing, user guide, help center,
     onboarding documentation, how-to guide, specification, technical specification, architecture document,
     runbook, SOP, standard operating procedure, process documentation, changelog, release notes

   **MAINTENANCE** (Support, updates, ongoing work):
   - Keywords: maintenance, support, technical support, monitoring, update, upgrade, patch, bug fixes,
     refactor, refactoring, code review, optimization, performance tuning, code cleanup, dependency update,
     security patch, hotfix, ongoing support, retainer, monthly maintenance, website maintenance,
     server maintenance, monitoring setup, logging, error tracking, backup, disaster recovery

   **RESEARCH** (Research, analysis, investigation):
   - Keywords: research, investigation, analysis, analyze, study, POC, proof of concept, spike,
     exploration, feasibility study, technical evaluation, technology evaluation, comparison, competitive analysis,
     benchmarking, R&D, research and development, experiment, market research, user research, data analysis,
     discovery phase, requirements analysis

   **OTHER** (Administrative, miscellaneous, uncategorized):
   - Use when: invoicing, contracts, administrative tasks, or truly uncategorized work
   - This should be LAST RESORT - always try to match a specific category first

   **CATEGORIZATION RULES**:
   1. Be SPECIFIC: Choose ui_ux_design over generic "design" if UI/UX tools mentioned
   2. Tool presence matters: "Figma" → ui_ux_design, "Photoshop" → graphic_design, "Make.com" → automation
   3. Context wins: "Make API integration script" → development (coding), "Make workflow setup" → automation (no-code)
   4. When multiple categories apply, choose the PRIMARY deliverable:
      - "Design logo and code website" → If equal split, use development (more complex)
      - "Edit video with motion graphics" → video_editing (primary deliverable)
   5. French terms: "montage vidéo" → video_editing, "rédaction de contenu" → content_writing,
      "conception graphique" → graphic_design, "développement" → development

8. **CRITICAL - Task Separation Logic - MANDATORY REQUIREMENT**:

   ⚠️ THIS IS THE MOST IMPORTANT RULE - READ CAREFULLY ⚠️

   When you see a line item with dashes/bullets underneath, you MUST create SEPARATE tasks.

   ❌ COMMON MISTAKE (DO NOT DO THIS):
   Combining all dashed items into one task with a generic name

   ✅ CORRECT APPROACH:
   Create individual task objects, one per dash/bullet/numbered item

   PATTERN 1: Dashed/Bulleted Sub-items (MANDATORY SEPARATION)

   **Example A: Make Workflow**
   Document shows:
   "Development work:
    - Adaptation flux Make pour reporting
    - Génération d'un script
    - Tests et MEP"

   YOU MUST EXTRACT: 3 SEPARATE tasks:
   [
     {
       "name": "Adapt Make workflow to include error reporting functionality",
       "description": "Modify existing Make.com automation workflow to capture and report errors...",
       "estimated_hours": 4
     },
     {
       "name": "Generate automated script for error compilation",
       "description": "Create script to aggregate errors from multiple sources...",
       "estimated_hours": 6
     },
     {
       "name": "Execute testing, feedback integration, and production deployment (MEP)",
       "description": "Comprehensive testing phase, integrate user feedback, deploy to production...",
       "estimated_hours": 8
     }
   ]

   **Example B: Squarespace Automation (Real-World Case)**
   Document shows:
   "Prolongation - Finalisation POC
    - Développement du scrapper d'automatisation de publication de contenu sur Squarespace
    - Transmission d'un .zip avec tout le nécessaire pour exécuter le contenu
    - Tests
    - Accompagnement pour l'exécution du scrapper"

   ❌ WRONG (DO NOT DO THIS):
   [
     {
       "name": "Develop automation scrapper for content publication on Squarespace",
       "description": "Complete POC with development, packaging, testing, and support"
     }
   ]

   ✅ CORRECT (YOU MUST DO THIS):
   [
     {
       "name": "Develop Squarespace content publication automation scrapper",
       "description": "Build automated scrapper to crawl and publish content on Squarespace platform with error handling and logging",
       "estimated_hours": 12,
       "category": "development"
     },
     {
       "name": "Package scrapper deliverable as executable .zip archive",
       "description": "Create deployable package containing scrapper code, dependencies, configuration files, and execution instructions",
       "estimated_hours": 2,
       "category": "deployment"
     },
     {
       "name": "Execute comprehensive testing of automation scrapper",
       "description": "Test scrapper functionality including edge cases, error handling, performance, and content validation",
       "estimated_hours": 4,
       "category": "testing"
     },
     {
       "name": "Provide client support and guidance for scrapper execution",
       "description": "Train client on scrapper setup, configuration, troubleshooting, and ongoing usage. Answer questions and resolve issues",
       "estimated_hours": 3,
       "category": "consulting"
     }
   ]

   PATTERN 2: Comma-Separated Activities (use judgment)
   "Design homepage, create logo" → 2 tasks (different deliverables)
   "Test and deploy feature" → 1 task (sequential workflow)

   PATTERN 3: Multi-Line Descriptions WITHOUT Dashes/Bullets (single task)
   ⚠️ KEY: Only combine if there are NO dashes/bullets

   "API Integration
    Connect to Stripe payment gateway
    Handle webhooks and error cases"
   → 1 task with full description (NO dashes present)

   **RULE OF THUMB (STRICTLY ENFORCED)**:
   - Each dash (-), bullet (•), or numbered item (1., 2.) = SEPARATE TASK (MANDATORY)
   - If pricing is PER ITEM = separate tasks
   - If description spans multiple lines WITHOUT bullets/dashes = single task

   **SELF-CHECK BEFORE SUBMITTING JSON**:
   1. Count the number of dashes (-) in the document
   2. Count the number of task objects in your JSON array
   3. If dashes > tasks: YOU MADE AN ERROR - Go back and separate each dashed item into its own task
   4. Each dash MUST have its own task object - NO EXCEPTIONS

9. **CRITICAL - Customer Identification**: The "customer" is the RECIPIENT (who will PAY)
   - Look for labels: "Client:", "À:", "Bill To:", "Destinataire:", "Facturé à:"
   - If two entities visible, customer is typically SECOND/BOTTOM entity
   - NEVER extract sender/freelancer/agency as customer
   - If in doubt, check context: "Merci pour votre confiance" → sender is freelancer

10. **Confidence Scoring Guidelines**:
   - overall: Average of all sub-scores
   - customer: 100 if email+name, 90 if name+company, 70 if name only, 50 if unclear
   - project: 90 if detailed description, 70 if name only, 50 if generic/inferred
   - tasks: 90 if all clear with hours, 70 if some vague, 50 if mostly vague
   - pricing: 100 if explicit breakdown, 80 if calculated, 60 if estimated

11. Handle edge cases:
   - Multiple tax rates: Use weighted average or primary rate
   - Discounts: Subtract from subtotal, note in invoice_estimate_details.notes
   - Deposits/advances: Note in payment_terms
   - Currency symbols: € = EUR, $ = USD, £ = GBP
   - Date formats: French (dd/mm/yyyy), US (mm/dd/yyyy), ISO (yyyy-mm-dd) → convert to ISO

12. Language detection:
   - "Devis", "Facture", "TTC", "HT", "TVA" = French
   - "Invoice", "Estimate", "Quote", "Tax", "VAT" = English
   - Set language field accordingly

13. Return ONLY valid JSON, no markdown blocks, no explanations, no comments"""

        user_prompt = """Please analyze this invoice or estimate document and extract all information according to the specified JSON structure.
Pay special attention to:
- Customer/client details
- Project or service description
- All line items with pricing and hours/days
- Dates (issue date, due date, validity)
- Tax information
- Total amounts

Return ONLY the JSON object, no additional text."""

        # Prepare API parameters
        api_params = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "response_format": {"type": "json_object"}
        }

        # Add reasoning_effort for GPT-5 models
        if 'gpt-5' in self.model.lower():
            api_params["reasoning_effort"] = self.reasoning_effort

        try:
            response = self.client.chat.completions.create(**api_params)
            content = response.choices[0].message.content
            extracted_data = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(exc)}")
            raise ValueError(f"Invalid JSON response from OpenAI: {str(exc)}") from exc
        except Exception as exc:
            message = str(exc)
            status = getattr(exc, "status_code", None)
            if status == 401 or "Incorrect API key provided" in message:
                raise RuntimeError(
                    "OpenAI authentication failed. Verify the OPENAI_API_KEY value and ensure it has access to the configured model."
                ) from exc
            logger.error(f"OpenAI API error: {message}")
            raise

        extracted_data['_metadata'] = {
            'model': self.model,
            'tokens_used': response.usage.total_tokens,
            'prompt_tokens': response.usage.prompt_tokens,
            'completion_tokens': response.usage.completion_tokens
        }

        return extracted_data

    def parse_documents_batch(self, file_paths: list[str]) -> Dict[str, Any]:
        """
        Parse multiple documents in batch for cost efficiency.
        Uses OpenAI Batch API when available, falls back to parallel processing.

        Args:
            file_paths: List of paths to PDF files

        Returns:
            Dictionary mapping file_path to extraction results
        """
        results = {}

        # For now, process in parallel (OpenAI Batch API has 24h turnaround)
        # We'll use concurrent processing for immediate results
        from concurrent.futures import ThreadPoolExecutor, as_completed

        try:
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_path = {
                    executor.submit(self.parse_document, path): path
                    for path in file_paths
                }

                for future in as_completed(future_to_path):
                    file_path = future_to_path[future]
                    try:
                        result = future.result()
                        results[file_path] = result
                    except Exception as e:
                        logger.error(f"Error processing {file_path}: {str(e)}")
                        results[file_path] = {
                            'success': False,
                            'extracted_data': None,
                            'error': str(e)
                        }

        except Exception as e:
            logger.error(f"Batch processing error: {str(e)}")
            # Fallback to sequential processing
            for path in file_paths:
                results[path] = self.parse_document(path)

        return results

    def validate_extracted_data(self, data: Dict[str, Any]) -> tuple[bool, list]:
        """
        Validate extracted data structure and content.

        Args:
            data: Extracted data dictionary

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check required top-level fields
        required_fields = ['document_type', 'language', 'confidence_scores', 'customer', 'tasks', 'invoice_estimate_details']
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")

        # Check document type
        if data.get('document_type') not in ['invoice', 'estimate']:
            errors.append(f"Invalid document_type: {data.get('document_type')}")

        # Check language
        if data.get('language') not in ['en', 'fr']:
            errors.append(f"Invalid language: {data.get('language')}")

        # Check tasks array
        if not isinstance(data.get('tasks'), list) or len(data.get('tasks', [])) == 0:
            errors.append("Tasks must be a non-empty array")

        # Check confidence scores are in valid range
        confidence = data.get('confidence_scores', {})
        for key, value in confidence.items():
            if not isinstance(value, (int, float)) or not (0 <= value <= 100):
                errors.append(f"Invalid confidence score for {key}: {value}")

        # Check customer has at least name or company
        customer = data.get('customer', {})
        if not customer.get('name') and not customer.get('company'):
            errors.append("Customer must have at least name or company")

        # Check invoice_estimate_details has total
        details = data.get('invoice_estimate_details', {})
        if not isinstance(details.get('total'), (int, float)):
            errors.append("invoice_estimate_details.total must be a number")

        return len(errors) == 0, errors

    def extract_tags_for_tasks(self, tasks: list[dict]) -> list[dict]:
        """
        Extract context-aware tags for tasks using AI.

        This method sends each task to GPT-4o-mini to extract 3-7 relevant,
        specific tags based on the actual tools, technologies, and skills mentioned.

        Args:
            tasks: List of task dictionaries with name, description, category

        Returns:
            Same tasks list with 'tags' field added to each task
        """

        tag_extraction_prompt = """You are a skill tagging expert. Extract 3-7 specific, relevant tags for this freelance task.

GUIDELINES:
1. **Be SPECIFIC** - Prefer exact tool/platform names over generic terms
   ✅ Good: "figma", "make.com", "premiere-pro", "react", "photoshop"
   ❌ Bad: "design", "automation", "development", "editing"

2. **Focus on ACTUAL skills/tools mentioned** - Don't infer generic categories
   - If task mentions "Make.com" → tag: "make.com", "automation", "no-code"
   - If task mentions "Figma UI design" → tag: "figma", "ui-design", "prototyping"
   - If task mentions "Photoshop logo" → tag: "photoshop", "logo-design", "branding"

3. **Include relevant technologies/platforms**:
   - Specific tools: figma, photoshop, illustrator, premiere-pro, after-effects, blender, make.com, zapier
   - Programming: react, python, django, javascript, typescript, nodejs, vue, angular
   - Platforms: wordpress, shopify, airtable, hubspot, aws, stripe
   - Skills: ui-design, logo-design, video-editing, copywriting, seo, 3d-modeling

4. **Format tags**:
   - Lowercase, hyphen-separated: "after-effects", "ui-design", "make.com"
   - NO spaces, NO special characters except hyphens
   - NO overly generic tags: avoid "work", "task", "project", "general"

5. **Prioritize by relevance** (most relevant first)

6. **Max 7 tags** - quality over quantity

EXAMPLES:

Task: "Create automation templates using Make for client onboarding"
Tags: ["make.com", "automation", "no-code", "workflow", "onboarding"]

Task: "Design mobile app UI in Figma with dark mode and animations"
Tags: ["figma", "ui-design", "mobile-app", "prototyping", "dark-mode", "animation"]

Task: "Edit 10-minute YouTube video with motion graphics in Premiere and After Effects"
Tags: ["premiere-pro", "after-effects", "motion-graphics", "video-editing", "youtube"]

Task: "Logo design and brand identity package in Illustrator"
Tags: ["illustrator", "logo-design", "branding", "graphic-design", "visual-identity"]

Task: "Write 5 SEO-optimized blog posts about digital marketing"
Tags: ["seo-writing", "content-writing", "blog-posts", "copywriting", "digital-marketing"]

Task: "Implement REST API authentication with JWT tokens in Django"
Tags: ["django", "python", "rest-api", "authentication", "jwt", "backend"]

Task: "3D product visualization in Blender with realistic rendering"
Tags: ["blender", "3d-modeling", "rendering", "product-visualization", "3d-graphics"]

Task: "Translate marketing materials from English to French"
Tags: ["translation", "french", "english-to-french", "localization", "marketing-translation"]

Task: "Manage Facebook and Instagram ad campaigns"
Tags: ["facebook-ads", "instagram-ads", "social-media-marketing", "ppc", "ad-campaigns"]

Task: "Bookkeeping and monthly financial reporting in QuickBooks"
Tags: ["quickbooks", "bookkeeping", "financial-reporting", "accounting"]

Now extract tags for this task:

Task Name: {task_name}
Description: {task_description}
Category: {category}

Return ONLY a JSON array of tags: ["tag1", "tag2", "tag3"]
"""

        for task in tasks:
            try:
                task_name = task.get('name', '')
                task_description = task.get('description', '')
                category = task.get('category', '')

                # Skip if task has no meaningful content
                if not task_name and not task_description:
                    task['tags'] = []
                    continue

                # Call OpenAI GPT-4o-mini (cheaper, faster for tag extraction)
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Cheaper model for simple extraction
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a skill tagging expert. Return ONLY a JSON array of tags, nothing else."
                        },
                        {
                            "role": "user",
                            "content": tag_extraction_prompt.format(
                                task_name=task_name,
                                task_description=task_description,
                                category=category
                            )
                        }
                    ],
                    temperature=0.3,  # Low temperature for consistency
                    max_tokens=100  # Tags are short
                )

                tags_text = response.choices[0].message.content.strip()

                # Parse JSON array
                import json
                import re

                # Clean up response (remove markdown if present)
                tags_text = re.sub(r'```json\s*|\s*```', '', tags_text)
                tags_text = tags_text.strip()

                # Parse tags
                tags = json.loads(tags_text)

                # Validate and clean tags
                if isinstance(tags, list):
                    # Filter to max 7 tags, lowercase, remove empty
                    cleaned_tags = [
                        tag.lower().strip()
                        for tag in tags
                        if isinstance(tag, str) and tag.strip()
                    ][:7]
                    task['tags'] = cleaned_tags
                else:
                    task['tags'] = []

            except Exception as e:
                logger.warning(f"Failed to extract tags for task '{task.get('name', 'unknown')}': {e}")
                # Fallback: use category as single tag
                task['tags'] = [task.get('category', 'other')] if task.get('category') else []

        return tasks
