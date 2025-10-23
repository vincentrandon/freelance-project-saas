import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentPreview, useGetAllClarificationSuggestions, useBulkRefineTasks, useSkipClarification } from '../../api/hooks';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';

function TaskClarification() {
  const { t } = useTranslation();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch preview data and suggestions
  const { data: preview, isLoading: previewLoading } = useDocumentPreview(documentId);
  const getAllSuggestions = useGetAllClarificationSuggestions();
  const bulkRefineTasks = useBulkRefineTasks();
  const skipClarification = useSkipClarification();

  // State
  const [tasks, setTasks] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [editedTasks, setEditedTasks] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'success', 'error'
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);

  // Load suggestions when preview is available
  useEffect(() => {
    if (preview && preview.id) {
      loadSuggestions();
    }
  }, [preview]);

  // Progress timer for loading suggestions
  useEffect(() => {
    if (!loadingSuggestions) {
      setLoadingProgress(0);
      setEstimatedTimeRemaining(null);
      return;
    }

    const startTime = Date.now();
    const estimatedDuration = 8000; // Estimate 8 seconds for AI processing

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95); // Cap at 95% until actually done
      const remaining = Math.max(Math.ceil((estimatedDuration - elapsed) / 1000), 0);

      setLoadingProgress(progress);
      setEstimatedTimeRemaining(remaining);

      if (progress >= 95) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loadingSuggestions]);

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const result = await getAllSuggestions.mutateAsync(preview.id);

      if (result.tasks.length === 0) {
        // No tasks need clarification - redirect to preview
        navigate(`/documents/preview/${documentId}`);
        return;
      }

      setTasks(result.tasks);

      // Auto-expand first task
      if (result.tasks.length > 0) {
        setExpandedTasks({ [result.tasks[0].index]: true });
      }

    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle accepting AI suggestion
  const handleAcceptSuggestion = (taskIndex) => {
    const task = tasks.find(t => t.index === taskIndex);
    if (task && task.ai_suggestion) {
      setEditedTasks(prev => ({
        ...prev,
        [taskIndex]: {
          ...task.ai_suggestion,
          accepted: true
        }
      }));
    }
  };

  // Handle field change
  const handleFieldChange = (taskIndex, field, value) => {
    setEditedTasks(prev => ({
      ...prev,
      [taskIndex]: {
        ...(prev[taskIndex] || tasks.find(t => t.index === taskIndex).original),
        [field]: value,
        accepted: false
      }
    }));
  };

  // Toggle task expansion
  const toggleTaskExpand = (taskIndex) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskIndex]: !prev[taskIndex]
    }));
  };

  // Get current values for a task (edited or original)
  const getTaskValues = (taskIndex) => {
    return editedTasks[taskIndex] || tasks.find(t => t.index === taskIndex).original;
  };

  // Check if task has been modified
  const isTaskModified = (taskIndex) => {
    return !!editedTasks[taskIndex];
  };

  // Save all changes
  const handleSaveAll = async () => {
    try {
      setSaveStatus('saving');

      // Prepare tasks array with only modified tasks
      const tasksToUpdate = Object.keys(editedTasks).map(taskIndex => ({
        index: parseInt(taskIndex),
        name: editedTasks[taskIndex].name,
        description: editedTasks[taskIndex].description,
        estimated_hours: editedTasks[taskIndex].estimated_hours,
        category: editedTasks[taskIndex].category
      }));

      if (tasksToUpdate.length === 0) {
        // No changes - just skip all
        await handleSkipAll();
        return;
      }

      await bulkRefineTasks.mutateAsync({
        previewId: preview.id,
        documentId: documentId,  // Pass documentId for cache invalidation
        tasks: tasksToUpdate
      });

      setSaveStatus('success');

      // Wait a moment to show success, then navigate
      setTimeout(() => {
        navigate(`/documents/preview/${documentId}`);
      }, 1000);

    } catch (error) {
      console.error('Error saving tasks:', error);
      setSaveStatus('error');
    }
  };

  // Skip all clarifications
  const handleSkipAll = async () => {
    try {
      await skipClarification.mutateAsync({
        previewId: preview.id,
        skip_all: true
      });
      navigate(`/documents/preview/${documentId}`);
    } catch (error) {
      console.error('Error skipping:', error);
    }
  };

  // Get clarity badge color
  const getClarityBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  // Get clarity icon
  const getClarityIcon = (score) => {
    if (score >= 80) return '✅';
    if (score >= 60) return '⚠️';
    return '❌';
  };

  if (previewLoading || loadingSuggestions) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center max-w-md w-full px-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-gray-100 font-medium mb-2">{t('documents.clarification.loadingSuggestions', { defaultValue: 'Loading AI suggestions...' })}</p>

              {/* Progress bar */}
              {loadingProgress > 0 && (
                <div className="mt-4">
                  <div className="bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700 mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{Math.round(loadingProgress)}%</span>
                    {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                      <span className="text-gray-400">
                        {t('documents.clarification.timeRemaining', {
                          defaultValue: '~{{seconds}}s remaining',
                          seconds: estimatedTimeRemaining
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-gray-500 text-sm mt-4">
                {t('documents.clarification.analyzingTasks', { defaultValue: 'AI is analyzing tasks and generating smart suggestions...' })}
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate(`/documents/import`)}
                className="inline-flex items-center text-violet-400 hover:text-violet-300 mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('documents.clarification.backToImports', { defaultValue: 'Back to Imports' })}
              </button>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl text-gray-100 font-bold flex items-center">
                    <svg className="w-8 h-8 mr-3 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('documents.clarification.reviewTasks', { defaultValue: 'Review & Clarify Tasks' })}
                  </h1>
                  <p className="text-gray-400 mt-2">
                    {t('documents.clarification.reviewDescription', {
                      defaultValue: 'Review AI suggestions and refine task details for accurate time estimates',
                      count: tasks.length
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-400">{t('documents.clarification.tasksToReview', { defaultValue: 'Tasks to Review' })}</div>
                  <div className="text-2xl font-bold text-violet-400">{tasks.length}</div>
                </div>
              </div>

              {/* Info banner */}
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-300">
                    {t('documents.clarification.infoBanner', {
                      defaultValue: 'AI has detected some tasks that need more details for accurate estimation. You can accept AI suggestions with one click or manually edit the fields.'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-4 mb-6">
              {tasks.map((task, idx) => {
                const isExpanded = expandedTasks[task.index];
                const isModified = isTaskModified(task.index);
                const currentValues = getTaskValues(task.index);
                const hasSuggestion = !!task.ai_suggestion;
                const suggestionAccepted = editedTasks[task.index]?.accepted;

                return (
                  <div key={task.index} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    {/* Task Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                      onClick={() => toggleTaskExpand(task.index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-xs font-medium text-gray-400 mr-3">
                              {t('documents.clarification.task', { defaultValue: 'TASK' })} {idx + 1} / {tasks.length}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getClarityBadgeColor(task.clarity_score)}`}>
                              {getClarityIcon(task.clarity_score)} {task.clarity_score}% {t('documents.clarification.clarity', { defaultValue: 'Clarity' })}
                            </span>
                            {isModified && (
                              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                ✏️ {t('documents.clarification.modified', { defaultValue: 'Modified' })}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-medium text-gray-100 mb-1">
                            {currentValues.name || task.original.name}
                          </h3>
                          {!isExpanded && (
                            <p className="text-sm text-gray-400 line-clamp-1">
                              {currentValues.description || task.original.description || t('common.noDescription', { defaultValue: 'No description' })}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Task Details (Expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-700">
                        {/* AI Suggestion Box */}
                        {hasSuggestion && !suggestionAccepted && (
                          <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-lg p-4 mb-4 mt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-violet-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="text-sm font-medium text-violet-300">
                                  {t('documents.clarification.aiSuggestion', { defaultValue: 'AI Suggestion' })}
                                  {task.ai_suggestion.confidence && (
                                    <span className="ml-2 text-violet-400">({task.ai_suggestion.confidence}% {t('common.confidence', { defaultValue: 'confidence' })})</span>
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() => handleAcceptSuggestion(task.index)}
                                className="btn-sm bg-violet-500 hover:bg-violet-600 text-white transition-colors"
                              >
                                ✓ {t('documents.clarification.acceptSuggestion', { defaultValue: 'Accept' })}
                              </button>
                            </div>

                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-gray-400">{t('common.name', { defaultValue: 'Name' })}:</span>
                                <p className="text-gray-200 mt-1">{task.ai_suggestion.name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">{t('common.description', { defaultValue: 'Description' })}:</span>
                                <p className="text-gray-200 mt-1">{task.ai_suggestion.description}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <span className="text-gray-400">{t('common.hours', { defaultValue: 'Hours' })}:</span>
                                  <p className="text-gray-200 font-medium">{task.ai_suggestion.estimated_hours}h</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">{t('common.category', { defaultValue: 'Category' })}:</span>
                                  <p className="text-gray-200 font-medium capitalize">{task.ai_suggestion.category}</p>
                                </div>
                              </div>
                              {task.ai_suggestion.reasoning && (
                                <div className="pt-2 border-t border-violet-500/20">
                                  <span className="text-gray-400 text-xs">{t('documents.clarification.reasoning', { defaultValue: 'Reasoning' })}:</span>
                                  <p className="text-gray-300 text-xs mt-1 italic">{task.ai_suggestion.reasoning}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Editable Fields */}
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              {t('common.taskName', { defaultValue: 'Task Name' })} *
                            </label>
                            <input
                              type="text"
                              value={currentValues.name}
                              onChange={(e) => handleFieldChange(task.index, 'name', e.target.value)}
                              className="w-full form-input bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500 rounded-lg"
                              placeholder={t('documents.clarification.taskNamePlaceholder', { defaultValue: 'Enter a specific task name...' })}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              {t('common.description', { defaultValue: 'Description' })}
                            </label>
                            <textarea
                              value={currentValues.description || ''}
                              onChange={(e) => handleFieldChange(task.index, 'description', e.target.value)}
                              rows={4}
                              className="w-full form-textarea bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500 rounded-lg"
                              placeholder={t('documents.clarification.descriptionPlaceholder', { defaultValue: 'Describe what needs to be done, how, and why...' })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t('common.estimatedHours', { defaultValue: 'Estimated Hours' })}
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={currentValues.estimated_hours}
                                onChange={(e) => handleFieldChange(task.index, 'estimated_hours', parseFloat(e.target.value) || 0)}
                                className="w-full form-input bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t('common.category', { defaultValue: 'Category' })}
                              </label>
                              <select
                                value={currentValues.category}
                                onChange={(e) => handleFieldChange(task.index, 'category', e.target.value)}
                                className="w-full form-select bg-gray-700 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500 rounded-lg"
                              >
                                <option value="development">{t('categories.development', { defaultValue: 'Development' })}</option>
                                <option value="design">{t('categories.design', { defaultValue: 'Design' })}</option>
                                <option value="testing">{t('categories.testing', { defaultValue: 'Testing' })}</option>
                                <option value="deployment">{t('categories.deployment', { defaultValue: 'Deployment' })}</option>
                                <option value="consulting">{t('categories.consulting', { defaultValue: 'Consulting' })}</option>
                                <option value="documentation">{t('categories.documentation', { defaultValue: 'Documentation' })}</option>
                                <option value="maintenance">{t('categories.maintenance', { defaultValue: 'Maintenance' })}</option>
                                <option value="research">{t('categories.research', { defaultValue: 'Research' })}</option>
                                <option value="other">{t('categories.other', { defaultValue: 'Other' })}</option>
                              </select>
                            </div>
                          </div>

                          {/* Issues Found */}
                          {task.issues && task.issues.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                              <div className="flex items-start">
                                <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-yellow-300 mb-1">{t('documents.clarification.issuesFound', { defaultValue: 'Issues Found:' })}</p>
                                  <ul className="text-sm text-yellow-200 space-y-1">
                                    {task.issues.map((issue, i) => (
                                      <li key={i}>• {issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkipAll}
                  disabled={saveStatus === 'saving'}
                  className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 transition-colors disabled:opacity-50"
                >
                  {t('documents.clarification.skipAll', { defaultValue: 'Skip All' })}
                </button>

                <div className="flex items-center space-x-4">
                  {saveStatus === 'error' && (
                    <span className="text-sm text-red-400">
                      {t('common.saveFailed', { defaultValue: 'Save failed. Please try again.' })}
                    </span>
                  )}
                  {saveStatus === 'success' && (
                    <span className="text-sm text-green-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('common.saved', { defaultValue: 'Saved!' })}
                    </span>
                  )}

                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus === 'saving'}
                    className="btn bg-violet-500 hover:bg-violet-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('common.saving', { defaultValue: 'Saving...' })}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('documents.clarification.saveAndContinue', { defaultValue: 'Save & Continue' })}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default TaskClarification;
