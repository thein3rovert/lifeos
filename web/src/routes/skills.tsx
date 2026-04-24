import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  RefreshCw,
  Upload,
  Tag,
  FileEdit
} from 'lucide-react'
import { api } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Types
type Skill = {
  id: string
  title: string
  format: string
  content: string
  updated_at: string
}

type Note = {
  id: number
  skill_id: string
  content: string
  created_at: string
}

type SkillDetail = {
  skill: Skill
  notes: Note[]
}

export const Route = createFileRoute('/skills')({
  component: SkillsPage,
})

function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Load skills list
  useEffect(() => {
    loadSkills()
  }, [])

  // Load skill detail when selected
  useEffect(() => {
    if (selectedSkillId) {
      loadSkillDetail(selectedSkillId)
    }
  }, [selectedSkillId])

  const loadSkills = async () => {
    try {
      const data = await api.skills.list()
      setSkills(data)
      // Auto-select first skill
      if (data.length > 0 && !selectedSkillId) {
        setSelectedSkillId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load skills:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSkillDetail = async (id: string) => {
    try {
      const data = await api.skills.get(id)
      setSkillDetail(data)
    } catch (err) {
      console.error('Failed to load skill detail:', err)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const data = await api.skills.sync()
      setSkills(data)
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedSkillId) return
    
    setAddingNote(true)
    try {
      const updatedNotes = await api.notes.add(selectedSkillId, newNote)
      setSkillDetail(prev => prev ? { ...prev, notes: updatedNotes } : null)
      setNewNote('')
    } catch (err) {
      console.error('Failed to add note:', err)
    } finally {
      setAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!selectedSkillId) return
    
    try {
      await api.notes.delete(selectedSkillId, noteId)
      setSkillDetail(prev => 
        prev ? { ...prev, notes: prev.notes.filter(n => n.id !== noteId) } : null
      )
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Skills List */}
      <aside 
        className={`
          ${sidebarCollapsed ? 'w-0' : 'w-[220px]'} 
          flex-shrink-0 bg-black border-r border-[#1e1e1e] 
          flex flex-col overflow-hidden transition-all duration-200
        `}
      >
        {/* Header with collapse button */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-[#1e1e1e]">
          <span className="text-xs font-medium text-[#aaa] uppercase tracking-wide">Skills</span>
          <button 
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Skills list */}
        <div className="flex-1 overflow-auto py-1">
          {loading ? (
            <div className="px-3 py-2 text-xs text-[#777]">Loading...</div>
          ) : skills.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#777]">No skills yet</div>
          ) : (
            skills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setSelectedSkillId(skill.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-[13px]
                  transition-colors duration-150
                  ${selectedSkillId === skill.id 
                    ? 'bg-[rgba(255,255,255,0.06)] text-white border-l-2 border-[#0070f3]' 
                    : 'text-[#aaa] hover:bg-[rgba(255,255,255,0.04)] hover:text-white border-l-2 border-transparent'
                  }
                `}
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#585858]" strokeWidth={1.5} />
                <span className="truncate">{skill.title}</span>
              </button>
            ))
          )}
        </div>

        {/* Sync button */}
        <div className="p-3 border-t border-[#1e1e1e]">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full h-7 flex items-center justify-center gap-2 bg-[#ededed] hover:bg-white disabled:opacity-50 text-black text-xs font-medium rounded transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {syncing ? 'Syncing...' : 'Sync Skills'}
          </button>
        </div>
      </aside>

      {/* Expand sidebar button (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-[#0f0f0f] border border-[#1e1e1e] border-l-0 rounded-r hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
        </button>
      )}

      {/* Center - Skill Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-black">
        {skillDetail ? (
          <>
            {/* Skill Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-white">{skillDetail.skill.title}</h1>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-[#0f0f0f] border border-[#1e1e1e] rounded text-[#777]">
                  {skillDetail.skill.format}
                </span>
              </div>
              <button className="flex items-center gap-1.5 h-7 px-3 bg-[#ededed] hover:bg-white text-black text-xs font-medium rounded transition-colors duration-150">
                <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                Edit
              </button>
            </div>

            {/* Markdown Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="prose prose-invert prose-sm max-w-none text-[#aaa]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {skillDetail.skill.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Bottom placeholder */}
            <div className="h-12 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-xs">
              Leave blank
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#585858]">
            Select a skill to view
          </div>
        )}
      </main>

      {/* Right Panel - Notes */}
      <aside className="w-[280px] flex-shrink-0 bg-black border-l border-[#1e1e1e] flex flex-col">
        {/* Notes Header */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-[#1e1e1e]">
          <span className="text-xs font-medium text-[#aaa] uppercase tracking-wide">Skill Notes</span>
          <button className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors">
            <Plus className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {skillDetail?.notes.length === 0 ? (
            <div className="text-center py-8 text-[#585858] text-xs">No notes yet</div>
          ) : (
            skillDetail?.notes.map((note) => (
              <div 
                key={note.id} 
                className="p-3 bg-[#0f0f0f] border border-[#1e1e1e] rounded group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] text-[#585858]">{formatDate(note.created_at)}</span>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
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
        <div className="p-3 border-t border-[#1e1e1e] space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full h-20 p-2 text-xs bg-[#0a0a0a] border border-[#1e1e1e] rounded text-[#aaa] placeholder:text-[#585858] focus:outline-none focus:border-[#3d3d3d] resize-none"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="w-full h-7 flex items-center justify-center bg-[#ededed] hover:bg-white disabled:opacity-50 text-black text-xs font-medium rounded transition-colors duration-150"
          >
            {addingNote ? 'Adding...' : 'Add Note'}
          </button>
        </div>

        {/* Update Skills button */}
        <div className="p-3 border-t border-[#1e1e1e]">
          <button className="w-full h-7 flex items-center justify-center border border-[#1e1e1e] hover:bg-[rgba(255,255,255,0.04)] text-[#aaa] text-xs font-medium rounded transition-colors duration-150">
            <Upload className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
            Update Skills
          </button>
        </div>

        {/* Bottom placeholder */}
        <div className="flex-1 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-xs min-h-[100px]">
          Leave blank
        </div>
      </aside>
    </div>
  )
}