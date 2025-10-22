import React, { useState } from 'react';
import Sidebar from '../partials/Sidebar';
import Header from '../partials/Header';
import { useProfile, useUpdateProfile, usePricingSettings, useUpdatePricingSettings, useCalculateTJM } from '../api/hooks';

function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: pricingSettings } = usePricingSettings();
  const updateProfile = useUpdateProfile();
  const updatePricing = useUpdatePricingSettings();
  const calculateTJM = useCalculateTJM();

  const [formData, setFormData] = useState({});
  const [tjmCalc, setTjmCalc] = useState({
    monthly_revenue_target: '',
    working_days_per_month: 20,
    expenses_percentage: 30,
  });
  const [tjmResult, setTjmResult] = useState(null);

  React.useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (section) => {
    try {
      if (section === 'pricing') {
        await updatePricing.mutateAsync({
          tjm_default: formData.tjm_default,
          hourly_rate_default: formData.hourly_rate_default,
          tjm_hours_per_day: formData.tjm_hours_per_day,
          default_security_margin: formData.default_security_margin,
          show_security_margin_on_pdf: formData.show_security_margin_on_pdf,
          default_tax_rate: formData.default_tax_rate,
          currency: formData.currency,
        });
      } else {
        await updateProfile.mutateAsync(formData);
      }
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleCalculateTJM = async () => {
    try {
      const result = await calculateTJM.mutateAsync(tjmCalc);
      setTjmResult(result.data);
    } catch (error) {
      console.error('Error calculating TJM:', error);
    }
  };

  if (profileLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Paramètres ⚙️</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('company')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'company'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Entreprise
                </button>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pricing'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  TJM & Tarification
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pdf'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  PDF & Documents
                </button>
                <button
                  onClick={() => setActiveTab('signature')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'signature'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Signature
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Company Tab */}
              {activeTab === 'company' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SIRET/SIREN
                      </label>
                      <input
                        type="text"
                        name="siret_siren"
                        value={formData.siret_siren || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        TVA Intracommunautaire
                      </label>
                      <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Adresse
                    </label>
                    <textarea
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code Postal
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pays
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('company')}
                      disabled={updateProfile.isPending}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {updateProfile.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-8">
                  {/* TJM Calculator */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      💼 Calculateur TJM
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Revenu mensuel cible (€)
                        </label>
                        <input
                          type="number"
                          value={tjmCalc.monthly_revenue_target}
                          onChange={(e) => setTjmCalc(prev => ({ ...prev, monthly_revenue_target: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="5000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Jours travaillés/mois
                        </label>
                        <input
                          type="number"
                          value={tjmCalc.working_days_per_month}
                          onChange={(e) => setTjmCalc(prev => ({ ...prev, working_days_per_month: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Charges (%)
                        </label>
                        <input
                          type="number"
                          value={tjmCalc.expenses_percentage}
                          onChange={(e) => setTjmCalc(prev => ({ ...prev, expenses_percentage: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCalculateTJM}
                      disabled={calculateTJM.isPending}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {calculateTJM.isPending ? 'Calcul...' : 'Calculer mon TJM'}
                    </button>

                    {tjmResult && (
                      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">TJM recommandé</div>
                            <div className="text-2xl font-bold text-indigo-600">{tjmResult.recommended_tjm} €</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">TJM net (après charges)</div>
                            <div className="text-2xl font-bold text-green-600">{tjmResult.net_tjm} €</div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{tjmResult.explanation}</p>
                      </div>
                    )}
                  </div>

                  {/* TJM Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Paramètres TJM
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          TJM par défaut (€)
                        </label>
                        <input
                          type="number"
                          name="tjm_default"
                          value={formData.tjm_default || ''}
                          onChange={handleChange}
                          step="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heures par jour
                        </label>
                        <input
                          type="number"
                          name="tjm_hours_per_day"
                          value={formData.tjm_hours_per_day || ''}
                          onChange={handleChange}
                          min="1"
                          max="24"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security Margin */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Marge de sécurité
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Marge par défaut (%)
                        </label>
                        <input
                          type="number"
                          name="default_security_margin"
                          value={formData.default_security_margin || ''}
                          onChange={handleChange}
                          step="1"
                          min="0"
                          max="50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_security_margin_on_pdf"
                            checked={formData.show_security_margin_on_pdf || false}
                            onChange={handleChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Afficher la marge sur les PDF clients
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Tax & Currency */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Taxes & Devise
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Taux de TVA par défaut (%)
                        </label>
                        <input
                          type="number"
                          name="default_tax_rate"
                          value={formData.default_tax_rate || ''}
                          onChange={handleChange}
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Devise
                        </label>
                        <select
                          name="currency"
                          value={formData.currency || 'EUR'}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="EUR">Euro (€)</option>
                          <option value="USD">US Dollar ($)</option>
                          <option value="GBP">British Pound (£)</option>
                          <option value="CHF">Swiss Franc (CHF)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('pricing')}
                      disabled={updatePricing.isPending}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {updatePricing.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Tab */}
              {activeTab === 'pdf' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Couleur principale (hex)
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        name="pdf_primary_color"
                        value={formData.pdf_primary_color || '#3B82F6'}
                        onChange={handleChange}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={formData.pdf_primary_color || '#3B82F6'}
                        onChange={(e) => handleChange({ target: { name: 'pdf_primary_color', value: e.target.value }})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Texte de pied de page
                    </label>
                    <textarea
                      name="pdf_footer_text"
                      value={formData.pdf_footer_text || ''}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Votre texte de pied de page personnalisé..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="pdf_show_logo"
                        checked={formData.pdf_show_logo || false}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Afficher le logo sur les PDF
                      </span>
                    </label>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('pdf')}
                      disabled={updateProfile.isPending}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {updateProfile.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}

              {/* Signature Tab */}
              {activeTab === 'signature' && (
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="signature_enabled"
                        checked={formData.signature_enabled || false}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Activer la signature électronique
                      </span>
                    </label>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ℹ️ La signature électronique avec pyHanko sera bientôt disponible. Pour l'instant, la signature web est utilisée.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('signature')}
                      disabled={updateProfile.isPending}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {updateProfile.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;
