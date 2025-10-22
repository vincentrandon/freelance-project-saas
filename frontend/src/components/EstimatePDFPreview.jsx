import React from 'react';

function EstimatePDFPreview({ formData, customer, project }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: formData.currency || 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="sticky top-6 h-fit bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Preview</h3>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
            {formData.status || 'draft'}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">See how your estimate will look</p>
      </div>

      {/* PDF Preview Content */}
      <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Estimate Header */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">DEVIS</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {formData.estimate_number || 'DEVIS-XXXX-XXXX'}
          </p>
        </div>

        {/* Customer & Dates */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Client</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {customer?.name || '—'}
            </p>
            {customer?.email && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{customer.email}</p>
            )}
            {project && (
              <p className="text-xs text-gray-500 mt-1">
                Projet: {project.name}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Dates</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Émis le:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(formData.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Valide jusqu'au:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(formData.valid_until)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Prestations</p>

          {formData.items && formData.items.length > 0 ? (
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.description || item.name || `Item ${index + 1}`}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 ml-2">
                      {formatCurrency(item.amount || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>{item.quantity || 0} {item.unit || 'hours'}</span>
                    <span>×</span>
                    <span>{formatCurrency(item.rate || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">Aucune ligne ajoutée</p>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sous-total HT</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(formData.subtotal_before_margin || 0)}
              </span>
            </div>

            {formData.security_margin_percentage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Marge de sécurité ({formData.security_margin_percentage}%)
                </span>
                <span className="font-medium text-yellow-700 dark:text-yellow-400">
                  +{formatCurrency(formData.security_margin_amount || 0)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600 dark:text-gray-400">Sous-total après marge</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(formData.subtotal || 0)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">TVA ({formData.tax_rate || 20}%)</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency((formData.subtotal * (formData.tax_rate || 20)) / 100)}
              </span>
            </div>

            <div className="flex justify-between text-base font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-gray-100">Total TTC</span>
              <span className="text-violet-600 dark:text-violet-400">
                {formatCurrency(formData.total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* TJM Info */}
        {formData.tjm_used && formData.total_days && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Tarif journalier</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {formData.total_days} jour{formData.total_days > 1 ? 's' : ''} × {formatCurrency(formData.tjm_used)}/jour
            </p>
          </div>
        )}

        {/* Notes */}
        {formData.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
          </div>
        )}

        {/* Terms */}
        {formData.terms && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Conditions</p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{formData.terms}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-3">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          La génération PDF finale sera disponible après enregistrement
        </p>
      </div>
    </div>
  );
}

export default EstimatePDFPreview;
