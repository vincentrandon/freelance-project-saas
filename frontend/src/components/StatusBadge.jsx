import React from 'react';

/**
 * StatusBadge Component
 * A reusable status badge component with consistent styling across the app
 * Supports different status types with predefined colors
 */

const STATUS_CONFIGS = {
  // Invoice statuses
  draft: { label: 'Draft', color: 'bg-gray-500 dark:bg-gray-600 text-white' },
  sent: { label: 'Sent', color: 'bg-blue-500 dark:bg-blue-600 text-white' },
  paid: { label: 'Paid', color: 'bg-green-500 dark:bg-green-600 text-white' },
  overdue: { label: 'Overdue', color: 'bg-red-500 dark:bg-red-600 text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500 dark:bg-gray-600 text-white' },
  pending: { label: 'Pending', color: 'bg-yellow-500 dark:bg-yellow-600 text-white' },

  // Estimate statuses
  accepted: { label: 'Accepted', color: 'bg-green-500 dark:bg-green-600 text-white' },
  declined: { label: 'Declined', color: 'bg-red-500 dark:bg-red-600 text-white' },
  expired: { label: 'Expired', color: 'bg-gray-500 dark:bg-gray-600 text-white' },

  // Project statuses
  active: { label: 'Active', color: 'bg-green-500 dark:bg-green-600 text-white' },
  paused: { label: 'Paused', color: 'bg-yellow-500 dark:bg-yellow-600 text-white' },
  completed: { label: 'Completed', color: 'bg-blue-500 dark:bg-blue-600 text-white' },

  // Task statuses
  todo: { label: 'To Do', color: 'bg-gray-500 dark:bg-gray-600 text-white' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500 dark:bg-yellow-600 text-white' },

  // Signature statuses
  none: { label: 'No Signature', color: 'bg-gray-500 dark:bg-gray-600 text-white' },
  requested: { label: 'Requested', color: 'bg-yellow-500 dark:bg-yellow-600 text-white' },
  signed: { label: 'Signed', color: 'bg-green-500 dark:bg-green-600 text-white' },

  // Generic statuses
  success: { label: 'Success', color: 'bg-green-500 dark:bg-green-600 text-white' },
  warning: { label: 'Warning', color: 'bg-yellow-500 dark:bg-yellow-600 text-white' },
  error: { label: 'Error', color: 'bg-red-500 dark:bg-red-600 text-white' },
  info: { label: 'Info', color: 'bg-blue-500 dark:bg-blue-600 text-white' },
};

function StatusBadge({
  status,
  label,
  size = 'md',
  className = '',
  showDot = false
}) {
  const config = STATUS_CONFIGS[status?.toLowerCase()] || STATUS_CONFIGS.draft;
  const displayLabel = label || config.label;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.color}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      )}
      {displayLabel}
    </span>
  );
}

// Specific badge variants for common use cases
StatusBadge.Invoice = ({ status, ...props }) => (
  <StatusBadge status={status} {...props} />
);

StatusBadge.Estimate = ({ status, ...props }) => (
  <StatusBadge status={status} {...props} />
);

StatusBadge.Project = ({ status, ...props }) => (
  <StatusBadge status={status} showDot {...props} />
);

StatusBadge.Task = ({ status, ...props }) => (
  <StatusBadge status={status} {...props} />
);

StatusBadge.Signature = ({ status, ...props }) => (
  <StatusBadge status={status} size="sm" {...props} />
);

export default StatusBadge;
export { STATUS_CONFIGS };
