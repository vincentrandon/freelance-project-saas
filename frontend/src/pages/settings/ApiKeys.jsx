import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import { useAIServiceTokens, useDeleteAIServiceToken } from '../../api/hooks';
import { useToast } from '../../components/ToastNotification';

function ApiKeys() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: tokens, isLoading } = useAIServiceTokens();
  const deleteToken = useDeleteAIServiceToken();
  const [revokeConfirmId, setRevokeConfirmId] = useState(null);

  const handleDeleteToken = async (id) => {
    if (revokeConfirmId !== id) {
      setRevokeConfirmId(id);
      toast.warning('Click again to confirm token revocation');
      setTimeout(() => setRevokeConfirmId(null), 3000);
      return;
    }
    try {
      await deleteToken.mutateAsync(id);
      toast.success('API key revoked successfully');
      setRevokeConfirmId(null);
    } catch (error) {
      console.error('Error deleting token:', error);
      toast.error('Failed to revoke token');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                  API Keys & ChatGPT Integration
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Create API keys to connect ChatGPT or other AI tools to your kiik.app account.
                </p>
              </div>

              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                <button
                  onClick={() => navigate('/settings/api/create')}
                  className="btn bg-violet-500 hover:bg-violet-600 text-white"
                >
                  <svg className="w-4 h-4 fill-current opacity-50 shrink-0" viewBox="0 0 16 16">
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span className="ml-2">New API Key</span>
                </button>
              </div>
            </div>

            {/* API Keys Table */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700/60">
              <div className="overflow-x-auto">
                <table className="table-auto w-full dark:text-gray-300">
                  <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-200 dark:border-gray-700/60">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Name</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Key Prefix</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Scopes</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Last Used</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Created</div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-left">Actions</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : !tokens?.results || tokens.results.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center">
                          <div className="text-gray-500 dark:text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <p className="text-lg font-medium mb-1">No API keys yet</p>
                            <p className="text-sm">Create your first API key to get started with ChatGPT integration</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tokens.results.map((token) => (
                        <tr key={token.id} className={!token.is_active ? 'opacity-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-800 dark:text-gray-100">
                              {token.name}
                              {!token.is_active && (
                                <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Revoked)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 text-violet-600 dark:text-violet-400 px-2 py-1 rounded font-mono">
                              {token.key_prefix}***
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {token.scopes?.slice(0, 3).map((scope) => (
                                <span
                                  key={scope}
                                  className="inline-flex items-center text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded"
                                >
                                  {scope}
                                </span>
                              ))}
                              {token.scopes?.length > 3 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +{token.scopes.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {token.last_used_at ? (
                              <div className="text-gray-600 dark:text-gray-400 text-xs">
                                {new Date(token.last_used_at).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">Never</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-gray-600 dark:text-gray-400 text-xs">
                              {new Date(token.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {token.is_active && (
                                <button
                                  onClick={() => handleDeleteToken(token.id)}
                                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Revoke token"
                                >
                                  <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                                    <path d="M5 7h2v6H5V7zm4 0h2v6H9V7zm3-6v2h4v2h-1v10c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V5H0V3h4V1c0-.6.4-1 1-1h6c.6 0 1 .4 1 1zM6 2v1h4V2H6zm7 3H3v9h10V5z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    How to use API keys with ChatGPT
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    <li>Create an API key above with the necessary scopes</li>
                    <li>Copy the key (it will only be shown once)</li>
                    <li>In ChatGPT, install the kiik.app integration (when available)</li>
                    <li>Paste your API key when prompted during setup</li>
                    <li>Start using natural language to manage your invoices, customers, and projects!</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApiKeys;
