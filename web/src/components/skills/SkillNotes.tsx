import { Plus, X, Upload } from 'lucide-react'
import type { SkillDetail } from '../../lib/skills/types'
import { formatDate } from '../../lib/skills/utils'

type SkillNotesProps = {
  skillDetail: SkillDetail | null
  newNote: string
  onNewNoteChange: (value: string) => void
  onAddNote: () => void
  onDeleteNote: (noteId: number) => void
  addingNote: boolean
}

export function SkillNotes({
  skillDetail,
  newNote,
  onNewNoteChange,
  onAddNote,
  onDeleteNote,
  addingNote,
}: SkillNotesProps) {
  return (
    <aside className="w-[280px] flex-shrink-0 bg-black border border-[#1e1e1e] rounded flex flex-col">
      {/* Panel Header - Atlas: 32px height */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[#1e1e1e] flex-shrink-0">
        <span className="text-[11px] font-medium text-[#aaa] uppercase tracking-[0.08em]">Skill Notes</span>
        <button className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors">
          <Plus className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Notes List - Scrollable */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {!skillDetail?.notes || skillDetail.notes.length === 0 ? (
          <div className="text-center py-8 text-[#585858] text-xs">No notes yet</div>
        ) : (
          skillDetail.notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-[#0f0f0f] border border-[#1e1e1e] rounded group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] text-[#585858]">{formatDate(note.created_at)}</span>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(255,255,255,0.04)] rounded transition-all"
                >
                  <X className="w-3 h-3 text-[#777]" strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-xs text-[#aaa] whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Note */}
      <div className="p-3 border-t border-[#1e1e1e] space-y-2 flex-shrink-0">
        <textarea
          value={newNote}
          onChange={(e) => onNewNoteChange(e.target.value)}
          placeholder="Add a note..."
          className="w-full h-20 p-2 text-xs bg-[#0a0a0a] border border-[#1e1e1e] rounded text-[#aaa] placeholder:text-[#585858] focus:outline-none focus:border-[#3d3d3d] resize-none"
        />
        <button
          onClick={onAddNote}
          disabled={!newNote.trim() || addingNote}
          className="w-full h-7 flex items-center justify-center bg-[#ededed] hover:bg-white disabled:opacity-50 text-black text-xs font-medium rounded transition-colors duration-150"
        >
          {addingNote ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Update Skills button */}
      <div className="p-3 border-t border-[#1e1e1e] flex-shrink-0">
        <button className="w-full h-7 flex items-center justify-center border border-[#1e1e1e] hover:bg-[rgba(255,255,255,0.04)] text-[#aaa] text-xs font-medium rounded transition-colors duration-150">
          <Upload className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
          Update Skills
        </button>
      </div>

      {/* Bottom placeholder */}
      <div className="h-24 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-xs flex-shrink-0">
        Leave blank
      </div>
    </aside>
  )
}
