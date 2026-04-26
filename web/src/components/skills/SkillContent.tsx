import { FileEdit, X, Save } from 'lucide-react'
import { useState } from 'react'
import type { SkillDetail } from '@/lib/skills/types'
import { stripFrontmatter } from '@/lib/skills/utils'
import { RenderMarkdown } from '@/components/RenderMarkdown'

type SkillContentProps = {
  skillDetail: SkillDetail | null
  onSave?: (content: string) => void
  saving?: boolean
}

export function SkillContent({ skillDetail, onSave, saving }: SkillContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  const handleEdit = () => {
    if (skillDetail) {
      setEditContent(skillDetail.skill.content)
      setIsEditing(true)
    }
  }

  const handleCancel = () => { setIsEditing(false); setEditContent('') }

  const handleSave = () => {
    if (onSave && editContent.trim()) {
      onSave(editContent)
      setIsEditing(false)
    }
  }

  return (
    <main className="flex-1 min-w-0 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-[var(--radius-md)] flex flex-col">
      {skillDetail ? (
        <>
          <div className="h-8 flex items-center justify-between px-4 border-b border-[var(--border-default)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{skillDetail.skill.title}</h1>
              <span className="px-2 py-0.5 text-[var(--text-xxs)] uppercase tracking-[0.08em] bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-tertiary)]">
                {skillDetail.skill.format}
              </span>
              {skillDetail.skill.pending_sync && (
                <span className="px-2 py-0.5 text-[var(--text-xxs)] bg-[var(--accent-highlight)] rounded-[var(--radius-md)] text-white">
                  Modified
                </span>
              )}
              {(skillDetail.skill.note_count || 0) > 0 && (
                <span className="px-2 py-0.5 text-[var(--text-xxs)] bg-[var(--status-warning)] rounded-[var(--radius-md)] text-black">
                  {skillDetail.skill.note_count} note{skillDetail.skill.note_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-[var(--accent-highlight)] hover:bg-[var(--accent-highlight-hover)] disabled:opacity-50 text-white text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEdit}
                className="flex items-center gap-1.5 h-6 px-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-black text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
              >
                <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                Edit
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[400px] bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-4 text-[var(--text-secondary)] text-[var(--text-sm)] font-mono resize-none focus:outline-none focus:border-[var(--accent-highlight)]"
                placeholder="Enter markdown content..."
              />
            ) : (
              <RenderMarkdown>
                {stripFrontmatter(skillDetail.skill.content)}
              </RenderMarkdown>
            )}
          </div>

          <div className="h-7 border-t border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] text-[var(--text-xs)] flex-shrink-0">
            {isEditing ? 'Editing raw markdown' : 'Leave blank'}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          Select a skill to view
        </div>
      )}
    </main>
  )
}