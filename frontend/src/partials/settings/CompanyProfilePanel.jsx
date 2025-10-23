import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStatus, useUpdateOnboarding } from '../../api/hooks';

function CompanyProfilePanel() {
  const { t } = useTranslation();
  const { data: profileData, isLoading } = useOnboardingStatus();
  const updateOnboarding = useUpdateOnboarding();

  const [formData, setFormData] = useState({
    company_name: '',
    siret_siren: '',
    tax_id: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profileData) {
      setFormData({
        company_name: profileData.company_name || '',
        siret_siren: profileData.siret_siren || '',
        tax_id: profileData.tax_id || '',
        address: profileData.address || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || 'France',
        phone: profileData.phone || '',
        email: profileData.email || '',
        website: profileData.website || '',
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
      setSuccessMessage(t('settings.companyPanel.success'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || t('settings.companyPanel.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="grow">
        <div className="p-6">
          <div className="text-center">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  const completeness = profileData?.profile_completeness || 0;
  const isComplete = profileData?.is_complete_for_invoicing || false;

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">{t('settings.companyPanel.title')}</h2>
          {profileData && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.companyPanel.completeness')}: <span className="font-semibold">{completeness}%</span>
              </div>
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completeness}%` }}
                ></div>
              </div>
            </div>
          )}
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

        {!isComplete && profileData?.missing_required_fields?.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
              {t('settings.companyPanel.missingFields')}
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
              {profileData.missing_required_fields
                .filter(field => !['IBAN', 'BIC', 'Bank Name', 'TJM', 'Tax Rate'].includes(field))
                .map((field) => (
                  <li key={field}>{field}</li>
                ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <section>
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              {t('settings.companyPanel.companyInformation')}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t('settings.companyPanel.companyInformationDesc')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="company_name">
                  {t('settings.companyPanel.companyName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="company_name"
                  name="company_name"
                  className="form-input w-full"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="siret_siren">
                    {t('settings.companyPanel.siretSiren')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="siret_siren"
                    name="siret_siren"
                    className="form-input w-full"
                    type="text"
                    placeholder="123 456 789 00012"
                    value={formData.siret_siren}
                    onChange={handleChange}
                    required
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.companyPanel.siretHelp')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="tax_id">
                    {t('settings.companyPanel.taxId')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tax_id"
                    name="tax_id"
                    className="form-input w-full"
                    type="text"
                    placeholder="FR12345678901"
                    value={formData.tax_id}
                    onChange={handleChange}
                    required
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.companyPanel.taxIdHelp')}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="mt-6">
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              {t('settings.companyPanel.contactInformation')}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t('settings.companyPanel.contactInformationDesc')}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="phone">
                    {t('settings.companyPanel.phoneNumber')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="form-input w-full"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">
                    {t('settings.companyPanel.companyEmail')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    className="form-input w-full"
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.companyPanel.companyEmailHelp')}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="website">
                  {t('settings.companyPanel.website')}
                </label>
                <input
                  id="website"
                  name="website"
                  className="form-input w-full"
                  type="url"
                  placeholder="https://www.company.com"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {/* Business Address */}
          <section className="mt-6">
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              {t('settings.companyPanel.businessAddress')}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t('settings.companyPanel.businessAddressDesc')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="address">
                  {t('settings.companyPanel.streetAddress')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  className="form-input w-full"
                  type="text"
                  placeholder="123 Rue de la République"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="postal_code">
                    {t('settings.companyPanel.postalCode')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="postal_code"
                    name="postal_code"
                    className="form-input w-full"
                    type="text"
                    placeholder="75001"
                    value={formData.postal_code}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="city">
                    {t('settings.companyPanel.city')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    className="form-input w-full"
                    type="text"
                    placeholder="Paris"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="country">
                    {t('settings.companyPanel.country')}
                  </label>
                  <input
                    id="country"
                    name="country"
                    className="form-input w-full"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={updateOnboarding.isPending}
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3 disabled:opacity-50"
            >
              {updateOnboarding.isPending ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CompanyProfilePanel;
