import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTaskCatalogue, useSearchTaskCatalogue } from '../api/hooks';

function TaskTemplatePickerModal({ isOpen, onClose, onSelectTemplate }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: templates = [], isLoading } = useTaskCatalogue({
    category: selectedCategory || undefined,
    is_active: true
  });

  const searchMutation = useSearchTaskCatalogue();

  const categories = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'development', label: 'Développement' },
    { value: 'design', label: 'Design' },
    { value: 'testing', label: 'Tests' },
    { value: 'deployment', label: 'Déploiement' },
    { value: 'consulting', label: 'Conseil' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'research', label: 'Recherche' },
    { value: 'other', label: 'Autre' },
  ];

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        await searchMutation.mutateAsync({
          query: searchQuery,
          category: selectedCategory || undefined,
          limit: 50
        });
      } catch (error) {
        console.error('Error searching templates:', error);
      }
    }
  };

  const handleSelectTemplate = (template) => {
    onSelectTemplate({
      id: null, // New task, not existing
      name: template.name,
      description: template.description || '',
      worked_dates: [],
      templateId: template.id,
      estimatedHours: template.average_estimated_hours || 0
    });
    onClose();
  };

  const displayTemplates = searchMutation.isSuccess && searchQuery.trim()
    ? searchMutation.data?.data?.results || []
    : templates;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Catalogue de tâches
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher une tâche..."
                className="form-input w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-100"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searchMutation.isPending}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
            >
              {searchMutation.isPending ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Chargement...</p>
            </div>
          ) : displayTemplates.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Aucune tâche trouvée dans le catalogue.</p>
              <p className="text-sm mt-2">Créez des templates en convertissant vos tâches existantes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        {template.name}
                        {template.match_score && (
                          <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">
                            Match: {Math.round(template.match_score)}%
                          </span>
                        )}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {categories.find(c => c.value === template.category)?.label || template.category}
                        </span>
                        {template.tags && template.tags.length > 0 && template.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {template.average_estimated_hours || 0}h
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {template.usage_count || 0} utilisations
                      </div>
                      {template.confidence_score && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Confiance: {Math.round(template.confidence_score)}%
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {displayTemplates.length} {displayTemplates.length === 1 ? 'tâche trouvée' : 'tâches trouvées'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskTemplatePickerModal;
