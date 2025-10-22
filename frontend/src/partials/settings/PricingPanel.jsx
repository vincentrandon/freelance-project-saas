import React, { useState, useEffect } from 'react';
import { useOnboardingStatus, useUpdateOnboarding } from '../../api/hooks';

function PricingPanel() {
  const { data: profileData, isLoading } = useOnboardingStatus();
  const updateOnboarding = useUpdateOnboarding();

  const [formData, setFormData] = useState({
    tjm_default: '',
    hourly_rate_default: '',
    tjm_hours_per_day: 7,
    default_security_margin: '',
    default_tax_rate: '',
    currency: 'EUR',
    payment_terms_days: 30,
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profileData) {
      setFormData({
        tjm_default: profileData.tjm_default || '',
        hourly_rate_default: profileData.hourly_rate_default || '',
        tjm_hours_per_day: profileData.tjm_hours_per_day || 7,
        default_security_margin: profileData.default_security_margin || '',
        default_tax_rate: profileData.default_tax_rate || '',
        currency: profileData.currency || 'EUR',
        payment_terms_days: profileData.payment_terms_days || 30,
      });
    }
  }, [profileData]);

  useEffect(() => {
    // Auto-calculate hourly rate when TJM or hours per day changes
    if (formData.tjm_default && formData.tjm_hours_per_day) {
      const hourlyRate = (parseFloat(formData.tjm_default) / parseFloat(formData.tjm_hours_per_day)).toFixed(2);
      setFormData(prev => ({ ...prev, hourly_rate_default: hourlyRate }));
    }
  }, [formData.tjm_default, formData.tjm_hours_per_day]);

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
      setSuccessMessage('Pricing settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to update settings. Please try again.');
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
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">Pricing & Rates</h2>

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
          {/* Daily Rate (TJM) */}
          <section>
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Daily Rate (TJM)
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Your default daily rate and working hours
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="tjm_default">
                    Daily Rate (TJM)
                  </label>
                  <div className="relative">
                    <input
                      id="tjm_default"
                      name="tjm_default"
                      className="form-input w-full pr-12"
                      type="number"
                      step="10"
                      min="0"
                      placeholder="500"
                      value={formData.tjm_default}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">{formData.currency}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your standard daily rate
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="tjm_hours_per_day">
                    Hours per Day
                  </label>
                  <input
                    id="tjm_hours_per_day"
                    name="tjm_hours_per_day"
                    className="form-input w-full"
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={formData.tjm_hours_per_day}
                    onChange={handleChange}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Standard working hours/day
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="hourly_rate_default">
                    Hourly Rate (Calculated)
                  </label>
                  <div className="relative">
                    <input
                      id="hourly_rate_default"
                      name="hourly_rate_default"
                      className="form-input w-full pr-12 bg-gray-50 dark:bg-gray-900"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_default}
                      disabled
                      readOnly
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">{formData.currency}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-calculated from TJM
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Margins & Pricing Strategy */}
          <section className="mt-6">
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Margins & Pricing Strategy
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Default margins for estimates and invoices
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="default_security_margin">
                    Security Margin
                  </label>
                  <div className="relative">
                    <input
                      id="default_security_margin"
                      name="default_security_margin"
                      className="form-input w-full pr-12"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="20"
                      value={formData.default_security_margin}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Buffer for unexpected work (e.g., 20%)
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="default_tax_rate">
                    Default Tax Rate (TVA)
                  </label>
                  <div className="relative">
                    <input
                      id="default_tax_rate"
                      name="default_tax_rate"
                      className="form-input w-full pr-12"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="20"
                      value={formData.default_tax_rate}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Standard French TVA is 20%
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
                      About Security Margin
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      The security margin is added to your estimates to account for unexpected complexity, scope creep,
                      or additional work. A 20% margin means if a task takes 10 hours, you'll quote 12 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Currency & Payment Terms */}
          <section className="mt-6">
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Currency & Payment Terms
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Default currency and payment conditions
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="currency">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    className="form-select w-full"
                    value={formData.currency}
                    onChange={handleChange}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </select>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used for all invoices and estimates
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="payment_terms_days">
                    Payment Terms
                  </label>
                  <div className="relative">
                    <input
                      id="payment_terms_days"
                      name="payment_terms_days"
                      className="form-input w-full pr-16"
                      type="number"
                      min="0"
                      max="365"
                      value={formData.payment_terms_days}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">days</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Standard is 30 days in France
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Calculator */}
          <section className="mt-6">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                💡 Quick Calculation
              </h4>
              {formData.tjm_default && formData.tjm_hours_per_day ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Daily Rate</div>
                      <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                        {parseFloat(formData.tjm_default).toFixed(2)} {formData.currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Hourly Rate</div>
                      <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                        {formData.hourly_rate_default} {formData.currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Weekly (5 days)</div>
                      <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                        {(parseFloat(formData.tjm_default) * 5).toFixed(2)} {formData.currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Monthly (20 days)</div>
                      <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                        {(parseFloat(formData.tjm_default) * 20).toFixed(2)} {formData.currency}
                      </div>
                    </div>
                  </div>
                  {formData.default_security_margin && (
                    <div className="pt-3 border-t border-violet-200 dark:border-violet-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        With {formData.default_security_margin}% security margin:
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        10 hours = <span className="font-semibold">{(10 * (1 + parseFloat(formData.default_security_margin) / 100)).toFixed(1)} hours quoted</span>
                        {' '}= <span className="font-semibold">{(parseFloat(formData.hourly_rate_default) * 10 * (1 + parseFloat(formData.default_security_margin) / 100)).toFixed(2)} {formData.currency}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your TJM and hours per day to see calculations
                </p>
              )}
            </div>
          </section>
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

export default PricingPanel;
