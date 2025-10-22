import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompleteOnboarding } from "../api/hooks";
import OnboardingImage from "../images/onboarding-image.jpg";

function Onboarding04() {
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (skipImport = false) => {
    setIsCompleting(true);
    try {
      await completeOnboarding.mutateAsync({ skip: false });
      navigate("/");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Failed to complete onboarding. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkipAndComplete = () => {
    handleComplete(true);
  };

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative flex">
        {/* Content */}
        <div className="w-full md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link className="block" to="/">
                  <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
                    <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
                  </svg>
                </Link>
                <div className="text-sm">
                  Have an account?{" "}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" to="/signin">
                    Sign In
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pt-12 pb-8">
                <div className="max-w-md mx-auto w-full">
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200 dark:bg-gray-700/60" aria-hidden="true"></div>
                    <ul className="relative flex justify-between w-full">
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white"
                          to="/onboarding-01"
                        >
                          1
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white"
                          to="/onboarding-02"
                        >
                          2
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white"
                          to="/onboarding-03"
                        >
                          3
                        </Link>
                      </li>
                      <li>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-violet-500 text-white">
                          4
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-8">
              <div className="max-w-md mx-auto">
                <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Import Existing Data</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Upload your existing invoices or estimates to automatically populate your data using AI
                </p>

                <div className="space-y-6 mb-8">
                  {/* Option 1: Import Now */}
                  <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-violet-400 dark:hover:border-violet-500 transition">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                          Import Documents Now
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Upload PDF invoices or estimates. Our AI will extract customers, projects, and tasks automatically.
                        </p>
                        <Link
                          to="/documents/import"
                          className="inline-flex items-center text-sm font-medium text-violet-500 hover:text-violet-600"
                          onClick={() => handleComplete(false)}
                        >
                          Go to Import
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Skip for Now */}
                  <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-600 transition">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                          Start Fresh
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Skip the import and start creating customers, projects, and invoices from scratch. You can always import later from Settings.
                        </p>
                        <button
                          onClick={handleSkipAndComplete}
                          disabled={isCompleting}
                          className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                        >
                          Skip and Go to Dashboard
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          AI-Powered Duplicate Detection
                        </h3>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                          Our system automatically detects duplicate customers, projects, and tasks to keep your data clean. You'll be able to review all matches before importing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link className="text-sm underline hover:no-underline" to="/onboarding-03">
                    &lt;- Back
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <img className="object-cover object-center w-full h-full" src={OnboardingImage} width="760" height="1024" alt="Onboarding" />
        </div>
      </div>
    </main>
  );
}

export default Onboarding04;
