import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api, type AIPreviewResponse } from '@/lib/api'
import type { Skill, SkillDetail } from '@/lib/skills/types'
import { SkillsSidebar } from '@/components/skills/SkillsSidebar'
import { SkillContent } from '@/components/skills/SkillContent'
import { SkillNotes } from '@/components/skills/SkillNotes'
import { AIPreviewDialog } from '@/components/skills/AIPreviewDialog'

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
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<AIPreviewResponse | null>(null)
  const [showAIPreview, setShowAIPreview] = useState(false)

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

  const handleSaveSkill = async (content: string) => {
    if (!selectedSkillId) return

    setSaving(true)
    try {
      const updatedSkill = await api.skills.save(selectedSkillId, content)
      // Update local state
      setSkillDetail(prev => prev ? { ...prev, skill: updatedSkill } : null)
      // Update skills list to show pending sync indicator
      setSkills(prev => prev.map(s => s.id === updatedSkill.id ? updatedSkill : s))
    } catch (err) {
      console.error('Failed to save skill:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async (content: string) => {
    if (!content.trim() || !selectedSkillId) return

    setAddingNote(true)
    try {
      const updatedNotes = await api.notes.add(selectedSkillId, content)
      setSkillDetail(prev => prev ? { ...prev, notes: updatedNotes } : null)
      // Refresh skills list to update note counts
      const skillsData = await api.skills.list()
      setSkills(skillsData)
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
      // Refresh skills list to update note counts
      const skillsData = await api.skills.list()
      setSkills(skillsData)
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleAIPreview = async () => {
    if (!selectedSkillId) return

    setAiLoading(true)
    setShowAIPreview(true)
    try {
      const preview = await api.skills.previewAIUpdate(selectedSkillId)
      setAiPreview(preview)
    } catch (err) {
      console.error('Failed to get AI preview:', err)
      setShowAIPreview(false)
    } finally {
      setAiLoading(false)
    }
  }

  // Save ai aupdate after preview is done
  const handleSaveAIUpdate = async () => {
    if (!selectedSkillId || !aiPreview) return

    try {
      await api.skills.saveAIUpdate(selectedSkillId, aiPreview.updated_content)
      // Refresh skill detail and skills list
      const updatedDetail = await api.skills.get(selectedSkillId)
      setSkillDetail(updatedDetail)
      const skillsData = await api.skills.list()
      setSkills(skillsData)
      setShowAIPreview(false)
      setAiPreview(null)
    } catch (err) {
      console.error('Failed to save AI update:', err)
    }
  }

  const handleAIReject = () => {
    setShowAIPreview(false)
    setAiPreview(null)
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

      <SkillContent skillDetail={skillDetail} onSave={handleSaveSkill} saving={saving} />

      <SkillNotes
        skillDetail={skillDetail}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        addingNote={addingNote}
        onAIPreview={handleAIPreview}
        aiLoading={aiLoading}
      />

      {/* AI Preview Dialog */}
      <AIPreviewDialog
        isOpen={showAIPreview}
        preview={aiPreview}
        isLoading={aiLoading}
        onCancel={handleAIReject}
        onAccept={handleSaveAIUpdate}
        onReject={handleAIReject}
      />
    </div>
  )
}
