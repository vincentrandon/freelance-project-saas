import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInvoice,
  useSendInvoice,
  useMarkInvoicePaid,
  useUpdateInvoice,
  useDeleteInvoice,
  useDuplicateInvoice,
  useGenerateInvoicePDF,
  useCreateCreditNote,
  useCreateDepositInvoice,
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
    <ModalBasic modalOpen={isOpen} setModalOpen={setIsOpen} title={title}>
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

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [paymentData, setPaymentData] = useState({
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
  });
  const [depositData, setDepositData] = useState({
    deposit_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    deposit_percentage: '',
  });

  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const { data: invoice, isLoading } = useInvoice(id);
  const sendMutation = useSendInvoice();
  const markPaidMutation = useMarkInvoicePaid();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const duplicateMutation = useDuplicateInvoice();
  const generatePDFMutation = useGenerateInvoicePDF();
  const createCreditNoteMutation = useCreateCreditNote();
  const createDepositInvoiceMutation = useCreateDepositInvoice();

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

  if (!invoice) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Invoice not found</h2>
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

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync(invoice.id);
      showNotification('success', 'Success', 'Invoice sent successfully via email!');
    } catch (err) {
      console.error('Error sending invoice:', err);
      showNotification('error', 'Error', 'Failed to send invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkPaid = async () => {
    try {
      await markPaidMutation.mutateAsync(invoice.id);
      showNotification('success', 'Success', 'Invoice marked as paid!');
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      showNotification('error', 'Error', 'Failed to mark invoice as paid: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      // Calculate new paid amount (accumulate with previous payments)
      const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(paymentData.payment_amount);

      // Send complete invoice data with updated payment fields
      await updateMutation.mutateAsync({
        id: invoice.id,
        data: {
          ...invoice,
          paid_amount: newPaidAmount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          // Update status to paid if fully paid
          status: newPaidAmount >= invoice.total ? 'paid' : invoice.status,
        }
      });
      setPaymentModalOpen(false);
      setPaymentData({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
      });
      showNotification('success', 'Success', 'Payment recorded successfully!');
    } catch (err) {
      console.error('Error recording payment:', err);
      showNotification('error', 'Error', 'Failed to record payment: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async () => {
    try {
      const result = await createCreditNoteMutation.mutateAsync({
        invoiceId: invoice.id,
        reason: creditNoteReason
      });
      setDeleteModalOpen(false);
      setCreditNoteReason('');
      showNotification('success', 'Success', 'Credit note created successfully! The original invoice has been cancelled.');
      // Navigate to the credit note after a short delay
      setTimeout(() => {
        if (result.data?.id) {
          navigate(`/invoicing/invoices/${result.data.id}`);
        } else {
          navigate('/invoicing');
        }
      }, 2000);
    } catch (err) {
      console.error('Error creating credit note:', err);
      showNotification('error', 'Error', 'Failed to create credit note: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateDepositInvoice = async (e) => {
    e.preventDefault();
    try {
      const result = await createDepositInvoiceMutation.mutateAsync({
        invoiceId: invoice.id,
        deposit_amount: parseFloat(depositData.deposit_amount),
        payment_date: depositData.payment_date,
        payment_method: depositData.payment_method,
        deposit_percentage: depositData.deposit_percentage ? parseFloat(depositData.deposit_percentage) : null
      });
      setDepositModalOpen(false);
      setDepositData({
        deposit_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        deposit_percentage: '',
      });

      // Check if SOLDE invoice was created
      if (result.data?.created_solde_invoice) {
        showNotification(
          'success',
          'Payment Complete!',
          `Deposit invoice created. Balance reached 0€ - Final balance invoice ${result.data.solde_invoice_number} generated automatically!`
        );
        // Navigate to SOLDE invoice to show the complete picture
        setTimeout(() => {
          if (result.data?.solde_invoice_id) {
            navigate(`/invoicing/invoices/${result.data.solde_invoice_id}`);
          }
        }, 3000);
      } else {
        showNotification('success', 'Success', 'Deposit invoice (Facture d\'acompte) created successfully!');
        // Navigate to the deposit invoice after a short delay
        setTimeout(() => {
          if (result.data?.deposit_invoice?.id) {
            navigate(`/invoicing/invoices/${result.data.deposit_invoice.id}`);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Error creating deposit invoice:', err);
      showNotification('error', 'Error', 'Failed to create deposit invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleActionClick = async (action) => {
    switch (action) {
      case 'generate-pdf':
        try {
          await generatePDFMutation.mutateAsync({ invoiceId: invoice.id });
          showNotification('success', 'Success', 'PDF generated successfully!');
        } catch (err) {
          console.error('Error generating PDF:', err);
          showNotification('error', 'Error', 'Failed to generate PDF: ' + (err.response?.data?.error || err.message));
        }
        break;

      case 'view-pdf':
        if (invoice.pdf_file) {
          window.open(invoice.pdf_file, '_blank');
        }
        break;

      case 'send-email':
        handleSend();
        break;

      case 'edit':
        navigate(`/invoicing/invoices/edit/${invoice.id}`);
        break;

      case 'duplicate':
        try {
          const result = await duplicateMutation.mutateAsync(invoice.id);
          showNotification('success', 'Success', 'Invoice duplicated successfully!');
          if (result.data?.id) {
            setTimeout(() => navigate(`/invoicing/invoices/${result.data.id}`), 1500);
          }
        } catch (err) {
          console.error('Error duplicating invoice:', err);
          showNotification('error', 'Error', 'Failed to duplicate invoice: ' + (err.response?.data?.error || err.message));
        }
        break;

      case 'delete':
        setDeleteModalOpen(true);
        break;

      case 'record-payment':
        // Calculate remaining balance (total - already paid)
        const remainingBalance = (invoice.total || 0) - (invoice.paid_amount || 0);
        setPaymentData({
          payment_amount: remainingBalance.toFixed(2),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
        });
        setPaymentModalOpen(true);
        break;

      case 'generate-deposit-invoice':
        // Calculate remaining balance after existing deposits
        const remainingAfterDeposits = Number(invoice.remaining_balance || invoice.total || 0);
        setDepositData({
          deposit_amount: remainingAfterDeposits.toFixed(2),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          deposit_percentage: '',
        });
        setDepositModalOpen(true);
        break;

      default:
        console.log('Unknown action:', action);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: invoice.currency || 'EUR'
    }).format(amount || 0);
  };

  const STATUS_COLORS = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    paid: 'bg-green-500',
    overdue: 'bg-red-500',
    cancelled: 'bg-gray-500',
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
                      {invoice.invoice_number}
                    </h1>

                    {/* Status Badge */}
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white uppercase ${STATUS_COLORS[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400">
                    Created {new Date(invoice.created_at).toLocaleDateString()} • Due {new Date(invoice.due_date).toLocaleDateString()}
                  </p>

                  {/* Draft Warning */}
                  {invoice.status === 'draft' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">This invoice is in draft mode</span>
                    </div>
                  )}

                  {/* Overdue Warning */}
                  {invoice.status === 'overdue' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">This invoice is overdue</span>
                    </div>
                  )}

                  {/* SOLDE Invoice Banner */}
                  {invoice.is_final_balance_invoice && (
                    <div className="mt-3 inline-flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                      <span className="text-2xl">📊</span>
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">Final Balance Invoice (Facture de Solde)</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          This invoice consolidates all deposit payments made on invoice{' '}
                          <a
                            href={`/invoicing/invoices/${invoice.parent_invoice}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/invoicing/invoices/${invoice.parent_invoice}`);
                            }}
                            className="font-medium underline hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            {invoice.parent_invoice_number}
                          </a>
                          . The full amount has been settled through progressive deposits.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action and Dropdown */}
                <div className="flex items-center gap-3 ml-6">
                  {/* Draft status - Publish button */}
                  {invoice.status === 'draft' && (
                    <button
                      onClick={async () => {
                        try {
                          await updateMutation.mutateAsync({
                            id: invoice.id,
                            data: { ...invoice, status: 'sent' }
                          });
                          showNotification('success', 'Success', 'Invoice published successfully!');
                        } catch (err) {
                          showNotification('error', 'Error', 'Failed to publish invoice: ' + (err.response?.data?.error || err.message));
                        }
                      }}
                      disabled={updateMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Publish Invoice</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Sent status - Quick actions: Send Email + Record Payment */}
                  {invoice.status === 'sent' && !invoice.is_deposit_invoice && !invoice.is_credit_note && (
                    <>
                      {invoice.pdf_file && (
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
                      )}
                      <button
                        onClick={() => handleActionClick('record-payment')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Record Payment</span>
                      </button>
                      <button
                        onClick={handleMarkPaid}
                        disabled={markPaidMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {markPaidMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Mark as Paid</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Overdue status - Record Payment */}
                  {invoice.status === 'overdue' && !invoice.is_deposit_invoice && !invoice.is_credit_note && (
                    <>
                      <button
                        onClick={() => handleActionClick('record-payment')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Record Payment</span>
                      </button>
                      <button
                        onClick={handleMarkPaid}
                        disabled={markPaidMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {markPaidMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Mark as Paid</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Partially invoiced status - Generate Deposit Invoice */}
                  {invoice.status === 'partially_invoiced' && !invoice.is_deposit_invoice && !invoice.is_credit_note && (
                    <button
                      onClick={() => handleActionClick('generate-deposit-invoice')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                      </svg>
                      <span>Generate Deposit Invoice</span>
                    </button>
                  )}

                  {/* Actions Dropdown */}
                  <DropdownActions invoice={invoice} onAction={handleActionClick} />
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <StatusTimeline
              type="invoice"
              status={invoice.status}
              isDeposit={invoice.is_deposit_invoice}
              isCreditNote={invoice.is_credit_note}
              isPartiallyInvoiced={invoice.status === 'partially_invoiced' || (invoice.deposit_invoices_list && invoice.deposit_invoices_list.length > 0)}
            />

            {/* Invoice Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer & Project Info */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer & Project</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Customer</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{invoice.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Project</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{invoice.project_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Issue Date</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {new Date(invoice.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deposit Invoices Section */}
                {invoice.deposit_invoices_list && invoice.deposit_invoices_list.length > 0 && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      Deposit Invoices (Acomptes Émis)
                    </h2>
                    <div className="space-y-2">
                      {invoice.deposit_invoices_list.map(deposit => (
                        <div key={deposit.id} className="flex justify-between items-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-800">
                          <div>
                            <a
                              href={`/invoicing/invoices/${deposit.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/invoicing/invoices/${deposit.id}`);
                              }}
                              className="font-medium text-orange-700 dark:text-orange-300 hover:underline"
                            >
                              {deposit.invoice_number}
                            </a>
                            <span className="text-sm text-orange-600 dark:text-orange-400 ml-2">
                              ({deposit.percentage.toFixed(0)}% • {deposit.issue_date})
                            </span>
                          </div>
                          <span className="font-semibold text-orange-900 dark:text-orange-100">
                            {formatCurrency(deposit.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t-2 border-orange-300 dark:border-orange-700 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-orange-800 dark:text-orange-200">Total Deposits:</span>
                          <span className="font-semibold text-orange-900 dark:text-orange-100">
                            -{formatCurrency(invoice.total_deposits_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100">Remaining Balance (Solde):</span>
                          <span className="font-bold text-xl text-violet-600 dark:text-violet-400">
                            {formatCurrency(invoice.remaining_balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Line Items</h2>
                  <div className="space-y-3">
                    {invoice.items?.map((item, index) => (
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
                {invoice.notes && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
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
                        {formatCurrency(invoice.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">TVA ({invoice.tax_rate}%)</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency((invoice.subtotal * invoice.tax_rate) / 100)}
                      </span>
                    </div>

                    <div className="flex justify-between text-base font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-gray-100">Total TTC</span>
                      <span className="text-violet-600 dark:text-violet-400">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>

                    {/* Déductions (Acomptes versés) - Deposit Deductions */}
                    {invoice.deposit_invoices_list && invoice.deposit_invoices_list.length > 0 ? (
                      <>
                        <div className="pt-3 border-t-2 border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10 -mx-6 px-6 py-3 mt-3">
                          <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-1">
                            <span>💰</span>
                            Déductions (Acomptes versés):
                          </h3>
                          <div className="space-y-1.5">
                            {invoice.deposit_invoices_list.map(deposit => (
                              <div key={deposit.id} className="flex justify-between text-sm text-orange-700 dark:text-orange-300">
                                <span>
                                  <a
                                    href={`/invoicing/invoices/${deposit.id}`}
                                    className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigate(`/invoicing/invoices/${deposit.id}`);
                                    }}
                                  >
                                    {deposit.invoice_number}
                                  </a>
                                  <span className="ml-1 text-xs">
                                    ({new Date(deposit.issue_date).toLocaleDateString('fr-FR')})
                                  </span>
                                </span>
                                <span className="font-semibold text-orange-700 dark:text-orange-300">
                                  -{formatCurrency(deposit.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm font-bold text-orange-800 dark:text-orange-200 mt-2 pt-2 border-t border-orange-300 dark:border-orange-700">
                            <span>Total acomptes:</span>
                            <span>
                              -{formatCurrency(invoice.total_deposits_amount)}
                            </span>
                          </div>
                        </div>

                        {/* SOLDE À PAYER - Remaining Balance */}
                        <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                          <span className="text-gray-900 dark:text-gray-100">SOLDE À PAYER:</span>
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(invoice.remaining_balance)}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Fallback for invoices without deposit system - show regular paid_amount */
                      invoice.paid_amount > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <span>Amount Paid</span>
                            <span className="font-medium">
                              -{formatCurrency(invoice.paid_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-bold text-red-600 dark:text-red-400">
                            <span>Balance Due</span>
                            <span>
                              {formatCurrency(invoice.total - invoice.paid_amount)}
                            </span>
                          </div>
                        </>
                      )
                    )}
                  </div>

                  {invoice.pdf_file && (
                    <div className="mt-4">
                      <a
                        href={invoice.pdf_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                      >
                        View PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Payment Modal */}
      <ModalBasic modalOpen={paymentModalOpen} setModalOpen={setPaymentModalOpen} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="p-5">
          <div className="space-y-4">
            {/* Show remaining balance info */}
            {invoice && (invoice.paid_amount > 0) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold">Invoice Balance</p>
                  <p className="mt-1">
                    Total: {formatCurrency(invoice.total)} |
                    Paid: {formatCurrency(invoice.paid_amount)} |
                    Remaining: {formatCurrency(invoice.total - invoice.paid_amount)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentData.payment_amount}
                onChange={(e) => setPaymentData({ ...paymentData, payment_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You can enter a partial payment amount if needed
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </ModalBasic>

      {/* Credit Note Confirmation Modal */}
      <ModalBasic modalOpen={deleteModalOpen} setModalOpen={setDeleteModalOpen} title="Cancel Invoice - Create Credit Note">
        <div className="p-4">
          {/* French Law Explanation */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">French Law Compliance</p>
                <p>According to French law, invoices cannot be deleted once issued. Instead, a credit note (facture d'avoir) with negative amounts will be created to cancel this invoice.</p>
              </div>
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This will create a credit note to cancel invoice <strong>{invoice?.invoice_number}</strong> and mark it as cancelled.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={creditNoteReason}
              onChange={(e) => setCreditNoteReason(e.target.value)}
              rows="3"
              required
              placeholder="e.g., Customer request, Billing error, Project cancelled..."
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setCreditNoteReason('');
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!creditNoteReason.trim() || createCreditNoteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createCreditNoteMutation.isPending ? 'Creating Credit Note...' : 'Create Credit Note'}
            </button>
          </div>
        </div>
      </ModalBasic>

      {/* Deposit Invoice Modal */}
      <ModalBasic modalOpen={depositModalOpen} setModalOpen={setDepositModalOpen} title="Generate Deposit Invoice (Facture d'Acompte)">
        <form onSubmit={handleCreateDepositInvoice} className="p-5">
          <div className="space-y-4">
            {/* French Law Explanation */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">French Law - Article 289 CGI</p>
                  <p>Every deposit payment must have a corresponding "facture d'acompte" with TVA calculated. This will generate invoice number ACOMPTE-YYYY-NNNN.</p>
                </div>
              </div>
            </div>

            {/* Show existing deposits and remaining balance */}
            {invoice && invoice.deposit_invoices_list && invoice.deposit_invoices_list.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Deposits:</p>
                {invoice.deposit_invoices_list.map((dep, idx) => (
                  <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    {dep.invoice_number}: {formatCurrency(dep.amount)} ({dep.percentage.toFixed(0)}%)
                  </p>
                ))}
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                  Remaining Balance: {formatCurrency(invoice.remaining_balance)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deposit Amount (TTC) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={depositData.deposit_amount}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  const percentage = invoice.total > 0 ? (amount / invoice.total) * 100 : 0;
                  setDepositData({
                    ...depositData,
                    deposit_amount: e.target.value,
                    deposit_percentage: percentage.toFixed(2)
                  });
                }}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                = {depositData.deposit_percentage || '0'}% of total invoice
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Amount including VAT (TTC). TVA will be calculated automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deposit Percentage
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={depositData.deposit_percentage}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  const amount = (percentage / 100) * invoice.total;
                  setDepositData({
                    ...depositData,
                    deposit_percentage: e.target.value,
                    deposit_amount: amount.toFixed(2)
                  });
                }}
                placeholder="e.g., 30 for 30%"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                = {formatCurrency(depositData.deposit_amount || 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Both fields auto-calculate each other
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={depositData.payment_date}
                onChange={(e) => setDepositData({ ...depositData, payment_date: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={depositData.payment_method}
                onChange={(e) => setDepositData({ ...depositData, payment_method: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDepositModalOpen(false)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDepositInvoiceMutation.isPending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createDepositInvoiceMutation.isPending ? 'Creating...' : 'Generate Deposit Invoice'}
            </button>
          </div>
        </form>
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

export default InvoiceDetail;
