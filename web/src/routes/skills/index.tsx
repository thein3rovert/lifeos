import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Skill, SkillDetail } from '@/lib/skills/types'
import { SkillsSidebar } from '@/components/skills/SkillsSidebar'
import { SkillContent } from '@/components/skills/SkillContent'
import { SkillNotes } from '@/components/skills/SkillNotes'

export const Route = createFileRoute('/skills/')({
  component: SkillsPage,
})

function SkillsPage() {
  // State
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Load skills list on mount
  useEffect(() => {
    loadSkills()
  }, [])

  // Load skill detail when selected
  useEffect(() => {
    if (selectedSkillId) {
      loadSkillDetail(selectedSkillId)
    }
  }, [selectedSkillId])

  // Handlers
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

  const handlePush = async () => {
    setPushing(true)
    try {
      const result = await api.skills.push()
      console.log('Push result:', result)
      // Refresh skills to get updated pending_sync status
      const data = await api.skills.list()
      setSkills(data)
    } catch (err) {
      console.error('Push failed:', err)
    } finally {
      setPushing(false)
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

  return (
    <div className="flex h-full gap-3 p-4">
      <SkillsSidebar
        skills={skills}
        selectedSkillId={selectedSkillId}
        onSelectSkill={setSelectedSkillId}
        loading={loading}
        syncing={syncing}
        onSync={handleSync}
        pushing={pushing}
        onPush={handlePush}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      <SkillContent skillDetail={skillDetail} />

      <SkillNotes
        skillDetail={skillDetail}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        addingNote={addingNote}
      />
    </div>
  )
}
