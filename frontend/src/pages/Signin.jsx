import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../api/hooks";
import { useAuth } from "../utils/AuthContext";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import AuthImage from "../images/auth-image.jpg";

function Signin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const loginMutation = useLogin();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await loginMutation.mutateAsync(formData);
      const { access, refresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // Get the Google OAuth authorization URL from backend
      const response = await client.get('/auth/google/');
      const { auth_url } = response.data;

      // Redirect to Google OAuth consent screen
      window.location.href = auth_url;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.error || 'Failed to initiate Google login. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative md:flex">
        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            {/* Header */}
            <div className="flex-1">
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link className="block" to="/">
                  <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
                    <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="max-w-sm mx-auto w-full px-4 py-8">
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Welcome back!</h1>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="email">
                      Email Address
                    </label>
                    <input 
                      id="email" 
                      name="email"
                      className="form-input w-full" 
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="password">
                      Password
                    </label>
                    <input 
                      id="password"
                      name="password" 
                      className="form-input w-full" 
                      type="password" 
                      autoComplete="on"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="mr-1">
                    <Link className="text-sm underline hover:no-underline" to="/reset-password">
                      Forgot Password?
                    </Link>
                  </div>
                  <button 
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3 disabled:opacity-50"
                  >
                    {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
              {/* Divider */}
              <div className="my-6 flex items-center">
                <hr className="grow" />
                <div className="mx-3 text-xs uppercase text-gray-400 font-medium">{t('auth.or')}</div>
                <hr className="grow" />
              </div>
              {/* Social links */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading || loginMutation.isPending}
                  className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 flex-1 disabled:opacity-50"
                  title={t('auth.continueWithGoogle')}
                >
                  {isGoogleLoading ? (
                    <div className="w-4 h-4 mx-auto border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 fill-current mx-auto" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  disabled
                  className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 flex-1 opacity-50 cursor-not-allowed"
                  title="GitHub login (coming soon)"
                >
                  <svg className="w-4 h-4 fill-current mx-auto" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-8">
              <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                Don't have an account? <Link className="font-medium text-violet-500 hover:text-violet-600" to="/signup">Create account</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <img className="w-full h-full object-cover" src={AuthImage} width={760} height={1024} alt="Authentication image" />
        </div>
      </div>
    </main>
  );
}

export default Signin;
