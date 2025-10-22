import React, { useState } from 'react';
import {
  useTaskCatalogue,
  useSearchTaskCatalogue,
  useTaskCatalogueAnalytics,
  useDeleteTaskTemplate,
  useActivateTaskTemplate,
} from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ModalBasic from '../components/ModalBasic';
import TaskTemplateCard from '../components/TaskTemplateCard';
import EmptyState from '../components/EmptyState';

function TaskCatalogue() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Fetch task catalogue
  const { data: catalogueData, isLoading, refetch } = useTaskCatalogue({
    category: selectedCategory || undefined,
    is_active: !showInactive,
  });

  // Handle different API response formats
  const templates = Array.isArray(catalogueData)
    ? catalogueData
    : (catalogueData?.results || catalogueData?.data || []);

  // Fetch analytics
  const { data: analytics } = useTaskCatalogueAnalytics();

  // Search mutation
  const searchMutation = useSearchTaskCatalogue();
  const deleteMutation = useDeleteTaskTemplate();
  const activateMutation = useActivateTaskTemplate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        const result = await searchMutation.mutateAsync({
          query: searchQuery,
          category: selectedCategory,
          limit: 20,
        });
        // Search returns different format - extract results
        const searchResults = result.data?.results || [];
        // TODO: Update UI to show search results
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      refetch();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this template?')) {
      await deleteMutation.mutateAsync(id);
      refetch();
    }
  };

  const handleActivate = async (id) => {
    await activateMutation.mutateAsync(id);
    refetch();
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'development', label: 'Development' },
    { value: 'design', label: 'Design' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'research', label: 'Research' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 font-bold">
                  Task Catalogue 📋
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Reusable task templates with historical time estimates
                </p>
              </div>
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Total Templates
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {analytics.total_templates}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Total Usage
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {analytics.total_usage}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Avg Confidence
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {analytics.average_confidence.toFixed(0)}%
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
                    High Confidence
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {analytics.high_confidence_templates}
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input w-full"
                  />
                </div>

                {/* Category Filter */}
                <div className="min-w-[150px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-select w-full"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show Inactive */}
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      Show inactive
                    </span>
                  </label>
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
                  disabled={searchMutation.isPending}
                >
                  {searchMutation.isPending ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Templates Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                }
                title="No task templates yet"
                description="Start by importing invoices/estimates with AI, or create templates manually. Your catalogue will grow automatically!"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <TaskTemplateCard
                    key={template.id}
                    template={template}
                    onDelete={() => handleDelete(template.id)}
                    onActivate={() => handleActivate(template.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default TaskCatalogue;
