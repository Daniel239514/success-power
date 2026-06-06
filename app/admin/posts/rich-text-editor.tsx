'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// A small rich-text editor. It edits formatted text and hands the parent plain
// HTML (via onChange), which we store in posts.body_html.
//
// `value` is the starting HTML (empty for a new post; the saved HTML when
// editing in Step F).
export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    // REQUIRED in Next's App Router: render the editor after mount, not during
    // the server render, otherwise React throws a hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // We only offer H2 and H3 in the toolbar (H1 is the post title itself).
        heading: { levels: [2, 3] },
        // Links open in a new tab and don't navigate while you're editing.
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: value,
    // Every keystroke/format change pushes the latest HTML up to the form.
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'rich-text min-h-[12rem] rounded-b-md border border-t-0 border-slate-300 px-3 py-2 text-sm focus:outline-none',
      },
    },
  })

  if (!editor) return null

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

// --- The toolbar -----------------------------------------------------------

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-slate-300 bg-slate-50 p-1.5">
      <Btn editor={editor} label="B" title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="font-bold" />

      <Btn editor={editor} label="I" title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="italic" />

      <Divider />

      <Btn editor={editor} label="H2" title="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />

      <Btn editor={editor} label="H3" title="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />

      <Divider />

      <Btn editor={editor} label="• List" title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()} />

      <Btn editor={editor} label="1. List" title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} />

      <Divider />

      <Btn editor={editor} label="Link" title="Add/remove link"
        active={editor.isActive('link')}
        onClick={() => setLink(editor)} />

      <Divider />

      <Btn editor={editor} label="↶" title="Undo"
        active={false}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()} />

      <Btn editor={editor} label="↷" title="Redo"
        active={false}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()} />
    </div>
  )
}

// Prompt for a URL and apply it to the selection. Empty input removes the link.
function setLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined
  const url = window.prompt('Link URL (leave blank to remove):', previous ?? '')

  // Cancelled the prompt — change nothing.
  if (url === null) return

  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-slate-300" />
}

// One toolbar button. Active = gold (brand), matching the rest of the app.
function Btn({
  label,
  title,
  active,
  onClick,
  disabled,
  className = '',
}: {
  editor: Editor
  label: string
  title: string
  active: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-[#c9a84c] text-black'
          : 'text-slate-700 hover:bg-slate-200'
      } ${className}`}
    >
      {label}
    </button>
  )
}
