import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadDocuments, useGenerateEstimateFromPrompt } from '../api/hooks';

function QuickActions() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const uploadMutation = useUploadDocuments();
  const generateMutation = useGenerateEstimateFromPrompt();

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      uploadMutation.mutate(files, {
        onSuccess: () => {
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
      setAiPrompt('');
      navigate('/invoicing');
    } catch (error) {
      console.error('Error generating estimate:', error);
      alert('Error generating estimate. Please try again.');
    }
  };

  return (
    <>
      <div className="px-3 mb-6">
        {/* Quick Actions Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-lg py-3 px-4 shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
            Quick Actions
          </span>
        </button>

        {/* Quick Actions Menu */}
        {showMenu && (
          <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Upload Invoice/Estimate */}
            <label className="block cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="px-4 py-3 flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Upload Document
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Import invoice/estimate
                  </p>
                </div>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Generate AI Estimate */}
            <button
              onClick={() => {
                setShowMenu(false);
                setShowAIDialog(true);
              }}
              className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="px-4 py-3 flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    AI Estimate
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Generate from description
                  </p>
                </div>
              </div>
            </button>

            {/* Create Customer */}
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/customers');
              }}
              className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="px-4 py-3 flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    New Customer
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add customer manually
                  </p>
                </div>
              </div>
            </button>

            {/* Create Project */}
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/projects');
              }}
              className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="px-4 py-3 flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    New Project
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start a new project
                  </p>
                </div>
              </div>
            </button>

            {/* View Pending Imports */}
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/documents/import');
              }}
              className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-3 flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Pending Imports
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Review waiting documents
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* AI Estimate Generation Dialog */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

export default QuickActions;
