import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateCustomer, useUpdateCustomer, useCustomer } from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';

/**
 * CustomerCreate - Dedicated full-page form for creating/editing customers
 * Similar design to EstimateCreate with clean layout and autosave
 */
function CustomerCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existingCustomer, isLoading: loadingCustomer } = useCustomer(id, { enabled: isEditing });
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: ''
  });

  // Load existing customer data when editing
  useEffect(() => {
    if (existingCustomer) {
      setFormData({
        name: existingCustomer.name || '',
        email: existingCustomer.email || '',
        phone: existingCustomer.phone || '',
        company: existingCustomer.company || '',
        address: existingCustomer.address || '',
        notes: existingCustomer.notes || ''
      });
    }
  }, [existingCustomer]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      navigate('/customers');
    } catch (err) {
      console.error('Error saving customer:', err);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      navigate('/customers');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/customers')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-2xl md:text-3xl text-gray-900 dark:text-gray-100 font-bold">
                  {isEditing ? 'Edit Customer' : 'New Customer'}
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-14">
                {isEditing ? 'Update customer information' : 'Add a new customer to your contact list'}
              </p>
            </div>

            {loadingCustomer ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                <div className="animate-pulse space-y-6">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Form Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Basic Information Section */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          id="company"
                          value={formData.company}
                          onChange={(e) => handleChange('company', e.target.value)}
                          placeholder="Acme Corporation"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Address
                    </h2>
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Address
                      </label>
                      <textarea
                        id="address"
                        rows={3}
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="123 Main Street&#10;New York, NY 10001&#10;United States"
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                      />
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Notes
                    </h2>
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Add any additional information about this customer..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Sticky Footer */}
                <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4 rounded-xl shadow-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span>* Required fields</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default CustomerCreate;
