import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useBatchSummary,
  useBatchList,
  useDetectPatterns,
  useBulkApprove,
  useBulkReject,
  useAutoApproveSafe
} from '../../api/hooks';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';

function BatchReview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPatterns, setShowPatterns] = useState(true);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // API hooks
  const { data: summary, isLoading: summaryLoading } = useBatchSummary();
  const { data: previews, isLoading: previewsLoading, refetch } = useBatchList(
    { ...filters, sort_by: sortBy, sort_order: sortOrder }
  );
  const detectPatterns = useDetectPatterns();
  const bulkApprove = useBulkApprove();
  const bulkReject = useBulkReject();
  const autoApproveSafe = useAutoApproveSafe();

  const [patterns, setPatterns] = useState([]);

  // Detect patterns on mount
  useEffect(() => {
    if (previews && previews.length > 0) {
      const previewIds = previews.map(p => p.id);
      detectPatterns.mutateAsync(previewIds).then(result => {
        setPatterns(result.patterns || []);
      });
    }
  }, [previews]);

  // Handle select/deselect
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === previews?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(previews?.map(p => p.id) || []);
    }
  };

  // Handle bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      await bulkApprove.mutateAsync(selectedIds);
      setSelectedIds([]);
      refetch();
    } catch (error) {
      console.error('Bulk approve error:', error);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(t('documents.batch.confirmReject', { count: selectedIds.length }))) return;

    try {
      await bulkReject.mutateAsync(selectedIds);
      setSelectedIds([]);
      refetch();
    } catch (error) {
      console.error('Bulk reject error:', error);
    }
  };

  const handleAutoApprove = async () => {
    if (!summary?.ready_for_batch_approve || summary.ready_for_batch_approve.length === 0) return;

    if (!window.confirm(t('documents.batch.confirmAutoApprove', { count: summary.auto_approve_eligible }))) return;

    try {
      await autoApproveSafe.mutateAsync(90);
      refetch();
    } catch (error) {
      console.error('Auto approve error:', error);
    }
  };

  // Apply pattern suggestion
  const handleApplyPattern = (pattern) => {
    if (pattern.type === 'same_customer' || pattern.type === 'same_project') {
      // Select all related previews
      setSelectedIds(pattern.preview_ids);
    }
  };

  // Get confidence badge color
  const getConfidenceBadge = (preview) => {
    const score = preview.overall_task_quality_score || 0;
    if (score >= 90) return 'bg-green-500/20 text-green-400 border border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  // Get card border color
  const getCardBorderColor = (preview) => {
    if (preview.conflicts && preview.conflicts.length > 0) {
      return 'border-red-500 shadow-red-500/20';
    }
    if (preview.warnings && preview.warnings.length > 0) {
      return 'border-yellow-500 shadow-yellow-500/20';
    }
    if (preview.auto_approve_eligible) {
      return 'border-green-500 shadow-green-500/20';
    }
    return 'border-gray-700';
  };

  // Get priority badge
  const getPriorityBadge = (pattern) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      low: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    };
    return colors[pattern.priority] || colors.low;
  };

  if (summaryLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-gray-400">{t('documents.batch.loading')}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If no pending documents, show empty state
  if (summary && summary.total_pending === 0) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <button
                onClick={() => navigate('/documents/import')}
                className="inline-flex items-center text-violet-400 hover:text-violet-300 mb-6"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('documents.batch.backToImports')}
              </button>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">{t('documents.batch.allCaughtUp')}</h3>
                <p className="text-gray-400 mb-6">{t('documents.batch.noPendingDocuments')}</p>
                <button
                  onClick={() => navigate('/documents/import')}
                  className="btn bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {t('documents.batch.uploadNewDocuments')}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">

            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate('/documents/import')}
                className="inline-flex items-center text-violet-400 hover:text-violet-300 mb-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('documents.batch.backToImports')}
              </button>

              <h1 className="text-2xl md:text-3xl text-gray-100 font-bold mb-2">{t('documents.batch.title')}</h1>
              <p className="text-gray-400">
                {t('documents.batch.description')}
              </p>
            </div>

            {/* Smart Summary Panel */}
            {summary && (
              <div className="bg-gradient-to-r from-violet-900/20 to-purple-900/20 border border-violet-700/50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-100 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('documents.batch.smartSummary')}
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{summary.total_pending}</div>
                    <div className="text-sm text-gray-400">{t('documents.batch.totalPending')}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{summary.auto_approve_eligible}</div>
                    <div className="text-sm text-gray-400">{t('documents.batch.readyToAutoApprove')}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">{summary.needs_attention}</div>
                    <div className="text-sm text-gray-400">{t('documents.batch.needsAttention')}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-amber-400">{summary.needs_clarification}</div>
                    <div className="text-sm text-gray-400">{t('documents.preview.needsClarification')}</div>
                  </div>
                </div>

                {summary.auto_approve_eligible > 0 && (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-green-400 font-medium mb-2">
                          💡 AI Suggestion: {summary.auto_approve_eligible} imports have &gt;90% confidence with no issues
                        </p>
                        <p className="text-gray-300 text-sm">
                          These documents are safe to approve automatically.
                        </p>
                      </div>
                      <button
                        onClick={handleAutoApprove}
                        disabled={autoApproveSafe.isPending}
                        className="ml-4 btn bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
                      >
                        {autoApproveSafe.isPending ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>⚡ Auto-Approve {summary.auto_approve_eligible}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pattern Detection Panel */}
            {patterns && patterns.length > 0 && showPatterns && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-100 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Detected Patterns ({patterns.length})
                  </h3>
                  <button
                    onClick={() => setShowPatterns(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Hide
                  </button>
                </div>

                <div className="divide-y divide-gray-700">
                  {patterns.map((pattern, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(pattern)}`}>
                              {pattern.priority.toUpperCase()}
                            </span>
                            <h4 className="text-white font-medium">{pattern.title}</h4>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{pattern.description}</p>
                          <p className="text-violet-400 text-sm">💡 {pattern.suggestion}</p>
                        </div>
                        <button
                          onClick={() => handleApplyPattern(pattern)}
                          className="ml-4 btn-sm bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters & Actions Bar */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Filters:</span>
                  <button
                    onClick={() => setFilters({})}
                    className={`btn-sm ${!filters.confidence ? 'bg-violet-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilters({ confidence: 'high' })}
                    className={`btn-sm ${filters.confidence === 'high' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    ⭐ High (&gt;90%)
                  </button>
                  <button
                    onClick={() => setFilters({ has_warnings: true })}
                    className={`btn-sm ${filters.has_warnings ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    ⚠️ Warnings
                  </button>
                  <button
                    onClick={() => setFilters({ has_conflicts: true })}
                    className={`btn-sm ${filters.has_conflicts ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    🚨 Conflicts
                  </button>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{selectedIds.length} selected</span>
                    <button
                      onClick={handleBulkApprove}
                      disabled={bulkApprove.isPending}
                      className="btn-sm bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-600 disabled:opacity-50"
                    >
                      {bulkApprove.isPending ? 'Approving...' : `✓ Approve ${selectedIds.length}`}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      disabled={bulkReject.isPending}
                      className="btn-sm bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-600 disabled:opacity-50"
                    >
                      {bulkReject.isPending ? 'Rejecting...' : `✗ Reject ${selectedIds.length}`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card Grid */}
            {previewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
              </div>
            ) : previews && previews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previews.map((preview) => (
                  <div
                    key={preview.id}
                    className={`bg-gray-800 border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${getCardBorderColor(preview)} ${
                      selectedIds.includes(preview.id) ? 'ring-2 ring-violet-500' : ''
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(preview.id)}
                          onChange={() => toggleSelect(preview.id)}
                          className="w-4 h-4 text-violet-500 focus:ring-violet-500 focus:ring-2 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-300">Select</span>
                      </label>

                      {preview.auto_approve_eligible ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          ✅ READY
                        </span>
                      ) : preview.needs_clarification ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          ⚠️ NEEDS CLARIFICATION
                        </span>
                      ) : preview.conflicts && preview.conflicts.length > 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                          🚨 CONFLICTS
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          ⚠️ REVIEW
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">
                          {preview.document?.document_type === 'invoice' ? '📄 Invoice' : '📋 Estimate'}
                        </div>
                        <h3 className="text-sm font-medium text-gray-100 truncate">
                          {preview.document?.file_name}
                        </h3>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div>
                          <div className="text-xs text-gray-400">Customer</div>
                          <div className="text-sm text-white font-medium">
                            {preview.customer_data?.name || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">Project</div>
                          <div className="text-sm text-gray-300 truncate">
                            {preview.project_data?.name || 'N/A'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-400">Tasks</div>
                            <div className="text-sm text-gray-300">
                              {preview.tasks_data?.length || 0} tasks
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Amount</div>
                            <div className="text-sm font-semibold text-green-400">
                              €{preview.invoice_estimate_data?.total?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 mb-1">Quality Score</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadge(preview)}`}>
                            {preview.overall_task_quality_score || 0}%
                          </span>
                        </div>
                      </div>

                      {/* Warnings/Conflicts */}
                      {preview.conflicts && preview.conflicts.length > 0 && (
                        <div className="mb-3 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-300">
                          🚨 {preview.conflicts[0]}
                          {preview.conflicts.length > 1 && ` +${preview.conflicts.length - 1} more`}
                        </div>
                      )}
                      {preview.warnings && preview.warnings.length > 0 && !preview.conflicts?.length && (
                        <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-300">
                          ⚠️ {preview.warnings[0]}
                          {preview.warnings.length > 1 && ` +${preview.warnings.length - 1} more`}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (preview.needs_clarification) {
                            navigate(`/documents/clarify/${preview.document?.id}`);
                          } else {
                            navigate(`/documents/preview/${preview.document?.id}`);
                          }
                        }}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                      >
                        👁 View Details
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await bulkReject.mutateAsync([preview.id]);
                              refetch();
                            } catch (error) {
                              console.error('Reject error:', error);
                            }
                          }}
                          className="btn-sm bg-gray-700 hover:bg-gray-600 text-gray-300"
                          title="Reject"
                        >
                          ✗
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await bulkApprove.mutateAsync([preview.id]);
                              refetch();
                            } catch (error) {
                              console.error('Approve error:', error);
                            }
                          }}
                          className="btn-sm bg-violet-500 hover:bg-violet-600 text-white"
                          title="Approve"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <p className="text-gray-400">No documents match the current filters.</p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default BatchReview;
