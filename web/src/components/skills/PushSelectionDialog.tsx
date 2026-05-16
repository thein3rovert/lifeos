import { useState } from 'react'
import { X, Upload, Check } from 'lucide-react'
import type { Skill } from '@/types'

type PushSelectionDialogProps = {
  isOpen: boolean
  skills: Skill[]
  onCancel: () => void
  onPush: (selectedIds: string[]) => void
  isLoading?: boolean
}

export function PushSelectionDialog({
  isOpen,
  skills,
  onCancel,
  onPush,
  isLoading,
}: PushSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const pendingSkills = skills.filter(s => s.pending_sync)

  const handleToggle = (skillId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId)
    } else {
      newSelected.add(skillId)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === pendingSkills.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingSkills.map(s => s.id)))
    }
  }

  const handlePush = () => {
    onPush(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-dialog-sm bg-raised border border-default rounded-lg flex flex-col max-h-dialog"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-default shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <span className="text-base font-medium text-white">
              Push Changes to GitHub
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-hover rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
          </button>
        </div>

        {/* Select All */}
        <div className="px-4 py-2 border-b border-default bg-raised">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-xs text-secondary hover:text-white transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              selectedIds.size === pendingSkills.length && pendingSkills.length > 0
                ? 'bg-blue-600 border-highlight'
                : 'border-default'
            }`}>
              {selectedIds.size === pendingSkills.length && pendingSkills.length > 0 && (
                <Check className="w-3 h-3 text-white" strokeWidth={2} />
              )}
            </div>
            Select All ({pendingSkills.length} skills)
          </button>
        </div>

        {/* Skills List */}
        <div className="flex-1 overflow-auto py-1">
          {pendingSkills.length === 0 ? (
            <div className="px-4 py-8 text-center text-tertiary text-xs">
              No pending changes to push
            </div>
          ) : (
            pendingSkills.map((skill) => {
              const isSelected = selectedIds.has(skill.id)
              return (
                <button
                  key={skill.id}
                  onClick={() => handleToggle(skill.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-selected'
                      : 'hover:bg-hover'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-highlight'
                      : 'border-default'
                  }`}>
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" strokeWidth={2} />
                    )}
                  </div>

                  {/* Skill Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-white truncate">
                      {skill.title}
                    </p>
                    <p className="text-xxs text-muted">
                      {skill.format}
                    </p>
                  </div>

                  {/* Status */}
                  <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-14 flex items-center justify-between px-4 border-t border-default bg-raised shrink-0">
          <span className="text-xs text-secondary">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="h-8 px-4 bg-raised hover:bg-hover text-secondary text-xs font-medium rounded-md transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handlePush}
              disabled={selectedIds.size === 0 || isLoading}
              className="h-8 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md flex items-center gap-2 transition-colors duration-150"
            >
              {isLoading ? (
                <>Pushing...</>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Push {selectedIds.size > 0 && `(${selectedIds.size})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}