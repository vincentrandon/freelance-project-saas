from celery import shared_task
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from .models import Invoice, Estimate, SignatureRequest
from notifications.signals import (
    notify_pdf_generated,
    notify_pdf_failed,
    notify_email_sent,
    notify_email_failed
)
import logging

logger = logging.getLogger(__name__)


@shared_task
def generate_invoice_pdf(invoice_id):
    """Generate PDF for invoice using WeasyPrint with enhanced template"""
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        from weasyprint import HTML, CSS
        from io import BytesIO
        from django.core.files.base import ContentFile

        # Get user profile for PDF customization
        profile = invoice.user.profile

        # Render invoice template with profile data
        html_string = render_to_string('invoicing/invoice_pdf.html', {
            'invoice': invoice,
            'profile': profile,
        })

        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)

        # Save PDF
        filename = f'invoice_{invoice.invoice_number}.pdf'
        invoice.pdf_file.save(filename, ContentFile(pdf_file.getvalue()))
        invoice.save()

        logger.info(f'Invoice {invoice.id} PDF generated successfully')

        # Send success notification
        notify_pdf_generated(
            user_id=invoice.user.id,
            document_type='Invoice',
            document_number=invoice.invoice_number,
            link=f'/invoices/{invoice.id}',
            content_object=invoice
        )

        return True
    except Exception as e:
        logger.error(f'Error generating invoice {invoice_id} PDF: {str(e)}', exc_info=True)

        # Send failure notification
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            notify_pdf_failed(
                user_id=invoice.user.id,
                document_type='Invoice',
                document_number=invoice.invoice_number,
                error_message=str(e)
            )
        except:
            pass

        return False


@shared_task
def generate_estimate_pdf(estimate_id):
    """Generate PDF for estimate using WeasyPrint with TJM and margin support"""
    try:
        estimate = Estimate.objects.get(id=estimate_id)
        from weasyprint import HTML
        from io import BytesIO
        from django.core.files.base import ContentFile

        # Get user profile for PDF customization
        profile = estimate.user.profile

        # Render estimate template with profile data
        html_string = render_to_string('invoicing/estimate_pdf.html', {
            'estimate': estimate,
            'profile': profile,
        })

        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)

        # Save PDF
        filename = f'estimate_{estimate.estimate_number}_v{estimate.version}.pdf'
        estimate.pdf_file.save(filename, ContentFile(pdf_file.getvalue()))
        estimate.save()

        logger.info(f'Estimate {estimate.id} PDF generated successfully (version {estimate.version})')

        # Send success notification
        notify_pdf_generated(
            user_id=estimate.user.id,
            document_type='Estimate',
            document_number=f'{estimate.estimate_number} (v{estimate.version})',
            link=f'/invoices?tab=estimates&id={estimate.id}',
            content_object=estimate
        )

        return True
    except Exception as e:
        logger.error(f'Error generating estimate {estimate_id} PDF: {str(e)}', exc_info=True)

        # Send failure notification
        try:
            estimate = Estimate.objects.get(id=estimate_id)
            notify_pdf_failed(
                user_id=estimate.user.id,
                document_type='Estimate',
                document_number=f'{estimate.estimate_number} (v{estimate.version})',
                error_message=str(e)
            )
        except:
            pass

        return False


@shared_task
def generate_signed_pdf(estimate_id):
    """
    Generate signed PDF with embedded signature for a signed estimate.

    This task regenerates the estimate PDF with the signature visually embedded,
    including "Bon pour accord" and signature metadata for legal proof.
    """
    try:
        from weasyprint import HTML
        from io import BytesIO
        from django.core.files.base import ContentFile
        from .models import SignatureRequest
        import base64
        import re

        estimate = Estimate.objects.get(id=estimate_id)

        # Verify estimate is signed
        if estimate.signature_status != 'signed':
            logger.warning(f'Cannot generate signed PDF for estimate {estimate_id}: not signed')
            return False

        # Get signature request
        try:
            signature_request = SignatureRequest.objects.get(estimate=estimate, status='signed')
        except SignatureRequest.DoesNotExist:
            logger.error(f'Signature request not found for estimate {estimate_id}')
            return False

        # Get user profile for PDF customization
        profile = estimate.user.profile

        # Process signature image if it exists (convert base64 data URI to just base64)
        if signature_request.signature_metadata and 'signature_image' in signature_request.signature_metadata:
            sig_image = signature_request.signature_metadata['signature_image']
            # Extract base64 data from data URI (e.g., "data:image/png;base64,...")
            if sig_image and sig_image.startswith('data:'):
                # Extract just the base64 part
                match = re.search(r'base64,(.+)', sig_image)
                if match:
                    signature_request.signature_metadata['signature_image'] = match.group(1)

        # Render signed estimate template with signature data
        html_string = render_to_string('invoicing/estimate_pdf_signed.html', {
            'estimate': estimate,
            'profile': profile,
            'signature_request': signature_request,
        })

        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)

        # Save PDF (overwrite the original)
        filename = f'estimate_{estimate.estimate_number}_v{estimate.version}_signed.pdf'
        estimate.pdf_file.save(filename, ContentFile(pdf_file.getvalue()))
        estimate.save()

        logger.info(f'Signed PDF generated successfully for estimate {estimate.id}')
        return True
    except Exception as e:
        logger.error(f'Error generating signed PDF for estimate {estimate_id}: {str(e)}', exc_info=True)
        return False


@shared_task
def send_invoice_email(invoice_id):
    """Send invoice via email"""
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        
        subject = f'Invoice {invoice.invoice_number}'
        html_message = render_to_string('invoicing/invoice_email.html', {
            'invoice': invoice,
            'customer': invoice.customer,
        })
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email='noreply@kiik.app',
            recipient_list=[invoice.customer.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        invoice.status = 'sent'
        invoice.save()

        logger.info(f'Invoice {invoice.id} sent to {invoice.customer.email}')

        # Send success notification
        notify_email_sent(
            user_id=invoice.user.id,
            document_type='Invoice',
            document_number=invoice.invoice_number,
            recipient=invoice.customer.email,
            content_object=invoice
        )

        return True
    except Exception as e:
        logger.error(f'Error sending invoice {invoice_id}: {str(e)}')

        # Send failure notification
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            notify_email_failed(
                user_id=invoice.user.id,
                document_type='Invoice',
                document_number=invoice.invoice_number,
                recipient=invoice.customer.email,
                error_message=str(e)
            )
        except:
            pass

        return False


@shared_task
def send_estimate_email(estimate_id):
    """Send estimate via email"""
    try:
        estimate = Estimate.objects.get(id=estimate_id)
        profile = estimate.user.profile

        subject = f'Devis {estimate.estimate_number}'

        # Create email with PDF attachment
        email = EmailMessage(
            subject=subject,
            body=f"""Bonjour {estimate.customer.name},

Veuillez trouver ci-joint votre devis {estimate.estimate_number}.

Montant total: {estimate.total} {estimate.currency}
Valable jusqu'au: {estimate.valid_until.strftime('%d/%m/%Y')}

Cordialement,
{profile.company_name or 'Votre prestataire'}
""",
            from_email=profile.get_business_email() or settings.DEFAULT_FROM_EMAIL,
            to=[estimate.customer.email],
        )

        # Attach PDF if exists
        if estimate.pdf_file:
            email.attach_file(estimate.pdf_file.path)

        email.send(fail_silently=False)

        estimate.status = 'sent'
        estimate.save()

        logger.info(f'Estimate {estimate.id} sent to {estimate.customer.email}')

        # Send success notification
        notify_email_sent(
            user_id=estimate.user.id,
            document_type='Estimate',
            document_number=estimate.estimate_number,
            recipient=estimate.customer.email,
            content_object=estimate
        )

        return True
    except Exception as e:
        logger.error(f'Error sending estimate {estimate_id}: {str(e)}', exc_info=True)

        # Send failure notification
        try:
            estimate = Estimate.objects.get(id=estimate_id)
            notify_email_failed(
                user_id=estimate.user.id,
                document_type='Estimate',
                document_number=estimate.estimate_number,
                recipient=estimate.customer.email,
                error_message=str(e)
            )
        except:
            pass

        return False


@shared_task
def send_signature_request_email(signature_request_id):
    """Send signature request email to customer"""
    try:
        signature_request = SignatureRequest.objects.get(id=signature_request_id)
        estimate = signature_request.estimate
        profile = estimate.user.profile

        subject = f'Demande de signature - Devis {estimate.estimate_number}'

        # Build signature URL
        signature_url = signature_request.signature_url

        body = f"""Bonjour {signature_request.signer_name},

{profile.company_name or 'Votre prestataire'} vous invite à signer le devis {estimate.estimate_number}.

Montant: {estimate.total} {estimate.currency}
Valide jusqu'au: {estimate.valid_until.strftime('%d/%m/%Y')}

Pour consulter et signer ce devis, cliquez sur le lien ci-dessous:
{signature_url}

Ce lien est valable jusqu'au {signature_request.expires_at.strftime('%d/%m/%Y')}.

Cordialement,
{profile.company_name or 'Votre prestataire'}
{profile.get_business_email()}
"""

        send_mail(
            subject=subject,
            message=body,
            from_email=profile.get_business_email() or settings.DEFAULT_FROM_EMAIL,
            recipient_list=[signature_request.signer_email],
            fail_silently=False,
        )

        # Mark as sent
        from django.utils import timezone
        signature_request.email_sent_at = timezone.now()
        signature_request.save()

        logger.info(f'Signature request {signature_request.id} sent to {signature_request.signer_email}')
        return True
    except Exception as e:
        logger.error(f'Error sending signature request {signature_request_id}: {str(e)}', exc_info=True)
        return False


@shared_task
def apply_signature_to_pdf(signature_request_id):
    """
    Apply digital signature to estimate PDF using pyHanko.
    This is a placeholder for future pyHanko integration.
    """
    try:
        signature_request = SignatureRequest.objects.get(id=signature_request_id)
        estimate = signature_request.estimate

        # TODO: Implement pyHanko signature
        # For now, just log and return
        logger.info(f'Signature applied placeholder for estimate {estimate.id}')

        # Future implementation will:
        # 1. Load unsigned PDF
        # 2. Add signature field using pyHanko
        # 3. Apply signature data
        # 4. Save signed PDF to estimate.signed_pdf_file

        return True
    except Exception as e:
        logger.error(f'Error applying signature {signature_request_id}: {str(e)}', exc_info=True)
        return False
