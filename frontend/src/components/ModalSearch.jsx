import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Transition from '../utils/Transition';
import { useUploadDocuments, useGenerateEstimateFromPrompt } from '../api/hooks';

function ModalSearch({
  id,
  searchId,
  modalOpen,
  setModalOpen
}) {

  const modalContent = useRef(null);
  const navigate = useNavigate();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const uploadMutation = useUploadDocuments();
  const generateMutation = useGenerateEstimateFromPrompt();

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!modalOpen || modalContent.current.contains(target)) return
      setModalOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!modalOpen || keyCode !== 27) return;
      setModalOpen(false);
      setShowAIDialog(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // No need to focus on input since we removed the search field
  // useEffect(() => {
  //   modalOpen && searchInput.current && searchInput.current.focus();
  // }, [modalOpen]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      uploadMutation.mutate(files, {
        onSuccess: () => {
          setModalOpen(false);
          navigate('/documents/import');
        }
      });
    }
  };

  const handleGenerateEstimate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      await generateMutation.mutateAsync({
        project_description: aiPrompt,
      });
      setShowAIDialog(false);
      setModalOpen(false);
      setAiPrompt('');
      navigate('/invoicing');
    } catch (error) {
      console.error('Error generating estimate:', error);
      alert('Error generating estimate. Please try again.');
    }
  };

  return (
    <>
      {/* Modal backdrop */}
      <Transition
        className="fixed inset-0 bg-gray-900/30 z-50 transition-opacity"
        show={modalOpen}
        enter="transition ease-out duration-200"
        enterStart="opacity-0"
        enterEnd="opacity-100"
        leave="transition ease-out duration-100"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
        aria-hidden="true"
      />
      {/* Modal dialog */}
      <Transition
        id={id}
        className="fixed inset-0 z-50 overflow-hidden flex items-start top-20 mb-4 justify-center px-4 sm:px-6"
        role="dialog"
        aria-modal="true"
        show={modalOpen}
        enter="transition ease-in-out duration-200"
        enterStart="opacity-0 translate-y-4"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-in-out duration-200"
        leaveStart="opacity-100 translate-y-0"
        leaveEnd="opacity-0 translate-y-4"
      >
        <div
          ref={modalContent}
          className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700/60 overflow-auto max-w-2xl w-full max-h-full rounded-lg shadow-lg"
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/60 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-800 dark:text-gray-100">Quick Actions</div>
              <button
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setModalOpen(false)}
              >
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4 fill-current">
                  <path d="M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="py-3 px-2">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2">Actions</div>
            <ul className="text-sm">
              {/* Upload Document */}
              <li>
                <label className="flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">Upload Invoice/Estimate</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Import PDF with AI extraction</div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </li>

              {/* AI Generate Estimate */}
              <li>
                <button
                  onClick={() => {
                    setShowAIDialog(true);
                  }}
                  className="w-full flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">Generate AI Estimate</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Create estimate from description</div>
                  </div>
                </button>
              </li>

              {/* Pending Imports */}
              <li>
                <Link
                  to="/documents/import"
                  onClick={() => setModalOpen(false)}
                  className="flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">View Pending Imports</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Review waiting documents</div>
                  </div>
                </Link>
              </li>
            </ul>

            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2 mt-4">Navigate</div>
            <ul className="text-sm">
              {/* Quick Links */}
              <li>
                <Link
                  to="/customers"
                  onClick={() => setModalOpen(false)}
                  className="flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">Customers</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Manage your customers</div>
                  </div>
                </Link>
              </li>

              <li>
                <Link
                  to="/projects"
                  onClick={() => setModalOpen(false)}
                  className="flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">Projects</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">View all projects</div>
                  </div>
                </Link>
              </li>

              <li>
                <Link
                  to="/invoicing"
                  onClick={() => setModalOpen(false)}
                  className="flex items-center p-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">Invoicing</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Invoices & estimates</div>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Transition>

      {/* AI Estimate Generation Dialog */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Generate AI Estimate
              </h3>
              <button
                onClick={() => {
                  setShowAIDialog(false);
                  setAiPrompt('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Describe your project and AI will generate a detailed estimate based on your historical data.
            </p>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="E.g., Build a mobile app for food delivery with iOS and Android support. Customer needs MVP in 3 months."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              rows={5}
            />

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAIDialog(false);
                  setAiPrompt('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateEstimate}
                disabled={!aiPrompt.trim() || generateMutation.isPending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generateMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Estimate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ModalSearch;
