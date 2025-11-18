#!/usr/bin/env python
"""
Test Email Configuration Script

This script tests your MailerSend email configuration by sending a test email.

Usage:
    # From Docker container
    docker-compose exec backend python utils/test_email.py your-email@example.com

    # From local environment
    python manage.py shell < utils/test_email.py
"""
import sys
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'freelancermgmt.settings')
django.setup()

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import translation


def test_simple_email(recipient):
    """
    Test 1: Simple plain text email
    """
    print("\n" + "="*60)
    print("TEST 1: Simple Plain Text Email")
    print("="*60)
    print(f"Backend: {settings.EMAIL_BACKEND}")
    print(f"SMTP Host: {settings.EMAIL_HOST}")
    print(f"SMTP Port: {settings.EMAIL_PORT}")
    print(f"From Email: {settings.DEFAULT_FROM_EMAIL}")
    print(f"To: {recipient}")

    try:
        result = send_mail(
            subject='[Test] Simple Email from kiik.app',
            message='This is a simple plain text test email sent via MailerSend SMTP.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )

        if result > 0:
            print("✅ SUCCESS: Plain text email sent!")
            return True
        else:
            print("❌ FAILED: Email was not sent (result=0)")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_html_email(recipient):
    """
    Test 2: HTML email with alternative text
    """
    print("\n" + "="*60)
    print("TEST 2: HTML Email with Alternative Text")
    print("="*60)

    try:
        subject = '[Test] HTML Email from kiik.app'
        text_body = 'This is a test email with HTML content. If you see this, your email client does not support HTML emails.'

        html_body = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9fafb; padding: 20px; }
                .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>kiik.app Test Email</h1>
                </div>
                <div class="content">
                    <h2>HTML Email Test</h2>
                    <p>This is a test email sent via <strong>MailerSend SMTP</strong> to verify your email configuration.</p>
                    <p>If you can see this formatted email, your HTML email setup is working correctly!</p>
                </div>
                <div class="footer">
                    <p>Sent from kiik.app • Powered by MailerSend</p>
                </div>
            </div>
        </body>
        </html>
        """

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient]
        )
        email.attach_alternative(html_body, "text/html")

        result = email.send(fail_silently=False)

        if result > 0:
            print("✅ SUCCESS: HTML email sent!")
            return True
        else:
            print("❌ FAILED: Email was not sent (result=0)")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_internationalization(recipient):
    """
    Test 3: Internationalized email (French)
    """
    print("\n" + "="*60)
    print("TEST 3: Internationalized Email (French)")
    print("="*60)

    try:
        # Activate French language
        with translation.override('fr'):
            subject = '[Test] Email multilingue de kiik.app'
            text_body = """
            Bonjour,

            Ceci est un email de test en français envoyé via MailerSend SMTP.

            Si vous recevez cet email, votre configuration d'internationalisation fonctionne correctement!

            Cordialement,
            L'équipe kiik.app
            """

            html_body = """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Email de test multilingue</h2>
                    <p>Bonjour,</p>
                    <p>Ceci est un email de test en <strong>français</strong> envoyé via MailerSend SMTP.</p>
                    <p>Si vous recevez cet email, votre configuration d'internationalisation fonctionne correctement!</p>
                    <p>Cordialement,<br>L'équipe kiik.app</p>
                </div>
            </body>
            </html>
            """

            email = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient]
            )
            email.attach_alternative(html_body, "text/html")

            result = email.send(fail_silently=False)

            if result > 0:
                print("✅ SUCCESS: French email sent!")
                return True
            else:
                print("❌ FAILED: Email was not sent (result=0)")
                return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_email_service(recipient):
    """
    Test 4: EmailService class (used throughout the app)
    """
    print("\n" + "="*60)
    print("TEST 4: EmailService Class")
    print("="*60)

    try:
        from utils.email_service import EmailService

        # Create a test user context
        class TestUser:
            email = recipient
            first_name = "Test"
            last_name = "User"

            class profile:
                preferred_language = 'en'

        user = TestUser()

        result = EmailService.send_templated_email(
            to_email=recipient,
            subject_template='account/email/email_confirmation_subject.txt',
            text_template='account/email/email_confirmation_message.txt',
            html_template='account/email/email_confirmation_message.html',
            context={
                'user': user,
                'activate_url': f'{settings.FRONTEND_URL}/verify-email/test-token',
            },
            user=user,
            language='en'
        )

        if result > 0:
            print("✅ SUCCESS: EmailService test passed!")
            return True
        else:
            print("❌ FAILED: EmailService did not send email (result=0)")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """
    Main test runner
    """
    print("\n" + "="*60)
    print("MailerSend Email Configuration Test")
    print("="*60)

    # Get recipient email from command line or prompt
    if len(sys.argv) > 1:
        recipient = sys.argv[1]
    else:
        recipient = input("Enter recipient email address: ").strip()

    if not recipient or '@' not in recipient:
        print("❌ ERROR: Invalid email address")
        sys.exit(1)

    # Check if using console backend
    if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        print("\n⚠️  WARNING: You are using console email backend.")
        print("   Emails will be printed to console, not actually sent.")
        print("   To test real email sending, set EMAIL_BACKEND to:")
        print("   django.core.mail.backends.smtp.EmailBackend")
        print("")
        response = input("Continue anyway? (y/n): ").lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)

    # Run all tests
    results = []
    results.append(("Simple Email", test_simple_email(recipient)))
    results.append(("HTML Email", test_html_email(recipient)))
    results.append(("I18n Email (French)", test_internationalization(recipient)))

    # Only test EmailService if templates exist
    try:
        results.append(("EmailService", test_email_service(recipient)))
    except Exception as e:
        print(f"\n⚠️  Skipping EmailService test (templates not found): {str(e)}")

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Your MailerSend configuration is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check your MailerSend configuration.")
        print("\nTroubleshooting:")
        print("1. Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env")
        print("2. Ensure DEFAULT_FROM_EMAIL domain is verified in MailerSend")
        print("3. Check Celery logs: docker-compose logs celery")
        print("4. Check Django logs: docker-compose logs backend")

    sys.exit(0 if passed == total else 1)


if __name__ == '__main__':
    main()
