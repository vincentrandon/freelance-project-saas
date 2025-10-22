import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import AuthImage from "../images/auth-image.jpg";

function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err.response?.data);
      
      // Handle various error formats from the backend
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response?.data) {
        const data = err.response.data;
        // Check for specific field errors
        if (data.email?.[0]) {
          errorMessage = `Email: ${data.email[0]}`;
        } else if (data.username?.[0]) {
          errorMessage = `Username: ${data.username[0]}`;
        } else if (data.password1?.[0]) {
          errorMessage = `Password: ${data.password1[0]}`;
        } else if (data.password2?.[0]) {
          errorMessage = `Password confirmation: ${data.password2[0]}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors?.[0]) {
          errorMessage = data.non_field_errors[0];
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          // If we have any error object, show the first error found
          const firstError = Object.values(data).find(val => val);
          if (firstError) {
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }
      }
      
      // Make error message more user-friendly
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Create your account</h1>

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1" htmlFor="firstName">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        className="form-input w-full"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1" htmlFor="lastName">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        className="form-input w-full"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
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
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="passwordConfirm">
                      Confirm Password
                    </label>
                    <input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      className="form-input w-full"
                      type="password"
                      autoComplete="on"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white mt-6 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="px-4 py-8">
              <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                Already have an account? <Link className="font-medium text-violet-500 hover:text-violet-600" to="/signin">Sign in</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <img className="w-full h-full object-cover" src={AuthImage} width={760} height={1024} alt="Authentication" />
        </div>
      </div>
    </main>
  );
}

export default Signup;
