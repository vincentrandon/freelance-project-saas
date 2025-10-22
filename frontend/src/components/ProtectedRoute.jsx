import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { useOnboardingStatus } from '../api/hooks';

function ProtectedRoute({ children, skipOnboardingCheck = false }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingStatus({
    enabled: isAuthenticated && !skipOnboardingCheck,
  });

  // Loading state
  if (authLoading || (isAuthenticated && !skipOnboardingCheck && onboardingLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-violet-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to signin
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // Check onboarding status (unless explicitly skipped)
  if (!skipOnboardingCheck && onboardingData) {
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');

    // If onboarding not completed and not on onboarding route, redirect to onboarding
    if (!onboardingData.onboarding_completed && !isOnboardingRoute) {
      return <Navigate to="/onboarding-01" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;

