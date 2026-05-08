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
      <aside className="w-notes shrink-0 bg-black border border-default rounded-md flex flex-col">
        {/* Panel Header */}
        <div className="h-8 flex items-center justify-between px-3 border-b border-default shrink-0">
          <span className="text-atlas-xs font-medium text-secondary uppercase tracking-[0.08em]">
            Skill Notes
            {noteCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-yellow-600 rounded-md text-xxs text-black">
                {noteCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {isMinimized && hasDraftNote && (
              <button
                onClick={handleResumeModal}
                className="p-1 hover:bg-hover rounded-md transition-colors text-blue-600"
                title="Continue editing note"
              >
                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={handleOpenModal}
              className="p-1 hover:bg-hover rounded-md transition-colors"
              title="Add new note"
            >
              <Plus className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Continue editing banner */}
        {isMinimized && hasDraftNote && (
          <div className="px-3 py-2 bg-blue-600/10 border-b border-blue-600/20">
            <button
              onClick={handleResumeModal}
              className="w-full text-left text-atlas-xs text-blue-600 hover:underline"
            >
              Continue editing note... ({newNote.length} chars)
            </button>
          </div>
        )}

        {/* Notes List */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {!skillDetail?.notes || skillDetail.notes.length === 0 ? (
            <div className="text-center py-8 text-muted text-atlas-xs">
              <p>No notes yet</p>
              <p className="mt-2 text-xxs">Click + to add a note</p>
            </div>
          ) : (
            skillDetail.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-raised border border-default rounded-md group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xxs text-muted">{formatDate(note.created_at)}</span>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-hover rounded-md transition-all"
                  >
                    <X className="w-3 h-3 text-tertiary" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="text-atlas-xs text-secondary whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>

        {/* AI Update button */}
        {noteCount > 0 && (
          <div className="p-3 border-t border-default shrink-0">
            <button
              onClick={onAIPreview}
              disabled={aiLoading}
              className="w-full h-7 flex items-center justify-center bg-blue-600/10 hover:bg-blue-600/20 disabled:opacity-50 border border-blue-600/30 text-blue-600 text-atlas-xs font-medium rounded-md transition-colors duration-150"
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

        <div className="h-4 border-t border-default shrink-0" />
      </aside>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="min-w-dialog-sm max-w-dialog-xl max-w-dialog-md max-h-dialog bg-raised border border-default rounded-lg shadow-2xl flex flex-col resize overflow-auto">
            <div className="h-10 flex items-center justify-between px-4 border-b border-default">
              <span className="text-atlas-base font-medium text-white">Add Note</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleMinimizeModal}
                  className="p-1.5 hover:bg-hover rounded-md transition-colors"
                  title="Minimize (Esc)"
                >
                  <Minimize2 className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-hover rounded-md transition-colors"
                  title="Cancel and clear"
                >
                  <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 min-h-0">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your note here..."
                className="w-full h-full min-h-dialog p-3 text-atlas-base bg-raised border border-default rounded-md text-secondary placeholder:text-muted focus:outline-none focus:border-default resize-none"
                autoFocus
              />
            </div>

            <div className="px-4 pb-2">
              <p className="text-xxs text-muted">
                Press Cmd+Enter to save, Esc to minimize
              </p>
            </div>

            <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-default">
              <button
                onClick={handleMinimizeModal}
                className="h-8 px-4 bg-raised hover:bg-hover text-secondary text-atlas-xs font-medium rounded-md transition-colors duration-150"
              >
                Minimize
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newNote.trim() || addingNote}
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-atlas-xs font-medium rounded-md transition-colors duration-150"
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
