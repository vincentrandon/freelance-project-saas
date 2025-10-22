import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject, useDeleteProject, useUpdateProjectNotes } from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import StatusBadge from '../components/StatusBadge';
import TiptapEditor from '../components/TiptapEditor';

const STATUS_COLORS = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  completed: 'bg-blue-500',
  archived: 'bg-gray-500',
};

const TASK_STATUS_COLORS = {
  todo: 'bg-gray-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
};

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [notesJson, setNotesJson] = useState(null);

  const { data: project, isLoading, error } = useProject(id);
  const deleteMutation = useDeleteProject();
  const updateNotesMutation = useUpdateProjectNotes();

  // Get related data
  const projectTasks = project?.tasks || [];
  const projectInvoices = project?.invoices || [];
  const projectEstimates = project?.estimates || [];

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(id);
        navigate('/projects');
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateNotesMutation.mutateAsync({
        id,
        notes_json: notesJson,
      });
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // Initialize notes when project loads
  React.useEffect(() => {
    if (project && !notesJson) {
      setNotesJson(project.notes_json || { type: 'doc', content: [{ type: 'paragraph' }] });
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="text-center py-12">
                <p className="text-red-400">Error loading project</p>
                <button
                  onClick={() => navigate('/projects')}
                  className="mt-4 btn bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Back to Projects
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Sidebar Navigation (Desktop) */}
            <div className="hidden md:flex md:flex-col w-72 bg-gray-800/50 border-r border-gray-700">
              {/* Back Button */}
              <div className="px-6 py-5 border-b border-gray-700">
                <button
                  onClick={() => navigate('/projects')}
                  className="flex items-center text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Projects
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex-shrink-0 border-b border-gray-700">
                <nav className="space-y-1 px-3 py-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-violet-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'tasks'
                        ? 'bg-violet-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tasks
                    {projectTasks.length > 0 && (
                      <span className="ml-auto bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-xs">
                        {projectTasks.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('financial')}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'financial'
                        ? 'bg-violet-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Financial
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('notes');
                      if (!notesJson) {
                        setNotesJson(project.notes_json || { type: 'doc', content: [{ type: 'paragraph' }] });
                      }
                    }}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'notes'
                        ? 'bg-violet-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notes
                  </button>
                </nav>
              </div>

              {/* Project Quick Stats */}
              <div className="px-3 pt-6 pb-4 border-t border-gray-700">
                <div className="space-y-3 px-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-200 font-medium">
                      {project.total_estimated_hours > 0
                        ? Math.round((project.total_actual_hours / project.total_estimated_hours) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${project.total_estimated_hours > 0
                          ? Math.min((project.total_actual_hours / project.total_estimated_hours) * 100, 100)
                          : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{Number(project.total_actual_hours).toFixed(1)}h spent</span>
                    <span>{Number(project.total_estimated_hours).toFixed(1)}h estimated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-700 bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <button
                        onClick={() => navigate('/projects')}
                        className="md:hidden mr-3 text-gray-400 hover:text-gray-200"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h1 className="text-2xl font-bold text-gray-100 truncate">{project.name}</h1>
                      <div className="ml-3">
                        <StatusBadge.Project status={project.status} showDot />
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{project.customer_name}</span>
                      {project.start_date && (
                        <>
                          <span className="mx-2">•</span>
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Started {new Date(project.start_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/projects/edit/${id}`)}
                      className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Mobile Tab Navigation */}
                <div className="md:hidden mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                  {['overview', 'tasks', 'financial', 'notes'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === 'notes') {
                          setNotesJson(project.notes_json || { type: 'doc', content: [{ type: 'paragraph' }] });
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                        activeTab === tab
                          ? 'bg-violet-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-100 mb-4">Key Metrics</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Estimated Hours</span>
                              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="text-3xl font-bold text-gray-100">{Number(project.total_estimated_hours).toFixed(1)}</div>
                            <div className="text-xs text-gray-500 mt-1">hours budgeted</div>
                          </div>

                          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Actual Hours</span>
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="text-3xl font-bold text-gray-100">{Number(project.total_actual_hours).toFixed(1)}</div>
                            <div className="text-xs text-gray-500 mt-1">hours tracked</div>
                          </div>

                          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Total Invoiced</span>
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="text-3xl font-bold text-gray-100">€{Number(project.total_invoiced).toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-1">revenue generated</div>
                          </div>

                          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Profit Margin</span>
                              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                            <div className="text-3xl font-bold text-gray-100">{Number(project.profit_margin).toFixed(1)}%</div>
                            <div className="text-xs text-gray-500 mt-1">profitability</div>
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-100 mb-4">Project Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</label>
                            <p className="mt-1 text-gray-100">{project.customer_name}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                            <p className="mt-1">
                              <StatusBadge.Project status={project.status} showDot />
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Budget</label>
                            <p className="mt-1 text-gray-100 font-semibold">€{Number(project.estimated_budget).toLocaleString()}</p>
                          </div>
                          {project.start_date && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
                              <p className="mt-1 text-gray-100">{new Date(project.start_date).toLocaleDateString()}</p>
                            </div>
                          )}
                          {project.end_date && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
                              <p className="mt-1 text-gray-100">{new Date(project.end_date).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                        {project.description && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                            <p className="mt-2 text-gray-300 text-sm leading-relaxed">{project.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                          <div className="text-4xl font-bold text-gray-100 mb-1">{project.task_count}</div>
                          <div className="text-sm text-gray-400">Total Tasks</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                          <div className="text-4xl font-bold text-gray-100 mb-1">{project.invoice_count}</div>
                          <div className="text-sm text-gray-400">Invoices</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                          <div className="text-4xl font-bold text-gray-100 mb-1">{project.estimate_count}</div>
                          <div className="text-sm text-gray-400">Estimates</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks Tab */}
                  {activeTab === 'tasks' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-100">Tasks</h2>
                          <p className="text-sm text-gray-400 mt-1">
                            {projectTasks.filter(t => t.status === 'completed').length} of {projectTasks.length} completed
                          </p>
                        </div>
                      </div>

                      {projectTasks.length === 0 ? (
                        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                          <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-100">No tasks</h3>
                          <p className="mt-1 text-sm text-gray-400">Get started by creating a new task.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projectTasks.map((task) => (
                            <div key={task.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-gray-100 font-medium">{task.name}</h4>
                                    <StatusBadge.Task status={task.status} size="sm" />
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-gray-400 leading-relaxed">{task.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm pt-3 border-t border-gray-700">
                                <div className="flex items-center text-gray-400">
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs">Est: {Number(task.estimated_hours).toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <span className="text-xs">Actual: {Number(task.actual_hours).toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs">€{Number(task.hourly_rate).toFixed(0)}/h</span>
                                </div>
                                <div className="ml-auto flex items-center font-semibold text-green-400">
                                  <span className="text-base">€{Number(task.amount).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financial Tab */}
                  {activeTab === 'financial' && (
                    <div className="space-y-6">
                      {/* Invoices Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-100">Invoices</h2>
                          <span className="text-sm text-gray-400">{projectInvoices.length} total</span>
                        </div>

                        {projectInvoices.length === 0 ? (
                          <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                            <svg className="mx-auto h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-400">No invoices yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {projectInvoices.map((invoice) => (
                              <div
                                key={invoice.id}
                                onClick={() => navigate(`/invoicing/invoices/${invoice.id}`)}
                                className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-violet-500 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="text-gray-100 font-medium">{invoice.invoice_number}</h4>
                                      <StatusBadge.Invoice status={invoice.status} size="sm" />
                                    </div>
                                    <p className="text-sm text-gray-400">
                                      Issued {new Date(invoice.issue_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-gray-100">€{Number(invoice.total).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Estimates Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-100">Estimates</h2>
                          <span className="text-sm text-gray-400">{projectEstimates.length} total</span>
                        </div>

                        {projectEstimates.length === 0 ? (
                          <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                            <svg className="mx-auto h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-400">No estimates yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {projectEstimates.map((estimate) => (
                              <div
                                key={estimate.id}
                                onClick={() => navigate(`/invoicing/estimates/${estimate.id}`)}
                                className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-violet-500 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="text-gray-100 font-medium">{estimate.estimate_number}</h4>
                                      <StatusBadge.Estimate status={estimate.status} size="sm" />
                                    </div>
                                    <p className="text-sm text-gray-400">
                                      Issued {new Date(estimate.issue_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-gray-100">€{Number(estimate.total).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                    <div className="max-w-5xl mx-auto">
                      {/* Notion-style header */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-2xl font-semibold text-gray-100">Notes</h2>
                              <p className="text-sm text-gray-500 mt-0.5">Document your project thoughts and decisions</p>
                            </div>
                          </div>
                          <button
                            onClick={handleSaveNotes}
                            disabled={updateNotesMutation.isPending}
                            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                          >
                            {updateNotesMutation.isPending ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Notion-style editor */}
                      {notesJson && (
                        <TiptapEditor
                          initialContent={notesJson}
                          onChange={setNotesJson}
                        />
                      )}

                      {/* Last saved indicator */}
                      <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                          {updateNotesMutation.isSuccess && (
                            <span className="inline-flex items-center gap-1.5 text-green-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Saved successfully
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectDetail;
