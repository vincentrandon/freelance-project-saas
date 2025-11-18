import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAIServiceTokens, useCreateAIServiceToken, useDeleteAIServiceToken, useAIServiceTokenLogs } from '../../api/hooks';
import ModalBasic from '../../components/ModalBasic';

function APIKeysPanel() {
  const { data: tokens, isLoading } = useAIServiceTokens();
  const createToken = useCreateAIServiceToken();
  const deleteToken = useDeleteAIServiceToken();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tokenDisplayModalOpen, setTokenDisplayModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    scopes: [],
    expires_at: '',
  });

  const { data: tokenLogs } = useAIServiceTokenLogs(selectedTokenId);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    console.log('Creating token with data:', formData);
    try {
      const result = await createToken.mutateAsync(formData);
      console.log('Token created:', result);
      setNewTokenValue(result.token_value);
      setCreateModalOpen(false);
      setTokenDisplayModalOpen(true);
      setFormData({ name: '', scopes: [], expires_at: '' });
    } catch (error) {
      console.error('Error creating token:', error);
      alert(error.response?.data?.detail || 'Failed to create API key');
    }
  };

  const handleDeleteToken = async (id) => {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteToken.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting token:', error);
      alert('Failed to revoke token');
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
    alert('Token copied to clipboard!');
  };

  const openLogsModal = (tokenId) => {
    setSelectedTokenId(tokenId);
    setLogsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grow">
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-1">
              API Keys
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Create API keys to connect ChatGPT or other AI tools to your kiik.app account.
            </div>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn bg-violet-500 hover:bg-violet-600 text-white"
          >
            <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span>Create New Key</span>
          </button>
        </div>

        {/* API Keys Table */}
        <section>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700/60 overflow-hidden">
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
                {!tokens?.results || tokens.results.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No API keys yet. Create your first key to get started.
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
                          <button
                            onClick={() => openLogsModal(token.id)}
                            className="text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                            title="View usage logs"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zM8 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
                            </svg>
                          </button>
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
        </section>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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

      {/* Create Token Modal - Using Portal to escape overflow container */}
      {isClient && createPortal(
        <ModalBasic
          id="create-token-modal"
          title="Create New API Key"
          modalOpen={createModalOpen}
          setModalOpen={setCreateModalOpen}
        >
        <form onSubmit={handleCreateToken}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="token-name">
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

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="expires-at">
                Expiration Date
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Scopes (Permissions) <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                {Object.entries(
                  availableScopes.reduce((acc, scope) => {
                    if (!acc[scope.group]) acc[scope.group] = [];
                    acc[scope.group].push(scope);
                    return acc;
                  }, {})
                ).map(([group, scopes]) => (
                  <div key={group}>
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {group}
                    </div>
                    <div className="space-y-1 ml-4">
                      {scopes.map((scope) => (
                        <label key={scope.value} className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={formData.scopes.includes(scope.value)}
                            onChange={() => handleScopeToggle(scope.value)}
                            className="form-checkbox text-violet-500"
                          />
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">
                            {scope.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {formData.scopes.length === 0 && (
                <div className="text-xs text-red-500 mt-1">
                  Please select at least one scope
                </div>
              )}
            </div>
          </div>

          {/* Modal footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                type="button"
                className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createToken.isPending || formData.scopes.length === 0}
                className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
              >
                {createToken.isPending ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>,
      document.body
      )}

      {/* Token Display Modal (shows token only once) - Using Portal */}
      {isClient && createPortal(
        <ModalBasic
        id="token-display-modal"
        title="API Key Created Successfully"
        modalOpen={tokenDisplayModalOpen}
        setModalOpen={setTokenDisplayModalOpen}
      >
        <div className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Important: Copy this key now. You won't be able to see it again!
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your API Key
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={newTokenValue || ''}
                className="form-input w-full font-mono text-sm bg-gray-50 dark:bg-gray-900"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(newTokenValue)}
                className="btn bg-violet-500 hover:bg-violet-600 text-white shrink-0"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <path d="M13 4h-3V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h1v1c0 .6.4 1 1 1h7c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1zm-1 9H6V6h6v7z" />
                </svg>
                <span className="ml-1">Copy</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex justify-end">
            <button
              onClick={() => setTokenDisplayModalOpen(false)}
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              Done
            </button>
          </div>
        </div>
      </ModalBasic>,
      document.body
      )}

      {/* Usage Logs Modal - Using Portal */}
      {isClient && createPortal(
        <ModalBasic
        id="token-logs-modal"
        title="API Key Usage Logs"
        modalOpen={logsModalOpen}
        setModalOpen={setLogsModalOpen}
      >
        <div className="px-5 py-4">
          <div className="max-h-96 overflow-y-auto">
            <table className="table-auto w-full">
              <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Time</th>
                  <th className="px-3 py-2 text-left font-semibold">Action</th>
                  <th className="px-3 py-2 text-left font-semibold">Path</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700/60">
                {!tokenLogs || tokenLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                      No usage logs yet
                    </td>
                  </tr>
                ) : (
                  tokenLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {log.action_type}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {log.path}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${
                            log.status_code >= 200 && log.status_code < 300
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {log.status_code}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex justify-end">
            <button
              onClick={() => setLogsModalOpen(false)}
              className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </ModalBasic>,
      document.body
      )}
    </div>
  );
}

export default APIKeysPanel;
