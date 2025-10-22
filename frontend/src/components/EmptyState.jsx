import React from 'react';

/**
 * EmptyState Component
 * A reusable empty state component with icon, title, description, and optional action button
 * Used across the app for consistent empty state UI
 */
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="flex justify-center mb-4">
          {typeof icon === 'string' ? (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">
              {icon}
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Pre-configured variants for common use cases
EmptyState.Customers = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    }
    title="No customers yet"
    description="Get started by adding your first customer. You can then create projects, invoices, and estimates for them."
    actionLabel="Add Customer"
    onAction={onAction}
  />
);

EmptyState.Projects = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    }
    title="No projects yet"
    description="Create your first project to start tracking tasks, hours, and financials for your customers."
    actionLabel="New Project"
    onAction={onAction}
  />
);

EmptyState.Invoices = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    title="No invoices yet"
    description="Start creating invoices to bill your customers for completed work and services."
    actionLabel="Create Invoice"
    onAction={onAction}
  />
);

EmptyState.Estimates = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    title="No estimates yet"
    description="Create estimates to quote project costs to your customers before starting work."
    actionLabel="Create Estimate"
    onAction={onAction}
  />
);

EmptyState.Tasks = ({ onAction }) => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    }
    title="No tasks yet"
    description="Break down your project into manageable tasks to track progress and estimate time."
    actionLabel="Create Task"
    onAction={onAction}
  />
);

EmptyState.SearchResults = () => (
  <EmptyState
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    title="No results found"
    description="Try adjusting your search or filter criteria to find what you're looking for."
  />
);

export default EmptyState;
