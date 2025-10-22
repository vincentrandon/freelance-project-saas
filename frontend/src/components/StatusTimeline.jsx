import React, { useState } from 'react';

/**
 * StatusTimeline Component - Vertical Compact Design
 *
 * Displays a subtle vertical progress bar showing document lifecycle status.
 * Positioned at bottom-right of the page with minimal visual footprint.
 *
 * @param {string} type - 'invoice' or 'estimate'
 * @param {string} status - Current status of the document
 * @param {boolean} isDeposit - Is this a deposit invoice (for invoices)
 * @param {boolean} isCreditNote - Is this a credit note (for invoices)
 * @param {string} signatureStatus - Signature status (for estimates: pending/sent/signed/declined)
 * @param {boolean} isPartiallyInvoiced - Has deposits been made (for invoices)
 */
function StatusTimeline({
  type = 'invoice',
  status,
  isDeposit = false,
  isCreditNote = false,
  signatureStatus = null,
  isPartiallyInvoiced = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Define invoice lifecycle steps
  const invoiceSteps = [
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    ...(isPartiallyInvoiced ? [{ key: 'partially_invoiced', label: 'Deposit Paid' }] : []),
    { key: 'paid', label: 'Paid' }
  ];

  // Define estimate lifecycle steps
  const estimateSteps = [
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'signature', label: 'Signature' },
    { key: 'final', label: 'Final' }
  ];

  const steps = type === 'invoice' ? invoiceSteps : estimateSteps;

  // Special handling for deposit invoices, credit notes, and SOLDE invoices - show nothing (they don't have a lifecycle)
  // SOLDE invoices are created when an invoice is fully paid via deposits, so they're always in 'paid' state
  if (type === 'invoice' && (isDeposit || isCreditNote || status === 'cancelled')) {
    return null;
  }

  // Determine current step index based on status
  const getCurrentStepIndex = () => {
    if (type === 'invoice') {
      if (status === 'draft') return 0;
      if (status === 'sent') return 1;
      if (status === 'partially_invoiced' || isPartiallyInvoiced) {
        return invoiceSteps.findIndex(s => s.key === 'partially_invoiced');
      }
      if (status === 'paid') return invoiceSteps.length - 1;
      if (status === 'overdue') return 1; // Treat overdue as "sent but not paid"
      return 0;
    } else {
      // Estimate
      if (status === 'draft') return 0;
      if (status === 'sent') return 1;

      // Signature step (index 2)
      if (signatureStatus === 'pending' || signatureStatus === 'sent') return 2;

      // Final step (index 3)
      if (status === 'accepted' || signatureStatus === 'signed') return 3;
      if (status === 'declined' || signatureStatus === 'declined') return 3;
      if (status === 'expired') return 2;

      return 0;
    }
  };

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = steps[currentStepIndex];

  // Calculate progress percentage
  const progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;

  // Determine step status: completed, current, or upcoming
  const getStepStatus = (stepIndex) => {
    if (type === 'estimate' && status === 'declined' && stepIndex === 3) return 'declined';
    if (type === 'estimate' && status === 'expired' && stepIndex === 2) return 'expired';
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  // Get color for step status
  const getStepColor = (stepStatus) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-violet-500';
      case 'declined':
        return 'bg-red-500';
      case 'expired':
        return 'bg-orange-500';
      default:
        return 'bg-gray-300 dark:bg-gray-600';
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={`
        transition-all duration-300 ease-in-out
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-lg
        ${isExpanded ? 'p-4' : 'p-2'}
      `}>
        {/* Collapsed View */}
        {!isExpanded && (
          <div className="flex flex-col items-center gap-2">
            {/* Vertical Progress Bar */}
            <div className="relative w-1 h-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              {/* Progress Fill */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-500 to-green-500 transition-all duration-500"
                style={{ height: `${progressPercentage}%` }}
              />

              {/* Step Dots */}
              {steps.map((step, index) => {
                const stepStatus = getStepStatus(index);
                const position = ((steps.length - 1 - index) / (steps.length - 1)) * 100;

                return (
                  <div
                    key={step.key}
                    className="absolute left-1/2 -translate-x-1/2 transition-all duration-300"
                    style={{ bottom: `${position}%` }}
                  >
                    <div className={`
                      w-2 h-2 rounded-full transition-all duration-300
                      ${getStepColor(stepStatus)}
                      ${stepStatus === 'current' ? 'ring-2 ring-violet-300 dark:ring-violet-700 ring-offset-1' : ''}
                    `} />
                  </div>
                );
              })}
            </div>

            {/* Current Status Label */}
            <div className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {currentStep?.label}
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="w-48">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Status</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentStepIndex + 1}/{steps.length}
              </span>
            </div>

            {/* Vertical Bar with Steps */}
            <div className="relative pl-6">
              {/* Vertical Line */}
              <div className="absolute left-2 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                {/* Progress Fill */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-500 to-green-500 rounded-full transition-all duration-500"
                  style={{ height: `${progressPercentage}%` }}
                />
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const stepStatus = getStepStatus(index);
                  const isCurrent = stepStatus === 'current';
                  const isCompleted = stepStatus === 'completed';

                  return (
                    <div key={step.key} className="relative flex items-center">
                      {/* Step Dot */}
                      <div className={`
                        absolute -left-6 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 transition-all duration-300
                        ${getStepColor(stepStatus)}
                        ${isCurrent ? 'ring-2 ring-violet-300 dark:ring-violet-700 scale-125' : ''}
                      `}>
                        {isCompleted && (
                          <svg className="w-2 h-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Step Label */}
                      <div className={`
                        text-xs transition-all duration-300
                        ${isCurrent ? 'font-bold text-violet-700 dark:text-violet-300' : ''}
                        ${isCompleted ? 'text-green-700 dark:text-green-300' : ''}
                        ${stepStatus === 'upcoming' ? 'text-gray-500 dark:text-gray-400' : ''}
                        ${stepStatus === 'declined' ? 'text-red-700 dark:text-red-300' : ''}
                        ${stepStatus === 'expired' ? 'text-orange-700 dark:text-orange-300' : ''}
                      `}>
                        {step.label}
                        {isCurrent && (
                          <span className="ml-1 inline-block w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusTimeline;
