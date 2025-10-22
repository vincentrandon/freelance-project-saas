import React, { useState, useEffect, useRef } from 'react';
import { useCreateProject, useCustomers } from '../api/hooks';
import ModalBasic from './ModalBasic';
import InlineCustomerForm from './InlineCustomerForm';

/**
 * InlineProjectForm - Quick project creation modal
 * Minimal form focused on speed with essential fields only
 */
function InlineProjectForm({ isOpen, onClose, onSuccess, preSelectedCustomer = null }) {
  const createMutation = useCreateProject();
  const { data: customersData } = useCustomers();
  const customers = customersData?.results || [];
  const nameInputRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer: preSelectedCustomer || '',
    status: 'active',
    estimated_budget: '',
  });

  const [errors, setErrors] = useState({});
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

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
        description: '',
        customer: preSelectedCustomer || '',
        status: 'active',
        estimated_budget: '',
      });
      setErrors({});
    }
  }, [isOpen, preSelectedCustomer]);

  // Update customer when preSelectedCustomer changes
  useEffect(() => {
    if (preSelectedCustomer) {
      setFormData(prev => ({ ...prev, customer: preSelectedCustomer }));
    }
  }, [preSelectedCustomer]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.customer) {
      newErrors.customer = 'Please select a customer first';
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
      const newProject = response.data;

      // Call success callback with the new project data
      onSuccess?.(newProject);

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error creating project:', err);

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

  const handleCustomerCreated = (newCustomer) => {
    // Auto-select the newly created customer
    setFormData(prev => ({ ...prev, customer: newCustomer.id }));
  };

  return (
    <ModalBasic
      modalOpen={shouldRender}
      setModalOpen={onClose}
      title="Create New Project"
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

          {/* Customer selector if not pre-selected */}
          {!preSelectedCustomer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={formData.customer}
                  onChange={(e) => handleChange('customer', e.target.value)}
                  className={`flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 transition-all duration-200 ${
                    errors.customer
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company ? `(${customer.company})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCustomerFormOpen(true)}
                  className="px-3 py-2 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/60 rounded-lg transition-colors flex items-center gap-1"
                  title="Create new customer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">New</span>
                </button>
              </div>
              {errors.customer && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customer}</p>
              )}
            </div>
          )}

          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Website Redesign"
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

          {/* Description field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Brief description of the project..."
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 resize-none ${
                errors.description
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Status and Budget row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 transition-all duration-200 ${
                  errors.status
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status}</p>
              )}
            </div>

            {/* Estimated Budget field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Budget (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_budget}
                onChange={(e) => handleChange('estimated_budget', e.target.value)}
                placeholder="5000"
                className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 ${
                  errors.estimated_budget
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.estimated_budget && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.estimated_budget}</p>
              )}
            </div>
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
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Nested customer creation form */}
      <InlineCustomerForm
        isOpen={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </ModalBasic>
  );
}

export default InlineProjectForm;
