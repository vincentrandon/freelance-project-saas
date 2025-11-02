import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOnboardingStatus, useUpdateOnboarding, useCompanyLookup } from "../api/hooks";
import { useTranslation } from "react-i18next";
import OnboardingImage from "../images/onboarding-image.jpg";

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function Onboarding02() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: onboardingData, isLoading } = useOnboardingStatus();
  const updateOnboarding = useUpdateOnboarding();
  const companyLookup = useCompanyLookup();

  const [formData, setFormData] = useState({
    company_name: "",
    siret_siren: "",
    address: "",
    city: "",
    postal_code: "",
    country: "France",
    phone: "",
    email: "",
    website: "",
  });

  const [errors, setErrors] = useState({});
  const [lookupSuccess, setLookupSuccess] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [isAutoLookingUp, setIsAutoLookingUp] = useState(false);

  // Cache to track which SIRENs have been looked up to prevent duplicate API calls
  const lookupCache = useRef(new Set());

  // Debounce the SIREN/SIRET input
  const debouncedSiretSiren = useDebounce(formData.siret_siren, 800);

  useEffect(() => {
    if (onboardingData) {
      setFormData({
        company_name: onboardingData.company_name || "",
        siret_siren: onboardingData.siret_siren || "",
        address: onboardingData.address || "",
        city: onboardingData.city || "",
        postal_code: onboardingData.postal_code || "",
        country: onboardingData.country || "France",
        phone: onboardingData.phone || "",
        email: onboardingData.email || "",
        website: onboardingData.website || "",
      });
    }
  }, [onboardingData]);

  // Auto-lookup when SIREN/SIRET is valid
  useEffect(() => {
    const performAutoLookup = async () => {
      if (!debouncedSiretSiren) return;

      // Clean input: remove spaces and dashes
      const cleanInput = debouncedSiretSiren.replace(/[\s-]/g, '');

      // Check if it's a valid SIREN (9 digits) or SIRET (14 digits)
      if (!/^\d{9}$/.test(cleanInput) && !/^\d{14}$/.test(cleanInput)) {
        return; // Not valid yet, don't search
      }

      // Extract SIREN from SIRET if needed (first 9 digits)
      const siren = cleanInput.substring(0, 9);

      // Prevent duplicate lookups for the same SIREN
      if (lookupCache.current.has(siren)) {
        return;
      }

      // Add to cache before lookup to prevent race conditions
      lookupCache.current.add(siren);

      setIsAutoLookingUp(true);
      setLookupSuccess(null);
      setLookupError(null);

      try {
        const data = await companyLookup.mutateAsync(siren);

        // Only auto-fill if fields are empty to avoid overwriting user edits
        setFormData((prev) => ({
          ...prev,
          company_name: prev.company_name || data.company_name || prev.company_name,
          address: prev.address || data.address || prev.address,
          city: prev.city || data.city || prev.city,
          postal_code: prev.postal_code || data.postal_code || prev.postal_code,
          siret_siren: data.siret || data.siren || prev.siret_siren,
        }));

        // Show success message
        setLookupSuccess(t('onboarding.company.lookupSuccess', { name: data.company_name }));
        setErrors({});

        // Auto-clear success message after 5 seconds
        setTimeout(() => setLookupSuccess(null), 5000);

      } catch (error) {
        console.error('Auto company lookup error:', error);

        // Show user-friendly error message
        const errorMessage = error.response?.data?.error || t('onboarding.company.lookupError');
        setLookupError(errorMessage);

        // Remove from cache on error so user can retry by editing the field
        lookupCache.current.delete(siren);

        // Auto-clear error message after 10 seconds
        setTimeout(() => setLookupError(null), 10000);
      } finally {
        setIsAutoLookingUp(false);
      }
    };

    performAutoLookup();
  }, [debouncedSiretSiren, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
    // Clear success/error messages when user manually edits (except siret_siren)
    if (name !== 'siret_siren') {
      if (lookupSuccess) setLookupSuccess(null);
      if (lookupError) setLookupError(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    }
    if (!formData.siret_siren.trim()) {
      newErrors.siret_siren = "SIRET/SIREN is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "Postal code is required";
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Phone or email is required";
      newErrors.email = "Phone or email is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await updateOnboarding.mutateAsync({
        ...formData,
        onboarding_step: 2,
      });
      navigate("/onboarding-03");
    } catch (error) {
      console.error("Error updating onboarding:", error);
      setErrors({
        submit: error.response?.data?.message || "Failed to save company information",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-violet-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative flex">
        {/* Content */}
        <div className="w-full md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link className="block" to="/">
                  <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
                    <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
                  </svg>
                </Link>
                <div className="text-sm">
                  Have an account?{" "}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" to="/signin">
                    Sign In
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pt-12 pb-8">
                <div className="max-w-md mx-auto w-full">
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200 dark:bg-gray-700/60" aria-hidden="true"></div>
                    <ul className="relative flex justify-between w-full">
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white"
                          to="/onboarding-01"
                        >
                          1
                        </Link>
                      </li>
                      <li>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white">
                          2
                        </div>
                      </li>
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                          to="/onboarding-03"
                        >
                          3
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                          to="/onboarding-04"
                        >
                          4
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-8">
              <div className="max-w-md mx-auto">
                <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Company Information</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Required for French legal compliance on invoices and estimates
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-8">
                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="company_name">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="company_name"
                        name="company_name"
                        className={`form-input w-full ${errors.company_name ? 'border-red-500' : ''}`}
                        type="text"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                      />
                      {errors.company_name && <p className="mt-1 text-xs text-red-500">{errors.company_name}</p>}
                    </div>

                    {/* SIRET/SIREN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="siret_siren">
                        SIRET/SIREN <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="siret_siren"
                          name="siret_siren"
                          className={`form-input w-full pr-10 ${errors.siret_siren ? 'border-red-500' : ''} ${isAutoLookingUp ? 'border-violet-300' : ''}`}
                          type="text"
                          value={formData.siret_siren}
                          onChange={handleChange}
                          placeholder={t('onboarding.company.sirenPlaceholder')}
                          required
                        />
                        {isAutoLookingUp && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="animate-spin h-5 w-5 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('onboarding.company.autoLookupHint')}
                      </p>
                      {errors.siret_siren && <p className="mt-1 text-xs text-red-500">{errors.siret_siren}</p>}
                      {lookupSuccess && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                          </svg>
                          {lookupSuccess}
                        </p>
                      )}
                      {lookupError && (
                        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start">
                            <svg className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                            </svg>
                            <span>{lookupError}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="address">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        className={`form-textarea w-full ${errors.address ? 'border-red-500' : ''}`}
                        rows="2"
                        value={formData.address}
                        onChange={handleChange}
                        required
                      ></textarea>
                      {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                    </div>

                    {/* City & Postal Code */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="city">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="city"
                          name="city"
                          className={`form-input w-full ${errors.city ? 'border-red-500' : ''}`}
                          type="text"
                          value={formData.city}
                          onChange={handleChange}
                          required
                        />
                        {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="postal_code">
                          Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="postal_code"
                          name="postal_code"
                          className={`form-input w-full ${errors.postal_code ? 'border-red-500' : ''}`}
                          type="text"
                          value={formData.postal_code}
                          onChange={handleChange}
                          required
                        />
                        {errors.postal_code && <p className="mt-1 text-xs text-red-500">{errors.postal_code}</p>}
                      </div>
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="country">
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

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="phone">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        className={`form-input w-full ${errors.phone ? 'border-red-500' : ''}`}
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g., +33 1 23 45 67 89"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="email">
                        Business Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        className={`form-input w-full ${errors.email ? 'border-red-500' : ''}`}
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Optional - defaults to your account email"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="website">
                        Website
                      </label>
                      <input
                        id="website"
                        name="website"
                        className="form-input w-full"
                        type="url"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-sm text-red-600 dark:text-red-400">
                      {errors.submit}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Link className="text-sm underline hover:no-underline" to="/onboarding-01">
                      &lt;- Back
                    </Link>
                    <button
                      type="submit"
                      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-auto disabled:opacity-50"
                      disabled={updateOnboarding.isPending}
                    >
                      {updateOnboarding.isPending ? "Saving..." : "Next Step →"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <img className="object-cover object-center w-full h-full" src={OnboardingImage} width="760" height="1024" alt="Onboarding" />
        </div>
      </div>
    </main>
  );
}

export default Onboarding02;
