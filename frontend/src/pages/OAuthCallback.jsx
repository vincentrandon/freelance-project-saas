import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import client from '../api/client';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const handleOAuthCallback = async () => {
      try {
        // Get the authorization code from URL params
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        // Check if user denied access
        if (errorParam) {
          setError('Authentication was cancelled. Please try again.');
          setIsProcessing(false);
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        if (!code) {
          setError('Authorization code not found. Please try again.');
          setIsProcessing(false);
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        // Send the code to backend to exchange for JWT tokens
        const response = await client.post('/auth/google/callback/', { code });

        const { access, refresh, user } = response.data;

        // Store tokens in localStorage
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        // Update auth context (without calling login again to avoid duplicate requests)
        // The auth context will automatically update when we navigate

        // Redirect to dashboard
        navigate('/');

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(
          err.response?.data?.error ||
          'Authentication failed. Please try again.'
        );
        setIsProcessing(false);
        setTimeout(() => navigate('/signin'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, login]);

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 py-8">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <svg
                className="fill-violet-500"
                xmlns="http://www.w3.org/2000/svg"
                width={64}
                height={64}
              >
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
            </div>

            {isProcessing && !error && (
              <>
                {/* Loading spinner */}
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                </div>
                <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
                  Completing sign in...
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we process your authentication.
                </p>
              </>
            )}

            {error && (
              <>
                {/* Error icon */}
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                    <svg
                      className="w-8 h-8 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
                  Authentication Failed
                </h1>
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Redirecting you back to sign in...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default OAuthCallback;
