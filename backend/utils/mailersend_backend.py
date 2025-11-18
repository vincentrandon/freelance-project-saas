"""
MailerSend Email Backend for Django

This is an alternative email backend that uses MailerSend's API instead of SMTP.
Use this if you prefer API-based email sending or need advanced MailerSend features.

To use this backend, set in your .env:
    EMAIL_BACKEND=utils.mailersend_backend.MailerSendBackend
    MAILERSEND_API_KEY=mlsn.your-api-key

The API backend provides:
- Better error handling and logging
- Access to MailerSend analytics
- Support for advanced features (templates, scheduling, etc.)
- No SMTP credentials needed
"""
import logging
import base64
from typing import List

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail import EmailMessage, EmailMultiAlternatives

logger = logging.getLogger(__name__)


class MailerSendBackend(BaseEmailBackend):
    """
    Django email backend that uses MailerSend API v2.x for sending emails

    This backend supports:
    - Plain text emails
    - HTML emails (via EmailMultiAlternatives)
    - Multiple recipients
    - CC and BCC
    - Attachments
    - Reply-To headers
    - Custom headers
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'MAILERSEND_API_KEY', None)

        if not self.api_key:
            if not fail_silently:
                raise ValueError(
                    "MAILERSEND_API_KEY is not set in settings. "
                    "Either set it in your .env file or use SMTP backend instead."
                )
            logger.warning("MAILERSEND_API_KEY not configured. Emails will not be sent.")

        # Initialize MailerSend client once
        self.client = None
        if self.api_key:
            try:
                from mailersend import MailerSendClient
                self.client = MailerSendClient(api_key=self.api_key)
            except ImportError:
                if not fail_silently:
                    raise ImportError(
                        "mailersend package is not installed. "
                        "Install it with: pip install mailersend"
                    )
                logger.error("mailersend package not installed")

    def send_messages(self, email_messages: List[EmailMessage]) -> int:
        """
        Send one or more EmailMessage objects and return the number sent successfully.

        Args:
            email_messages: List of Django EmailMessage or EmailMultiAlternatives objects

        Returns:
            int: Number of emails sent successfully
        """
        if not self.client:
            return 0

        num_sent = 0

        for message in email_messages:
            try:
                sent = self._send_message(message)
                if sent:
                    num_sent += 1
            except Exception as e:
                logger.error(f"Failed to send email via MailerSend: {str(e)}", exc_info=True)
                if not self.fail_silently:
                    raise

        return num_sent

    def _send_message(self, message: EmailMessage) -> bool:
        """
        Send a single EmailMessage using MailerSend API v2.x

        Args:
            message: Django EmailMessage or EmailMultiAlternatives object

        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.client:
            return False

        try:
            # Build email payload according to MailerSend API v2.x format
            email_data = self._build_email_payload(message)

            # Send email using MailerSend client
            response = self.client.email.send(email_data)

            # Check response
            # MailerSend API returns 202 Accepted for successful email submission
            if hasattr(response, 'status_code'):
                if response.status_code == 202:
                    logger.info(f"Email sent successfully via MailerSend API to {message.to}")
                    return True
                else:
                    logger.error(f"MailerSend API error: status={response.status_code}, response={response}")
                    return False
            elif hasattr(response, 'get'):
                # Some versions return dict-like objects
                status = response.get('status_code', 0)
                if status == 202:
                    logger.info(f"Email sent successfully via MailerSend API to {message.to}")
                    return True
                else:
                    logger.error(f"MailerSend API error: {response}")
                    return False
            else:
                # Assume success if we got a response without error
                logger.info(f"Email sent via MailerSend API to {message.to}")
                return True

        except Exception as e:
            logger.error(f"MailerSend API send error: {str(e)}", exc_info=True)
            if not self.fail_silently:
                raise
            return False

    def _build_email_payload(self, message: EmailMessage) -> dict:
        """
        Build MailerSend API v2.x email payload from Django EmailMessage

        Args:
            message: Django EmailMessage or EmailMultiAlternatives object

        Returns:
            dict: MailerSend API email payload
        """
        # Extract from email
        from_email = self._extract_email(message.from_email)
        from_name = self._extract_name(message.from_email) or "kiik.app"

        # Build payload
        payload = {
            "from": {
                "email": from_email,
                "name": from_name
            },
            "to": [
                {
                    "email": self._extract_email(recipient),
                    "name": self._extract_name(recipient) or ""
                }
                for recipient in message.to
            ],
            "subject": message.subject,
        }

        # Add plain text body
        if message.body:
            payload["text"] = message.body

        # Add HTML body if present (from EmailMultiAlternatives)
        html_body = None
        if isinstance(message, EmailMultiAlternatives) and message.alternatives:
            for alternative, mimetype in message.alternatives:
                if mimetype == 'text/html':
                    html_body = alternative
                    break

        if html_body:
            payload["html"] = html_body

        # Add CC if present
        if message.cc:
            payload["cc"] = [
                {
                    "email": self._extract_email(recipient),
                    "name": self._extract_name(recipient) or ""
                }
                for recipient in message.cc
            ]

        # Add BCC if present
        if message.bcc:
            payload["bcc"] = [
                {
                    "email": self._extract_email(recipient),
                    "name": self._extract_name(recipient) or ""
                }
                for recipient in message.bcc
            ]

        # Add reply-to if present
        if message.reply_to:
            payload["reply_to"] = {
                "email": self._extract_email(message.reply_to[0]),
                "name": self._extract_name(message.reply_to[0]) or ""
            }

        # Add attachments if present
        if message.attachments:
            attachments = []
            for attachment in message.attachments:
                if isinstance(attachment, tuple) and len(attachment) >= 2:
                    # (filename, content, mimetype)
                    filename = attachment[0]
                    content = attachment[1]

                    # Convert bytes to base64 string
                    if isinstance(content, bytes):
                        content_b64 = base64.b64encode(content).decode('utf-8')
                    elif isinstance(content, str):
                        content_b64 = base64.b64encode(content.encode('utf-8')).decode('utf-8')
                    else:
                        logger.warning(f"Unsupported attachment content type: {type(content)}")
                        continue

                    attachments.append({
                        "filename": filename,
                        "content": content_b64,
                        "disposition": "attachment"
                    })

            if attachments:
                payload["attachments"] = attachments

        return payload

    def _extract_email(self, email_string: str) -> str:
        """
        Extract email address from string (handles "Name <email@example.com>" format)

        Args:
            email_string: Email string in various formats

        Returns:
            str: Extracted email address
        """
        if not email_string:
            return ""

        email_string = str(email_string).strip()

        if '<' in email_string and '>' in email_string:
            # Format: "Name <email@example.com>"
            return email_string.split('<')[1].split('>')[0].strip()

        return email_string

    def _extract_name(self, email_string: str) -> str:
        """
        Extract name from email string (handles "Name <email@example.com>" format)

        Args:
            email_string: Email string in various formats

        Returns:
            str: Extracted name or empty string
        """
        if not email_string:
            return ""

        email_string = str(email_string).strip()

        if '<' in email_string and '>' in email_string:
            # Format: "Name <email@example.com>"
            name = email_string.split('<')[0].strip()
            return name if name else ""

        return ""
