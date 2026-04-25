import { AlertTriangle, X } from 'lucide-react'
import type { Skill } from '@/lib/skills/types'

type SyncConfirmationDialogProps = {
  isOpen: boolean
  skills: Skill[]
  onCancel: () => void
  onPushFirst: () => void
  onPullAnyway: () => void
}

export function SyncConfirmationDialog({
  isOpen,
  skills,
  onCancel,
  onPushFirst,
  onPullAnyway,
}: SyncConfirmationDialogProps) {
  if (!isOpen) return null

  // Calculate pending changes
  const pendingSyncCount = skills.filter(s => s.pending_sync).length
  const skillsWithNotes = skills.filter(s => (s.note_count || 0) > 0).length
  const totalLocalChanges = pendingSyncCount + skillsWithNotes

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-[480px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-md shadow-2xl">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#f5a623]" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white mb-1">
                Pull from GitHub?
              </h3>
              <p className="text-[13px] text-[#aaa] leading-relaxed">
                This will overwrite your local skills with the latest version from GitHub.
              </p>
            </div>
          </div>
        </div>

        {/* Body - Warning details */}
        {totalLocalChanges > 0 && (
          <div className="px-4 py-3">
            <div className="p-3 bg-[#1e1e1e] rounded border border-[#f5a623]/20">
              <p className="text-[12px] text-[#f5a623] font-medium mb-2">
                You have {totalLocalChanges} local change{totalLocalChanges > 1 ? 's' : ''} that will be lost:
              </p>
              <ul className="space-y-1.5">
                {pendingSyncCount > 0 && (
                  <li className="flex items-center gap-2 text-[11px] text-[#aaa]">
                    <span className="w-1.5 h-1.5 bg-[#0070f3] rounded-full" />
                    {pendingSyncCount} modified skill{pendingSyncCount > 1 ? 's' : ''} not pushed to GitHub
                  </li>
                )}
                {skillsWithNotes > 0 && (
                  <li className="flex items-center gap-2 text-[11px] text-[#aaa]">
                    <span className="w-1.5 h-1.5 bg-[#f5a623] rounded-full" />
                    {skillsWithNotes} skill{skillsWithNotes > 1 ? 's' : ''} with pending notes
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 pt-2 border-t border-[#1e1e1e] bg-[#0a0a0a]">
          <button
            onClick={onCancel}
            className="h-7 px-3 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#aaa] text-[12px] font-medium rounded transition-colors duration-150"
          >
            Cancel
          </button>
          
          {pendingSyncCount > 0 && (
            <button
              onClick={onPushFirst}
              className="h-7 px-3 bg-[#0070f3]/10 hover:bg-[#0070f3]/20 border border-[#0070f3]/30 text-[#0070f3] text-[12px] font-medium rounded transition-colors duration-150"
            >
              Push Changes First
            </button>
          )}
          
          <button
            onClick={onPullAnyway}
            className="h-7 px-3 bg-[#ededed] hover:bg-white text-black text-[12px] font-medium rounded transition-colors duration-150"
          >
            Pull Anyway
          </button>
        </div>
      </div>
    </div>
  )
}