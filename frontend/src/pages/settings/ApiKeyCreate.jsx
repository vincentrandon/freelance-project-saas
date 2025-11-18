import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import { useCreateAIServiceToken } from '../../api/hooks';
import { useToast } from '../../components/ToastNotification';

function ApiKeyCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const createToken = useCreateAIServiceToken();
  const [newTokenValue, setNewTokenValue] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    scopes: [],
    expires_at: '',
  });

  const availableScopes = [
    { value: 'customers:read', label: 'View customers', group: 'Customers' },
    { value: 'customers:write', label: 'Create/update customers', group: 'Customers' },
    { value: 'projects:read', label: 'View projects', group: 'Projects' },
    { value: 'projects:write', label: 'Create/update projects', group: 'Projects' },
    { value: 'invoices:read', label: 'View invoices', group: 'Invoices' },
    { value: 'invoices:write', label: 'Create/update invoices', group: 'Invoices' },
    { value: 'estimates:read', label: 'View estimates', group: 'Estimates' },
    { value: 'estimates:write', label: 'Create/update estimates', group: 'Estimates' },
    { value: 'cra:read', label: 'View activity reports', group: 'CRA' },
    { value: 'cra:write', label: 'Create/update activity reports', group: 'CRA' },
    { value: 'documents:import', label: 'Import documents', group: 'Documents' },
    { value: 'context:read', label: 'Read context information', group: 'Context' },
  ];

  const handleCreateToken = async (e) => {
    e.preventDefault();
    try {
      const result = await createToken.mutateAsync(formData);
      setNewTokenValue(result.token_value);
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating token:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Failed to create API key';
      toast.error(errorMessage);
    }
  };

  const handleScopeToggle = (scope) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  // If token was created successfully, show the success view
  if (newTokenValue) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main>
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-3xl mx-auto">
              {/* Success Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                      API Key Created Successfully
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Copy your key now - you won't be able to see it again
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Important: Copy this key now. You won't be able to see it again!
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Store it securely - treat it like a password.
                    </p>
                  </div>
                </div>
              </div>

              {/* API Key Display */}
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 mb-6">
                <label className="block text-sm font-medium mb-3 text-gray-800 dark:text-gray-100">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newTokenValue}
                    className="form-input w-full font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newTokenValue)}
                    className="btn bg-violet-500 hover:bg-violet-600 text-white shrink-0"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                      <path d="M13 4h-3V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h1v1c0 .6.4 1 1 1h7c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1zm-1 9H6V6h6v7z" />
                    </svg>
                    <span className="ml-2">Copy</span>
                  </button>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Next Steps
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>Copy the API key above to your clipboard</li>
                  <li>Store it securely (password manager, environment variables, etc.)</li>
                  <li>In ChatGPT, install the kiik.app integration (when available)</li>
                  <li>Paste your API key when prompted during setup</li>
                  <li>Start using natural language to manage your invoices, customers, and projects!</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigate('/settings/api')}
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                >
                  Done
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show the creation form
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-3xl mx-auto">
            {/* Page header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                Create New API Key
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Generate an API key to connect ChatGPT or other AI tools to your kiik.app account.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateToken}>
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700/60">
                <div className="p-6 space-y-6">
                  {/* Key Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100" htmlFor="token-name">
                      Key Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="token-name"
                      className="form-input w-full"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., ChatGPT Production, Development Key"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      A descriptive name to identify this key
                    </div>
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100" htmlFor="expires-at">
                      Expiration Date <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                    </label>
                    <input
                      id="expires-at"
                      className="form-input w-full"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Optional: Set when this key should expire
                    </div>
                  </div>

                  {/* Scopes */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-800 dark:text-gray-100">
                      Scopes (Permissions) <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 max-h-96 overflow-y-auto space-y-4">
                      {Object.entries(
                        availableScopes.reduce((acc, scope) => {
                          if (!acc[scope.group]) acc[scope.group] = [];
                          acc[scope.group].push(scope);
                          return acc;
                        }, {})
                      ).map(([group, scopes]) => (
                        <div key={group}>
                          <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                            {group}
                          </div>
                          <div className="space-y-2 ml-2">
                            {scopes.map((scope) => (
                              <label key={scope.value} className="flex items-center cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={formData.scopes.includes(scope.value)}
                                  onChange={() => handleScopeToggle(scope.value)}
                                  className="form-checkbox text-violet-500"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                                  {scope.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {formData.scopes.length === 0 && (
                      <div className="text-xs text-red-500 mt-2">
                        Please select at least one scope
                      </div>
                    )}
                  </div>
                </div>

                {/* Form footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/20">
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                      onClick={() => navigate('/settings/api')}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createToken.isPending || formData.scopes.length === 0}
                      className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
                    >
                      {createToken.isPending ? 'Creating...' : 'Create API Key'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApiKeyCreate;
