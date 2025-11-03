import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function DropdownActionsCRA({ cra, onAction }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null);
  const dropdown = useRef(null);

  // Update dropdown position when opened or on scroll
  const updatePosition = () => {
    if (trigger.current && dropdown.current) {
      const rect = trigger.current.getBoundingClientRect();
      const dropdownHeight = dropdown.current.offsetHeight || 400; // Estimated height if not yet rendered
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Determine if dropdown should open above or below
      const shouldOpenAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: shouldOpenAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.right - 240, // 240px = min-w-60 (60 * 4px)
      });
    }
  };

  useEffect(() => {
    if (dropdownOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [dropdownOpen]);

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

  const isDraft = cra.status === 'draft';
  const isPendingValidation = cra.status === 'pending_validation';
  const isValidated = cra.status === 'validated';
  const hasPDF = !!cra.pdf_file;

  return (
    <>
      <button
        ref={trigger}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-300 dark:hover:text-gray-400"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Actions</span>
        <svg
          className="w-5 h-5 fill-current"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="2" r="2" />
          <circle cx="8" cy="8" r="2" />
          <circle cx="8" cy="14" r="2" />
        </svg>
      </button>

      {createPortal(
        <div
          className="fixed"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999,
            display: dropdownOpen ? 'block' : 'none',
          }}
        >
          <div
            ref={dropdown}
            className="min-w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          >
            <ul className="py-2">
              {/* View CRA Details */}
              <li>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAction('view')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View CRA</span>
                </button>
              </li>

              <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>

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

              {/* View/Download PDF */}
              {hasPDF && (
                <li>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleAction('view-pdf')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download PDF</span>
                  </button>
                </li>
              )}

              <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>

              {/* Send for Validation - Only for draft */}
              {isDraft && (
                <li>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleAction('send-validation')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Send for Validation</span>
                  </button>
                </li>
              )}

              {/* Generate Invoice - Only for validated CRA */}
              {isValidated && (
                <li>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium"
                    onClick={() => handleAction('generate-invoice')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generate Invoice</span>
                  </button>
                </li>
              )}

              <li className="border-t border-gray-200 dark:border-gray-700 my-2"></li>

              {/* Edit - Only for draft */}
              {cra.can_edit && (
                <li>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleAction('edit')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit CRA</span>
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
                  <span>Duplicate CRA</span>
                </button>
              </li>

              {/* Delete - Only if can delete */}
              {cra.can_delete && (
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
                      <span>Delete CRA</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default DropdownActionsCRA;
