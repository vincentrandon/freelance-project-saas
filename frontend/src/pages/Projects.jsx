import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectNotes,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useProjectInvoices,
  useProjectEstimates,
  useCustomers,
} from '../api/hooks';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ModalBasic from '../components/ModalBasic';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

// Slash Command Menu Component
const CommandsList = React.forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      title: 'Heading 1',
      description: 'Big section heading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <text x="2" y="18" fontSize="20" fontWeight="bold" fill="currentColor">H1</text>
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <text x="2" y="18" fontSize="18" fontWeight="bold" fill="currentColor">H2</text>
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <text x="2" y="18" fontSize="16" fontWeight="bold" fill="currentColor">H3</text>
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'Code Block',
      description: 'Capture a code snippet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCodeBlock().run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setBlockquote().run();
      },
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  const filteredCommands = props.query
    ? commands.filter(command =>
        command.title.toLowerCase().includes(props.query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.query]);

  const selectItem = (index) => {
    const command = filteredCommands[index];
    if (command) {
      command.command(props);
    }
  };

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + filteredCommands.length - 1) % filteredCommands.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % filteredCommands.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (filteredCommands.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 min-w-[280px]">
        <div className="px-3 py-2 text-sm text-gray-400">No results</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 min-w-[280px] max-h-[400px] overflow-y-auto">
      {filteredCommands.map((command, index) => (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
            index === selectedIndex
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <div className={`mt-0.5 ${index === selectedIndex ? 'text-violet-400' : 'text-gray-400'}`}>
            {command.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{command.title}</div>
            <div className="text-xs text-gray-500">{command.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
});

CommandsList.displayName = 'CommandsList';

// Create slash command extension
const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

function TiptapEditor({ initialContent, onChange }) {
  // Ensure we have valid content for Tiptap
  const validContent = initialContent && Object.keys(initialContent).length > 0 
    ? initialContent 
    : { type: 'doc', content: [{ type: 'paragraph' }] };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Type "/" for commands',
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }) => {
            return [
              {
                title: 'Heading 1',
                description: 'Big section heading',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
                },
              },
              {
                title: 'Heading 2',
                description: 'Medium section heading',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
                },
              },
              {
                title: 'Heading 3',
                description: 'Small section heading',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
                },
              },
              {
                title: 'Bullet List',
                description: 'Create a simple bullet list',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).toggleBulletList().run();
                },
              },
              {
                title: 'Numbered List',
                description: 'Create a list with numbering',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).toggleOrderedList().run();
                },
              },
              {
                title: 'Code Block',
                description: 'Capture a code snippet',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setCodeBlock().run();
                },
              },
              {
                title: 'Quote',
                description: 'Capture a quote',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setBlockquote().run();
                },
              },
              {
                title: 'Divider',
                description: 'Visually divide blocks',
                command: ({ editor, range }) => {
                  editor.chain().focus().deleteRange(range).setHorizontalRule().run();
                },
              },
            ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
          },
          render: () => {
            let component;
            let popup;

            return {
              onStart: (props) => {
                component = new ReactRenderer(CommandsList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return component.ref?.onKeyDown(props);
              },
              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: validContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-invert prose-lg max-w-none min-h-[500px] px-16 py-8',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Notion-style minimal toolbar */}
      <div className="border-b border-gray-700/50 px-4 py-2 bg-gray-800/30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('bold') 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('italic') 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              editor.isActive('heading', { level: 1 }) 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              editor.isActive('heading', { level: 2 }) 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              editor.isActive('heading', { level: 3 }) 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Heading 3"
          >
            H3
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('bulletList') 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('orderedList') 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('codeBlock') 
                ? 'bg-gray-700 text-violet-400' 
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title="Code Block"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>
      </div>
      {/* Notion-style editor area */}
      <div className="bg-transparent">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projectsData, isLoading } = useProjects();
  const projects = projectsData?.results || [];
  const { data: customersData } = useCustomers();
  const customers = customersData?.results || [];
  
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const updateNotesMutation = useUpdateProjectNotes();
  
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    customer: '',
    estimated_budget: '',
  });

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [notesJson, setNotesJson] = useState({ type: 'doc', content: [{ type: 'paragraph' }] });
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    name: '',
    description: '',
    status: 'todo',
    estimated_hours: '',
    actual_hours: '',
    hourly_rate: '',
  });
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Fetch selected project details
  const { data: selectedProject } = useProject(selectedProjectId, { enabled: !!selectedProjectId });
  const { data: projectInvoicesData } = useProjectInvoices(selectedProjectId, { enabled: !!selectedProjectId });
  const { data: projectEstimatesData } = useProjectEstimates(selectedProjectId, { enabled: !!selectedProjectId });
  const { data: tasksData } = useTasks({ project: selectedProjectId }, { enabled: !!selectedProjectId });
  
  const projectInvoices = projectInvoicesData || [];
  const projectEstimates = projectEstimatesData || [];
  const projectTasks = tasksData?.results || [];

  // Clear selected project when modal closes
  useEffect(() => {
    if (!detailsOpen) {
      setTimeout(() => {
        setSelectedProjectId(null);
      }, 100);
    }
  }, [detailsOpen]);

  const handleOpenModal = () => {
    // Navigate to create page instead of opening modal
    navigate('/projects/create');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleOpenDetails = (projectId) => {
    // Navigate to detail page instead of opening modal
    navigate(`/projects/${projectId}`);
  };


  const handleSaveNotes = async () => {
    if (!selectedProjectId) return;
    try {
      await updateNotesMutation.mutateAsync({ id: selectedProjectId, notesJson });
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskFormData({
        name: task.name,
        description: task.description || '',
        status: task.status,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        hourly_rate: task.hourly_rate,
      });
    } else {
      setEditingTaskId(null);
      setTaskFormData({
        name: '',
        description: '',
        status: 'todo',
        estimated_hours: '',
        actual_hours: '',
        hourly_rate: '',
      });
    }
    setTimeout(() => {
      setTaskModalOpen(true);
    }, 0);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...taskFormData,
        project: selectedProjectId,
      };
      
      if (editingTaskId) {
        await updateTaskMutation.mutateAsync({ id: editingTaskId, data: taskData });
      } else {
        await createTaskMutation.mutateAsync(taskData);
      }
      setTaskModalOpen(false);
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const STATUS_COLORS = {
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-red-500',
  };

  const TASK_STATUS_COLORS = {
    todo: 'bg-gray-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
  };

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count projects by status
  const statusCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    paused: projects.filter(p => p.status === 'paused').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">{t('navigation.projects')}</h1>
                <button onClick={handleOpenModal} className="btn bg-violet-500 hover:bg-violet-600 text-white">
                  + {t('projects.newProject')}
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('projects.searchPlaceholder')}
                className="w-full max-w-md px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-gray-100 placeholder-gray-500 transition-all duration-200"
              />

              {/* Status Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  { key: 'all', label: t('projects.allProjects') },
                  { key: 'active', label: t('projects.status.active') },
                  { key: 'paused', label: t('projects.status.paused') },
                  { key: 'completed', label: t('projects.status.completed') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                      statusFilter === key
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {label}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      statusFilter === key
                        ? 'bg-violet-700 text-violet-200'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {statusCounts[key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              searchQuery || statusFilter !== 'all' ? (
                <EmptyState.SearchResults />
              ) : (
                <EmptyState.Projects onAction={handleOpenModal} />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition cursor-pointer"
                    onClick={() => handleOpenDetails(project.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-100 mb-1 truncate">{project.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{project.customer_name}</p>
                      </div>
                      <StatusBadge.Project status={project.status} showDot />
                    </div>
                    
                    {project.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Estimated Hours</p>
                        <p className="text-gray-200 font-semibold">{Number(project.total_estimated_hours).toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Actual Hours</p>
                        <p className="text-gray-200 font-semibold">{Number(project.total_actual_hours).toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total Invoiced</p>
                        <p className="text-green-400 font-semibold">€{Number(project.total_invoiced).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Tasks</p>
                        <p className="text-gray-200 font-semibold">{project.task_count}</p>
                      </div>
                    </div>
                    
                    {project.start_date && (
                      <p className="text-xs text-gray-500">
                        Started: {new Date(project.start_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Project Modal */}
      <ModalBasic modalOpen={modalOpen} setModalOpen={setModalOpen} title="New Project">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Customer *</label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="form-select w-full bg-gray-700 text-gray-100 border-gray-600"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-select w-full bg-gray-700 text-gray-100 border-gray-600"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Budget (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_budget}
                  onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-700">
            <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn bg-gray-700 hover:bg-gray-600 text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            </div>
          </div>
        </form>
      </ModalBasic>

      {/* Project Details Panel - Full screen side panel */}
      {detailsOpen && selectedProject && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out animate-in fade-in"
            onClick={() => setDetailsOpen(false)}
          />
          
          {/* Side Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[90vw] lg:w-[75vw] xl:w-[70vw] flex shadow-2xl transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
            <div className="flex w-full bg-gray-900 overflow-hidden">
              {/* Sidebar Navigation */}
              <div className="hidden md:flex md:flex-col w-64 bg-gray-800 border-r border-gray-700">
                <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                  <div className="px-5 mb-6">
                    <button
                      onClick={() => setDetailsOpen(false)}
                      className="flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-sm font-medium">Back to Projects</span>
                    </button>
                  </div>
                  
                  <nav className="flex-1 px-3 space-y-1">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'overview'
                          ? 'bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-violet-400'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
                      }`}
                    >
                      <svg className={`mr-3 h-5 w-5 ${activeTab === 'overview' ? 'text-violet-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Overview
                    </button>

                    <button
                      onClick={() => setActiveTab('tasks')}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'tasks'
                          ? 'bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-violet-400'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
                      }`}
                    >
                      <svg className={`mr-3 h-5 w-5 ${activeTab === 'tasks' ? 'text-violet-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Tasks
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        activeTab === 'tasks' ? 'bg-violet-500/20 text-violet-300' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {projectTasks.length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('financial');
                      }}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'financial'
                          ? 'bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-violet-400'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
                      }`}
                    >
                      <svg className={`mr-3 h-5 w-5 ${activeTab === 'financial' ? 'text-violet-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Financial
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        activeTab === 'financial' ? 'bg-violet-500/20 text-violet-300' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {projectInvoices.length + projectEstimates.length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('notes');
                        setNotesJson(selectedProject.notes_json || { type: 'doc', content: [{ type: 'paragraph' }] });
                      }}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'notes'
                          ? 'bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-violet-400'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
                      }`}
                    >
                      <svg className={`mr-3 h-5 w-5 ${activeTab === 'notes' ? 'text-violet-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes
                    </button>
                  </nav>

                  {/* Project Quick Stats */}
                  <div className="px-3 pt-6 pb-4 border-t border-gray-700">
                    <div className="space-y-3 px-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-gray-200 font-medium">
                          {selectedProject.total_estimated_hours > 0 
                            ? Math.round((selectedProject.total_actual_hours / selectedProject.total_estimated_hours) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${selectedProject.total_estimated_hours > 0 
                              ? Math.min((selectedProject.total_actual_hours / selectedProject.total_estimated_hours) * 100, 100)
                              : 0}%` 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{Number(selectedProject.total_actual_hours).toFixed(1)}h spent</span>
                        <span>{Number(selectedProject.total_estimated_hours).toFixed(1)}h estimated</span>
                      </div>
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
                          onClick={() => setDetailsOpen(false)}
                          className="md:hidden mr-3 text-gray-400 hover:text-gray-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-100 truncate">{selectedProject.name}</h1>
                        <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[selectedProject.status]}`}>
                          {selectedProject.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{selectedProject.customer_name}</span>
                        {selectedProject.start_date && (
                          <>
                            <span className="mx-2">•</span>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Started {new Date(selectedProject.start_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={() => setDetailsOpen(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                            setNotesJson(selectedProject.notes_json || { type: 'doc', content: [{ type: 'paragraph' }] });
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
                              <div className="text-3xl font-bold text-gray-100">{Number(selectedProject.total_estimated_hours).toFixed(1)}</div>
                              <div className="text-xs text-gray-500 mt-1">hours budgeted</div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Actual Hours</span>
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div className="text-3xl font-bold text-gray-100">{Number(selectedProject.total_actual_hours).toFixed(1)}</div>
                              <div className="text-xs text-gray-500 mt-1">hours tracked</div>
                            </div>

                            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Total Invoiced</span>
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="text-3xl font-bold text-gray-100">€{Number(selectedProject.total_invoiced).toLocaleString()}</div>
                              <div className="text-xs text-gray-500 mt-1">revenue generated</div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Profit Margin</span>
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              </div>
                              <div className="text-3xl font-bold text-gray-100">{Number(selectedProject.profit_margin).toFixed(1)}%</div>
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
                              <p className="mt-1 text-gray-100">{selectedProject.customer_name}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                              <p className="mt-1">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[selectedProject.status]}`}>
                                  {selectedProject.status}
                                </span>
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Budget</label>
                              <p className="mt-1 text-gray-100 font-semibold">€{Number(selectedProject.estimated_budget).toLocaleString()}</p>
                            </div>
                            {selectedProject.start_date && (
                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
                                <p className="mt-1 text-gray-100">{new Date(selectedProject.start_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {selectedProject.end_date && (
                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
                                <p className="mt-1 text-gray-100">{new Date(selectedProject.end_date).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                          {selectedProject.description && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                              <p className="mt-2 text-gray-300 text-sm leading-relaxed">{selectedProject.description}</p>
                            </div>
                          )}
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                            <div className="text-4xl font-bold text-gray-100 mb-1">{selectedProject.task_count}</div>
                            <div className="text-sm text-gray-400">Total Tasks</div>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                            <div className="text-4xl font-bold text-gray-100 mb-1">{selectedProject.invoice_count}</div>
                            <div className="text-sm text-gray-400">Invoices</div>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                            <div className="text-4xl font-bold text-gray-100 mb-1">{selectedProject.estimate_count}</div>
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
                          <button
                            onClick={() => handleOpenTaskModal()}
                            className="btn bg-violet-500 hover:bg-violet-600 text-white"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Task
                          </button>
                        </div>

                        {projectTasks.length === 0 ? (
                          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-100">No tasks</h3>
                            <p className="mt-1 text-sm text-gray-400">Get started by creating a new task.</p>
                            <div className="mt-6">
                              <button
                                onClick={() => handleOpenTaskModal()}
                                className="btn bg-violet-500 hover:bg-violet-600 text-white"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Task
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {projectTasks.map((task) => (
                              <div key={task.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-gray-100 font-medium">{task.name}</h4>
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${TASK_STATUS_COLORS[task.status]}`}>
                                        {task.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-gray-400 leading-relaxed">{task.description}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1 ml-4">
                                    <button
                                      onClick={() => handleOpenTaskModal(task)}
                                      className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                                      title="Edit task"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                                      title="Delete task"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
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
                                <div key={invoice.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-gray-100 font-medium">{invoice.invoice_number}</h4>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
                                          invoice.status === 'paid' ? 'bg-green-500' :
                                          invoice.status === 'sent' ? 'bg-blue-500' :
                                          invoice.status === 'overdue' ? 'bg-red-500' :
                                          'bg-gray-500'
                                        }`}>
                                          {invoice.status}
                                        </span>
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
                                <div key={estimate.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-gray-100 font-medium">{estimate.estimate_number}</h4>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
                                          estimate.status === 'accepted' ? 'bg-green-500' :
                                          estimate.status === 'sent' ? 'bg-blue-500' :
                                          estimate.status === 'declined' ? 'bg-red-500' :
                                          estimate.status === 'expired' ? 'bg-gray-500' :
                                          'bg-yellow-500'
                                        }`}>
                                          {estimate.status}
                                        </span>
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
                        <TiptapEditor
                          initialContent={notesJson}
                          onChange={setNotesJson}
                        />
                        
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
          </div>
        </>
      )}

      {/* Task Modal */}
      <ModalBasic modalOpen={taskModalOpen} setModalOpen={setTaskModalOpen} title={editingTaskId ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmitTask}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Task Name *</label>
              <input
                type="text"
                required
                value={taskFormData.name}
                onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                rows="3"
                className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={taskFormData.status}
                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                className="form-select w-full bg-gray-700 text-gray-100 border-gray-600"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={taskFormData.estimated_hours}
                  onChange={(e) => setTaskFormData({ ...taskFormData, estimated_hours: e.target.value })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Actual Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={taskFormData.actual_hours}
                  onChange={(e) => setTaskFormData({ ...taskFormData, actual_hours: e.target.value })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hourly Rate (€)</label>
                <input
                  type="number"
                  step="1"
                  value={taskFormData.hourly_rate}
                  onChange={(e) => setTaskFormData({ ...taskFormData, hourly_rate: e.target.value })}
                  className="form-input w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-700">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="btn bg-gray-700 hover:bg-gray-600 text-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
              >
                {(createTaskMutation.isPending || updateTaskMutation.isPending) ? 'Saving...' : editingTaskId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>
    </div>
  );
}

export default Projects;
