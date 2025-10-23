import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCustomers,
  useCreateCRA,
  useUpdateCRA,
  useCRA,
} from '../../api/hooks';
import Header from '../../partials/Header';
import Sidebar from '../../partials/Sidebar';
import CalendarDayPicker from '../../components/CalendarDayPicker';
import TaskDatePicker from '../../components/TaskDatePicker';
import TaskTemplatePickerModal from '../../components/TaskTemplatePickerModal';
import SimpleRichTextEditor from '../../components/SimpleRichTextEditor';
import { useTranslation } from 'react-i18next';

function CRAForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  // Get month and year from URL parameters
  const urlMonth = searchParams.get('month');
  const urlYear = searchParams.get('year');

  const [currentStep, setCurrentStep] = useState(1);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    period_month: urlMonth ? parseInt(urlMonth) : new Date().getMonth() + 1,
    period_year: urlYear ? parseInt(urlYear) : new Date().getFullYear(),
    selected_work_dates: [],
    tasks: [], // [{name, description, date_slots: [{date, period}]}]
    daily_rate: 500,
    currency: 'EUR',
    notes: '',
  });

  const { data: customersData } = useCustomers();
  const { data: existingCRA } = useCRA(id);

  const createMutation = useCreateCRA();
  const updateMutation = useUpdateCRA();

  const customers = customersData?.results || [];

  // Load existing CRA data for editing
  useEffect(() => {
    if (isEdit && existingCRA?.data) {
      const cra = existingCRA.data;
      setFormData({
        customer_id: cra.customer.id,
        period_month: cra.period_month,
        period_year: cra.period_year,
        selected_work_dates: cra.selected_work_dates || [],
        tasks: cra.tasks.map(t => {
          // Convert old worked_dates format to new date_slots format
          const dateSlots = (t.worked_dates || []).map(date => ({
            date,
            period: 'full' // Default to full day for existing data
          }));
          return {
            id: t.id,
            name: t.name,
            description: t.description || '',
            date_slots: dateSlots
          };
        }),
        daily_rate: cra.daily_rate,
        currency: cra.currency,
        notes: cra.notes || '',
      });
    }
  }, [isEdit, existingCRA]);

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

  const handleDatesChange = (newDates) => {
    setFormData(prev => ({
      ...prev,
      selected_work_dates: newDates
    }));
  };

  const handleAddTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { name: '', description: '', date_slots: [] }]
    }));
  };

  const handleAddFromTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleSelectTemplate = (templateTask) => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...templateTask, date_slots: [] }]
    }));
  };

  const handleTaskChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const handleTaskDateSlotsChange = (index, newDateSlots) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) =>
        i === index ? { ...task, date_slots: newDateSlots } : task
      )
    }));
  };

  const handleOpenDatePicker = (index) => {
    setEditingTaskIndex(editingTaskIndex === index ? null : index);
  };

  const handleRemoveTask = (index) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null); // Clear any previous errors

    try {
      const payload = {
        customer_id: parseInt(formData.customer_id),
        period_month: parseInt(formData.period_month),
        period_year: parseInt(formData.period_year),
        selected_work_dates: formData.selected_work_dates,
        tasks_data: formData.tasks.map(t => {
          // Convert date_slots back to worked_dates for backend
          // Expand half-days into separate date entries
          const workedDates = [];
          t.date_slots.forEach(slot => {
            if (slot.period === 'full') {
              workedDates.push(slot.date);
            } else if (slot.period === 'morning') {
              workedDates.push(`${slot.date}:AM`);
            } else if (slot.period === 'afternoon') {
              workedDates.push(`${slot.date}:PM`);
            }
          });

          return {
            id: t.id || null,
            name: t.name,
            description: t.description,
            worked_dates: workedDates
          };
        }),
        daily_rate: parseFloat(formData.daily_rate),
        currency: formData.currency,
        notes: formData.notes,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      navigate('/cra');
    } catch (error) {
      console.error('Error saving CRA:', error);

      // Check if it's a duplicate CRA error
      if (error.response?.data?.non_field_errors) {
        const errors = error.response.data.non_field_errors;
        if (errors.some(err => err.includes('already exists'))) {
          setFormError('Un CRA existe déjà pour ce client et cette période. Veuillez modifier le CRA existant ou choisir une période différente.');
          setCurrentStep(1); // Go back to step 1 to change customer/period
        } else {
          setFormError(errors.join(', '));
        }
      } else if (error.response?.data) {
        // Handle field-specific errors
        const errorMessages = Object.entries(error.response.data)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setFormError(errorMessages);
      } else {
        setFormError('Erreur lors de l\'enregistrement du CRA: ' + (error.message || 'Erreur inconnue'));
      }
    }
  };

  // Validation logic
  const canProceedStep1 = formData.customer_id && formData.period_month && formData.period_year;
  const canProceedStep2 = formData.selected_work_dates.length > 0;

  // Calculate total days including half-days
  const totalAssignedDays = formData.tasks.reduce((sum, t) => {
    return sum + (t.date_slots || []).reduce((daySum, slot) => {
      return daySum + (slot.period === 'full' ? 1 : 0.5);
    }, 0);
  }, 0);

  const selectedDaysCount = formData.selected_work_dates.length;
  const canProceedStep3 = formData.tasks.length > 0 &&
    formData.tasks.every(t => t.name.trim()) &&
    totalAssignedDays <= selectedDaysCount;

  const totalDays = totalAssignedDays;
  const totalAmount = totalDays * parseFloat(formData.daily_rate || 0);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">

            {/* Page header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 font-bold">
                {isEdit ? 'Modifier le CRA' : 'Nouveau CRA'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Étape {currentStep} sur 4
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center">
                {[
                  { num: 1, label: 'Client & Période' },
                  { num: 2, label: 'Jours travaillés' },
                  { num: 3, label: 'Tâches' },
                  { num: 4, label: 'Récapitulatif' }
                ].map((step, index) => (
                  <React.Fragment key={step.num}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                        currentStep >= step.num
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {step.num}
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 mt-2 text-center">
                        {step.label}
                      </span>
                    </div>
                    {index < 3 && (
                      <div className={`h-1 w-full flex-1 self-start mt-5 ${
                        currentStep > step.num
                          ? 'bg-indigo-500'
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Erreur lors de l'enregistrement
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                      {formError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 ml-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Step 1: Customer & Period */}
              {currentStep === 1 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
                    Client et Période
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Client *
                      </label>
                      <select
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={handleInputChange}
                        className="form-select w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionnez un client</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.company ? `(${customer.company})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Mois *
                        </label>
                        <select
                          name="period_month"
                          value={formData.period_month}
                          onChange={handleInputChange}
                          className="form-select w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                          required
                        >
                          {monthNames.map((name, index) => (
                            <option key={index + 1} value={index + 1}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Année *
                        </label>
                        <input
                          type="number"
                          name="period_year"
                          value={formData.period_year}
                          onChange={handleInputChange}
                          className="form-input w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                          required
                          min="2020"
                          max="2099"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Calendar - Select Work Days */}
              {currentStep === 2 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Sélectionner les jours travaillés
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Période : <strong>{monthNames[formData.period_month - 1]} {formData.period_year}</strong>
                    <br />
                    Cliquez sur les jours du calendrier où vous avez travaillé
                  </p>

                  <CalendarDayPicker
                    month={parseInt(formData.period_month)}
                    year={parseInt(formData.period_year)}
                    selectedDates={formData.selected_work_dates}
                    onDatesChange={handleDatesChange}
                  />
                </div>
              )}

              {/* Step 3: Tasks & Day Assignment */}
              {currentStep === 3 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                        Tâches et attribution des jours
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Jours attribués: <span className={totalAssignedDays > selectedDaysCount ? 'text-red-500' : 'text-green-500 font-medium'}>
                          {totalAssignedDays}
                        </span> / {selectedDaysCount} sélectionnés
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddFromTemplate}
                        className="btn bg-green-500 hover:bg-green-600 text-white"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Catalogue
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTask}
                        className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
                      >
                        + Tâche manuelle
                      </button>
                    </div>
                  </div>

                  {formData.tasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <p>Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour commencer.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.tasks.map((task, index) => (
                        <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900/50">
                          <div className="grid grid-cols-12 gap-4 mb-3">
                            <div className="col-span-7">
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Nom de la tâche *
                              </label>
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                                placeholder="Ex: Développement frontend"
                                className="form-input w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                                required
                              />
                            </div>

                            <div className="col-span-3 flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Jours
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDatePicker(index)}
                                  className={`form-input w-full text-center font-medium ${
                                    (task.date_slots?.length || 0) > 0
                                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                      : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  {(() => {
                                    const totalDays = (task.date_slots || []).reduce((sum, slot) => {
                                      return sum + (slot.period === 'full' ? 1 : 0.5);
                                    }, 0);
                                    return totalDays;
                                  })()}
                                </button>
                              </div>
                            </div>

                            <div className="col-span-2 flex items-end justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveTask(index)}
                                className="btn border-red-200 hover:border-red-300 text-red-600"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          </div>

                          {/* Rich Text Description */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Description
                            </label>
                            <SimpleRichTextEditor
                              content={task.description || ''}
                              onChange={(html) => handleTaskChange(index, 'description', html)}
                              placeholder="Décrivez les détails de la tâche..."
                            />
                          </div>

                          {/* Calendar date picker for this task */}
                          {editingTaskIndex === index && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                              <TaskDatePicker
                                month={parseInt(formData.period_month)}
                                year={parseInt(formData.period_year)}
                                availableDates={formData.selected_work_dates}
                                selectedDateSlots={task.date_slots || []}
                                onDateSlotsChange={(newDateSlots) => handleTaskDateSlotsChange(index, newDateSlots)}
                                taskName={task.name}
                              />
                              <div className="mt-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskIndex(null)}
                                  className="btn border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 text-sm"
                                >
                                  Fermer le calendrier
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {totalAssignedDays > selectedDaysCount && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        ⚠️ Vous avez attribué plus de jours ({totalAssignedDays}) que sélectionnés ({selectedDaysCount}). Veuillez ajuster.
                      </p>
                    </div>
                  )}

                  {totalAssignedDays < selectedDaysCount && formData.tasks.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        ℹ️ Vous avez {selectedDaysCount - totalAssignedDays} jour(s) non attribué(s).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: TJM & Summary */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* TJM Section */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
                      Taux Journalier et Notes
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Taux Journalier Moyen (TJM) *
                        </label>
                        <input
                          type="number"
                          name="daily_rate"
                          value={formData.daily_rate}
                          onChange={handleInputChange}
                          className="form-input w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Devise
                        </label>
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleInputChange}
                          className="form-select w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="form-textarea w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                        placeholder="Notes additionnelles..."
                      />
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
                      Récapitulatif
                    </h2>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Client:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {customers.find(c => c.id === parseInt(formData.customer_id))?.name || '-'}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Période:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {monthNames[formData.period_month - 1]} {formData.period_year}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Jours travaillés:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {formData.selected_work_dates.length} jour(s)
                        </span>
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tâches:</p>
                        <ul className="space-y-2">
                          {formData.tasks.map((task, index) => {
                            const taskDays = (task.date_slots || []).reduce((sum, slot) => {
                              return sum + (slot.period === 'full' ? 1 : 0.5);
                            }, 0);
                            return (
                              <li key={index} className="text-sm flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">{task.name}</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                  {taskDays} jour(s)
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <div className="flex justify-between text-lg font-semibold">
                          <span className="text-slate-800 dark:text-slate-100">Total HT:</span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: formData.currency
                            }).format(totalAmount)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                          {totalDays} jours × {formData.daily_rate} {formData.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/cra')}
                  className="btn border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
                >
                  Annuler
                </button>

                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="btn border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
                    >
                      Précédent
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={
                        (currentStep === 1 && !canProceedStep1) ||
                        (currentStep === 2 && !canProceedStep2) ||
                        (currentStep === 3 && !canProceedStep3)
                      }
                      className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={createMutation.isLoading || updateMutation.isLoading}
                      className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createMutation.isLoading || updateMutation.isLoading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le CRA'}
                    </button>
                  )}
                </div>
              </div>
            </form>

          </div>
        </main>

        {/* Task Template Picker Modal */}
        <TaskTemplatePickerModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    </div>
  );
}

export default CRAForm;
