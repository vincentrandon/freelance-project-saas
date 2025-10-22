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
from openai import OpenAI
import PyPDF2
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)


class OpenAIDocumentParser:
    """Service for parsing invoice and estimate PDFs using OpenAI GPT-4o Vision"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
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
      "category": "development|design|testing|deployment|consulting|documentation|maintenance|research|other"
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
2. For line items, convert them to task objects
3. **CRITICAL - Time Estimation**: For EVERY task, you MUST provide estimated_hours
   - If hours/days are explicitly stated: Use that value (convert days to hours: 1 day = 8 hours)
   - If quantity/units are given: That's your hours
   - If only amount is given: Calculate backwards from hourly rate (estimated_hours = amount / hourly_rate)
   - If nothing is stated: Infer based on task complexity:
     * Simple tasks (updates, small fixes): 1-4 hours
     * Medium tasks (features, integrations): 8-16 hours (1-2 days)
     * Complex tasks (modules, major features): 24-40 hours (3-5 days)
   - NEVER leave estimated_hours as null - always provide your best estimate
4. **CRITICAL - Hourly Rate Calculation**: Calculate hourly_rate for every task
   - If explicit: Use stated rate
   - If days with daily rate (TJM): Convert (TJM rate / 8 hours)
   - If only total amount: Derive from estimated_hours (amount / hours)
   - Typical French freelance rates: €400-€600/day (€50-€75/hour)
5. **CRITICAL - Task Categorization**: Assign category to each task based on keywords
   - Development: code, develop, implement, API, backend, frontend, feature, bug, fix
   - Design: UI, UX, mockup, wireframe, graphic, logo, design
   - Testing: test, QA, validation, debug
   - Deployment: deploy, release, production, hosting, server
   - Consulting: meeting, strategy, advice, consulting, planning
   - Documentation: doc, documentation, manual, wiki, guide
   - Maintenance: maintenance, support, monitoring, update
   - Research: research, POC, investigation, analysis
   - Other: if none match
6. If information is missing, use null (except for estimated_hours and hourly_rate - always infer these)
7. Confidence scores should reflect your certainty (high quality scan = high score)
8. Detect document language automatically
9. Handle both "Facture" (invoice) and "Devis" (estimate) in French
10. **CRITICAL - Customer Identification**: The "customer" is the RECIPIENT of the invoice/estimate (the one who will PAY), NOT the sender/issuer.
   - Usually appears after labels like "Client:", "À:", "Bill To:", "Destinataire:"
   - If two entities are present, the customer is typically the second one (bottom/right side of document)
   - The sender/freelancer details should NOT be extracted as the customer
11. **CRITICAL - Task Identification**: When extracting tasks from line items:
    - If you see multiple items separated by dashes/bullet points (-), each dash represents a DIFFERENT, SEPARATE task
    - Example workflow tasks you might encounter:
      * Adaptation flux Make pour inclure reporting d'erreurs
      * Génération d'un script pour compiler les erreurs
      * Compilation des résultats et envoi
      * Tests, retours et MEP
    - Each of these should be extracted as individual task objects with separate pricing
    - Do NOT combine multiple dashed items into a single task
12. **Quality Estimation Tips**:
    - Add 20% buffer to raw estimates for realistic planning
    - Consider task dependencies and complexity multipliers
    - Round estimates to realistic increments (0.5, 1, 2, 4, 8, 16, 24, 40 hours)
13. Return ONLY valid JSON, no markdown or explanations"""

        user_prompt = """Please analyze this invoice or estimate document and extract all information according to the specified JSON structure.
Pay special attention to:
- Customer/client details
- Project or service description
- All line items with pricing and hours/days
- Dates (issue date, due date, validity)
- Tax information
- Total amounts

Return ONLY the JSON object, no additional text."""

        try:
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

            response = self.client.chat.completions.create(**api_params)

            # Parse the response
            content = response.choices[0].message.content
            extracted_data = json.loads(content)

            # Add usage metadata
            extracted_data['_metadata'] = {
                'model': self.model,
                'tokens_used': response.usage.total_tokens,
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens
            }

            return extracted_data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            raise ValueError(f"Invalid JSON response from OpenAI: {str(e)}")
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise

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
