import React, { useState, useEffect } from 'react';
import { useCustomer, useProjects, useDeleteCustomer, useDeleteAttachment, useUploadCustomerAttachment } from '../api/hooks';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';

/**
 * CustomerDetailPanel - Slide-over panel for customer details
 * Inspired by Linear's issue panel design
 * Full-screen on mobile, slide-over on desktop
 */
function CustomerDetailPanel({ customerId, isOpen, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: customer, isLoading } = useCustomer(customerId, { enabled: !!customerId && isOpen });
  const { data: projectsData } = useProjects({ customer: customerId }, { enabled: !!customerId && isOpen });
  const deleteCustomerMutation = useDeleteCustomer();
  const deleteAttachmentMutation = useDeleteAttachment();
  const uploadMutation = useUploadCustomerAttachment();

  const projects = projectsData?.results || [];

  // Reset to overview tab when opening new customer
  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [customerId, isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file && customerId) {
      try {
        await uploadMutation.mutateAsync({ customerId, file });
        e.target.value = ''; // Reset file input
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      try {
        await deleteAttachmentMutation.mutateAsync(attachmentId);
      } catch (err) {
        console.error('Error deleting attachment:', err);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await deleteCustomerMutation.mutateAsync(customerId);
        onClose();
      } catch (err) {
        console.error('Error deleting customer:', err);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[600px] flex shadow-2xl">
        <div className="flex flex-col w-full bg-white dark:bg-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                ) : customer ? (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      {/* Customer Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {customer.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                          {customer.name}
                        </h2>
                        {customer.company && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {customer.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mt-4 overflow-x-auto no-scrollbar">
              {['overview', 'projects', 'files'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'projects' && projects.length > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {projects.length}
                    </span>
                  )}
                  {tab === 'files' && customer?.attachments?.length > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {customer.attachments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : customer ? (
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                            <a href={`mailto:${customer.email}`} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
                              {customer.email}
                            </a>
                          </div>
                        </div>
                        {customer.phone && (
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                              <a href={`tel:${customer.phone}`} className="text-sm text-gray-900 dark:text-gray-100">
                                {customer.phone}
                              </a>
                            </div>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                                {customer.address}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {customer.notes && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {customer.notes}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Metadata</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(customer.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Projects</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{projects.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    {projects.length === 0 ? (
                      <EmptyState.Projects />
                    ) : (
                      projects.map(project => (
                        <div key={project.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {project.name}
                              </h4>
                              {project.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <StatusBadge.Project status={project.status} size="sm" />
                          </div>
                          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <span>{Number(project.total_estimated_hours || 0).toFixed(1)}h estimated</span>
                            <span>{Number(project.total_actual_hours || 0).toFixed(1)}h actual</span>
                            <span className="text-green-600 dark:text-green-400">
                              €{Number(project.total_invoiced || 0).toLocaleString()} invoiced
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                  <div className="space-y-4">
                    {/* Upload Button */}
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors">
                      <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                        {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
                      </span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadMutation.isPending}
                      />
                    </label>

                    {/* Files List */}
                    {customer.attachments && customer.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {customer.attachments.map(attachment => (
                          <div key={attachment.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(attachment.file_size)} • {formatDate(attachment.uploaded_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={attachment.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Download"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="📎"
                        title="No files yet"
                        description="Upload documents, contracts, or other files related to this customer."
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon="⚠️"
                  title="Customer not found"
                  description="This customer may have been deleted or you don't have permission to view it."
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {customer && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteCustomerMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onEdit(customer)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Customer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CustomerDetailPanel;
