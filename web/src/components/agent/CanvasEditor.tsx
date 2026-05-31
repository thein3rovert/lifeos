import { useState } from 'react'
import { X, Eye, Edit3 } from 'lucide-react'
import { RenderMarkdown } from '@/components/ui/RenderMarkdown'

type CanvasEditorProps = {
  isOpen: boolean
  initialContent: string
  onSave: (content: string) => void
  onClose: () => void
}

export function CanvasEditor({
  isOpen,
  initialContent,
  onSave,
  onClose,
}: CanvasEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isPreview, setIsPreview] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    onSave(content)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-primary/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-secondary border border-default rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-4 py-3 border-b border-default flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-4 h-4 text-secondary" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-primary">Edit Content</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview toggle */}
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                isPreview
                  ? 'bg-tertiary text-primary'
                  : 'hover:bg-tertiary text-secondary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
              Preview
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-tertiary rounded-md transition-colors"
              aria-label="Close editor"
            >
              <X className="w-4 h-4 text-secondary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex">
          {isPreview ? (
            // Preview mode
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <RenderMarkdown>{content}</RenderMarkdown>
              </div>
            </div>
          ) : (
            // Edit mode
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-tertiary border-none rounded-none px-6 py-4 text-sm text-primary font-mono resize-none focus:outline-none focus:ring-0"
              placeholder="Edit content in Markdown..."
              autoFocus
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-default flex items-center justify-between">
          <span className="text-xs text-tertiary">
            {content.length} characters · Markdown supported
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-secondary hover:text-primary hover:bg-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-accent text-on-accent rounded-md text-xs font-medium hover:bg-accent-hover transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
