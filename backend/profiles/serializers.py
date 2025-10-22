from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """Full serializer for UserProfile"""

    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    business_email = serializers.SerializerMethodField()
    calculated_hourly_rate = serializers.SerializerMethodField()
    profile_completeness = serializers.SerializerMethodField()
    is_complete_for_invoicing = serializers.SerializerMethodField()
    missing_required_fields = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'user_username', 'user_email', 'business_email',

            # Company info
            'company_name', 'company_logo', 'address', 'city', 'postal_code',
            'country', 'phone', 'email', 'website', 'tax_id', 'siret_siren',

            # Bank details
            'iban', 'bic', 'bank_name',

            # Pricing settings
            'tjm_default', 'hourly_rate_default', 'calculated_hourly_rate',
            'tjm_hours_per_day', 'tjm_rates',
            'default_security_margin', 'show_security_margin_on_pdf',

            # Payment & tax
            'payment_terms_days', 'default_tax_rate', 'currency',

            # PDF customization
            'pdf_footer_text', 'pdf_primary_color', 'pdf_show_logo',

            # Signature
            'signature_enabled', 'signature_certificate_path',

            # Terms
            'estimate_terms', 'invoice_terms',

            # Onboarding
            'onboarding_completed', 'onboarding_step',

            # Computed fields
            'profile_completeness', 'is_complete_for_invoicing', 'missing_required_fields',

            # Metadata
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'profile_completeness',
                           'is_complete_for_invoicing', 'missing_required_fields']

    def get_business_email(self, obj):
        """Get business email with fallback"""
        return obj.get_business_email()

    def get_calculated_hourly_rate(self, obj):
        """Calculate hourly rate from TJM"""
        if obj.tjm_default and obj.tjm_hours_per_day:
            return float(obj.tjm_default / obj.tjm_hours_per_day)
        return float(obj.hourly_rate_default)

    def get_profile_completeness(self, obj):
        """Get profile completeness percentage"""
        return obj.get_profile_completeness_percentage()

    def get_is_complete_for_invoicing(self, obj):
        """Check if profile is complete for invoicing"""
        return obj.is_profile_complete_for_invoicing()

    def get_missing_required_fields(self, obj):
        """Get missing required fields"""
        return obj.get_missing_required_fields()


class PricingSettingsSerializer(serializers.ModelSerializer):
    """Lightweight serializer for just pricing settings"""

    calculated_hourly_rate = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'tjm_default',
            'hourly_rate_default',
            'calculated_hourly_rate',
            'tjm_hours_per_day',
            'tjm_rates',
            'default_security_margin',
            'show_security_margin_on_pdf',
            'default_tax_rate',
            'currency'
        ]

    def get_calculated_hourly_rate(self, obj):
        """Calculate hourly rate from TJM"""
        if obj.tjm_default and obj.tjm_hours_per_day:
            return float(obj.tjm_default / obj.tjm_hours_per_day)
        return float(obj.hourly_rate_default)


class CompanyInfoSerializer(serializers.ModelSerializer):
    """Serializer for company information only (for PDFs, emails)"""

    business_email = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'company_name', 'company_logo', 'address', 'city', 'postal_code',
            'country', 'phone', 'email', 'business_email', 'website',
            'tax_id', 'siret_siren', 'iban', 'bic', 'bank_name',
            'pdf_show_logo', 'pdf_primary_color', 'pdf_footer_text'
        ]
        read_only_fields = fields

    def get_business_email(self, obj):
        return obj.get_business_email()


class OnboardingSerializer(serializers.ModelSerializer):
    """Serializer for onboarding flow data"""

    profile_completeness = serializers.SerializerMethodField()
    is_complete_for_invoicing = serializers.SerializerMethodField()
    missing_required_fields = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            # Company info
            'company_name', 'company_logo', 'address', 'city', 'postal_code',
            'country', 'phone', 'email', 'website', 'tax_id', 'siret_siren',

            # Bank details
            'iban', 'bic', 'bank_name',

            # Pricing settings
            'tjm_default', 'hourly_rate_default', 'tjm_hours_per_day',
            'default_security_margin', 'default_tax_rate', 'currency',
            'payment_terms_days',

            # Onboarding
            'onboarding_completed', 'onboarding_step',

            # Computed
            'profile_completeness', 'is_complete_for_invoicing', 'missing_required_fields'
        ]
        read_only_fields = ['profile_completeness', 'is_complete_for_invoicing', 'missing_required_fields']

    def get_profile_completeness(self, obj):
        return obj.get_profile_completeness_percentage()

    def get_is_complete_for_invoicing(self, obj):
        return obj.is_profile_complete_for_invoicing()

    def get_missing_required_fields(self, obj):
        return obj.get_missing_required_fields()
