import React, { useState, useEffect, useRef } from 'react';
import { useCreateCustomer } from '../api/hooks';
import ModalBasic from './ModalBasic';

/**
 * InlineCustomerForm - Quick customer creation modal
 * Minimal form focused on speed with essential fields only
 */
function InlineCustomerForm({ isOpen, onClose, onSuccess }) {
  const createMutation = useCreateCustomer();
  const nameInputRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  // Delay rendering to prevent immediate close from click-outside handler
  useEffect(() => {
    if (isOpen) {
      // Small delay to prevent the opening click from triggering close
      const timer = setTimeout(() => setShouldRender(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isOpen]);

  // Auto-focus name field when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const response = await createMutation.mutateAsync(formData);
      const newCustomer = response.data;

      // Call success callback with the new customer data
      onSuccess?.(newCustomer);

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error creating customer:', err);

      // Handle server-side validation errors
      if (err.response?.data) {
        const serverErrors = {};
        Object.keys(err.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(err.response.data[key])
            ? err.response.data[key][0]
            : err.response.data[key];
        });
        setErrors(serverErrors);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Cmd+Enter or Ctrl+Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <ModalBasic
      modalOpen={shouldRender}
      setModalOpen={onClose}
      title="Create New Customer"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="px-5 py-4 space-y-4">
          {/* Quick tip */}
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
            <p className="text-xs text-violet-700 dark:text-violet-300">
              <span className="font-semibold">Tip:</span> Press{' '}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 rounded text-[10px] font-mono">
                ⌘ + Enter
              </kbd>{' '}
              to save quickly
            </p>
          </div>

          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 ${
                errors.name
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@example.com"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 ${
                errors.email
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Company field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Acme Corporation"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 ${
                errors.company
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.company && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.company}</p>
            )}
          </div>

          {/* Phone field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 ${
                errors.phone
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              * Required fields
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </ModalBasic>
  );
}

export default InlineCustomerForm;
