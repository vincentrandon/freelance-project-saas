# MailerSend Email Integration Guide

This document provides a complete guide for setting up MailerSend email integration with kiik.app.

## Overview

kiik.app has been configured to use **MailerSend** for all transactional emails, including:

- 🔐 **Authentication**: Password resets, email verification, welcome emails
- 📄 **Invoices & Estimates**: Send documents to customers via email
- 📊 **CRA (Activity Reports)**: Validation requests and notifications
- 💳 **Subscriptions**: Trial expiration reminders
- 🔔 **Notifications**: In-app notifications sent via email

## Why MailerSend?

MailerSend offers:
- ✅ Professional transactional email service
- ✅ High deliverability rates
- ✅ Generous free tier
- ✅ Email analytics and tracking
- ✅ SMTP and API support
- ✅ Domain verification (SPF, DKIM)
- ✅ Template management

## Quick Start

### 1. Create MailerSend Account

1. Sign up at [https://www.mailersend.com/](https://www.mailersend.com/)
2. Verify your email address
3. Log in to the dashboard

### 2. Verify Your Domain

**Important**: You must verify your domain before sending emails.

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `kiik.app` or `yourdomain.com`)
3. MailerSend will provide DNS records to add:
   - **SPF Record** (TXT): Authorizes MailerSend to send emails from your domain
   - **DKIM Record** (TXT): Cryptographic signature for email authentication
   - **CNAME Record**: For tracking and webhooks

4. Add these records to your DNS provider:
   - **Cloudflare**: DNS → Add Record
   - **GoDaddy**: DNS Management → Add Record
   - **Namecheap**: Advanced DNS → Add New Record

5. Wait for DNS propagation (5 minutes to 48 hours)
6. Click **Verify** in MailerSend dashboard

### 3. Configure Email Backend

You have two options: **SMTP** (recommended) or **API**.

#### Option A: SMTP Backend (Recommended)

**Why SMTP?**
- Simpler setup
- Works with existing Django email system
- No code changes required

**Setup Steps:**

1. In MailerSend dashboard, go to **Domains** → Your Domain → **SMTP Users**
2. Click **Generate New User**
3. Copy the **Username** and **Password** (⚠️ case-sensitive!)
4. Update your `.env` file:

```bash
# Enable SMTP email backend
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# MailerSend SMTP Configuration
EMAIL_HOST=smtp.mailersend.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=MS_xxxxxx@yourdomain.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxxxxxxxx

# Sender email (must match verified domain)
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

5. Restart services:

```bash
docker-compose restart backend celery celery-beat
```

#### Option B: API Backend (Advanced)

**Why API?**
- Access to advanced MailerSend features
- Better error handling
- Email scheduling, templates, personalization

**Setup Steps:**

1. In MailerSend dashboard, go to **Settings** → **API Tokens**
2. Click **Generate New Token**
3. Give it a name (e.g., "kiik.app Production")
4. Copy the API key (starts with `mlsn.`)
5. Update your `.env` file:

```bash
# Enable MailerSend API backend
EMAIL_BACKEND=utils.mailersend_backend.MailerSendBackend

# MailerSend API Key
MAILERSEND_API_KEY=mlsn.xxxxxxxxxxxxxxxxxxxxxxxx

# Sender email (must match verified domain)
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

6. Restart services:

```bash
docker-compose restart backend celery celery-beat
```

## Testing Your Configuration

### Test 1: Simple Email Test

```bash
# Run the test script
docker-compose exec backend python utils/test_email.py your-email@example.com
```

This will send 4 test emails:
1. Plain text email
2. HTML email
3. French internationalized email
4. EmailService template test

### Test 2: Django Shell Test

```bash
# Open Django shell
docker-compose exec backend python manage.py shell

# Send a test email
from django.core.mail import send_mail
send_mail(
    'Test Email',
    'This is a test from kiik.app',
    'noreply@yourdomain.com',
    ['your-email@example.com'],
    fail_silently=False,
)
```

### Test 3: Password Reset Flow

1. Go to http://localhost:5173/forgot-password
2. Enter your email address
3. Check your inbox for the password reset email

### Test 4: Invoice Email

1. Create an invoice in the dashboard
2. Click "Send Email" on the invoice
3. Check the customer's email inbox

## Development vs Production

### Development Mode (Console Backend)

For local development, you can print emails to console instead of sending them:

```bash
# .env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Emails will appear in your Docker logs:

```bash
docker-compose logs -f backend
```

### Production Mode (MailerSend SMTP)

For production, use MailerSend SMTP:

```bash
# .env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.mailersend.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

## Email Sending Locations

All email sending in the application happens through Django's standard email system, so MailerSend will work automatically:

| Feature | File | Function |
|---------|------|----------|
| Welcome Email | `utils/email_service.py` | `send_welcome_email()` |
| Password Reset | `utils/email_service.py` | `send_password_reset_email()` |
| Email Verification | `utils/email_service.py` | `send_email_confirmation()` |
| Invoice Email | `invoicing/tasks.py` | `send_invoice_email()` |
| Estimate Email | `invoicing/tasks.py` | `send_estimate_email()` |
| Signature Request | `invoicing/tasks.py` | `send_signature_request_email()` |
| CRA Validation | `cra/tasks.py` | `send_cra_validation_email()` |
| CRA Invoice Notification | `cra/tasks.py` | `generate_invoice_from_cra()` |
| Trial Reminder | `subscriptions/tasks.py` | `send_trial_ending_reminders()` |

## Troubleshooting

### ❌ Emails not sending

**Symptoms**: Emails not arriving in inbox

**Solutions**:
1. Check email backend is set correctly in `.env`:
   ```bash
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   ```
2. Verify SMTP credentials are correct (case-sensitive!)
3. Ensure sender domain is verified in MailerSend
4. Check Celery worker is running:
   ```bash
   docker-compose logs celery | tail -50
   ```
5. Check Django logs for errors:
   ```bash
   docker-compose logs backend | tail -50
   ```

### ❌ 550 Error: Domain not verified

**Symptoms**: Error message "550 5.7.1 Relaying denied"

**Solutions**:
1. Verify your domain in MailerSend dashboard
2. Check DNS records (SPF, DKIM) are properly configured
3. Wait for DNS propagation (can take up to 48 hours)
4. Ensure `DEFAULT_FROM_EMAIL` matches your verified domain

### ❌ Authentication failed (535 Error)

**Symptoms**: "535 Authentication credentials invalid"

**Solutions**:
1. SMTP credentials are case-sensitive - copy them exactly
2. Regenerate SMTP credentials in MailerSend dashboard
3. Check for extra spaces in `.env` file
4. Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are set correctly

### ❌ Emails going to spam

**Symptoms**: Emails arrive in spam/junk folder

**Solutions**:
1. Ensure SPF and DKIM records are verified in MailerSend
2. Add proper email content (avoid spam trigger words)
3. Warm up your domain (send gradually increasing volumes)
4. Use a professional sender name and email address
5. Include unsubscribe links (for marketing emails)

### ❌ Rate limits exceeded

**Symptoms**: "429 Too Many Requests" error

**Solutions**:
1. Check your MailerSend plan limits:
   - **Free tier**: Limited sends per month
   - **Trial**: 5 concurrent connections, 120 requests/minute
2. Upgrade to a paid plan for higher limits
3. Implement email throttling in your application
4. Use Celery for async email sending (already configured)

## Internationalization Support

All emails support French and English based on user preferences:

### French Email Example

```python
from utils.email_service import EmailService

# Send French password reset email
EmailService.send_password_reset_email(
    user=user,
    password_reset_url='https://app.kiik.app/reset-password/token',
    language='fr'  # Force French
)
```

### Email Templates

Email templates are located in:
- **English**: `/backend/templates/account/email/*.html` and `*.txt`
- **French**: `/backend/templates/account/email/*_fr.html` and `*_fr.txt`

## Advanced Features

### Custom MailerSend API Backend

If you need advanced MailerSend features (templates, scheduling, analytics), use the custom API backend:

**File**: [utils/mailersend_backend.py](backend/utils/mailersend_backend.py)

**Features**:
- Full MailerSend API integration
- Support for attachments, CC, BCC
- HTML and plain text emails
- Error handling with retries

**Usage**:

```bash
# .env
EMAIL_BACKEND=utils.mailersend_backend.MailerSendBackend
MAILERSEND_API_KEY=mlsn.your-api-key
```

### Email Analytics

MailerSend provides detailed analytics:

1. Go to **Analytics** in MailerSend dashboard
2. View metrics:
   - **Delivered**: Emails successfully delivered
   - **Opened**: Recipients who opened the email
   - **Clicked**: Links clicked in email
   - **Bounced**: Failed deliveries
   - **Spam Complaints**: Marked as spam

### Webhooks (Optional)

Configure webhooks to receive real-time email events:

1. Go to **Webhooks** in MailerSend dashboard
2. Add webhook URL: `https://yourdomain.com/api/webhooks/mailersend/`
3. Select events to track (delivered, opened, clicked, bounced)

**Note**: Webhook endpoint not yet implemented. Future enhancement.

## Environment Variables Reference

All environment variables for email configuration:

```bash
# Email Backend Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# Options:
#   - django.core.mail.backends.smtp.EmailBackend (SMTP)
#   - utils.mailersend_backend.MailerSendBackend (API)
#   - django.core.mail.backends.console.EmailBackend (Dev/Testing)

# MailerSend SMTP Settings
EMAIL_HOST=smtp.mailersend.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-mailersend-smtp-username
EMAIL_HOST_PASSWORD=your-mailersend-smtp-password

# Sender Configuration
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# MailerSend API Key (for API backend only)
MAILERSEND_API_KEY=mlsn.your-api-key

# Frontend URL (for email links)
FRONTEND_URL=https://app.yourdomain.com
```

## Security Best Practices

1. ✅ **Never commit `.env` file** to version control
2. ✅ **Use environment variables** for sensitive credentials
3. ✅ **Rotate SMTP credentials** regularly (every 6 months)
4. ✅ **Monitor email analytics** for suspicious activity
5. ✅ **Enable domain verification** (SPF, DKIM, DMARC)
6. ✅ **Use rate limiting** to prevent abuse
7. ✅ **Validate recipient emails** before sending

## Cost & Limits

### Free Tier
- **12,000 emails/month**
- Basic analytics
- Domain verification
- SMTP and API access

### Paid Plans
Starting at $25/month:
- **50,000+ emails/month**
- Advanced analytics
- Dedicated IP addresses
- Priority support
- Custom sending domains

See pricing: [https://www.mailersend.com/pricing](https://www.mailersend.com/pricing)

## Resources

- 🌐 **MailerSend Dashboard**: [https://app.mailersend.com/](https://app.mailersend.com/)
- 📚 **Documentation**: [https://developers.mailersend.com/](https://developers.mailersend.com/)
- 🔧 **SMTP Guide**: [https://www.mailersend.com/help/smtp-relay](https://www.mailersend.com/help/smtp-relay)
- 💬 **Support**: [https://www.mailersend.com/help](https://www.mailersend.com/help)
- 📧 **Status Page**: [https://status.mailersend.com/](https://status.mailersend.com/)

## Next Steps

1. ✅ Sign up for MailerSend account
2. ✅ Verify your domain (add DNS records)
3. ✅ Generate SMTP credentials
4. ✅ Update `.env` file with credentials
5. ✅ Restart Docker services
6. ✅ Run test script to verify configuration
7. ✅ Monitor email delivery in MailerSend dashboard

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review MailerSend documentation
3. Check Django logs: `docker-compose logs backend`
4. Check Celery logs: `docker-compose logs celery`
5. Contact MailerSend support

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
