import React from 'react';

const categoryColors = {
  development: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  automation: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  ui_ux_design: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  graphic_design: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  video_editing: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  '3d_modeling': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  content_writing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  translation: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  marketing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  accounting: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
  audio_production: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  testing: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  consulting: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  documentation: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  research: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function TaskTemplateCard({ template, onUse, onDelete, onActivate, showActions = true }) {
  const categoryColor = categoryColors[template.category] || categoryColors.other;

  // Safely convert numeric fields
  const confidenceScore = Number(template.confidence_score) || 50;
  const avgHours = Number(template.average_estimated_hours) || 0;
  const avgRate = Number(template.average_hourly_rate) || 0;
  const minHours = Number(template.min_hours) || 0;
  const maxHours = Number(template.max_hours) || 0;

  const getConfidenceColor = (score) => {
    if (score >= 75) return 'text-emerald-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 75) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {template.name}
          </h3>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${categoryColor}`}>
            {template.category}
          </span>
        </div>
        {!template.is_active && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Inactive
          </span>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
            Avg Time
          </div>
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {avgHours} h
          </div>
          {minHours !== maxHours && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {minHours}h - {maxHours}h
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
            Avg Rate
          </div>
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            €{avgRate}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">per hour</div>
        </div>
      </div>

      {/* Confidence & Usage */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Confidence:</span>
          <span className={`text-sm font-medium ${getConfidenceColor(confidenceScore)}`}>
            {getConfidenceLabel(confidenceScore)} ({confidenceScore.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>{template.usage_count} uses</span>
        </div>
      </div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 5 && (
            <span className="px-2 py-1 rounded text-xs text-slate-500 dark:text-slate-400">
              +{template.tags.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          {template.is_active ? (
            <>
              {onUse && (
                <button
                  onClick={() => onUse(template)}
                  className="flex-1 btn-sm bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  Use Template
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(template.id)}
                  className="btn-sm border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                  title="Deactivate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </>
          ) : (
            onActivate && (
              <button
                onClick={() => onActivate(template.id)}
                className="flex-1 btn-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Reactivate
              </button>
            )
          )}
        </div>
      )}

      {/* Last Used */}
      {template.last_used_at && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          Last used: {new Date(template.last_used_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default TaskTemplateCard;
