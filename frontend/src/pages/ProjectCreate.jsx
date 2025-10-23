import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateProject, useUpdateProject, useProject, useCustomers } from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';

function ProjectCreate() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isEditing = !!id;

  const { data: project } = useProject(id, { enabled: isEditing });
  const { data: customersData } = useCustomers();
  const customers = customersData?.results || [];

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const [formData, setFormData] = useState({
    customer: '',
    name: '',
    description: '',
    status: 'active',
    estimated_budget: '',
    start_date: '',
    end_date: '',
  });

  // Load existing project data if editing
  useEffect(() => {
    if (isEditing && project) {
      setFormData({
        customer: project.customer || '',
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        estimated_budget: project.estimated_budget || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
      });
    }
  }, [isEditing, project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      navigate('/projects');
    } catch (err) {
      console.error('Error saving project:', err);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <button
                onClick={handleCancel}
                className="flex items-center text-sm text-gray-400 hover:text-gray-200 transition-colors mb-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('projects.form.backToProjects')}
              </button>
              <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">
                {isEditing ? t('projects.form.editTitle') : t('projects.form.newTitle')}
              </h1>
              <p className="text-gray-400 mt-1">
                {isEditing ? t('projects.form.editSubtitle') : t('projects.form.newSubtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Selection */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">{t('projects.form.customerSection')}</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('projects.form.customer')} <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100"
                  >
                    <option value="">{t('projects.form.selectCustomer')}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('projects.form.customerHelp')}
                  </p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">{t('projects.form.basicInformation')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('projects.form.projectName')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('projects.form.projectNamePlaceholder')}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('projects.form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('projects.form.descriptionPlaceholder')}
                      rows="4"
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('common.status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100"
                    >
                      <option value="active">{t('projects.status.active')}</option>
                      <option value="paused">{t('projects.status.paused')}</option>
                      <option value="completed">{t('projects.status.completed')}</option>
                      <option value="archived">{t('projects.status.archived')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Budget & Dates */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">{t('projects.form.budgetAndTimeline')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('projects.form.estimatedBudget')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimated_budget}
                      onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100 placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('projects.form.budgetHelp')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('projects.form.startDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('projects.form.endDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 -mx-4 sm:-mx-6 lg:-mx-8">
                <div className="flex items-center justify-end gap-3 max-w-5xl mx-auto">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('common.saving')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isEditing ? t('projects.form.updateButton') : t('projects.form.createButton')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectCreate;
