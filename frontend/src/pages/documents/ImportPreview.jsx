import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentPreview, useApprovePreview, useRejectPreview, useUpdatePreviewData, useFeedbackSummary } from '../../api/hooks';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import ModalBlank from '../../components/ModalBlank';
import FeedbackRatingModal from '../../components/FeedbackRatingModal';
import { useToast } from '../../components/ToastNotification';

function ImportPreview() {
  const { t } = useTranslation();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: preview, isLoading, error } = useDocumentPreview(documentId);
  const approveMutation = useApprovePreview();
  const rejectMutation = useRejectPreview();
  const updateMutation = useUpdatePreviewData();

  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState({});
  const [editedProject, setEditedProject] = useState({});
  const [editedTasks, setEditedTasks] = useState([]);
  const [editedInvoice, setEditedInvoice] = useState({});
  
  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  // Fetch feedback summary to check if rating is needed
  const { data: feedbackSummary } = useFeedbackSummary(preview?.id, {
    enabled: !!preview?.id,
  });

  // Initialize edited data when preview loads
  useEffect(() => {
    if (preview) {
      setEditedCustomer(preview.customer_data || {});
      setEditedProject(preview.project_data || {});
      setEditedTasks(preview.tasks_data || []);
      setEditedInvoice(preview.invoice_estimate_data || {});
    }
  }, [preview]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        previewId: preview.id,
        data: {
          customer_data: editedCustomer,
          project_data: editedProject,
          tasks_data: editedTasks,
          invoice_estimate_data: editedInvoice,
        },
      });
      setIsEditing(false);
      setSuccessMessage(t('documents.preview.changesSavedSuccess'));
      setTimeout(() => {
        setSuccessModalOpen(true);
      }, 0);
    } catch (error) {
      console.error('Save error:', error);
      // Extract error message from backend response
      const errorMsg = error.response?.data?.error || error.response?.data?.message || t('documents.preview.errorSavingChanges');
      setErrorMessage(errorMsg);
      setTimeout(() => {
        setErrorModalOpen(true);
      }, 0);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    setEditedCustomer(preview.customer_data || {});
    setEditedProject(preview.project_data || {});
    setEditedTasks(preview.tasks_data || []);
    setEditedInvoice(preview.invoice_estimate_data || {});
    setIsEditing(false);
  };

  const handleApprove = async () => {
    setApproveModalOpen(false);
    try {
      await approveMutation.mutateAsync(preview.id);

      // Show toast for implicit positive feedback
      if (!feedbackSummary?.has_edits) {
        toast.success(t('documents.preview.perfectExtraction'));
      }

      // Show rating modal if feedback needs rating
      if (feedbackSummary?.needs_rating) {
        setRatingModalOpen(true);
      } else {
        // Navigate immediately if no rating needed
        navigate('/documents/import');
      }
    } catch (error) {
      console.error('Approval error:', error);
      // Extract error message from backend response
      const errorMsg = error.response?.data?.error || error.response?.data?.message || t('documents.preview.errorApprovingImport');
      setErrorMessage(errorMsg);
      setTimeout(() => {
        setErrorModalOpen(true);
      }, 0);
    }
  };

  const handleRatingModalClose = () => {
    setRatingModalOpen(false);
    navigate('/documents/import');
  };

  const handleReject = async () => {
    setRejectModalOpen(false);
    try {
      await rejectMutation.mutateAsync(preview.id);
      navigate('/documents/import');
    } catch (error) {
      console.error('Rejection error:', error);
      // Extract error message from backend response
      const errorMsg = error.response?.data?.error || error.response?.data?.message || t('documents.preview.errorRejectingImport');
      setErrorMessage(errorMsg);
      setTimeout(() => {
        setErrorModalOpen(true);
      }, 0);
    }
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 90) return 'bg-green-500/20 text-green-400 border border-green-500/30';
    if (confidence >= 70) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">{t('documents.preview.loadingPreview')}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-400 font-semibold mb-2">{t('documents.preview.errorLoadingPreview')}</h3>
                <p className="text-red-300">{error.message}</p>
                <button
                  onClick={() => navigate('/documents/import')}
                  className="mt-4 inline-flex items-center text-violet-400 hover:text-violet-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('documents.preview.backToImport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!preview) {
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-yellow-400 font-semibold mb-2">{t('documents.preview.noPreviewAvailable')}</h3>
                <p className="text-yellow-300">{t('documents.preview.documentStillProcessing')}</p>
                <button
                  onClick={() => navigate('/documents/import')}
                  className="mt-4 inline-flex items-center text-violet-400 hover:text-violet-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('documents.preview.backToImport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/documents/import')}
            className="inline-flex items-center text-violet-400 hover:text-violet-300 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('documents.preview.backToImport')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">{t('documents.preview.title')}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  preview.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  preview.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  preview.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {preview.status?.replace('_', ' ').toUpperCase()}
                </span>
                {preview.needs_clarification && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {t('documents.preview.needsClarification')}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-400">
                {isEditing ? t('documents.preview.editingData') : t('documents.preview.reviewData')}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('documents.preview.editData')}
              </button>
            )}
          </div>
        </div>

        {/* Warnings and Conflicts */}
        {(preview.warnings?.length > 0 || preview.conflicts?.length > 0) && (
          <div className="mb-6 space-y-4">
            {preview.conflicts?.length > 0 && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-400 mb-2">{t('documents.preview.conflictsDetected')}</h3>
                    <ul className="list-disc list-inside space-y-1 text-red-300 text-sm">
                      {preview.conflicts.map((conflict, idx) => (
                        <li key={idx}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {preview.warnings?.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-400 mb-2">{t('documents.preview.warnings')}</h3>
                    <ul className="list-disc list-inside space-y-1 text-yellow-300 text-sm">
                      {preview.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Needing Clarification */}
        {preview.needs_clarification && preview.task_quality_scores && (
          <div className="mb-6">
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <svg className="h-5 w-5 text-amber-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-400 mb-3">{t('documents.preview.tasksNeedClarification')}</h3>
                    <p className="text-amber-200 text-sm mb-4">
                      {t('documents.preview.tasksTooVague', {
                        count: Object.values(preview.task_quality_scores).filter(q => q.needs_clarification).length
                      })}
                    </p>
                    <div className="space-y-2 mb-4">
                      {Object.entries(preview.task_quality_scores)
                        .filter(([_, quality]) => quality.needs_clarification)
                        .map(([index, quality]) => (
                          <div key={index} className="bg-gray-800/50 rounded-lg p-3 border border-amber-700/30">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-white font-medium">{quality.task_name}</p>
                                <div className="flex items-center mt-1 space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    quality.score >= 70 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {quality.score}% clarity
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {quality.clarity_level}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => navigate(`/documents/clarify/${documentId}`)}
                      className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {t('documents.preview.clarifyTasksNow')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">{t('documents.preview.customerInformation')}</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(preview.customer_match_confidence)}`}>
                {preview.customer_match_confidence}% {t('documents.preview.confidence')}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {preview.customer_action === 'create_new' ? t('documents.preview.createNew') : preview.customer_action === 'use_existing' ? t('documents.preview.useExisting') : t('documents.preview.merge')}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-400">{t('common.name')}</dt>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer.name || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                  className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-100">{editedCustomer.name || 'N/A'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-400">{t('common.company')}</dt>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer.company || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, company: e.target.value })}
                  className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-100">{editedCustomer.company || 'N/A'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-400">{t('common.email')}</dt>
              {isEditing ? (
                <input
                  type="email"
                  value={editedCustomer.email || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                  className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-100">{editedCustomer.email || 'N/A'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-400">{t('common.phone')}</dt>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer.phone || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                  className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-100">{editedCustomer.phone || 'N/A'}</dd>
              )}
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-400">{t('common.address')}</dt>
              {isEditing ? (
                <textarea
                  value={editedCustomer.address || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
                  rows={2}
                  className="mt-1 form-textarea w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-100">{editedCustomer.address || 'N/A'}</dd>
              )}
            </div>
          </dl>

          {preview.matched_customer && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>{t('documents.preview.matchedCustomer')}</strong> {preview.matched_customer.name} ({preview.matched_customer.email})
              </p>
            </div>
          )}
        </div>

      {/* Project Section */}
      <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">{t('documents.preview.projectInformation')}</h2>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(preview.project_match_confidence)}`}>
              {preview.project_match_confidence}% {t('documents.preview.confidence')}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {preview.project_action === 'create_new' ? t('documents.preview.createNew') : t('documents.preview.mergeTasks')}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.projectName')}</dt>
            {isEditing ? (
              <input
                type="text"
                value={editedProject.name || ''}
                onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedProject.name || 'N/A'}</dd>
            )}
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-400">{t('common.description')}</dt>
            {isEditing ? (
              <textarea
                value={editedProject.description || ''}
                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                rows={3}
                className="mt-1 form-textarea w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedProject.description || 'N/A'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.startDate')}</dt>
            {isEditing ? (
              <input
                type="date"
                value={editedProject.start_date || ''}
                onChange={(e) => setEditedProject({ ...editedProject, start_date: e.target.value })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedProject.start_date || 'N/A'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.endDate')}</dt>
            {isEditing ? (
              <input
                type="date"
                value={editedProject.end_date || ''}
                onChange={(e) => setEditedProject({ ...editedProject, end_date: e.target.value })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedProject.end_date || 'N/A'}</dd>
            )}
          </div>
        </dl>

        {preview.matched_project && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>{t('documents.preview.matchedProject')}</strong> {preview.matched_project.name}
            </p>
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">
            {t('documents.preview.tasksCount', { count: editedTasks.length || 0 })}
          </h2>
        </div>

        {editedTasks && editedTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('documents.preview.taskName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('documents.preview.hours')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('documents.preview.rate')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">{t('documents.preview.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {editedTasks.map((task, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-100">
                      {isEditing ? (
                        <input
                          type="text"
                          value={task.name || ''}
                          onChange={(e) => {
                            const newTasks = [...editedTasks];
                            newTasks[idx] = { ...task, name: e.target.value };
                            setEditedTasks(newTasks);
                          }}
                          className="form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                        />
                      ) : (
                        task.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={task.estimated_hours || task.actual_hours || ''}
                          onChange={(e) => {
                            const newTasks = [...editedTasks];
                            newTasks[idx] = { ...task, estimated_hours: parseFloat(e.target.value) || null };
                            setEditedTasks(newTasks);
                          }}
                          className="form-input w-24 bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                        />
                      ) : (
                        task.estimated_hours || task.actual_hours || 'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={task.hourly_rate || ''}
                          onChange={(e) => {
                            const newTasks = [...editedTasks];
                            newTasks[idx] = { ...task, hourly_rate: parseFloat(e.target.value) || null };
                            setEditedTasks(newTasks);
                          }}
                          className="form-input w-24 bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                        />
                      ) : (
                        `$${task.hourly_rate || 'N/A'}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-100 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={task.amount || ''}
                          onChange={(e) => {
                            const newTasks = [...editedTasks];
                            newTasks[idx] = { ...task, amount: parseFloat(e.target.value) || 0 };
                            setEditedTasks(newTasks);
                          }}
                          className="form-input w-32 bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
                        />
                      ) : (
                        `$${task.amount?.toFixed(2) || '0.00'}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>{t('documents.preview.noTasks')}</p>
          </div>
        )}
      </div>

      {/* Invoice/Estimate Section */}
      <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">
          {preview.document?.document_type === 'invoice' ? t('documents.preview.invoice') : t('documents.preview.estimate')} {t('common.details')}
        </h2>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.number')}</dt>
            {isEditing ? (
              <input
                type="text"
                value={editedInvoice.number || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, number: e.target.value })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedInvoice.number || 'N/A'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.issueDate')}</dt>
            {isEditing ? (
              <input
                type="date"
                value={editedInvoice.issue_date || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, issue_date: e.target.value })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedInvoice.issue_date || 'N/A'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.subtotal')}</dt>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={editedInvoice.subtotal || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, subtotal: parseFloat(e.target.value) || 0 })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">${editedInvoice.subtotal?.toFixed(2) || '0.00'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.taxRate')}</dt>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={editedInvoice.tax_rate || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, tax_rate: parseFloat(e.target.value) || 0 })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedInvoice.tax_rate}% - ${editedInvoice.tax_amount?.toFixed(2) || '0.00'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.currency')}</dt>
            {isEditing ? (
              <select
                value={editedInvoice.currency || 'EUR'}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, currency: e.target.value })}
                className="mt-1 form-select w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            ) : (
              <dd className="mt-1 text-sm text-gray-100">{editedInvoice.currency || 'EUR'}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-400">{t('documents.preview.total')}</dt>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={editedInvoice.total || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, total: parseFloat(e.target.value) || 0 })}
                className="mt-1 form-input w-full bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500 font-bold"
              />
            ) : (
              <dd className="mt-1 text-lg font-bold text-green-400">${editedInvoice.total?.toFixed(2) || '0.00'}</dd>
            )}
          </div>
        </dl>
      </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? t('documents.preview.saving') : t('documents.preview.saveChanges')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  // Use setTimeout to ensure state updates complete before opening modal
                  setTimeout(() => {
                    setRejectModalOpen(true);
                  }, 0);
                }}
                disabled={rejectMutation.isPending}
                className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 disabled:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {t('documents.preview.rejectImport')}
              </button>
              <button
                onClick={() => {
                  // Use setTimeout to ensure state updates complete before opening modal
                  setTimeout(() => {
                    setApproveModalOpen(true);
                  }, 0);
                }}
                disabled={approveMutation.isPending}
                className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {t('documents.preview.approveImport')}
              </button>
            </>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Modals - rendered at root level for proper z-index stacking */}
      {preview && (
        <>
          {/* Approve Confirmation Modal */}
          <ModalBlank id="approve-modal" modalOpen={approveModalOpen} setModalOpen={setApproveModalOpen}>
            <div className="p-5 flex space-x-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-500/20">
                <svg className="shrink-0 fill-current text-violet-500 dark:text-violet-400" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zM8 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1">
                {/* Modal header */}
                <div className="mb-2">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('documents.preview.approveConfirmTitle')}</div>
                </div>
                {/* Modal content */}
                <div className="text-sm mb-10">
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">{t('documents.preview.approveConfirmMessage')}</p>
                    {preview?.tasks_data && (
                      <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-3">
                        <li>{preview.customer_action === 'create_new' ? t('documents.preview.createCustomerAction') : t('documents.preview.useExistingCustomerAction')}</li>
                        <li>{preview.project_action === 'create_new' ? t('documents.preview.createProjectAction') : t('documents.preview.mergeProjectAction')}</li>
                        <li>{t('documents.preview.createTasksAction', { count: preview.tasks_data.length })}</li>
                        <li>{t('documents.preview.createInvoiceAction', { type: preview.document?.document_type === 'invoice' ? t('documents.preview.invoice') : t('documents.preview.estimate') })}</li>
                      </ul>
                    )}
                  </div>
                </div>
                {/* Modal footer */}
                <div className="flex flex-wrap justify-end space-x-2">
                  <button
                    className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 bg-white dark:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setApproveModalOpen(false);
                    }}
                    disabled={approveMutation.isPending}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className="btn-sm bg-violet-500 hover:bg-violet-600 text-white disabled:bg-gray-600 disabled:opacity-50"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? t('documents.preview.approving') : t('documents.preview.yesApprove')}
                  </button>
                </div>
              </div>
            </div>
          </ModalBlank>

          {/* Reject Confirmation Modal */}
          <ModalBlank id="reject-modal" modalOpen={rejectModalOpen} setModalOpen={setRejectModalOpen}>
            <div className="p-5 flex space-x-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-700">
                <svg className="shrink-0 fill-current text-red-500" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                </svg>
              </div>
              {/* Content */}
              <div>
                {/* Modal header */}
                <div className="mb-2">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('documents.preview.rejectConfirmTitle')}</div>
                </div>
                {/* Modal content */}
                <div className="text-sm mb-10">
                  <div className="space-y-2">
                    <p>{t('documents.preview.rejectConfirmMessage')}</p>
                  </div>
                </div>
                {/* Modal footer */}
                <div className="flex flex-wrap justify-end space-x-2">
                  <button
                    className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectModalOpen(false);
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className="btn-sm bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-600 disabled:opacity-50"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? t('documents.preview.rejecting') : t('documents.preview.yesReject')}
                  </button>
                </div>
              </div>
            </div>
          </ModalBlank>

          {/* Error Modal */}
          <ModalBlank id="error-modal" modalOpen={errorModalOpen} setModalOpen={setErrorModalOpen}>
            <div className="p-5 flex space-x-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-500/20">
                <svg className="shrink-0 fill-current text-red-500" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1">
                {/* Modal header */}
                <div className="mb-2">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('common.error')}</div>
                </div>
                {/* Modal content */}
                <div className="text-sm mb-10">
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">{errorMessage}</p>
                  </div>
                </div>
                {/* Modal footer */}
                <div className="flex flex-wrap justify-end space-x-2">
                  <button
                    className="btn-sm bg-gray-700 hover:bg-gray-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setErrorModalOpen(false);
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </ModalBlank>

          {/* Success Modal */}
          <ModalBlank id="success-modal" modalOpen={successModalOpen} setModalOpen={setSuccessModalOpen}>
            <div className="p-5 flex space-x-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-500/20">
                <svg className="shrink-0 fill-current text-green-500" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM7 11.4L3.6 8 5 6.6l2 2 4-4L12.4 6 7 11.4z" />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1">
                {/* Modal header */}
                <div className="mb-2">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('common.success')}</div>
                </div>
                {/* Modal content */}
                <div className="text-sm mb-10">
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">{successMessage}</p>
                  </div>
                </div>
                {/* Modal footer */}
                <div className="flex flex-wrap justify-end space-x-2">
                  <button
                    className="btn-sm bg-green-500 hover:bg-green-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSuccessModalOpen(false);
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </ModalBlank>

          {/* Feedback Rating Modal */}
          <FeedbackRatingModal
            isOpen={ratingModalOpen}
            onClose={handleRatingModalClose}
            previewId={preview?.id}
            documentName={preview?.document?.file_name || 'Document'}
          />
        </>
      )}
    </div>
  );
}

export default ImportPreview;
