"""
Celery tasks for CRA operations:
- Auto-generate invoices from validated CRAs
- Send validation email requests
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def generate_invoice_from_cra(cra_id):
    """
    Generate invoice from validated CRA (triggered after client signature).
    
    Args:
        cra_id: CRA model primary key
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from .models import CRA
        from .services import create_invoice_from_cra
        
        cra = CRA.objects.get(id=cra_id)
        invoice = create_invoice_from_cra(cra)
        
        logger.info(f'Invoice {invoice.invoice_number} auto-generated from CRA {cra.id}')
        
        # Send email notification to user
        try:
            profile = cra.user.profile
            email_body = f"""Bonjour,

Votre CRA pour {cra.period_display} ({cra.customer.name}) a été validé par le client.

Une facture brouillon a été automatiquement générée:
- Numéro: {invoice.invoice_number}
- Montant: {invoice.total} {invoice.currency}
- Date d'émission: {invoice.issue_date.strftime('%d/%m/%Y')}
- Date d'échéance: {invoice.due_date.strftime('%d/%m/%Y')}

Vous pouvez consulter et modifier cette facture avant envoi sur votre tableau de bord.

Cordialement,
Freelancer Management System
"""
            
            send_mail(
                subject=f'CRA validé - Facture {invoice.invoice_number} créée',
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[cra.user.email],
                fail_silently=False
            )
        except Exception as e:
            logger.warning(f'Failed to send notification email for invoice {invoice.id}: {str(e)}')
        
        return True
        
    except Exception as e:
        logger.error(f'Error generating invoice from CRA {cra_id}: {str(e)}', exc_info=True)
        return False


@shared_task
def send_cra_validation_email(signature_request_id):
    """
    Send CRA validation request email to client.
    
    Args:
        signature_request_id: CRASignature model primary key
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from .models import CRASignature
        
        signature_request = CRASignature.objects.get(id=signature_request_id)
        cra = signature_request.cra
        profile = cra.user.profile
        
        subject = f'Validation CRA - {cra.period_display} - {profile.company_name or cra.user.get_full_name()}'
        
        # Build signature URL
        signature_url = signature_request.signature_url
        
        body = f"""Bonjour {signature_request.signer_name},

{profile.company_name or cra.user.get_full_name()} vous invite à valider le Compte Rendu d'Activité pour {cra.period_display}.

Détails:
- Période: {cra.period_display}
- Total jours travaillés: {cra.total_days}
- Taux journalier: {cra.daily_rate} {cra.currency}
- Montant total (HT): {cra.total_amount} {cra.currency}

Pour consulter et signer ce CRA, cliquez sur le lien ci-dessous:
{signature_url}

Ce lien est valable jusqu'au {signature_request.expires_at.strftime('%d/%m/%Y')}.

Cordialement,
{profile.company_name or cra.user.get_full_name()}
{profile.get_business_email() if hasattr(profile, 'get_business_email') else cra.user.email}
"""
        
        send_mail(
            subject=subject,
            message=body,
            from_email=profile.get_business_email() if hasattr(profile, 'get_business_email') else settings.DEFAULT_FROM_EMAIL,
            recipient_list=[signature_request.signer_email],
            fail_silently=False
        )
        
        # Mark as sent
        signature_request.email_sent_at = timezone.now()
        signature_request.save()
        
        logger.info(f'CRA validation email sent for signature request {signature_request.id}')
        return True
        
    except Exception as e:
        logger.error(f'Error sending CRA validation email for signature request {signature_request_id}: {str(e)}', exc_info=True)
        return False
