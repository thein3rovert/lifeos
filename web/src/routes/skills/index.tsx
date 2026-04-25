import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
  Upload,
  FileEdit
} from 'lucide-react'
import { api } from '../../lib/api'
import { RenderMarkdown } from '../../components/RenderMarkdown'

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

// Helper to strip YAML frontmatter from markdown
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) {
    return content
  }

  const lines = content.split('\n')
  let inFrontmatter = true
  let contentStart = 0

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      contentStart = i + 1
      inFrontmatter = false
      break
    }
  }

  if (contentStart > 0 && contentStart < lines.length) {
    return lines.slice(contentStart).join('\n').trim()
  }

  return content
}

export const Route = createFileRoute('/skills/')({
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
    if (!dateStr || dateStr === '0001-01-01T00:00:00Z' || dateStr.startsWith('0001-01-01')) {
      return 'Unknown date'
    }

    // Handle Go time format: "2026-04-24 22:34:14.340107457 +0100 BST"
    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      const date = new Date(dateMatch[1])
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }
    }

    // Fallback: try parsing the whole string
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return 'Unknown date'
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex h-full gap-3 p-4">
      {/* Left Sidebar - Skills List (220px) */}
      {!sidebarCollapsed && (
        <aside className="w-[220px] flex-shrink-0 bg-black border border-[#1e1e1e] rounded flex flex-col overflow-hidden">
          {/* Panel Header - Atlas: 32px height */}
          <div className="h-8 flex items-center justify-between px-3 border-b border-[#1e1e1e] flex-shrink-0">
            <span className="text-[11px] font-medium text-[#aaa] uppercase tracking-[0.08em]">Skills</span>
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
          <div className="p-3 border-t border-[#1e1e1e] flex-shrink-0">
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
      )}

      {/* Expand sidebar button (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="flex-shrink-0 w-8 h-8 self-start bg-[#0f0f0f] border border-[#1e1e1e] rounded hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
        </button>
      )}

      {/* Center - Skill Content (flex-1) */}
      <main className="flex-1 min-w-0 bg-black border border-[#1e1e1e] rounded flex flex-col">
        {skillDetail ? (
          <>
            {/* Panel Header - Atlas: 32px height */}
            <div className="h-8 flex items-center justify-between px-4 border-b border-[#1e1e1e] flex-shrink-0">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-semibold text-white">{skillDetail.skill.title}</h1>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] bg-[#0f0f0f] border border-[#1e1e1e] rounded text-[#777]">
                  {skillDetail.skill.format}
                </span>
              </div>
              <button className="flex items-center gap-1.5 h-6 px-2.5 bg-[#ededed] hover:bg-white text-black text-xs font-medium rounded transition-colors duration-150">
                <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                Edit
              </button>
            </div>

            {/* Markdown Content - Scrollable */}
            <div className="flex-1 overflow-auto p-4">
              <RenderMarkdown>
                {stripFrontmatter(skillDetail.skill.content)}
              </RenderMarkdown>
            </div>

            {/* Status Bar - Atlas: 28px height */}
            <div className="h-7 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-[11px] flex-shrink-0">
              Leave blank
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#585858]">
            Select a skill to view
          </div>
        )}
      </main>

      {/* Right Panel - Notes (280px) */}
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
        <div className="p-3 border-t border-[#1e1e1e] space-y-2 flex-shrink-0">
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
    </div>
  )
}
