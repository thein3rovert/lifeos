import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Upload, Plus} from 'lucide-react'
import type { Skill } from '@/lib/skills/types'
import { SyncConfirmationDialog } from './SyncConfirmationDialog'
import { CreateSkillDialog } from './CreateSkillDialog'
import { PushSelectionDialog } from './PushSelectionDialog'

type SkillsSidebarProps = {
  skills: Skill[]
  selectedSkillId: string | null
  onSelectSkill: (id: string) => void
  loading: boolean
  syncing: boolean
  onSync: () => void
  pushing?: boolean
  onPush?: () => void
  onPushSelected?: (skillIds: string[]) => void
  collapsed: boolean
  onToggleCollapse: (collapsed: boolean) => void
  onCreateSkill?: (title: string, format: string, content: string) => void
  creatingSkill?: boolean
}

export function SkillsSidebar({
  skills,
  selectedSkillId,
  onSelectSkill,
  loading,
  syncing,
  onSync,
  pushing,
  onPush,
  onPushSelected,
  collapsed,
  onToggleCollapse,
  onCreateSkill,
  creatingSkill,
}: SkillsSidebarProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)

  const pendingCount = skills.filter(s => s.pending_sync).length
  const skillsWithNotes = skills.filter(s => (s.note_count || 0) > 0).length
  const hasLocalChanges = pendingCount > 0 || skillsWithNotes > 0

  const lastSynced = skills.length > 0
    ? skills.filter(s => s.synced_at).sort((a, b) =>
        new Date(b.synced_at!).getTime() - new Date(a.synced_at!).getTime()
      )[0]?.synced_at
    : null

  const handleSyncClick = () => {
    if (hasLocalChanges) {
      setShowConfirmDialog(true)
    } else {
      onSync()
    }
  }

  const handleCancel = () => setShowConfirmDialog(false)
  const handlePushFirst = () => { setShowConfirmDialog(false); onPush?.() }
  const handlePullAnyway = () => { setShowConfirmDialog(false); onSync() }

  if (collapsed) {
    return (
      <button
        onClick={() => onToggleCollapse(false)}
        className="flex-shrink-0 w-8 h-8 self-start bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center relative"
      >
        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-highlight)] rounded-full text-[var(--text-xxs)] flex items-center justify-center text-white font-medium">
            {pendingCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-[var(--radius-md)] flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] uppercase tracking-[0.08em]">
            Skills
          </span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--accent-highlight)] rounded-[var(--radius-md)] text-[var(--text-xxs)] text-white whitespace-nowrap">
              {pendingCount} pending
            </span>
          )}
          {skillsWithNotes > 0 && !pendingCount && (
            <span className="px-1.5 py-0.5 bg-[var(--status-warning)] rounded-[var(--radius-md)] text-[var(--text-xxs)] text-black whitespace-nowrap">
              {skillsWithNotes} notes
            </span>
          )}
        </div>
          <div className="flex items-center gap-1">
            {onCreateSkill && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
                title="Create new skill"
              >
                <Plus className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => onToggleCollapse(true)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            </button>
          </div>
        </div>

      {/* Skills list */}
      <div className="flex-1 overflow-auto py-1">
        {loading ? (
          <div className="px-3 py-2 text-[var(--text-base)] text-[var(--text-tertiary)]">Loading...</div>
        ) : skills.length === 0 ? (
          <div className="px-3 py-2 text-[var(--text-base)] text-[var(--text-tertiary)]">No skills yet</div>
        ) : (
          skills.map((skill) => {
            const hasNotes = (skill.note_count || 0) > 0
            const hasPendingSync = skill.pending_sync

            return (
              <button
                key={skill.id}
                onClick={() => onSelectSkill(skill.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-base)]
                  transition-colors duration-150
                  ${selectedSkillId === skill.id
                    ? 'bg-[var(--bg-selected)] text-[var(--text-primary)] border-l-2 border-[var(--accent-highlight)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                  }
                `}
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
                <span className="truncate flex-1">{skill.title}</span>

                <div className="flex items-center gap-1">
                  {hasNotes && (
                    <span className="w-2 h-2 bg-[var(--status-warning)] rounded-full flex-shrink-0" />
                  )}
                  {hasPendingSync && (
                    <span className="w-2 h-2 bg-[var(--accent-highlight)] rounded-full flex-shrink-0" />
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Sync status & buttons */}
      <div className="p-3 border-t border-[var(--border-default)] flex-shrink-0 space-y-2">
        {lastSynced && (
          <p className="text-[var(--text-xxs)] text-[var(--text-muted)] text-center">
            Last synced: {new Date(lastSynced).toLocaleDateString()}
          </p>
        )}

        <button
          onClick={handleSyncClick}
          disabled={syncing}
          className="w-full h-7 flex items-center justify-center gap-2 bg-[var(--border-default)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {syncing ? 'Syncing...' : 'Pull from GitHub'}
        </button>

        {pendingCount > 0 && (onPush || onPushSelected) && (
          <button
            onClick={() => onPushSelected ? setShowPushDialog(true) : onPush?.()}
            disabled={pushing}
            className="w-full h-7 flex items-center justify-center gap-2 bg-[var(--accent-highlight)] hover:bg-[var(--accent-highlight-hover)] disabled:opacity-50 text-white text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
          >
            <Upload className={`w-3.5 h-3.5 ${pushing ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
            {pushing ? 'Pushing...' : `Push ${pendingCount} change${pendingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <SyncConfirmationDialog
        isOpen={showConfirmDialog}
        skills={skills}
        onCancel={handleCancel}
        onPushFirst={handlePushFirst}
        onPullAnyway={handlePullAnyway}
      />

      <CreateSkillDialog
        isOpen={showCreateDialog}
        onCancel={() => setShowCreateDialog(false)}
        onCreate={(title, format, content) => {
          onCreateSkill?.(title, format, content)
          setShowCreateDialog(false)
        }}
        isLoading={creatingSkill}
      />

      <PushSelectionDialog
        isOpen={showPushDialog}
        skills={skills}
        onCancel={() => setShowPushDialog(false)}
        onPush={(skillIds) => {
          onPushSelected?.(skillIds)
          setShowPushDialog(false)
        }}
        isLoading={pushing}
      />
    </aside>
  )
}
