import React, { useState, useRef, useEffect } from 'react';
import Transition from '../utils/Transition';

function DropdownActions({ estimate, invoice, onAction }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const trigger = useRef(null);
  const dropdown = useRef(null);

  // Determine which entity we're working with
  const entity = estimate || invoice;
  const isEstimate = !!estimate;
  const isInvoice = !!invoice;

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleAction = (action) => {
    setDropdownOpen(false);
    // Small delay to ensure click event has finished propagating
    // before opening modals (prevents click-outside handlers from immediately closing them)
    setTimeout(() => {
      onAction(action);
    }, 100);
  };

  const isDraft = entity.status === 'draft';
  const isSent = entity.status === 'sent';
  const hasPDF = !!entity.pdf_file;
  const isSigned = isEstimate && entity.signature_status === 'signed';
  const canRequestSignature = isEstimate && isSent && entity.signature_status === 'none' && hasPDF;
  const canConvertToInvoice = isEstimate && (entity.status === 'accepted' || isSigned) && entity.status !== 'converted';

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actions</span>
        <svg
          className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" transform="rotate(90 8 8)" />
        </svg>
      </button>

      <Transition
        className="origin-top-right z-10 absolute top-full right-0 min-w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden mt-2"
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div
          ref={dropdown}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          <ul className="py-2">
            {/* Generate PDF */}
            <li>
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleAction('generate-pdf')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Generate PDF</span>
              </button>
            </li>

            {/* View PDF */}
            {hasPDF && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAction('view-pdf')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View PDF</span>
                </button>
              </li>
            )}

            {/* Download Signed PDF */}
            {isSigned && hasPDF && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
                  onClick={() => handleAction('download-signed-pdf')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Download Signed PDF</span>
                </button>
              </li>
            )}

            <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>

            {/* Send Email */}
            <li>
              <button
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isSent && hasPDF
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                onClick={() => isSent && hasPDF && handleAction('send-email')}
                disabled={!isSent || !hasPDF}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Send Email</span>
                {!isSent && <span className="ml-auto text-xs">(Sent only)</span>}
                {isSent && !hasPDF && <span className="ml-auto text-xs">(Need PDF)</span>}
              </button>
            </li>

            {/* Request Signature - Only for Estimates */}
            {isEstimate && (
              <li>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    canRequestSignature
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  onClick={() => canRequestSignature && handleAction('request-signature')}
                  disabled={!canRequestSignature}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Request Signature</span>
                  {!canRequestSignature && <span className="ml-auto text-xs">(Not available)</span>}
                </button>
              </li>
            )}

            {/* Record Payment - Only for Invoices */}
            {isInvoice && entity.status !== 'paid' && !entity.is_deposit_invoice && !entity.is_credit_note && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAction('record-payment')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Record Payment</span>
                </button>
              </li>
            )}

            {/* Generate Deposit Invoice - Only for regular invoices */}
            {isInvoice && !entity.is_deposit_invoice && !entity.is_credit_note && entity.status !== 'paid' && entity.status !== 'cancelled' && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAction('generate-deposit-invoice')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                  <span>Generate Deposit Invoice</span>
                </button>
              </li>
            )}

            {/* Convert to Invoice - Only for Estimates */}
            {isEstimate && canConvertToInvoice && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium"
                  onClick={() => handleAction('convert-to-invoice')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Convert to Invoice</span>
                </button>
              </li>
            )}

            <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>

            {/* Edit */}
            {isDraft && (
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAction('edit')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit {isEstimate ? 'Estimate' : 'Invoice'}</span>
                </button>
              </li>
            )}

            {/* Duplicate */}
            <li>
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleAction('duplicate')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Duplicate {isEstimate ? 'Estimate' : 'Invoice'}</span>
              </button>
            </li>

            {/* Delete */}
            {isDraft && (
              <>
                <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>
                <li>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    onClick={() => handleAction('delete')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete {isEstimate ? 'Estimate' : 'Invoice'}</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </Transition>
    </div>
  );
}

export default DropdownActions;
