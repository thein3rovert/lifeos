import { AlertTriangle } from 'lucide-react'
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
      <div className="w-full max-w-dialog-sm bg-raised border border-default rounded-md shadow-2xl">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-warning-muted border border-[#f5a623]/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-atlas-md font-semibold text-white mb-1">
                Pull from GitHub?
              </h3>
              <p className="text-atlas-base text-secondary leading-relaxed">
                This will overwrite your local skills with the latest version from GitHub.
              </p>
            </div>
          </div>
        </div>

        {/* Body - Warning details */}
        {totalLocalChanges > 0 && (
          <div className="px-4 py-3">
            <div className="p-3 bg-gray-900 rounded border border-[#f5a623]/20">
              <p className="text-atlas-sm text-warning font-medium mb-2">
                You have {totalLocalChanges} local change{totalLocalChanges > 1 ? 's' : ''} that will be lost:
              </p>
              <ul className="space-y-1.5">
                {pendingSyncCount > 0 && (
                  <li className="flex items-center gap-2 text-atlas-xs text-secondary">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    {pendingSyncCount} modified skill{pendingSyncCount > 1 ? 's' : ''} not pushed to GitHub
                  </li>
                )}
                {skillsWithNotes > 0 && (
                  <li className="flex items-center gap-2 text-atlas-xs text-secondary">
                    <span className="w-1.5 h-1.5 bg-warning rounded-full" />
                    {skillsWithNotes} skill{skillsWithNotes > 1 ? 's' : ''} with pending notes
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 pt-2 border-t border-default bg-input">
          <button
            onClick={onCancel}
            className="h-7 px-3 bg-gray-900 hover:bg-gray-800 text-secondary text-atlas-sm font-medium rounded transition-colors duration-150"
          >
            Cancel
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={onPushFirst}
              className="h-7 px-3 bg-highlight-muted hover:bg-[#0070f3]/20 border border-[#0070f3]/30 text-highlight text-atlas-sm font-medium rounded transition-colors duration-150"
            >
              Push Changes First
            </button>
          )}

          <button
            onClick={onPullAnyway}
            className="h-7 px-3 bg-gray-100 hover:bg-white text-black text-atlas-sm font-medium rounded transition-colors duration-150"
          >
            Pull Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
