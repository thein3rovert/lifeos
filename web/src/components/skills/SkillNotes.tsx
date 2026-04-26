import { Plus, X, Sparkles, Minimize2, Edit3, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { SkillDetail } from '@/lib/skills/types'
import { formatDate } from '@/lib/skills/utils'

type SkillNotesProps = {
  skillDetail: SkillDetail | null
  onAddNote: (content: string) => void
  onDeleteNote: (noteId: number) => void
  addingNote: boolean
  onAIPreview?: () => void
  aiLoading?: boolean
}

export function SkillNotes({
  skillDetail,
  onAddNote,
  onDeleteNote,
  addingNote,
  onAIPreview,
  aiLoading,
}: SkillNotesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [newNote, setNewNote] = useState('')

  const handleOpenModal = () => { setIsModalOpen(true); setIsMinimized(false) }
  const handleMinimizeModal = () => { setIsModalOpen(false); setIsMinimized(true) }
  const handleResumeModal = () => { setIsModalOpen(true); setIsMinimized(false) }
  const handleCloseModal = () => { setIsModalOpen(false); setIsMinimized(false); setNewNote('') }

  const handleSubmit = () => {
    if (newNote.trim()) {
      onAddNote(newNote)
      handleCloseModal()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
    if (e.key === 'Escape') handleMinimizeModal()
  }

  const noteCount = skillDetail?.notes?.length || 0
  const hasDraftNote = newNote.trim().length > 0

  return (
    <>
      <aside className="w-[280px] flex-shrink-0 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-[var(--radius-md)] flex flex-col">
        {/* Panel Header */}
        <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border-default)] flex-shrink-0">
          <span className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] uppercase tracking-[0.08em]">
            Skill Notes
            {noteCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-[var(--status-warning)] rounded-[var(--radius-md)] text-[var(--text-xxs)] text-black">
                {noteCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {isMinimized && hasDraftNote && (
              <button 
                onClick={handleResumeModal}
                className="p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors text-[var(--accent-highlight)]"
                title="Continue editing note"
              >
                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
            <button 
              onClick={handleOpenModal}
              className="p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
              title="Add new note"
            >
              <Plus className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Continue editing banner */}
        {isMinimized && hasDraftNote && (
          <div className="px-3 py-2 bg-[var(--accent-highlight-muted)] border-b border-[var(--accent-highlight)]/20">
            <button 
              onClick={handleResumeModal}
              className="w-full text-left text-[var(--text-xs)] text-[var(--accent-highlight)] hover:underline"
            >
              Continue editing note... ({newNote.length} chars)
            </button>
          </div>
        )}

        {/* Notes List */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {!skillDetail?.notes || skillDetail.notes.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-[var(--text-xs)]">
              <p>No notes yet</p>
              <p className="mt-2 text-[var(--text-xxs)]">Click + to add a note</p>
            </div>
          ) : (
            skillDetail.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-[var(--radius-md)] group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[var(--text-xxs)] text-[var(--text-muted)]">{formatDate(note.created_at)}</span>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-all"
                  >
                    <X className="w-3 h-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="text-[var(--text-xs)] text-[var(--text-secondary)] whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>

        {/* AI Update button */}
        {noteCount > 0 && (
          <div className="p-3 border-t border-[var(--border-default)] flex-shrink-0">
            <button 
              onClick={onAIPreview}
              disabled={aiLoading}
              className="w-full h-7 flex items-center justify-center bg-[var(--accent-highlight-muted)] hover:bg-[var(--accent-highlight)]/20 disabled:opacity-50 border border-[var(--accent-highlight)]/30 text-[var(--accent-highlight)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
              title="Send notes to AI for skill update"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              )}
              {aiLoading ? 'Processing...' : 'Update with AI'}
            </button>
          </div>
        )}

        <div className="h-4 border-t border-[var(--border-default)] flex-shrink-0" />
      </aside>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="min-w-[480px] max-w-[800px] w-[600px] max-h-[80vh] bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col resize overflow-auto">
            <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
              <span className="text-[var(--text-md)] font-medium text-[var(--text-primary)]">Add Note</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleMinimizeModal}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
                  title="Minimize (Esc)"
                >
                  <Minimize2 className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
                  title="Cancel and clear"
                >
                  <X className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 min-h-0">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your note here..."
                className="w-full h-full min-h-[200px] p-3 text-[var(--text-sm)] bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] resize-none"
                autoFocus
              />
            </div>
            
            <div className="px-4 pb-2">
              <p className="text-[var(--text-xxs)] text-[var(--text-muted)]">
                Press Cmd+Enter to save, Esc to minimize
              </p>
            </div>

            <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-[var(--border-default)]">
              <button
                onClick={handleMinimizeModal}
                className="h-8 px-4 bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
              >
                Minimize
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newNote.trim() || addingNote}
                className="h-8 px-4 bg-[var(--accent-highlight)] hover:bg-[var(--accent-highlight-hover)] disabled:opacity-50 text-white text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}