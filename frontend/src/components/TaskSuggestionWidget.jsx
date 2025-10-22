import React, { useState, useEffect } from 'react';
import { useSearchTaskCatalogue, useSuggestTasks } from '../api/hooks';
import TaskTemplateCard from './TaskTemplateCard';

/**
 * Task Suggestion Widget
 * Shows task template suggestions based on search or project description
 * Integrates with estimate creation to quickly add tasks
 */
function TaskSuggestionWidget({
  projectDescription = '',
  customerName = '',
  onAddTask,
  compact = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchMutation = useSearchTaskCatalogue();
  const suggestMutation = useSuggestTasks();

  // Auto-suggest based on project description when widget loads
  useEffect(() => {
    if (projectDescription && projectDescription.length > 20) {
      handleAutoSuggest();
    }
  }, [projectDescription]);

  const handleAutoSuggest = async () => {
    try {
      const result = await suggestMutation.mutateAsync({
        project_description: projectDescription,
        customer_name: customerName,
        limit: 6,
      });

      setSuggestions(result.data?.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Auto-suggest failed:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const result = await searchMutation.mutateAsync({
        query,
        limit: 6,
      });

      setSuggestions(result.data?.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleUseTemplate = (template) => {
    if (onAddTask) {
      // Create task item from template
      const taskItem = {
        description: template.name,
        quantity: template.average_estimated_hours,
        unit_price: template.average_hourly_rate,
        amount: template.average_estimated_hours * template.average_hourly_rate,
        _template_id: template.id, // Store template ID for reference
      };

      onAddTask(taskItem);
    }
  };

  if (compact) {
    // Compact mode for inline display in estimate creation
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            💡 Task Suggestions
          </h4>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-indigo-500 hover:text-indigo-600"
          >
            {showSuggestions ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search task templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="form-input w-full text-sm"
          />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {suggestMutation.isPending || searchMutation.isPending ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No templates found' : 'No suggestions available'}
              </div>
            ) : (
              suggestions.map((suggestion, index) => {
                const template = suggestion.template || suggestion;
                return (
                  <div
                    key={template.id || index}
                    className="bg-white dark:bg-slate-800 rounded p-3 flex items-start justify-between hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {template.average_estimated_hours}h × €{template.average_hourly_rate} = €
                        {(template.average_estimated_hours * template.average_hourly_rate).toFixed(2)}
                      </div>
                      {suggestion.relevance_score && (
                        <div className="text-xs text-emerald-600 mt-1">
                          {suggestion.relevance_score}% match
                        </div>
                      )}
                      {suggestion.match_score && (
                        <div className="text-xs text-emerald-600 mt-1">
                          {suggestion.match_score}% match
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="ml-3 flex-shrink-0 btn-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Helper Text */}
        {suggestions.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
            Click "+ Add" to insert template into estimate
          </div>
        )}
      </div>
    );
  }

  // Full mode for standalone display
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Task Template Suggestions
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Find and reuse task templates from your catalogue
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Search Templates
        </label>
        <input
          type="text"
          placeholder="Search by task name..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="form-input w-full"
        />
      </div>

      {/* Auto-suggest button */}
      {projectDescription && (
        <div className="mb-4">
          <button
            onClick={handleAutoSuggest}
            disabled={suggestMutation.isPending}
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white w-full"
          >
            {suggestMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing project...
              </>
            ) : (
              <>🪄 Get AI Suggestions</>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      <div>
        {searchMutation.isPending || suggestMutation.isPending ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {searchQuery ? 'No matching templates found' : 'Start typing to search or click "Get AI Suggestions"'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) => {
              const template = suggestion.template || suggestion;
              return (
                <TaskTemplateCard
                  key={template.id || index}
                  template={template}
                  onUse={handleUseTemplate}
                  showActions={true}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskSuggestionWidget;
