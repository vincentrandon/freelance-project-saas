from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UserProfile
from .serializers import (
    UserProfileSerializer,
    PricingSettingsSerializer,
    CompanyInfoSerializer,
    OnboardingSerializer
)


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user profiles.
    Each user has one profile.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        """Users can only access their own profile"""
        return UserProfile.objects.filter(user=self.request.user)

    def get_object(self):
        """Get the current user's profile"""
        obj, created = UserProfile.objects.get_or_create(user=self.request.user)
        return obj

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Get or update current user's profile"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'patch'])
    def pricing_settings(self, request):
        """
        Get or update pricing settings only.
        Lighter endpoint for frequently accessed pricing config.
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        if request.method == 'GET':
            serializer = PricingSettingsSerializer(profile)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = PricingSettingsSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()

                # Recalculate hourly rate if TJM changed
                if 'tjm_default' in request.data or 'tjm_hours_per_day' in request.data:
                    profile.save()  # Triggers save() method which recalculates

                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def company_info(self, request):
        """Get company information for PDFs and emails"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = CompanyInfoSerializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def calculate_tjm(self, request):
        """
        Calculate recommended TJM based on monthly revenue target and working days.

        POST data:
        {
          "monthly_revenue_target": 5000,
          "working_days_per_month": 20,
          "expenses_percentage": 30  // optional, defaults to 0
        }

        Returns:
        {
          "recommended_tjm": 312.50,
          "net_tjm": 218.75,  // after expenses
          "explanation": "..."
        }
        """
        monthly_revenue = request.data.get('monthly_revenue_target')
        working_days = request.data.get('working_days_per_month', 20)
        expenses_pct = request.data.get('expenses_percentage', 0)

        if not monthly_revenue:
            return Response(
                {'error': 'monthly_revenue_target is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            monthly_revenue = float(monthly_revenue)
            working_days = float(working_days)
            expenses_pct = float(expenses_pct)

            if working_days <= 0:
                return Response(
                    {'error': 'working_days_per_month must be greater than 0'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            recommended_tjm = monthly_revenue / working_days
            net_tjm = recommended_tjm * (1 - expenses_pct / 100)

            explanation = (
                f"To achieve €{monthly_revenue:,.2f}/month working {working_days:.0f} days/month, "
                f"you need a TJM of €{recommended_tjm:.2f}."
            )

            if expenses_pct > 0:
                explanation += (
                    f" After {expenses_pct:.0f}% expenses, your net TJM is €{net_tjm:.2f}."
                )

            return Response({
                'recommended_tjm': round(recommended_tjm, 2),
                'net_tjm': round(net_tjm, 2),
                'monthly_revenue_target': monthly_revenue,
                'working_days_per_month': working_days,
                'expenses_percentage': expenses_pct,
                'explanation': explanation
            })

        except ValueError:
            return Response(
                {'error': 'Invalid numeric values provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def tjm_for_service(self, request):
        """
        Get TJM rate for a specific service type.

        Query params:
        - service_type: string (e.g., 'development', 'consulting')

        Returns the specific TJM or falls back to default.
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        service_type = request.query_params.get('service_type')

        tjm = profile.get_tjm_for_service(service_type)

        return Response({
            'service_type': service_type or 'default',
            'tjm': float(tjm),
            'currency': profile.currency,
            'all_rates': profile.tjm_rates if profile.tjm_rates else {}
        })

    @action(detail=False, methods=['get'])
    def onboarding_status(self, request):
        """
        Check onboarding status for current user.

        Returns:
        {
          "onboarding_completed": bool,
          "onboarding_step": int,
          "profile_completeness": int (percentage),
          "is_complete_for_invoicing": bool,
          "missing_required_fields": list
        }
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = OnboardingSerializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_onboarding(self, request):
        """
        Update profile data during onboarding flow.

        PATCH data:
        - Any UserProfile fields
        - onboarding_step: int (1-4) to track progress

        Automatically validates and sets onboarding_completed=True
        if all required fields are present.
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = OnboardingSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            # Auto-complete onboarding if all required fields are present
            if profile.is_profile_complete_for_invoicing() and not profile.onboarding_completed:
                profile.onboarding_completed = True
                profile.save()

            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def complete_onboarding(self, request):
        """
        Mark onboarding as completed.

        Validates that all required fields are present before completing.
        Returns error if profile is incomplete.

        POST data:
        - skip: bool (optional) - allows skipping onboarding (not recommended)
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        skip = request.data.get('skip', False)

        if not skip and not profile.is_profile_complete_for_invoicing():
            missing_fields = profile.get_missing_required_fields()
            return Response({
                'error': 'Profile incomplete',
                'message': 'Please complete all required fields before finishing onboarding',
                'missing_fields': missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)

        profile.onboarding_completed = True
        profile.onboarding_step = 4  # Completed all steps
        profile.save()

        serializer = OnboardingSerializer(profile)
        return Response({
            'message': 'Onboarding completed successfully',
            'profile': serializer.data
        })
