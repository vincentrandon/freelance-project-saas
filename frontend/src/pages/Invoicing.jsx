import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInvoices,
  useEstimates,
  useInvoiceStats,
  useCreateInvoice,
  useCreateEstimate,
  useSendInvoice,
  useSendEstimate,
  useMarkInvoicePaid,
  useCustomers,
  useProjects,
  useProfile,
  usePricingSettings,
  useApplySecurityMargin,
  useSuggestMargin,
  useConvertToTJM,
  useAIGenerateEstimate,
  useRequestSignature,
} from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ModalBasic from '../components/ModalBasic';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

function Invoicing() {
  const navigate = useNavigate();
  const { data: invoicesData = {} } = useInvoices();
  const { data: estimatesData = {} } = useEstimates();
  const { data: stats } = useInvoiceStats();
  const { data: customersData } = useCustomers();
  const { data: projectsData } = useProjects();
  const { data: profile } = useProfile();
  const { data: pricingSettings } = usePricingSettings();

  const createInvoiceMutation = useCreateInvoice();
  const createEstimateMutation = useCreateEstimate();
  const sendInvoiceMutation = useSendInvoice();
  const sendEstimateMutation = useSendEstimate();
  const markPaidMutation = useMarkInvoicePaid();
  const applyMarginMutation = useApplySecurityMargin();
  const suggestMarginMutation = useSuggestMargin();
  const convertToTJMMutation = useConvertToTJM();
  const aiGenerateMutation = useAIGenerateEstimate();
  const requestSignatureMutation = useRequestSignature();

  const customers = customersData?.results || [];
  const projects = projectsData?.results || [];

  const [activeTab, setActiveTab] = useState('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [marginSuggestion, setMarginSuggestion] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');

  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    invoice_number: '',
    estimate_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    subtotal_before_margin: 0,
    security_margin_percentage: pricingSettings?.default_security_margin || 10,
    security_margin_amount: 0,
    tjm_used: null,
    total_days: null,
    tax_rate: 20,
    total: 0,
    currency: 'EUR',
    status: 'draft',
    notes: '',
    terms: '',
    pricing_mode: 'hourly', // 'hourly' or 'tjm'
  });

  const invoices = invoicesData.results || [];
  const estimates = estimatesData.results || [];

  // Filter invoices and estimates
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = estimate.display_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         estimate.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count by status for invoices
  const invoiceStatusCounts = {
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  // Count by status for estimates
  const estimateStatusCounts = {
    all: estimates.length,
    draft: estimates.filter(e => e.status === 'draft').length,
    sent: estimates.filter(e => e.status === 'sent').length,
    accepted: estimates.filter(e => e.status === 'accepted').length,
    declined: estimates.filter(e => e.status === 'declined').length,
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        name: '',
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
        unit: formData.pricing_mode === 'tjm' ? 'jour' : 'heure'
      }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items = formData.items) => {
    const subtotalBeforeMargin = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const marginAmount = (subtotalBeforeMargin * formData.security_margin_percentage) / 100;
    const subtotal = subtotalBeforeMargin + marginAmount;
    const tax = (subtotal * formData.tax_rate) / 100;
    const total = subtotal + tax;

    setFormData(prev => ({
      ...prev,
      items,
      subtotal_before_margin: subtotalBeforeMargin,
      security_margin_amount: marginAmount,
      subtotal,
      total
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'invoices') {
        await createInvoiceMutation.mutateAsync(formData);
      } else {
        await createEstimateMutation.mutateAsync(formData);
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating:', err);
    }
  };

  const handleAIGenerate = async (e) => {
    e.preventDefault();
    try {
      const result = await aiGenerateMutation.mutateAsync({
        prompt: aiPrompt,
        customer: formData.customer,
        project: formData.project,
      });

      // Populate form with AI-generated data
      setFormData({
        ...formData,
        items: result.data.items || [],
        notes: result.data.notes || '',
        security_margin_percentage: result.data.suggested_margin || formData.security_margin_percentage,
        tjm_used: result.data.tjm_used || null,
        total_days: result.data.total_days || null,
      });

      calculateTotals(result.data.items || []);
      setAiModalOpen(false);
      setModalOpen(true);
    } catch (err) {
      console.error('Error generating estimate:', err);
    }
  };

  const handleSuggestMargin = async () => {
    try {
      const result = await suggestMarginMutation.mutateAsync({
        estimate_id: formData.id,
        project_description: formData.notes,
        customer_type: 'existing',
      });
      setMarginSuggestion(result.data);
    } catch (err) {
      console.error('Error suggesting margin:', err);
    }
  };

  const handleConvertToTJM = () => {
    const tjmRate = pricingSettings?.tjm_default || 500;
    const hoursPerDay = pricingSettings?.tjm_hours_per_day || 7;

    const newItems = formData.items.map(item => {
      const hours = item.quantity;
      const days = hours / hoursPerDay;
      return {
        ...item,
        quantity: parseFloat(days.toFixed(2)),
        rate: tjmRate,
        amount: parseFloat((days * tjmRate).toFixed(2)),
        unit: 'jour'
      };
    });

    const totalDays = newItems.reduce((sum, item) => sum + item.quantity, 0);

    setFormData({
      ...formData,
      items: newItems,
      pricing_mode: 'tjm',
      tjm_used: tjmRate,
      total_days: totalDays,
    });

    calculateTotals(newItems);
  };

  const handleRequestSignature = async (estimateId) => {
    const estimate = estimates.find(e => e.id === estimateId);
    const customer = customers.find(c => c.id === estimate.customer);

    if (!customer) {
      alert('Customer information not found');
      return;
    }

    try {
      await requestSignatureMutation.mutateAsync({
        estimate_id: estimateId,
        signer_name: customer.name,
        signer_email: customer.email,
        signature_method: 'digital',
      });
      alert('Signature request sent successfully!');
    } catch (err) {
      console.error('Error requesting signature:', err);
      alert('Failed to send signature request');
    }
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      project: '',
      invoice_number: '',
      estimate_number: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      subtotal: 0,
      subtotal_before_margin: 0,
      security_margin_percentage: pricingSettings?.default_security_margin || 10,
      security_margin_amount: 0,
      tjm_used: null,
      total_days: null,
      tax_rate: 20,
      total: 0,
      currency: 'EUR',
      status: 'draft',
      notes: '',
      terms: '',
      pricing_mode: 'hourly',
    });
    setMarginSuggestion(null);
  };

  const STATUS_COLORS = {
    draft: 'bg-gray-600',
    sent: 'bg-blue-600',
    paid: 'bg-green-600',
    overdue: 'bg-red-600',
    cancelled: 'bg-gray-500',
    accepted: 'bg-green-600',
    declined: 'bg-red-600',
    expired: 'bg-gray-500',
    pending: 'bg-yellow-600',
  };

  const SIGNATURE_STATUS_COLORS = {
    not_requested: 'bg-gray-600',
    pending: 'bg-yellow-600',
    signed: 'bg-green-600',
    declined: 'bg-red-600',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">Invoicing</h1>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (activeTab === 'estimates') {
                        navigate('/invoicing/estimates/create');
                      } else {
                        navigate('/invoicing/invoices/create');
                      }
                    }}
                    className="btn bg-violet-500 hover:bg-violet-600 text-white"
                  >
                    + New {activeTab === 'invoices' ? 'Invoice' : 'Estimate'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Total Invoices</p>
                    <p className="text-2xl font-bold text-gray-100">{stats.total_invoices}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">${(stats.total_revenue / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 border border-green-800">
                    <p className="text-gray-400 text-sm">Paid</p>
                    <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800">
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
                  </div>
                  <div className="bg-red-900/30 rounded-lg p-4 border border-red-800">
                    <p className="text-gray-400 text-sm">Overdue</p>
                    <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-700">
              <button
                onClick={() => {
                  setActiveTab('invoices');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className={`pb-4 px-4 font-semibold transition ${
                  activeTab === 'invoices'
                    ? 'text-violet-500 border-b-2 border-violet-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Invoices
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-400">
                  {invoices.length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('estimates');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className={`pb-4 px-4 font-semibold transition ${
                  activeTab === 'estimates'
                    ? 'text-violet-500 border-b-2 border-violet-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Estimates
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-400">
                  {estimates.length}
                </span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab} by number or customer...`}
                className="w-full max-w-md px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-gray-100 placeholder-gray-500 transition-all duration-200"
              />

              {/* Status Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {activeTab === 'invoices' ? (
                  [
                    { key: 'all', label: 'All' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'sent', label: 'Sent' },
                    { key: 'paid', label: 'Paid' },
                    { key: 'overdue', label: 'Overdue' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                        statusFilter === key
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      {label}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        statusFilter === key
                          ? 'bg-violet-700 text-violet-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {invoiceStatusCounts[key]}
                      </span>
                    </button>
                  ))
                ) : (
                  [
                    { key: 'all', label: 'All' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'sent', label: 'Sent' },
                    { key: 'accepted', label: 'Accepted' },
                    { key: 'declined', label: 'Declined' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                        statusFilter === key
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      {label}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        statusFilter === key
                          ? 'bg-violet-700 text-violet-200'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {estimateStatusCounts[key]}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Content */}
            {activeTab === 'invoices' ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Issue Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12">
                          {searchQuery || statusFilter !== 'all' ? (
                            <EmptyState.SearchResults />
                          ) : (
                            <EmptyState.Invoices onAction={() => setModalOpen(true)} />
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-100">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{invoice.customer_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{invoice.project_name || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(invoice.issue_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-gray-100">
                            {invoice.total.toLocaleString()} {invoice.currency}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge.Invoice status={invoice.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/invoicing/invoices/${invoice.id}`)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                                title="View details"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => navigate(`/invoicing/invoices/edit/${invoice.id}`)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                                  title="Edit invoice"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              )}
                              {invoice.status !== 'paid' && invoice.status !== 'sent' && (
                                <button
                                  onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-md transition-colors"
                                  title="Send invoice"
                                  disabled={sendInvoiceMutation.isPending}
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Send
                                </button>
                              )}
                              {invoice.status === 'sent' && (
                                <button
                                  onClick={() => markPaidMutation.mutate(invoice.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors"
                                  title="Mark as paid"
                                  disabled={markPaidMutation.isPending}
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Mark Paid
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
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">TJM/Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Valid Until</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Signature</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredEstimates.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-12">
                          {searchQuery || statusFilter !== 'all' ? (
                            <EmptyState.SearchResults />
                          ) : (
                            <EmptyState.Estimates onAction={() => navigate('/invoicing/estimates/create')} />
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredEstimates.map((estimate) => (
                        <tr key={estimate.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-100">
                            {estimate.display_number}
                            {estimate.is_draft && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">DRAFT</span>
                            )}
                            {estimate.version > 1 && (
                              <span className="ml-2 text-xs text-gray-400">v{estimate.version}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{estimate.customer_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{estimate.project_name || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {estimate.tjm_used ? (
                              <span className="text-blue-400">
                                {estimate.tjm_used} EUR × {estimate.total_days}j
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(estimate.valid_until).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-gray-100">
                            {estimate.total.toLocaleString()} {estimate.currency}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge.Estimate status={estimate.status} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge.Signature
                              status={estimate.signature_status === 'not_requested' ? 'none' : estimate.signature_status}
                              label={estimate.signature_status === 'not_requested' ? 'No' : estimate.signature_status}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/invoicing/estimates/${estimate.id}`)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                                title="View details"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <button
                                onClick={() => navigate(`/invoicing/estimates/edit/${estimate.id}`)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                                title="Edit estimate"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              {estimate.status !== 'sent' && (
                                <button
                                  onClick={() => sendEstimateMutation.mutate(estimate.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-md transition-colors"
                                  title="Send estimate"
                                  disabled={sendEstimateMutation.isPending}
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Send
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
            )}
          </div>
        </main>
      </div>

      {/* Create Invoice Modal */}
      <ModalBasic
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        title="New Invoice"
      >
        <form onSubmit={handleCreateInvoice}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Customer *</label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="form-select w-full bg-gray-700 text-gray-100 border-gray-600"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                <select
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="form-select w-full bg-gray-700 text-gray-100 border-gray-600"
                >
                  <option value="">No project</option>
                  {projects.filter(p => formData.customer ? p.customer.toString() === formData.customer.toString() : true).map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {activeTab === 'invoices' ? 'Invoice' : 'Estimate'} Number *
                </label>
                <input
                  type="text"
                  required
                  value={activeTab === 'invoices' ? formData.invoice_number : formData.estimate_number}
                  onChange={(e) => setFormData({
                    ...formData,
                    [activeTab === 'invoices' ? 'invoice_number' : 'estimate_number']: e.target.value
                  })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {activeTab === 'invoices' ? 'Due Date' : 'Valid Until'}
                </label>
                <input
                  type="date"
                  value={activeTab === 'invoices' ? formData.due_date : formData.valid_until}
                  onChange={(e) => setFormData({
                    ...formData,
                    [activeTab === 'invoices' ? 'due_date' : 'valid_until']: e.target.value
                  })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
            </div>

            {activeTab === 'estimates' && (
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-200">Pricing Mode</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pricing_mode: 'hourly', tjm_used: null })}
                      className={`px-3 py-1 rounded text-sm ${
                        formData.pricing_mode === 'hourly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      Hourly
                    </button>
                    <button
                      type="button"
                      onClick={handleConvertToTJM}
                      className={`px-3 py-1 rounded text-sm ${
                        formData.pricing_mode === 'tjm'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      TJM (Daily Rate)
                    </button>
                  </div>
                </div>
                {formData.pricing_mode === 'tjm' && formData.tjm_used && (
                  <p className="text-xs text-blue-300">
                    Using TJM: {formData.tjm_used} EUR/day × {formData.total_days?.toFixed(1)} days
                  </p>
                )}
              </div>
            )}

            {/* Line Items */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">Line Items</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  + Add Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="col-span-5 form-input bg-gray-700 text-gray-100 border-gray-600 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="col-span-2 form-input bg-gray-700 text-gray-100 border-gray-600 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-2 form-input bg-gray-700 text-gray-100 border-gray-600 text-sm"
                  />
                  <div className="col-span-2 flex items-center text-sm text-gray-300 font-semibold">
                    {item.amount.toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="col-span-1 text-red-400 hover:text-red-300 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal (before margin):</span>
                <span className="text-gray-100 font-semibold">
                  {formData.subtotal_before_margin.toFixed(2)} {formData.currency}
                </span>
              </div>

              {activeTab === 'estimates' && (
                <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">Security Margin:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.security_margin_percentage}
                      onChange={(e) => {
                        const newMargin = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, security_margin_percentage: newMargin });
                        calculateTotals();
                      }}
                      className="w-16 form-input bg-gray-700 text-gray-100 border-gray-600 text-sm py-1"
                    />
                    <span className="text-gray-400">%</span>
                    {marginSuggestion && (
                      <button
                        type="button"
                        onClick={handleSuggestMargin}
                        className="text-xs text-purple-400 hover:text-purple-300"
                        disabled={suggestMarginMutation.isPending}
                      >
                        ✨ AI Suggest
                      </button>
                    )}
                  </div>
                  <span className="text-yellow-400 font-semibold">
                    +{formData.security_margin_amount.toFixed(2)} {formData.currency}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
                <span className="text-gray-400">Subtotal (after margin):</span>
                <span className="text-gray-100 font-semibold">
                  {formData.subtotal.toFixed(2)} {formData.currency}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Tax:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tax_rate}
                    onChange={(e) => {
                      setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 });
                      calculateTotals();
                    }}
                    className="w-16 form-input bg-gray-700 text-gray-100 border-gray-600 text-sm py-1"
                  />
                  <span className="text-gray-400">%</span>
                </div>
                <span className="text-gray-100">
                  {((formData.subtotal * formData.tax_rate) / 100).toFixed(2)} {formData.currency}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold border-t-2 border-gray-700 pt-2">
                <span className="text-gray-100">Total:</span>
                <span className="text-violet-400">
                  {formData.total.toFixed(2)} {formData.currency}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn bg-gray-700 hover:bg-gray-600 text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending || createEstimateMutation.isPending}
              className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </ModalBasic>
    </div>
  );
}

export default Invoicing;
