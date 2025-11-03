"""
PDF generation service for CRA (Compte Rendu d'Activité).
Uses WeasyPrint to generate French-compliant activity report PDFs.
"""
from weasyprint import HTML
from io import BytesIO
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from datetime import datetime, date
from calendar import monthcalendar
from collections import Counter
import json
import logging

logger = logging.getLogger(__name__)


def prepare_calendar_data(cra):
    """
    Prepare calendar data structure for PDF rendering.

    Args:
        cra: CRA model instance

    Returns:
        dict: Calendar data with weeks and day details
    """
    try:
        # Get month calendar (list of weeks, each week is list of days)
        month_cal = monthcalendar(cra.period_year, cra.period_month)

        # Parse worked dates from CRA
        worked_dates = set()
        if cra.selected_work_dates:
            if isinstance(cra.selected_work_dates, str):
                worked_dates_list = json.loads(cra.selected_work_dates)
            else:
                worked_dates_list = cra.selected_work_dates

            # Convert to set of day numbers
            for date_str in worked_dates_list:
                try:
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                    if dt.month == cra.period_month and dt.year == cra.period_year:
                        worked_dates.add(dt.day)
                except:
                    pass

        # Count tasks per day
        task_counts = Counter()
        for task in cra.tasks.all():
            if task.worked_dates:
                if isinstance(task.worked_dates, str):
                    task_dates = json.loads(task.worked_dates)
                else:
                    task_dates = task.worked_dates

                for date_str in task_dates:
                    try:
                        dt = datetime.strptime(date_str, '%Y-%m-%d')
                        if dt.month == cra.period_month and dt.year == cra.period_year:
                            task_counts[dt.day] += 1
                    except:
                        pass

        # Build calendar structure
        today = date.today()
        weeks = []

        for week in month_cal:
            week_data = []
            for day in week:
                if day == 0:
                    # Empty cell (day from other month)
                    week_data.append({
                        'day': '',
                        'is_empty': True,
                        'is_worked': False,
                        'is_weekend': False,
                        'is_today': False,
                        'task_count': 0
                    })
                else:
                    # Real day
                    day_date = date(cra.period_year, cra.period_month, day)
                    is_weekend = day_date.weekday() >= 5  # Saturday = 5, Sunday = 6
                    is_worked = day in worked_dates
                    is_today = day_date == today

                    week_data.append({
                        'day': day,
                        'is_empty': False,
                        'is_worked': is_worked,
                        'is_weekend': is_weekend,
                        'is_today': is_today,
                        'task_count': task_counts.get(day, 0)
                    })

            weeks.append(week_data)

        return {
            'weeks': weeks,
            'worked_days_count': len(worked_dates),
            'total_tasks': len(task_counts)
        }

    except Exception as e:
        logger.warning(f'Error preparing calendar data for CRA {cra.id}: {str(e)}')
        return None


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

        # Add calculated amount and formatted dates to each task
        tasks_with_amounts = []
        for task in tasks:
            task.task_amount = float(task.worked_days) * float(cra.daily_rate)

            # Format worked dates for display
            if task.worked_dates:
                try:
                    if isinstance(task.worked_dates, str):
                        dates_list = json.loads(task.worked_dates)
                    else:
                        dates_list = task.worked_dates

                    # Parse and sort dates
                    parsed_dates = []
                    for date_str in dates_list:
                        try:
                            dt = datetime.strptime(date_str, '%Y-%m-%d')
                            parsed_dates.append(dt)
                        except:
                            pass

                    parsed_dates.sort()

                    # Group consecutive dates into ranges
                    if parsed_dates:
                        ranges = []
                        range_start = parsed_dates[0]
                        range_end = parsed_dates[0]

                        for i in range(1, len(parsed_dates)):
                            # Check if dates are consecutive
                            if (parsed_dates[i] - range_end).days == 1:
                                range_end = parsed_dates[i]
                            else:
                                # Save current range and start new one
                                if range_start == range_end:
                                    ranges.append(range_start.strftime('%d/%m'))
                                else:
                                    ranges.append(f"{range_start.strftime('%d')}-{range_end.strftime('%d/%m')}")
                                range_start = parsed_dates[i]
                                range_end = parsed_dates[i]

                        # Add final range
                        if range_start == range_end:
                            ranges.append(range_start.strftime('%d/%m'))
                        else:
                            ranges.append(f"{range_start.strftime('%d')}-{range_end.strftime('%d/%m')}")

                        task.worked_dates_display = ', '.join(ranges)
                    else:
                        task.worked_dates_display = None
                except:
                    task.worked_dates_display = None
            else:
                task.worked_dates_display = None

            tasks_with_amounts.append(task)

        # Prepare calendar data
        calendar_data = prepare_calendar_data(cra)

        # Render CRA template
        html_string = render_to_string('cra/cra_pdf.html', {
            'cra': cra,
            'profile': profile,
            'tasks': tasks_with_amounts,
            'calendar_data': calendar_data,
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
