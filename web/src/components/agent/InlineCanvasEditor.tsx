import { useState, useEffect } from 'react'
import { Eye, Edit3, Save, X } from 'lucide-react'
import { RenderMarkdown } from '@/components/ui/RenderMarkdown'

type InlineCanvasEditorProps = {
  content: string
  onSave: (newContent: string) => void
  onClose: () => void
}

export function InlineCanvasEditor({
  content: initialContent,
  onSave,
  onClose,
}: InlineCanvasEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isPreview, setIsPreview] = useState(true)

  // Update content when prop changes
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const handleSave = () => {
    onSave(content)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-default flex items-center justify-between bg-tertiary">
        <div className="flex items-center gap-2">
          {/* Edit/Preview toggle */}
          <button
            onClick={() => setIsPreview(false)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              !isPreview
                ? 'bg-secondary text-primary'
                : 'text-secondary hover:bg-secondary/50'
            }`}
          >
            <Edit3 className="w-3 h-3" strokeWidth={1.5} />
            Edit
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              isPreview
                ? 'bg-secondary text-primary'
                : 'text-secondary hover:bg-secondary/50'
            }`}
          >
            <Eye className="w-3 h-3" strokeWidth={1.5} />
            Preview
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-accent text-on-accent rounded text-xs font-medium hover:bg-accent-hover transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3 h-3" strokeWidth={1.5} />
            Save
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors text-secondary"
            aria-label="Close editor"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isPreview ? (
          // Preview mode
          <div className="h-full overflow-y-auto p-4 bg-primary">
            <div className="prose prose-invert prose-sm max-w-none">
              <RenderMarkdown>{content}</RenderMarkdown>
            </div>
          </div>
        ) : (
          // Edit mode
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-primary border-none p-4 text-sm text-primary font-mono resize-none focus:outline-none focus:ring-0"
            placeholder="Edit content in Markdown..."
            autoFocus
          />
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-default bg-tertiary">
        <span className="text-xs text-tertiary">
          {content.length} characters · Markdown supported
        </span>
      </div>
    </div>
  )
}
