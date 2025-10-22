import React, { useState, useEffect } from 'react';
import { useOnboardingStatus, useUpdateOnboarding } from '../../api/hooks';

function CompanyProfilePanel() {
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
      setSuccessMessage('Company profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to update profile. Please try again.');
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

  const completeness = profileData?.profile_completeness || 0;
  const isComplete = profileData?.is_complete_for_invoicing || false;

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">Company Profile</h2>
          {profileData && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completeness: <span className="font-semibold">{completeness}%</span>
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
              Missing required fields for legal invoicing:
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
              Company Information
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Legal business information required for French invoicing
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="company_name">
                  Company Name <span className="text-red-500">*</span>
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
                    SIRET / SIREN <span className="text-red-500">*</span>
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
                    14 digits for SIRET, 9 for SIREN
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="tax_id">
                    TVA Intracommunautaire <span className="text-red-500">*</span>
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
                    Format: FR + 11 digits
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="mt-6">
            <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
              Contact Information
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              How clients can reach your company
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span>
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
                    Company Email
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
                    Will appear on invoices and estimates
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="website">
                  Website
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
              Business Address
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Your company's legal registered address
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="address">
                  Street Address <span className="text-red-500">*</span>
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
                    Postal Code <span className="text-red-500">*</span>
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
                    City <span className="text-red-500">*</span>
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
                    Country
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

export default CompanyProfilePanel;
