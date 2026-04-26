import { X, Sparkles, Check, Loader2 } from 'lucide-react'
import type { AIPreviewResponse } from '@/lib/api'

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
      <div className="w-full max-w-[900px] h-[80vh] bg-[#0f0f0f] border border-[#1e1e1e] rounded-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0070f3]" strokeWidth={1.5} />
            <span className="text-[13px] font-medium text-white">
              {isLoading ? 'AI is updating...' : 'Review AI Changes'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors"
          >
            <X className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#0070f3] animate-spin mb-4" strokeWidth={1.5} />
            <p className="text-[13px] text-[#aaa]">AI is analyzing your notes...</p>
            <p className="text-[11px] text-[#585858] mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Preview Content */}
        {!isLoading && preview && (
          <>
            <div className="flex-1 flex overflow-hidden">
              {/* Original */}
              <div className="flex-1 flex flex-col border-r border-[#1e1e1e]">
                <div className="h-8 flex items-center px-3 border-b border-[#1e1e1e] bg-[#0a0a0a]">
                  <span className="text-[11px] text-[#585858] uppercase tracking-wide">Original</span>
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
                <div className="h-8 flex items-center px-3 border-b border-[#1e1e1e] bg-[#0a0a0a]">
                  <span className="text-[11px] text-[#0070f3] uppercase tracking-wide">AI Updated</span>
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
            <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-[#1e1e1e] bg-[#0a0a0a] flex-shrink-0">
              <button
                onClick={onReject}
                className="h-8 px-4 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#aaa] text-[12px] font-medium rounded transition-colors duration-150"
              >
                Reject
              </button>
              <button
                onClick={onAccept}
                className="h-8 px-4 bg-[#0070f3] hover:bg-[#0060d3] text-white text-[12px] font-medium rounded flex items-center gap-2 transition-colors duration-150"
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
            <p className="text-[13px] text-[#f5a623]">Failed to get AI preview</p>
            <button
              onClick={onCancel}
              className="mt-4 h-8 px-4 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#aaa] text-[12px] font-medium rounded transition-colors duration-150"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
