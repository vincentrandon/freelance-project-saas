import React, { useState, useEffect } from 'react';
import { useOnboardingStatus, useUpdateOnboarding } from '../../api/hooks';

function BillingPanel() {
  const { data: profileData, isLoading } = useOnboardingStatus();
  const updateOnboarding = useUpdateOnboarding();

  const [formData, setFormData] = useState({
    iban: '',
    bic: '',
    bank_name: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profileData) {
      setFormData({
        iban: profileData.iban || '',
        bic: profileData.bic || '',
        bank_name: profileData.bank_name || '',
      });
    }
  }, [profileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateOnboarding.mutateAsync(formData);
      setSuccessMessage('Banking information updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to update information. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="grow">
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow">

      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-1">Banking & Payments</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Manage your banking details for receiving payments from clients
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Bank Account Information */}
          <section>
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Bank Account Information
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              These details will appear on your invoices for client payments
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="iban">
                  IBAN
                </label>
                <input
                  id="iban"
                  name="iban"
                  className="form-input w-full"
                  type="text"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  value={formData.iban}
                  onChange={handleChange}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  International Bank Account Number for SEPA transfers
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="bic">
                    BIC / SWIFT
                  </label>
                  <input
                    id="bic"
                    name="bic"
                    className="form-input w-full"
                    type="text"
                    placeholder="BNPAFRPPXXX"
                    value={formData.bic}
                    onChange={handleChange}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Bank Identifier Code
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="bank_name">
                    Bank Name
                  </label>
                  <input
                    id="bank_name"
                    name="bank_name"
                    className="form-input w-full"
                    type="text"
                    placeholder="BNP Paribas"
                    value={formData.bank_name}
                    onChange={handleChange}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Name of your banking institution
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Banking Information Privacy
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your banking details are stored securely and will only appear on invoices sent to clients.
                      They are never shared with third parties and are used solely for receiving payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Information Preview */}
          {(formData.iban || formData.bic || formData.bank_name) && (
            <section className="mt-6">
              <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
                Invoice Preview
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                How your banking details will appear on invoices
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Payment Information
                </h4>
                <ul className="space-y-2 text-sm">
                  {formData.bank_name && (
                    <li className="flex">
                      <span className="font-medium text-gray-600 dark:text-gray-400 w-24">Bank:</span>
                      <span className="text-gray-800 dark:text-gray-200">{formData.bank_name}</span>
                    </li>
                  )}
                  {formData.iban && (
                    <li className="flex">
                      <span className="font-medium text-gray-600 dark:text-gray-400 w-24">IBAN:</span>
                      <span className="text-gray-800 dark:text-gray-200 font-mono text-xs">{formData.iban}</span>
                    </li>
                  )}
                  {formData.bic && (
                    <li className="flex">
                      <span className="font-medium text-gray-600 dark:text-gray-400 w-24">BIC:</span>
                      <span className="text-gray-800 dark:text-gray-200 font-mono text-xs">{formData.bic}</span>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          )}
        </form>
      </div>

      {/* Panel footer */}
      <footer>
        <div className="flex flex-col px-6 py-5 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex self-end">
            <button
              type="button"
              className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
              onClick={() => window.location.reload()}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={updateOnboarding.isPending}
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3 disabled:opacity-50"
            >
              {updateOnboarding.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BillingPanel;
