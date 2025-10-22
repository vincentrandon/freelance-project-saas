import React, { useEffect, useState } from 'react';
import { useSuggestLineItem } from '../api/hooks';

function LineItemSuggestions({
  description,
  customerId,
  projectContext,
  historicalContext,
  onApply,
  onApplyQuantity,
  onApplyRate,
  isVisible
}) {
  const suggestMutation = useSuggestLineItem();
  const [suggestions, setSuggestions] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Don't fetch if description is too short
    if (!description || description.trim().length < 3 || !isVisible) {
      setSuggestions(null);
      return;
    }

    // Faster debounce - show suggestions quicker
    const timer = setTimeout(() => {
      suggestMutation.mutate({
        item_description: description,
        customer_id: customerId,
        project_context: projectContext,
        historical_context: historicalContext  // Pass cached historical data
      }, {
        onSuccess: (response) => {
          setSuggestions(response.data);
        },
        onError: (error) => {
          console.error('Failed to get suggestions:', error);
          // Don't clear suggestions on error - keep previous ones
          // setSuggestions(null);
        }
      });
    }, 300); // Reduced from 500ms to 300ms for faster response

    return () => clearTimeout(timer);
  }, [description, customerId, projectContext, historicalContext, isVisible]);

  const handleApplyAll = () => {
    if (onApply && suggestions) {
      onApply({
        quantity: suggestions.suggested_hours,
        rate: suggestions.suggested_rate,
        amount: suggestions.suggested_amount
      });
      setSuggestions(null);
    }
  };

  const handleApplyQuantity = () => {
    if (onApplyQuantity && suggestions) {
      onApplyQuantity(suggestions.suggested_hours);
    }
  };

  const handleApplyRate = () => {
    if (onApplyRate && suggestions) {
      onApplyRate(suggestions.suggested_rate);
    }
  };

  if (!isVisible || !suggestions) {
    return null;
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">AI Suggestion</span>
            {suggestions.confidence && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                suggestions.confidence === 'high'
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30'
                  : suggestions.confidence === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                  : 'bg-gray-500/20 text-gray-100 border border-gray-400/30'
              }`}>
                {suggestions.confidence} confidence
              </span>
            )}
          </div>
          <button
            onClick={handleApplyAll}
            disabled={suggestMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-violet-600 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apply All
          </button>
        </div>
      </div>

      <div className="p-4">
        {suggestMutation.isPending ? (
          <div className="flex items-center justify-center gap-3 py-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-violet-200 border-t-violet-600"></div>
              <div className="absolute inset-0 rounded-full border-2 border-violet-100"></div>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Analyzing similar tasks...</span>
          </div>
        ) : (
          <>
            {/* Stats Grid - Stripe/Linear inspired with individual action buttons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all group">
                <div className="flex items-start justify-between mb-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</div>
                  {onApplyQuantity && (
                    <button
                      onClick={handleApplyQuantity}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded"
                      title="Apply quantity"
                    >
                      <svg className="w-3 h-3 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {suggestions.suggested_hours}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">hours</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all group">
                <div className="flex items-start justify-between mb-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Rate</div>
                  {onApplyRate && (
                    <button
                      onClick={handleApplyRate}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded"
                      title="Apply rate"
                    >
                      <svg className="w-3 h-3 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  €{suggestions.suggested_rate}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">/hr</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg px-3 py-2.5 border border-violet-200 dark:border-violet-800">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Total</div>
                <div className="text-lg font-bold text-violet-700 dark:text-violet-300">
                  €{suggestions.suggested_amount}
                </div>
              </div>
            </div>

            {/* Reasoning Section */}
            {suggestions.reasoning && (
              <div className="mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
                      !isExpanded && suggestions.reasoning.length > 150 ? 'line-clamp-2' : ''
                    }`}>
                      {suggestions.reasoning}
                    </p>
                    {suggestions.reasoning.length > 150 && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mt-1.5 inline-flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Show less
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            Read more
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Historical Tasks */}
            {suggestions.similar_historical_tasks && suggestions.similar_historical_tasks.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Based on {suggestions.similar_historical_tasks.length} similar task{suggestions.similar_historical_tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {suggestions.similar_historical_tasks.slice(0, 3).map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-900/50 rounded-lg px-2.5 py-2 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group">
                      <div className="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors truncate">
                        {task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LineItemSuggestions;
