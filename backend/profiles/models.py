from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extended user profile for freelancer with company info, pricing settings, and PDF customization.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Company/Freelance Information
    company_name = models.CharField(max_length=255, blank=True, help_text="Company or freelance business name")
    company_logo = models.ImageField(upload_to='company_logos/', blank=True, null=True, help_text="Company logo for PDFs")

    # Contact Details
    address = models.TextField(blank=True, help_text="Street address")
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='France')
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True, help_text="Business email (optional, defaults to user email)")
    website = models.URLField(blank=True)

    # Legal Information (French freelancers)
    tax_id = models.CharField(max_length=50, blank=True, verbose_name="TVA Intracommunautaire")
    siret_siren = models.CharField(max_length=50, blank=True, verbose_name="SIRET/SIREN")

    # Bank Details
    iban = models.CharField(max_length=34, blank=True, verbose_name="IBAN")
    bic = models.CharField(max_length=11, blank=True, verbose_name="BIC/SWIFT")
    bank_name = models.CharField(max_length=255, blank=True)

    # Pricing Settings
    tjm_default = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=500.00,
        verbose_name="TJM par défaut",
        help_text="Taux Journalier Moyen (daily rate) in default currency"
    )
    hourly_rate_default = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0.00,
        verbose_name="Taux horaire par défaut",
        help_text="Calculated from TJM or set manually"
    )
    tjm_hours_per_day = models.IntegerField(
        default=7,
        verbose_name="Heures par jour",
        help_text="Number of billable hours per day (for TJM to hourly conversion)"
    )
    tjm_rates = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="TJM par type de prestation",
        help_text="Multiple TJM rates by service type: {'development': 500, 'consulting': 650}"
    )

    # Security Margin Settings
    default_security_margin = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        verbose_name="Marge de sécurité par défaut (%)",
        help_text="Default security margin percentage for estimates (e.g., 10.00 for 10%)"
    )
    show_security_margin_on_pdf = models.BooleanField(
        default=False,
        verbose_name="Afficher la marge sur les PDF",
        help_text="If True, security margin is visible on client PDFs as a separate line item"
    )

    # Payment & Invoice Settings
    payment_terms_days = models.IntegerField(
        default=30,
        verbose_name="Délai de paiement (jours)",
        help_text="Default payment terms in days (30, 45, 60)"
    )
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        verbose_name="Taux de TVA par défaut (%)",
        help_text="Default VAT/tax rate (e.g., 20.00 for 20%)"
    )
    currency = models.CharField(
        max_length=3,
        default='EUR',
        choices=[
            ('EUR', 'Euro (€)'),
            ('USD', 'US Dollar ($)'),
            ('GBP', 'British Pound (£)'),
            ('CHF', 'Swiss Franc (CHF)'),
        ]
    )

    # PDF Customization
    pdf_footer_text = models.TextField(
        blank=True,
        verbose_name="Texte de pied de page PDF",
        help_text="Custom footer text for invoices and estimates"
    )
    pdf_primary_color = models.CharField(
        max_length=7,
        default='#3B82F6',
        verbose_name="Couleur principale PDF",
        help_text="Hex color code for PDF branding (e.g., #3B82F6)"
    )
    pdf_show_logo = models.BooleanField(
        default=True,
        verbose_name="Afficher le logo sur les PDF",
        help_text="Show company logo on generated PDFs"
    )

    # Digital Signature Settings
    signature_certificate_path = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Chemin du certificat de signature",
        help_text="Path to digital signature certificate file (optional)"
    )
    signature_enabled = models.BooleanField(
        default=True,
        verbose_name="Signature électronique activée",
        help_text="Enable digital signature feature for estimates"
    )

    # Terms & Conditions
    estimate_terms = models.TextField(
        blank=True,
        verbose_name="Conditions générales des devis",
        help_text="Default terms and conditions for estimates"
    )
    invoice_terms = models.TextField(
        blank=True,
        verbose_name="Conditions générales des factures",
        help_text="Default terms and conditions for invoices"
    )

    # Onboarding
    onboarding_completed = models.BooleanField(
        default=False,
        verbose_name="Onboarding terminé",
        help_text="Whether the user has completed the initial onboarding flow"
    )
    onboarding_step = models.IntegerField(
        default=1,
        verbose_name="Étape d'onboarding",
        help_text="Current step in onboarding process (1-4)"
    )

    # Language Preference
    preferred_language = models.CharField(
        max_length=2,
        default='en',
        choices=[
            ('en', 'English'),
            ('fr', 'Français'),
        ],
        verbose_name="Langue préférée",
        help_text="User's preferred language for the interface"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s Profile - {self.company_name or 'No Company'}"

    def save(self, *args, **kwargs):
        """Auto-calculate hourly rate from TJM if not set"""
        if self.tjm_default and self.tjm_hours_per_day and not self.hourly_rate_default:
            self.hourly_rate_default = self.tjm_default / self.tjm_hours_per_day
        super().save(*args, **kwargs)

    def get_tjm_for_service(self, service_type=None):
        """
        Get TJM rate for a specific service type.
        Falls back to default TJM if service type not found.
        """
        if service_type and service_type in self.tjm_rates:
            return self.tjm_rates[service_type]
        return self.tjm_default

    def get_business_email(self):
        """Get business email, falling back to user email"""
        return self.email or self.user.email

    def is_profile_complete_for_invoicing(self):
        """
        Check if profile has all required fields for French legal invoicing.
        Required: company_name, siret_siren, tax_id, address, city, postal_code, phone or email
        """
        required_fields = [
            self.company_name,
            self.siret_siren,
            self.tax_id,
            self.address,
            self.city,
            self.postal_code,
        ]
        # Must have at least one contact method
        has_contact = bool(self.phone or self.email or self.user.email)

        return all(required_fields) and has_contact

    def get_profile_completeness_percentage(self):
        """Calculate profile completeness as a percentage"""
        total_fields = 0
        completed_fields = 0

        # Company info (weight: 6 fields)
        company_fields = [
            self.company_name, self.siret_siren, self.tax_id,
            self.address, self.city, self.postal_code
        ]
        total_fields += len(company_fields)
        completed_fields += sum(1 for f in company_fields if f)

        # Contact (weight: 3 fields)
        contact_fields = [self.phone, self.email, self.website]
        total_fields += len(contact_fields)
        completed_fields += sum(1 for f in contact_fields if f)

        # Bank details (weight: 2 fields)
        bank_fields = [self.iban, self.bic]
        total_fields += len(bank_fields)
        completed_fields += sum(1 for f in bank_fields if f)

        # Logo (weight: 1 field)
        total_fields += 1
        if self.company_logo:
            completed_fields += 1

        return int((completed_fields / total_fields) * 100) if total_fields > 0 else 0

    def get_missing_required_fields(self):
        """Get list of missing required fields for invoicing"""
        missing = []

        if not self.company_name:
            missing.append('company_name')
        if not self.siret_siren:
            missing.append('siret_siren')
        if not self.tax_id:
            missing.append('tax_id')
        if not self.address:
            missing.append('address')
        if not self.city:
            missing.append('city')
        if not self.postal_code:
            missing.append('postal_code')
        if not (self.phone or self.email or self.user.email):
            missing.append('contact_info')

        return missing


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create UserProfile when a new User is created"""
    if created:
        UserProfile.objects.create(
            user=instance,
            onboarding_completed=False,
            onboarding_step=1
        )


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()
