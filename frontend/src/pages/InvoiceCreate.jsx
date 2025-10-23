import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCreateInvoice,
  useUpdateInvoice,
  useInvoice,
  useCustomers,
  useProjects,
  useNextInvoiceNumber,
} from '../api/hooks';
import InvoicePDFPreview from '../components/InvoicePDFPreview';
import CustomerProjectSelector from '../components/CustomerProjectSelector';

function InvoiceCreate() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const UNIT_OPTIONS = [
    { value: 'hours', label: t('invoices.form.units.hours'), shortLabel: 'h' },
    { value: 'days', label: t('invoices.form.units.days'), shortLabel: 'j' },
    { value: 'units', label: t('invoices.form.units.units'), shortLabel: 'u' },
    { value: 'fixed', label: t('invoices.form.units.fixed'), shortLabel: t('invoices.form.units.fixedShort') },
  ];

  const { data: invoice } = useInvoice(id, { enabled: isEditing });
  const { data: customersData } = useCustomers();
  const { data: projectsData } = useProjects();
  const { data: nextNumberData } = useNextInvoiceNumber({ enabled: !isEditing });

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  const customers = customersData?.results || [];
  const projects = projectsData?.results || [];

  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    tax_rate: 20,
    total: 0,
    currency: 'EUR',
    status: 'draft',
    notes: '',
    terms: '',
    payment_terms: 'Payment due within 30 days',
  });

  const [saveStatus, setSaveStatus] = useState('saved');

  // Auto-fill next invoice number
  useEffect(() => {
    if (!isEditing && nextNumberData?.invoice_number && !formData.invoice_number) {
      setFormData(prev => ({
        ...prev,
        invoice_number: nextNumberData.invoice_number
      }));
    }
  }, [nextNumberData, isEditing]);

  // Load invoice data if editing
  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        // Ensure numeric fields are properly typed
        subtotal: Number(invoice.subtotal) || 0,
        total: Number(invoice.total) || 0,
        tax_rate: Number(invoice.tax_rate) || 20,
        items: invoice.items || [],
      });
    }
  }, [invoice]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        name: '',
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
        unit: 'hours'
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

    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items = formData.items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = (subtotal * formData.tax_rate) / 100;
    const total = subtotal + tax;

    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      total
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      navigate('/invoicing');
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Failed to save invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(formData.customer));
  const selectedProject = projects.find(p => p.id === parseInt(formData.project));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/invoicing')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('common.back')}
              </button>

              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {isEditing ? t('invoices.form.editTitle') : t('invoices.form.newTitle')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {formData.invoice_number || t('invoices.form.notSavedYet')}
                </p>
              </div>
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-500 border-t-transparent"></div>
                  {t('common.saving')}
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t('invoices.form.saved')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer & Project Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('invoices.form.customerAndProject')}</h2>

                <CustomerProjectSelector
                  customers={customers}
                  projects={projects}
                  selectedCustomer={formData.customer}
                  selectedProject={formData.project}
                  onCustomerChange={(customerId) => setFormData({ ...formData, customer: customerId })}
                  onProjectChange={(projectId) => setFormData({ ...formData, project: projectId })}
                />
              </div>

              {/* Invoice Details */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('invoices.form.invoiceDetails')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('invoices.form.invoiceNumber')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100"
                      placeholder={t('invoices.form.invoiceNumberPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('invoices.form.issueDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('invoices.form.dueDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('invoices.form.lineItems')}</h2>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('invoices.form.addItem')}
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder={t('invoices.form.description')}
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            placeholder={t('invoices.form.quantity')}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                          >
                            {UNIT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder={t('invoices.form.rate')}
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              €{(Number(item.amount) || 0).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p className="text-sm">{t('invoices.form.noItemsYet')}</p>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        {t('invoices.form.addFirstItem')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('invoices.form.totals')}</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('invoices.form.subtotalHT')}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      €{(Number(formData.subtotal) || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">{t('invoices.form.tva')}</span>
                      <input
                        type="number"
                        value={formData.tax_rate}
                        onChange={(e) => {
                          setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 });
                          calculateTotals();
                        }}
                        className="w-16 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-gray-600 dark:text-gray-400">%</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      €{(((Number(formData.subtotal) || 0) * (Number(formData.tax_rate) || 0)) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-gray-100">{t('invoices.form.totalTTC')}</span>
                    <span className="text-violet-600 dark:text-violet-400">
                      €{(Number(formData.total) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('invoices.form.additionalInformation')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('invoices.form.paymentTerms')}
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder={t('invoices.form.paymentTermsPlaceholder')}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('invoices.form.notes')}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      placeholder={t('invoices.form.notesPlaceholder')}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('invoices.form.terms')}
                    </label>
                    <textarea
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      rows="3"
                      placeholder={t('invoices.form.termsPlaceholder')}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/invoicing')}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('invoices.form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {t('invoices.form.saving')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditing ? t('invoices.form.updateInvoice') : t('invoices.form.createInvoice')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - PDF Preview */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <InvoicePDFPreview
              formData={formData}
              customer={selectedCustomer}
              project={selectedProject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceCreate;
