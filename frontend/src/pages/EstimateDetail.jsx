import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEstimate,
  useGenerateEstimatePDF,
  useSendEstimate,
  useRequestSignature,
  useDeleteEstimate,
  useUpdateEstimate,
  usePublishEstimate,
  useDuplicateEstimate,
  useMarkEstimateAccepted,
  useConvertEstimateToInvoice,
} from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ModalBasic from '../components/ModalBasic';
import DropdownActions from '../components/DropdownActions';
import StatusTimeline from '../components/StatusTimeline';

// Notification Modal Component
function NotificationModal({ isOpen, setIsOpen, type, title, message }) {
  const bgColor = type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  const borderColor = type === 'success' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800';
  const iconColor = type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const textColor = type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';

  return (
    <ModalBasic isOpen={isOpen} setIsOpen={setIsOpen} title={title}>
      <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={iconColor}>
            {type === 'success' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </ModalBasic>
  );
}

function EstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [signatureData, setSignatureData] = useState({
    signer_name: '',
    signer_email: '',
    signer_company: '',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const { data: estimate, isLoading } = useEstimate(id);
  const generatePDFMutation = useGenerateEstimatePDF();
  const sendMutation = useSendEstimate();
  const requestSignatureMutation = useRequestSignature();
  const deleteMutation = useDeleteEstimate();
  const updateMutation = useUpdateEstimate();
  const publishMutation = usePublishEstimate();
  const duplicateMutation = useDuplicateEstimate();
  const markAcceptedMutation = useMarkEstimateAccepted();
  const convertToInvoiceMutation = useConvertEstimateToInvoice();

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Estimate not found</h2>
                <button
                  onClick={() => navigate('/invoicing')}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Back to Invoicing
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleGeneratePDF = async () => {
    try {
      await generatePDFMutation.mutateAsync({ estimateId: estimate.id });
      showNotification('success', 'Success', 'PDF generation started! The file will be ready in a few seconds.');

      // Refetch the estimate data after 2 seconds to get the updated pdf_file
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['estimates', String(id)] });
      }, 2000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showNotification('error', 'Error', 'Failed to generate PDF: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync(estimate.id);
      showNotification('success', 'Success', 'Estimate sent successfully via email!');
    } catch (err) {
      console.error('Error sending estimate:', err);
      showNotification('error', 'Error', 'Failed to send estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRequestSignature = async (e) => {
    e.preventDefault();
    try {
      await requestSignatureMutation.mutateAsync({
        estimateId: estimate.id,
        ...signatureData,
      });
      setSignatureModalOpen(false);
      showNotification('success', 'Success', 'Signature request sent successfully!');
    } catch (err) {
      console.error('Error requesting signature:', err);
      showNotification('error', 'Error', 'Failed to request signature: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async () => {
    setDeleteModalOpen(false);
    try {
      await deleteMutation.mutateAsync(estimate.id);
      showNotification('success', 'Success', 'Estimate deleted successfully!');
      setTimeout(() => navigate('/invoicing'), 1500);
    } catch (err) {
      console.error('Error deleting estimate:', err);
      showNotification('error', 'Error', 'Failed to delete estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(estimate.id);
      showNotification('success', 'Success', 'Estimate published successfully!');
    } catch (err) {
      console.error('Error publishing estimate:', err);
      showNotification('error', 'Error', 'Failed to publish estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await duplicateMutation.mutateAsync(estimate.id);
      showNotification('success', 'Success', 'Estimate duplicated successfully!');
      // Navigate to the new estimate
      if (response.data?.id) {
        setTimeout(() => navigate(`/invoicing/estimates/${response.data.id}`), 1500);
      }
    } catch (err) {
      console.error('Error duplicating estimate:', err);
      showNotification('error', 'Error', 'Failed to duplicate estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkAccepted = async () => {
    try {
      await markAcceptedMutation.mutateAsync(estimate.id);
      showNotification('success', 'Success', 'Estimate marked as accepted!');
    } catch (err) {
      console.error('Error marking estimate as accepted:', err);
      showNotification('error', 'Error', 'Failed to mark estimate as accepted: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const response = await convertToInvoiceMutation.mutateAsync({ estimateId: estimate.id, due_days: 30 });
      showNotification('success', 'Success', 'Estimate converted to invoice successfully!');
      // Navigate to the new invoice
      if (response.data?.id) {
        setTimeout(() => navigate(`/invoicing/invoices/${response.data.id}`), 1500);
      }
    } catch (err) {
      console.error('Error converting estimate to invoice:', err);
      showNotification('error', 'Error', 'Failed to convert estimate to invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDownloadSignedPDF = () => {
    // Download the signed PDF with proof
    const url = `${import.meta.env.VITE_API_URL}/invoices/estimates/${estimate.id}/download_signed_pdf/`;
    const token = localStorage.getItem('access_token');

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to download signed PDF');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${estimate.estimate_number}_signed.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('success', 'Success', 'Signed PDF downloaded successfully!');
    })
    .catch(err => {
      console.error('Error downloading signed PDF:', err);
      showNotification('error', 'Error', 'Failed to download signed PDF');
    });
  };

  const handleActionClick = (action) => {
    switch (action) {
      case 'generate-pdf':
        handleGeneratePDF();
        break;
      case 'view-pdf':
        if (estimate.pdf_file) {
          window.open(estimate.pdf_file, '_blank');
        }
        break;
      case 'download-signed-pdf':
        handleDownloadSignedPDF();
        break;
      case 'send-email':
        handleSend();
        break;
      case 'request-signature':
        setSignatureModalOpen(true);
        break;
      case 'convert-to-invoice':
        handleConvertToInvoice();
        break;
      case 'edit':
        navigate(`/invoicing/estimates/edit/${estimate.id}`);
        break;
      case 'duplicate':
        handleDuplicate();
        break;
      case 'delete':
        setDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: estimate.currency || 'EUR'
    }).format(amount || 0);
  };

  const STATUS_COLORS = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    accepted: 'bg-green-500',
    declined: 'bg-red-500',
    expired: 'bg-orange-500',
  };

  const SIGNATURE_STATUS_COLORS = {
    none: 'bg-gray-500',
    requested: 'bg-yellow-500',
    signed: 'bg-green-500',
    declined: 'bg-red-500',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              {/* Back Button */}
              <div className="mb-4">
                <button
                  onClick={() => navigate('/invoicing')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Invoicing
                </button>
              </div>

              {/* Title and Actions Row */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {estimate.estimate_number}
                      {estimate.version > 1 && (
                        <span className="ml-3 text-xl text-gray-500 dark:text-gray-400">v{estimate.version}</span>
                      )}
                    </h1>

                    {/* Status Badges */}
                    <div className="flex gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white uppercase ${STATUS_COLORS[estimate.status]}`}>
                        {estimate.status}
                      </span>
                      {estimate.signature_status !== 'none' && (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white uppercase ${SIGNATURE_STATUS_COLORS[estimate.signature_status]}`}>
                          {estimate.signature_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400">
                    Created {new Date(estimate.created_at).toLocaleDateString()} • Valid until {new Date(estimate.valid_until).toLocaleDateString()}
                  </p>

                  {/* Draft Warning */}
                  {estimate.status === 'draft' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">This estimate is in draft mode</span>
                    </div>
                  )}
                </div>

                {/* Primary Action and Dropdown */}
                <div className="flex items-center gap-3 ml-6">
                  {/* Primary Action Button based on status */}
                  {estimate.status === 'draft' && (
                    <button
                      onClick={handlePublish}
                      disabled={publishMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {publishMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Publish Estimate</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Sent status - Quick actions: Send Email or Request Signature */}
                  {estimate.status === 'sent' && (
                    <>
                      {estimate.pdf_file && (
                        <>
                          <button
                            onClick={handleSend}
                            disabled={sendMutation.isPending}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {sendMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Send Email</span>
                              </>
                            )}
                          </button>
                          {estimate.signature_status === 'none' && (
                            <button
                              onClick={() => setSignatureModalOpen(true)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Request Signature</span>
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={handleMarkAccepted}
                        disabled={markAcceptedMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {markAcceptedMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Mark as Accepted</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Accepted status - Convert to Invoice (only if NOT signed) */}
                  {estimate.status === 'accepted' && estimate.signature_status !== 'signed' && (
                    <>
                      {!estimate.pdf_file && (
                        <button
                          onClick={handleGeneratePDF}
                          disabled={generatePDFMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {generatePDFMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>Generate PDF</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={handleConvertToInvoice}
                        disabled={convertToInvoiceMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {convertToInvoiceMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Converting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Convert to Invoice</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Signed status - Convert to Invoice + Download Signed PDF */}
                  {estimate.signature_status === 'signed' && estimate.status !== 'converted' && (
                    <>
                      {estimate.pdf_file && (
                        <button
                          onClick={handleDownloadSignedPDF}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Download Signed PDF</span>
                        </button>
                      )}
                      <button
                        onClick={handleConvertToInvoice}
                        disabled={convertToInvoiceMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {convertToInvoiceMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Converting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Convert to Invoice</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Actions Dropdown */}
                  <DropdownActions estimate={estimate} onAction={handleActionClick} />
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <StatusTimeline
              type="estimate"
              status={estimate.status}
              signatureStatus={estimate.signature_status}
            />

            {/* Estimate Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer & Project Info */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer & Project</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Customer</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{estimate.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Project</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{estimate.project_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Issue Date</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {new Date(estimate.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valid Until</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {new Date(estimate.valid_until).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Line Items</h2>
                  <div className="space-y-3">
                    {estimate.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-start p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.description || item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {item.quantity} {item.unit || 'units'} × {formatCurrency(item.rate)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {estimate.notes && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{estimate.notes}</p>
                  </div>
                )}
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">
                {/* Financial Summary */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Financial Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal HT</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(estimate.subtotal_before_margin)}
                      </span>
                    </div>

                    {estimate.security_margin_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-700 dark:text-yellow-400">
                          Marge ({estimate.security_margin_percentage}%)
                        </span>
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">
                          +{formatCurrency(estimate.security_margin_amount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal après marge</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(estimate.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">TVA ({estimate.tax_rate}%)</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(estimate.tax_amount)}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-gray-100">Total TTC</span>
                      <span className="text-violet-600 dark:text-violet-400">{formatCurrency(estimate.total)}</span>
                    </div>
                  </div>

                  {estimate.tjm_used && estimate.total_days && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">TJM Used</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {formatCurrency(estimate.tjm_used)}/day × {estimate.total_days} days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Signature Request Modal */}
      <ModalBasic
        modalOpen={signatureModalOpen}
        setModalOpen={setSignatureModalOpen}
        title="Request Signature"
      >
        <form onSubmit={handleRequestSignature}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Signer Name *
              </label>
              <input
                type="text"
                required
                value={signatureData.signer_name}
                onChange={(e) => setSignatureData({ ...signatureData, signer_name: e.target.value })}
                className="form-input w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-violet-500 focus:ring-violet-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Signer Email *
              </label>
              <input
                type="email"
                required
                value={signatureData.signer_email}
                onChange={(e) => setSignatureData({ ...signatureData, signer_email: e.target.value })}
                className="form-input w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-violet-500 focus:ring-violet-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company (Optional)
              </label>
              <input
                type="text"
                value={signatureData.signer_company}
                onChange={(e) => setSignatureData({ ...signatureData, signer_company: e.target.value })}
                className="form-input w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-violet-500 focus:ring-violet-500"
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expires At
              </label>
              <input
                type="date"
                value={signatureData.expires_at}
                onChange={(e) => setSignatureData({ ...signatureData, expires_at: e.target.value })}
                className="form-input w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-violet-500 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Modal footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="btn border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestSignatureMutation.isPending}
                className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestSignatureMutation.isPending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>

      {/* Delete Confirmation Modal */}
      <ModalBasic
        modalOpen={deleteModalOpen}
        setModalOpen={setDeleteModalOpen}
        title="Delete Estimate"
      >
        <div className="px-5 py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this estimate? This action cannot be undone.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="btn border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Estimate'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        setIsOpen={(isOpen) => setNotification({ ...notification, isOpen })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}

export default EstimateDetail;
