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
        className="shrink-0 w-8 h-8 self-start bg-raised border border-default rounded-md hover:bg-hover transition-colors flex items-center justify-center relative"
      >
        <ChevronRight className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-xxs flex items-center justify-center text-white font-medium">
            {pendingCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside
      className="w-sidebar shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-black)',
        boxShadow: 'var(--shadow-neuro-soft)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Panel Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-default shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-atlas-xs font-medium text-secondary uppercase tracking-[0.08em]">
            Skills
          </span>
          {pendingCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-md text-xxs text-white whitespace-nowrap"
              style={{
                background: 'var(--accent-highlight)',
                boxShadow: 'var(--shadow-neuro-raised)',
              }}
            >
              {pendingCount} pending
            </span>
          )}
          {skillsWithNotes > 0 && !pendingCount && (
            <span className="px-1.5 py-0.5 bg-yellow-600 rounded-md text-xxs text-black whitespace-nowrap">
              {skillsWithNotes} notes
            </span>
          )}
        </div>
          <div className="flex items-center gap-1">
            {onCreateSkill && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="p-1 hover:bg-hover rounded-md transition-colors"
                title="Create new skill"
              >
                <Plus className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => onToggleCollapse(true)}
              className="p-1 hover:bg-hover rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

      {/* Skills list */}
      <div className="flex-1 overflow-auto py-1">
        {loading ? (
          <div className="px-3 py-2 text-atlas-base text-tertiary">Loading...</div>
        ) : skills.length === 0 ? (
          <div className="px-3 py-2 text-atlas-base text-tertiary">No skills yet</div>
        ) : (
          skills.map((skill) => {
            const hasNotes = (skill.note_count || 0) > 0
            const hasPendingSync = skill.pending_sync

            return (
              <button
                key={skill.id}
                onClick={() => onSelectSkill(skill.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-atlas-base
                  transition-all duration-150 rounded-md mx-1 my-0.5
                  ${selectedSkillId === skill.id
                    ? 'text-white border-l-2 border-highlight'
                    : 'text-secondary hover:text-white border-l-2 border-transparent'
                  }
                `}
                style={{
                  background: selectedSkillId === skill.id ? 'var(--bg-elevated)' : 'transparent',
                  boxShadow: selectedSkillId === skill.id ? 'var(--shadow-neuro-raised)' : 'none',
                }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
                <span className="truncate flex-1">{skill.title}</span>

                <div className="flex items-center gap-1">
                  {hasNotes && (
                    <span className="w-2 h-2 bg-yellow-600 rounded-full shrink-0" />
                  )}
                  {hasPendingSync && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Sync status & buttons */}
      <div className="p-3 border-t border-default shrink-0 space-y-2">
        {lastSynced && (
          <p className="text-xxs text-muted text-center">
            Last synced: {new Date(lastSynced).toLocaleDateString()}
          </p>
        )}

        <button
          onClick={handleSyncClick}
          disabled={syncing}
          className="w-full h-7 flex items-center justify-center gap-2 disabled:opacity-50 text-secondary text-atlas-xs font-medium rounded-md transition-all active:scale-98"
          style={{
            background: 'var(--bg-button)',
            boxShadow: syncing ? 'none' : 'var(--shadow-neuro-raised)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {syncing ? 'Syncing...' : 'Pull from GitHub'}
        </button>

        {pendingCount > 0 && (onPush || onPushSelected) && (
          <button
            onClick={() => onPushSelected ? setShowPushDialog(true) : onPush?.()}
            disabled={pushing}
            className="w-full h-7 flex items-center justify-center gap-2 disabled:opacity-50 text-white text-atlas-xs font-medium rounded-md transition-all active:scale-98"
            style={{
              background: 'var(--accent-highlight)',
              boxShadow: pushing ? 'none' : 'var(--shadow-neuro-raised)',
            }}
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
