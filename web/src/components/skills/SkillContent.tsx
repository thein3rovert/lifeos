import { FileEdit, X, Save, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { SkillDetail, SkillReference } from '@/types'
import { stripFrontmatter } from '@/lib/skills/utils'
import { RenderMarkdown } from '@/components/ui/RenderMarkdown'

type SkillContentProps = {
  skillDetail: SkillDetail | null
  selectedReference?: SkillReference | null
  onSave?: (content: string) => void
  saving?: boolean
  onOpenChat?: () => void
  onRefetch?: () => void
}

export function SkillContent({ skillDetail, selectedReference, onSave, saving, onOpenChat, onRefetch }: SkillContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [savingRef, setSavingRef] = useState(false)

  // For skills
  const handleEdit = () => {
    if (skillDetail) {
      setEditContent(skillDetail.skill.content)
      setIsEditing(true)
    }
  }

  // For references
  const handleEditRef = () => {
    if (selectedReference) {
      setEditContent(selectedReference.content)
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

  const handleSaveRef = async () => {
    if (!selectedReference || !editContent.trim()) return
    setSavingRef(true)
    try {
      await api.references.save(selectedReference.skill_id, selectedReference.path, editContent)
      setIsEditing(false)
      onRefetch?.()
    } catch (err) {
      console.error('Failed to save reference:', err)
    } finally {
      setSavingRef(false)
    }
  }

  return (
    <main className="flex-1 min-w-0 bg-base border border-default rounded-md flex flex-col">
      {selectedReference ? (
        <>
          <div className="h-8 flex items-center justify-between px-4 border-b border-default shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-white">{selectedReference.name}</h1>
              <span className="px-2 py-0.5 text-xxs uppercase tracking-[0.08em] bg-raised border border-default rounded-md text-tertiary">
                Reference
              </span>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-raised hover:bg-hover text-secondary text-xs font-medium rounded-md transition-colors duration-150"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveRef}
                  disabled={savingRef}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors duration-150"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {savingRef ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditRef}
                className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-150"
              >
                <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                Edit
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-dialog-content bg-raised border border-default rounded-md p-4 text-secondary text-base font-mono resize-none focus:outline-none focus:border-highlight"
                placeholder="Enter markdown content..."
              />
            ) : selectedReference.content ? (
              <>
                <div className="text-xxs text-tertiary mb-2">Content length: {selectedReference.content.length} chars</div>
                <RenderMarkdown>{selectedReference.content}</RenderMarkdown>
              </>
            ) : (
              <div className="text-muted text-sm">No content available</div>
            )}
          </div>
        </>
      ) : skillDetail ? (
        <>
          <div className="h-8 flex items-center justify-between px-4 border-b border-default shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-white">{skillDetail.skill.title}</h1>
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
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-raised hover:bg-hover text-secondary text-xs font-medium rounded-md transition-colors duration-150"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors duration-150"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    className="flex items-center gap-1.5 h-6 px-2.5 bg-raised hover:bg-hover border border-default text-secondary text-xs font-medium rounded-md transition-colors duration-150"
                    title="Chat with AI about this skill"
                  >
                    <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Chat
                  </button>
                )}
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-150"
                >
                  <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-dialog-content bg-raised border border-default rounded-md p-4 text-secondary text-base font-mono resize-none focus:outline-none focus:border-highlight"
                placeholder="Enter markdown content..."
              />
            ) : (
              <RenderMarkdown>
                {stripFrontmatter(skillDetail.skill.content)}
              </RenderMarkdown>
            )}
          </div>

          <div className="h-7 border-t border-default flex items-center justify-center text-muted text-xs shrink-0">
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