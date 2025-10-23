import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUploadDocuments, useImportedDocuments, useBatchSummary } from '../../api/hooks';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import ModalBasic from '../../components/ModalBasic';

function DocumentImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');

  // Build filters object for API
  const filters = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (documentTypeFilter !== 'all') filters.document_type = documentTypeFilter;

  const { data: documents, isLoading: documentsLoading } = useImportedDocuments(filters);
  const { data: batchSummary } = useBatchSummary();
  const uploadMutation = useUploadDocuments();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = [...e.dataTransfer.files];
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));

    if (pdfFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pdfFiles]);
    } else {
      setErrorMessage(t('documents.import.errorUploadingPDF'));
      setErrorModalOpen(true);
    }
  }, []);

  const handleFileSelect = (e) => {
    const files = [...e.target.files];
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage(t('documents.import.errorNoFiles'));
      setErrorModalOpen(true);
      return;
    }

    try {
      await uploadMutation.mutateAsync(selectedFiles);
      setUploadedCount(selectedFiles.length);
      setSelectedFiles([]);
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(t('documents.import.errorUploading'));
      setErrorModalOpen(true);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      uploaded: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      processing: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      parsed: 'bg-green-500/20 text-green-400 border border-green-500/30',
      approved: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
      rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
      error: 'bg-red-600/20 text-red-300 border border-red-600/30',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-700 text-gray-300'}`}>
        {t(`documents.import.statuses.${status}`) || status}
      </span>
    );
  };

  // Filter documents based on search query (client-side filtering for filename)
  const filteredDocuments = (documents || []).filter(doc =>
    doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate status counts for all documents
  const allDocuments = documents || [];
  const statusCounts = {
    all: allDocuments.length,
    uploaded: allDocuments.filter(d => d.status === 'uploaded').length,
    processing: allDocuments.filter(d => d.status === 'processing').length,
    parsed: allDocuments.filter(d => d.status === 'parsed').length,
    approved: allDocuments.filter(d => d.status === 'approved').length,
    rejected: allDocuments.filter(d => d.status === 'rejected').length,
    error: allDocuments.filter(d => d.status === 'error').length,
  };

  const documentTypeCounts = {
    all: allDocuments.length,
    invoice: allDocuments.filter(d => d.document_type === 'invoice').length,
    estimate: allDocuments.filter(d => d.document_type === 'estimate').length,
    unknown: allDocuments.filter(d => d.document_type === 'unknown').length,
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">{t('documents.import.title')}</h1>
                  <p className="mt-2 text-sm text-gray-400">
                    {t('documents.import.description')}
                  </p>
                </div>

                {/* Batch Review Button */}
                {batchSummary && batchSummary.total_pending > 0 && (
                  <button
                    onClick={() => navigate('/documents/batch-review')}
                    className="btn bg-violet-500 hover:bg-violet-600 text-white flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>{t('documents.import.batchReviewCount', { count: batchSummary.total_pending })}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">{t('documents.import.uploadSection')}</h2>

              {/* Drag and drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive ? 'border-violet-500 bg-violet-500/10' : 'border-gray-600 bg-gray-700/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-4 text-sm text-gray-300">
                  <label htmlFor="file-upload" className="cursor-pointer text-violet-400 hover:text-violet-300 font-medium">
                    {t('documents.import.clickToUpload')}
                  </label>
                  {' '}{t('documents.import.dragAndDrop')}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {t('documents.import.fileHelp')}
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-100 mb-3">
                    {t('documents.import.selectedFiles')} ({selectedFiles.length})
                  </h3>
                  <ul className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-3 text-sm text-gray-100 truncate">{file.name}</span>
                          <span className="ml-3 text-xs text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-4 inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                        >
                          {t('documents.import.remove')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="mt-4 w-full btn bg-violet-500 hover:bg-violet-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadMutation.isPending ? t('documents.import.uploading') : t('documents.import.uploadDocuments', { count: selectedFiles.length })}
                  </button>
                </div>
              )}
            </div>

            {/* Toolbar - Stripe/Linear inspired */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('documents.import.searchPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-sm text-gray-100 placeholder-gray-500 transition-all"
                  />
                </div>

                {/* Active filters badge */}
                {(statusFilter !== 'all' || documentTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDocumentTypeFilter('all');
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t('documents.import.clearFilters')}
                  </button>
                )}
              </div>

              {/* Compact Filter Pills - Linear Style */}
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <div className="inline-flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
                  {[
                    { key: 'all', label: t('common.all'), icon: null },
                    { key: 'uploaded', label: t('documents.import.statuses.uploaded'), icon: '📤' },
                    { key: 'processing', label: t('documents.import.statuses.processing'), icon: '⏳' },
                    { key: 'parsed', label: t('documents.import.statuses.parsed'), icon: '✓' },
                    { key: 'approved', label: t('documents.import.statuses.approved'), icon: '✓✓' },
                    { key: 'rejected', label: t('documents.import.statuses.rejected'), icon: '✗' },
                    { key: 'error', label: t('documents.import.statuses.error'), icon: '!' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`relative px-2.5 py-1 text-xs font-medium rounded transition-all ${
                        statusFilter === key
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {icon && <span className="text-[10px]">{icon}</span>}
                        {label}
                        {statusCounts[key] > 0 && (
                          <span className={`ml-1 ${statusFilter === key ? 'text-violet-200' : 'text-gray-500'}`}>
                            {statusCounts[key]}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Document Type Filter - Compact */}
                <div className="inline-flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
                  <span className="px-2 text-xs text-gray-500">{t('documents.import.filters.documentType')}</span>
                  <div className="h-3 w-px bg-gray-700"></div>
                  {[
                    { key: 'all', label: t('common.all') },
                    { key: 'invoice', label: t('documents.documentType.invoice') },
                    { key: 'estimate', label: t('documents.documentType.estimate') },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDocumentTypeFilter(key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                        documentTypeFilter === key
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      }`}
                    >
                      {label}
                      {documentTypeCounts[key] > 0 && (
                        <span className={`ml-1 ${documentTypeFilter === key ? 'text-violet-200' : 'text-gray-500'}`}>
                          {documentTypeCounts[key]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recently Uploaded Documents */}
            <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-gray-100">{t('documents.import.documentsTitle')}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {filteredDocuments.length === documents?.length
                    ? t('documents.import.showingAll', { count: documents?.length || 0 })
                    : t('documents.import.showingFiltered', { filtered: filteredDocuments.length, total: documents?.length || 0 })
                  }
                </p>
              </div>

              {documentsLoading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                  <p>{t('documents.import.loadingDocuments')}</p>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('documents.import.fileName')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('documents.import.type')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('documents.import.status')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('documents.import.uploaded')}
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('documents.import.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-100">{doc.file_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">
                              {doc.document_type === 'invoice' ? t('documents.documentType.invoiceFacture') : doc.document_type === 'estimate' ? t('documents.documentType.estimateDevis') : t('documents.documentType.unknown')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(doc.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium">
                            {doc.status === 'parsed' && doc.preview && (
                              doc.preview.needs_clarification ? (
                                <button
                                  onClick={() => navigate(`/documents/clarify/${doc.id}`)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  {t('documents.import.clarifyTasks')}
                                </button>
                              ) : (
                                <button
                                  onClick={() => navigate(`/documents/preview/${doc.id}`)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-md transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {t('documents.import.review')}
                                </button>
                              )
                            )}
                            {doc.status === 'processing' && (
                              <div className="inline-flex items-center text-xs text-yellow-400">
                                <svg className="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('documents.import.processingStatus')}
                              </div>
                            )}
                            {doc.status === 'error' && (
                              <div className="inline-flex items-start max-w-xs">
                                <svg className="h-4 w-4 text-red-400 mr-1.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-400 text-xs text-left break-words">
                                  {doc.error_message || t('documents.import.processingFailed')}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : searchQuery || statusFilter !== 'all' || documentTypeFilter !== 'all' ? (
                <div className="p-8 text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-300 mb-2">{t('documents.import.noResultsFound')}</p>
                  <p className="text-sm text-gray-500">{t('documents.import.tryDifferentFilters')}</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDocumentTypeFilter('all');
                    }}
                    className="mt-4 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  >
                    {t('documents.import.clearFilters')}
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>{t('documents.import.noDocuments')}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Success Modal */}
      <ModalBasic
        id="success-modal"
        modalOpen={successModalOpen}
        setModalOpen={setSuccessModalOpen}
        title={t('documents.import.uploadSuccess')}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="text-center mb-5">
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {t('documents.import.documentUploaded', { count: uploadedCount })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('documents.import.aiProcessingWillBegin')}
            </div>
          </div>
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              className="btn-sm bg-violet-500 hover:bg-violet-600 text-white"
              onClick={() => setSuccessModalOpen(false)}
            >
              {t('documents.import.gotIt')}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Error Modal */}
      <ModalBasic
        id="error-modal"
        modalOpen={errorModalOpen}
        setModalOpen={setErrorModalOpen}
        title={t('documents.import.errorTitle')}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="text-center mb-5">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {errorMessage}
            </div>
          </div>
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              className="btn-sm bg-gray-500 hover:bg-gray-600 text-white"
              onClick={() => setErrorModalOpen(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </ModalBasic>
    </div>
  );
}

export default DocumentImport;
