import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCustomers,
  useProjects,
  useAvailableTasks,
  useCreateCRA,
  useUpdateCRA,
  useCRA,
} from '../../api/hooks';
import Header from '../../partials/Header';
import Sidebar from '../../partials/Sidebar';
import { useTranslation } from 'react-i18next';

function CRAForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: null,
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    task_ids: [],
    daily_rate: 500,
    currency: 'EUR',
    notes: '',
  });

  const { data: customersData } = useCustomers();
  const { data: projectsData } = useProjects();
  const { data: existingCRA } = useCRA(id);
  const { data: availableTasksData } = useAvailableTasks(
    formData.customer_id,
    formData.period_month,
    formData.period_year,
    id
  );

  const createMutation = useCreateCRA();
  const updateMutation = useUpdateCRA();

  const customers = customersData?.results || [];
  const projects = projectsData?.results || [];
  const availableTasks = availableTasksData?.data || [];

  // Load existing CRA data for editing
  useEffect(() => {
    if (isEdit && existingCRA?.data) {
      const cra = existingCRA.data;
      setFormData({
        customer_id: cra.customer.id,
        project_id: cra.project?.id || null,
        period_month: cra.period_month,
        period_year: cra.period_year,
        task_ids: cra.tasks.map(t => t.id),
        daily_rate: cra.daily_rate,
        currency: cra.currency,
        notes: cra.notes || '',
      });
    }
  }, [isEdit, existingCRA]);

  const customerProjects = projects.filter(p => p.customer === parseInt(formData.customer_id));
  const selectedTasks = availableTasks.filter(t => formData.task_ids.includes(t.id));
  const totalDays = selectedTasks.reduce((sum, task) => sum + parseFloat(task.worked_days || 0), 0);
  const totalAmount = totalDays * parseFloat(formData.daily_rate);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskToggle = (taskId) => {
    setFormData(prev => ({
      ...prev,
      task_ids: prev.task_ids.includes(taskId)
        ? prev.task_ids.filter(id => id !== taskId)
        : [...prev.task_ids, taskId]
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      navigate('/cra');
    } catch (error) {
      console.error('Error saving CRA:', error);
      alert('Erreur lors de la sauvegarde du CRA');
    }
  };

  const canProceedStep1 = formData.customer_id && formData.period_month && formData.period_year;
  const canProceedStep2 = formData.task_ids.length > 0;
  const canSubmit = canProceedStep1 && canProceedStep2 && formData.daily_rate > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">

            {/* Page header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
                {isEdit ? 'Modifier le CRA' : 'Nouveau CRA'}
              </h1>
            </div>

            {/* Progress steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 1 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    1
                  </div>
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div className={`h-full ${currentStep >= 2 ? 'bg-indigo-500' : 'bg-gray-200'}`} style={{ width: currentStep >= 2 ? '100%' : '0%' }}></div>
                  </div>
                </div>

                <div className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 2 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div className={`h-full ${currentStep >= 3 ? 'bg-indigo-500' : 'bg-gray-200'}`} style={{ width: currentStep >= 3 ? '100%' : '0%' }}></div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 3 ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    3
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-600">Période & Client</div>
                <div className="text-xs text-gray-600">Sélection des tâches</div>
                <div className="text-xs text-gray-600">Récapitulatif</div>
              </div>
            </div>

            {/* Form content */}
            <div className="bg-white shadow-sm rounded-lg p-6">

              {/* Step 1: Period & Customer */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Période *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <select
                          name="period_month"
                          value={formData.period_month}
                          onChange={handleInputChange}
                          className="form-select w-full"
                          disabled={isEdit}
                        >
                          {monthNames.map((month, index) => (
                            <option key={index + 1} value={index + 1}>
                              {month}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          name="period_year"
                          value={formData.period_year}
                          onChange={handleInputChange}
                          className="form-select w-full"
                          disabled={isEdit}
                        >
                          {[2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      className="form-select w-full"
                      disabled={isEdit}
                    >
                      <option value="">Sélectionner un client</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} {customer.company && `(${customer.company})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Projet (optionnel)
                    </label>
                    <select
                      name="project_id"
                      value={formData.project_id || ''}
                      onChange={handleInputChange}
                      className="form-select w-full"
                      disabled={!formData.customer_id}
                    >
                      <option value="">Aucun projet spécifique</option>
                      {customerProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Task Selection */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Sélectionner les tâches pour {monthNames[formData.period_month - 1]} {formData.period_year}
                    </h3>

                    {availableTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucune tâche disponible pour cette période et ce client.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableTasks.map(task => (
                          <div
                            key={task.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              formData.task_ids.includes(task.id)
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleTaskToggle(task.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.task_ids.includes(task.id)}
                                    onChange={() => {}}
                                    className="form-checkbox h-5 w-5 text-indigo-600"
                                  />
                                  <div className="ml-3">
                                    <div className="font-medium text-gray-900">{task.name}</div>
                                    {task.description && (
                                      <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">
                                      Projet: {task.project_name || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {task.worked_days || 0} jour(s)
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Summary */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Récapitulatif</h3>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Période:</span>
                        <span className="font-medium">{monthNames[formData.period_month - 1]} {formData.period_year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Client:</span>
                        <span className="font-medium">
                          {customers.find(c => c.id === parseInt(formData.customer_id))?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nombre de tâches:</span>
                        <span className="font-medium">{formData.task_ids.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total jours:</span>
                        <span className="font-medium">{totalDays.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taux Journalier Moyen (TJM) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="daily_rate"
                        value={formData.daily_rate}
                        onChange={handleInputChange}
                        className="form-input w-full pr-16"
                        min="0"
                        step="50"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500">{formData.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Montant total HT:</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: formData.currency }).format(totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                      className="form-textarea w-full"
                      placeholder="Ajouter des notes ou commentaires..."
                    />
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <div>
                  {currentStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="btn bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                    >
                      Retour
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/cra')}
                    className="btn bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                  >
                    Annuler
                  </button>

                  {currentStep < 3 ? (
                    <button
                      onClick={handleNext}
                      disabled={
                        (currentStep === 1 && !canProceedStep1) ||
                        (currentStep === 2 && !canProceedStep2)
                      }
                      className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || createMutation.isLoading || updateMutation.isLoading}
                      className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createMutation.isLoading || updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default CRAForm;
