import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadDocuments, useImportedDocuments } from '../../api/hooks';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import ModalBasic from '../../components/ModalBasic';

function DocumentImport() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: documents, isLoading: documentsLoading } = useImportedDocuments();
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
      setErrorMessage('Please upload only PDF files');
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
      setErrorMessage('Please select at least one file');
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
      setErrorMessage('Error uploading documents. Please try again.');
      setErrorModalOpen(true);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      uploaded: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      processing: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      parsed: 'bg-green-500/20 text-green-400 border border-green-500/30',
      approved: 'bg-green-600 text-white',
      rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
      error: 'bg-red-600 text-white',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-700 text-gray-300'}`}>
        {status}
      </span>
    );
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
              <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">AI Document Import</h1>
              <p className="mt-2 text-sm text-gray-400">
                Upload invoices (factures) and estimates (devis) to automatically create customers, projects, and tasks using AI.
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Upload PDF Documents</h2>

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
                    Click to upload
                  </label>
                  {' '}or drag and drop
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  PDF files only. You can upload multiple documents at once.
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
                    Selected Files ({selectedFiles.length})
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
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="mt-4 w-full btn bg-violet-500 hover:bg-violet-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} Document${selectedFiles.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>

            {/* Recently Uploaded Documents */}
            <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-gray-100">Recent Documents</h2>
              </div>

              {documentsLoading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                  <p>Loading documents...</p>
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-100">{doc.file_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">
                              {doc.document_type === 'invoice' ? 'Invoice / Facture' : doc.document_type === 'estimate' ? 'Estimate / Devis' : 'Unknown'}
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
                            {doc.status === 'parsed' && (
                              <button
                                onClick={() => navigate(`/documents/preview/${doc.id}`)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-md transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Review
                              </button>
                            )}
                            {doc.status === 'processing' && (
                              <div className="inline-flex items-center text-xs text-yellow-400">
                                <svg className="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </div>
                            )}
                            {doc.status === 'error' && (
                              <div className="inline-flex items-start max-w-xs">
                                <svg className="h-4 w-4 text-red-400 mr-1.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-400 text-xs text-left break-words">
                                  {doc.error_message || 'Processing failed'}
                                </span>
                              </div>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No documents uploaded yet. Upload your first invoice or estimate above!</p>
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
        title="Upload Successful"
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
              {uploadedCount} {uploadedCount === 1 ? 'document' : 'documents'} uploaded successfully!
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              AI processing will begin shortly. You'll be able to review the extracted data once processing is complete.
            </div>
          </div>
          <div className="flex flex-wrap justify-end space-x-2">
            <button
              className="btn-sm bg-violet-500 hover:bg-violet-600 text-white"
              onClick={() => setSuccessModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Error Modal */}
      <ModalBasic
        id="error-modal"
        modalOpen={errorModalOpen}
        setModalOpen={setErrorModalOpen}
        title="Error"
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
              Close
            </button>
          </div>
        </div>
      </ModalBasic>
    </div>
  );
}

export default DocumentImport;
