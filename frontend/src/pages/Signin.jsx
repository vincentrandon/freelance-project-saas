import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../api/hooks";
import { useAuth } from "../utils/AuthContext";
import AuthImage from "../images/auth-image.jpg";

function Signin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

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
                <div className="mx-3 text-xs uppercase text-gray-400 font-medium">Or</div>
                <hr className="grow" />
              </div>
              {/* Social links */}
              <div className="flex gap-3">
                <a
                  className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 flex-1"
                  href="#"
                >
                  <svg className="w-4 h-4 fill-current mx-auto" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                </a>
                <a
                  className="btn-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 flex-1"
                  href="#"
                >
                  <svg className="w-4 h-4 fill-current mx-auto" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                </a>
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
