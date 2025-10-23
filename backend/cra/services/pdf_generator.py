"""
PDF generation service for CRA (Compte Rendu d'Activité).
Uses WeasyPrint to generate French-compliant activity report PDFs.
"""
from weasyprint import HTML
from io import BytesIO
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


def generate_cra_pdf(cra):
    """
    Generate PDF for CRA using WeasyPrint.
    
    Args:
        cra: CRA model instance
        
    Returns:
        str: Path to the generated PDF file
        
    Raises:
        Exception: If PDF generation fails
    """
    try:
        # Get user profile for PDF customization
        profile = cra.user.profile
        
        # Get tasks with details and calculate amounts
        tasks = cra.tasks.all().select_related('project').order_by('order', 'created_at')

        # Add calculated amount to each task
        tasks_with_amounts = []
        for task in tasks:
            task.task_amount = float(task.worked_days) * float(cra.daily_rate)
            tasks_with_amounts.append(task)

        # Render CRA template
        html_string = render_to_string('cra/cra_pdf.html', {
            'cra': cra,
            'profile': profile,
            'tasks': tasks_with_amounts,
        })
        
        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)
        
        # Save PDF
        filename = f'cra_{cra.period_month:02d}_{cra.period_year}_{cra.customer.name.replace(" ", "_")}.pdf'
        cra.pdf_file.save(filename, ContentFile(pdf_file.getvalue()))
        cra.save()
        
        logger.info(f'CRA {cra.id} PDF generated successfully')
        return cra.pdf_file.path
        
    except Exception as e:
        logger.error(f'Error generating CRA {cra.id} PDF: {str(e)}', exc_info=True)
        raise
