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
    <main className="flex-1 min-w-0 bg-black border border-default rounded-md flex flex-col">
      {skillDetail ? (
        <>
          <div className="h-8 flex items-center justify-between px-4 border-b border-default shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-atlas-base font-semibold text-white">{skillDetail.skill.title}</h1>
              <span className="px-2 py-0.5 text-xxs uppercase tracking-[0.08em] bg-raised border border-default rounded-md text-tertiary">
                {skillDetail.skill.format}
              </span>
              {skillDetail.skill.pending_sync && (
                <span className="px-2 py-0.5 text-xxs bg-blue-600 rounded-md text-white">
                  Modified
                </span>
              )}
              {(skillDetail.skill.note_count || 0) > 0 && (
                <span className="px-2 py-0.5 text-xxs bg-yellow-600 rounded-md text-black">
                  {skillDetail.skill.note_count} note{skillDetail.skill.note_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-raised hover:bg-hover text-secondary text-atlas-xs font-medium rounded-md transition-colors duration-150"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-atlas-xs font-medium rounded-md transition-colors duration-150"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-atlas-xs font-medium rounded-md transition-colors duration-150"
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
                className="w-full h-full min-h-dialog-content bg-raised border border-default rounded-md p-4 text-secondary text-atlas-base font-mono resize-none focus:outline-none focus:border-highlight"
                placeholder="Enter markdown content..."
              />
            ) : (
              <RenderMarkdown>
                {stripFrontmatter(skillDetail.skill.content)}
              </RenderMarkdown>
            )}
          </div>

          <div className="h-7 border-t border-default flex items-center justify-center text-muted text-atlas-xs shrink-0">
            {isEditing ? 'Editing raw markdown' : 'Leave blank'}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted">
          Select a skill to view
        </div>
      )}
    </main>
  )
}
