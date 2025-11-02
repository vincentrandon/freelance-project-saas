import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { usePasswordResetConfirm } from "../api/hooks";
import AuthImage from "../images/auth-image.jpg";

function ResetPasswordConfirm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    new_password1: '',
    new_password2: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const passwordResetConfirmMutation = usePasswordResetConfirm();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.new_password1 !== formData.new_password2) {
      setError(t('auth.setNewPassword.errorPasswordMismatch'));
      return;
    }

    if (!uid || !token) {
      setError(t('auth.setNewPassword.errorInvalidLink'));
      return;
    }

    try {
      await passwordResetConfirmMutation.mutateAsync({
        uid,
        token,
        new_password1: formData.new_password1,
        new_password2: formData.new_password2
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.new_password2) {
        setError(errorData.new_password2[0]);
      } else if (errorData?.new_password1) {
        setError(errorData.new_password1[0]);
      } else if (errorData?.token) {
        setError(t('auth.setNewPassword.errorExpiredLink'));
      } else if (errorData?.detail) {
        setError(errorData.detail);
      } else {
        setError(t('auth.setNewPassword.errorGeneric'));
      }
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
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">{t('auth.setNewPassword.title')}</h1>

              {success && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {t('auth.setNewPassword.successMessage')}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {!success && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {t('auth.setNewPassword.description')}
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="new_password1">
                          {t('auth.setNewPassword.newPasswordLabel')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="new_password1"
                          name="new_password1"
                          className="form-input w-full"
                          type="password"
                          value={formData.new_password1}
                          onChange={handleChange}
                          required
                          disabled={passwordResetConfirmMutation.isPending}
                          minLength={8}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="new_password2">
                          {t('auth.setNewPassword.confirmPasswordLabel')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="new_password2"
                          name="new_password2"
                          className="form-input w-full"
                          type="password"
                          value={formData.new_password2}
                          onChange={handleChange}
                          required
                          disabled={passwordResetConfirmMutation.isPending}
                          minLength={8}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-6">
                      <button
                        type="submit"
                        disabled={passwordResetConfirmMutation.isPending}
                        className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white whitespace-nowrap disabled:opacity-50"
                      >
                        {passwordResetConfirmMutation.isPending ? t('auth.setNewPassword.resetting') : t('auth.setNewPassword.resetButton')}
                      </button>
                    </div>
                  </form>
                </>
              )}

              <div className="mt-6 text-center">
                <Link
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  to="/signin"
                >
                  {t('auth.setNewPassword.backToSignIn')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <img className="object-cover object-center w-full h-full" src={AuthImage} width="760" height="1024" alt="Authentication" />
        </div>
      </div>
    </main>
  );
}

export default ResetPasswordConfirm;
