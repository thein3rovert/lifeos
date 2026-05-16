import { X, Sparkles, Check, Loader2 } from 'lucide-react'
import type { AIPreviewResponse } from '@/types'

type SkillAIPreviewDialogProps = {
  isOpen: boolean
  preview: AIPreviewResponse | null
  isLoading: boolean
  onCancel: () => void
  onAccept: () => void
  onReject: () => void
}

export function SkillAIPreviewDialog({
  isOpen,
  preview,
  isLoading,
  onCancel,
  onAccept,
  onReject,
}: SkillAIPreviewDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-dialog-2xl h-dialog bg-raised border border-default rounded-md flex flex-col"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-default shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-highlight" strokeWidth={1.5} />
            <span className="text-base font-medium text-white">
              {isLoading ? 'AI is updating...' : 'Review AI Changes'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-hover rounded transition-colors"
          >
            <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-highlight animate-spin mb-4" strokeWidth={1.5} />
            <p className="text-base text-secondary">AI is analyzing your notes...</p>
            <p className="text-xs text-muted mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Preview Content */}
        {!isLoading && preview && (
          <>
            <div className="flex-1 flex overflow-hidden">
              {/* Original */}
              <div className="flex-1 flex flex-col border-r border-default">
                <div className="h-8 flex items-center px-3 border-b border-default bg-input">
                  <span className="text-xs text-muted uppercase tracking-wide">Original</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.rendered_html }}
                  />
                </div>
              </div>

              {/* Updated */}
              <div className="flex-1 flex flex-col">
                <div className="h-8 flex items-center px-3 border-b border-default bg-input">
                  <span className="text-xs text-highlight uppercase tracking-wide">AI Updated</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.rendered_html }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-default bg-input shrink-0">
              <button
                onClick={onReject}
                className="h-8 px-4 bg-gray-900 hover:bg-gray-800 text-secondary text-sm font-medium rounded transition-colors duration-150"
              >
                Reject
              </button>
              <button
                onClick={onAccept}
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded flex items-center gap-2 transition-colors duration-150"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                Accept Changes
              </button>
            </div>
          </>
        )}

        {/* Error State */}
        {!isLoading && !preview && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-base text-warning">Failed to get AI preview</p>
            <button
              onClick={onCancel}
              className="mt-4 h-8 px-4 bg-gray-900 hover:bg-gray-800 text-secondary text-sm font-medium rounded transition-colors duration-150"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}