import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

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

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

export default TiptapEditor;
