import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOnboardingStatus, useUpdateOnboarding } from "../api/hooks";
import OnboardingImage from "../images/onboarding-image.jpg";

function Onboarding03() {
  const navigate = useNavigate();
  const { data: onboardingData, isLoading } = useOnboardingStatus();
  const updateOnboarding = useUpdateOnboarding();

  const [formData, setFormData] = useState({
    tjm_default: 500,
    tjm_hours_per_day: 7,
    default_tax_rate: 20.0,
    currency: "EUR",
    payment_terms_days: 30,
    default_security_margin: 10.0,
    iban: "",
    bic: "",
    bank_name: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (onboardingData) {
      setFormData({
        tjm_default: onboardingData.tjm_default || 500,
        tjm_hours_per_day: onboardingData.tjm_hours_per_day || 7,
        default_tax_rate: onboardingData.default_tax_rate || 20.0,
        currency: onboardingData.currency || "EUR",
        payment_terms_days: onboardingData.payment_terms_days || 30,
        default_security_margin: onboardingData.default_security_margin || 10.0,
        iban: onboardingData.iban || "",
        bic: onboardingData.bic || "",
        bank_name: onboardingData.bank_name || "",
      });
    }
  }, [onboardingData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const calculateHourlyRate = () => {
    if (formData.tjm_default && formData.tjm_hours_per_day) {
      return (formData.tjm_default / formData.tjm_hours_per_day).toFixed(2);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateOnboarding.mutateAsync({
        ...formData,
        onboarding_step: 3,
      });
      navigate("/onboarding-04");
    } catch (error) {
      console.error("Error updating onboarding:", error);
      setErrors({
        submit: error.response?.data?.message || "Failed to save pricing settings",
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
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white"
                          to="/onboarding-02"
                        >
                          2
                        </Link>
                      </li>
                      <li>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white">
                          3
                        </div>
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
                <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Pricing & Legal Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Configure your default rates and payment terms
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-8">
                    {/* TJM (Daily Rate) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="tjm_default">
                        TJM - Taux Journalier Moyen (€)
                      </label>
                      <input
                        id="tjm_default"
                        name="tjm_default"
                        className="form-input w-full"
                        type="number"
                        step="0.01"
                        value={formData.tjm_default}
                        onChange={handleChange}
                      />
                      <p className="mt-1 text-xs text-gray-500">Your daily rate in euros</p>
                    </div>

                    {/* Hours per day */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="tjm_hours_per_day">
                        Billable Hours per Day
                      </label>
                      <input
                        id="tjm_hours_per_day"
                        name="tjm_hours_per_day"
                        className="form-input w-full"
                        type="number"
                        min="1"
                        max="24"
                        value={formData.tjm_hours_per_day}
                        onChange={handleChange}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Hourly rate: €{calculateHourlyRate()}/hour
                      </p>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="currency">
                        Currency
                      </label>
                      <select
                        id="currency"
                        name="currency"
                        className="form-select w-full"
                        value={formData.currency}
                        onChange={handleChange}
                      >
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="GBP">British Pound (£)</option>
                        <option value="CHF">Swiss Franc (CHF)</option>
                      </select>
                    </div>

                    {/* Tax Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="default_tax_rate">
                        Default Tax Rate (%)
                      </label>
                      <input
                        id="default_tax_rate"
                        name="default_tax_rate"
                        className="form-input w-full"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_tax_rate}
                        onChange={handleChange}
                      />
                      <p className="mt-1 text-xs text-gray-500">Standard VAT rate in France is 20%</p>
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="payment_terms_days">
                        Payment Terms (days)
                      </label>
                      <select
                        id="payment_terms_days"
                        name="payment_terms_days"
                        className="form-select w-full"
                        value={formData.payment_terms_days}
                        onChange={handleChange}
                      >
                        <option value="15">15 days</option>
                        <option value="30">30 days</option>
                        <option value="45">45 days</option>
                        <option value="60">60 days</option>
                      </select>
                    </div>

                    {/* Security Margin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="default_security_margin">
                        Default Security Margin (%)
                      </label>
                      <input
                        id="default_security_margin"
                        name="default_security_margin"
                        className="form-input w-full"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_security_margin}
                        onChange={handleChange}
                      />
                      <p className="mt-1 text-xs text-gray-500">Safety buffer added to estimates (typically 10-15%)</p>
                    </div>

                    {/* Bank Details */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Bank Details (Optional)</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="iban">
                            IBAN
                          </label>
                          <input
                            id="iban"
                            name="iban"
                            className="form-input w-full"
                            type="text"
                            value={formData.iban}
                            onChange={handleChange}
                            placeholder="FR76 1234 5678 9012 3456 7890 123"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="bic">
                            BIC/SWIFT
                          </label>
                          <input
                            id="bic"
                            name="bic"
                            className="form-input w-full"
                            type="text"
                            value={formData.bic}
                            onChange={handleChange}
                            placeholder="BNPAFRPPXXX"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1" htmlFor="bank_name">
                            Bank Name
                          </label>
                          <input
                            id="bank_name"
                            name="bank_name"
                            className="form-input w-full"
                            type="text"
                            value={formData.bank_name}
                            onChange={handleChange}
                            placeholder="e.g., BNP Paribas"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-sm text-red-600 dark:text-red-400">
                      {errors.submit}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Link className="text-sm underline hover:no-underline" to="/onboarding-02">
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

export default Onboarding03;
