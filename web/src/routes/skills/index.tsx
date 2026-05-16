import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api, type AIPreviewResponse, type SkillReference } from '@/lib/api'
import type { Skill, SkillDetail } from '@/lib/skills/types'
import { SkillsSidebar } from '@/components/skills/SkillsSidebar'
import { SkillContent } from '@/components/skills/SkillContent'
import { SkillNotes } from '@/components/skills/SkillNotes'
import { SkillAIPreviewDialog } from '@/components/skills/SkillAIPreviewDialog'
import { PullSelectionDialog } from '@/components/skills/PullSelectionDialog'
import { SyncConfirmationDialog } from '@/components/skills/SyncConfirmationDialog'
import { SkillChatModal } from '@/components/skills/SkillChatModal'

export const Route = createFileRoute('/skills/')({
  component: SkillsPage,
})

function SkillsPage() {
  // State
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null)
  const [selectedReference, setSelectedReference] = useState<SkillReference | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<AIPreviewResponse | null>(null)
  const [showAIPreview, setShowAIPreview] = useState(false)
  const [creatingSkill, setCreatingSkill] = useState(false)
  const [showPullDialog, setShowPullDialog] = useState(false)
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false)
  const [selectedPullIds, setSelectedPullIds] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)

  // Load skills list on mount
  useEffect(() => {
    loadSkills()
  }, [])

  // Load skill detail when selected
  useEffect(() => {
    if (selectedSkillId) {
      // Only clear reference if it's from a different skill
      if (selectedReference && selectedReference.skill_id !== selectedSkillId) {
        setSelectedReference(null)
      }
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
    setShowPullDialog(true) // Show selection dialog
  }

  const handlePullSelected = async (skillIds: string[]) => {
    setShowPullDialog(false)

    // Check if any selected skills have local changes
    const selectedSkills = skills.filter(s => skillIds.includes(s.id))
    const hasLocalChanges = selectedSkills.some(s => s.pending_sync || (s.note_count && s.note_count > 0))

    if (hasLocalChanges) {
      // Show confirmation dialog
      setSelectedPullIds(skillIds)
      setShowSyncConfirmation(true)
    } else {
      // No conflicts, pull directly
      await performPull(skillIds)
    }
  }

  const performPull = async (skillIds: string[]) => {
    setShowSyncConfirmation(false)
    setSyncing(true)
    try {
      // Sync all from GitHub
      await api.skills.sync()
      // Reload skills list
      const allSkills = await api.skills.list()
      setSkills(allSkills)
      // If currently viewing a pulled skill, reload it
      if (selectedSkillId && skillIds.includes(selectedSkillId)) {
        await loadSkillDetail(selectedSkillId)
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  const handlePullAnyway = () => {
    performPull(selectedPullIds)
  }

  const handlePushFirst = async () => {
    setShowSyncConfirmation(false)
    // Push pending changes first
    await handlePush()
    // Then pull
    await performPull(selectedPullIds)
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

  const handlePushSelected = async (skillIds: string[]) => {
    setPushing(true)
    try {
      // Push each selected skill individually
      for (const skillId of skillIds) {
        await api.skills.pushSingle(skillId)
      }
      // Refresh skills list
      const data = await api.skills.list()
      setSkills(data)
    } catch (err) {
      console.error('Failed to push selected skills:', err)
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

  const handleSelectReference = (reference: SkillReference | null) => {
    if (!reference) {
      setSelectedReference(null)
      return
    }

    console.log('Selected reference:', reference)
    console.log('Content length:', reference.content?.length)
    setSelectedReference(reference)

    // Switch to the skill that owns this reference (will load notes for that skill)
    if (reference.skill_id !== selectedSkillId) {
      setSelectedSkillId(reference.skill_id)
    }
  }

  const handleAddNote = async (title: string, content: string) => {
    if (!title.trim() || !content.trim() || !selectedSkillId) return

    setAddingNote(true)
    try {
      const updatedNotes = await api.notes.add(selectedSkillId, title, content)
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

  const handleEditNote = async (noteId: number, title: string, content: string) => {
    if (!selectedSkillId) return
    setAddingNote(true)

    try {
      await api.notes.edit(selectedSkillId, noteId, title, content)
      // Refresh note list
      const updatedNotes = await api.notes.list(selectedSkillId)
      setSkillDetail(prev => prev ? { ...prev, notes: updatedNotes } : null)
    } catch (err) {
      console.error('Failed to edit note:', err)
    } finally {
      setAddingNote(false)
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
      console.error('Failed to get AI preview make sure your AI provider\n is connected and running:', err)
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
      console.error('Failed to save AI update make sure your AI provider\n is connected and running:', err)
    }
  }

  const handleAIReject = () => {
    setShowAIPreview(false)
    setAiPreview(null)
  }

  const handleCreateSkill = async (title: string, format: string, content: string) => {
    setCreatingSkill(true)
    try {
      const newSkill = await api.skills.create(title, format, content)
      // Refresh skills list and select the new skill
      const skillsData = await api.skills.list()
      setSkills(skillsData)
      setSelectedSkillId(newSkill.id)
    } catch (err) {
      console.error('Failed to create new skill:', err)
    } finally {
      setCreatingSkill(false)
    }
  }

  return (
    <div className="flex h-full gap-3 p-4">
      <SkillsSidebar
        skills={skills}
        selectedSkillId={selectedSkillId}
        onSelectSkill={setSelectedSkillId}
        onSelectReference={handleSelectReference}
        loading={loading}
        syncing={syncing}
        onSync={handleSync}
        pushing={pushing}
        onPush={handlePush}
        onPushSelected={handlePushSelected}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
        onCreateSkill={handleCreateSkill}
        creatingSkill={creatingSkill}
      />

      <SkillContent
        skillDetail={skillDetail}
        selectedReference={selectedReference}
        onSave={handleSaveSkill}
        saving={saving}
        onOpenChat={() => setShowChat(true)}
      />

      <SkillNotes
        skillDetail={skillDetail}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onEditNote={handleEditNote}
        addingNote={addingNote}
        onAIPreview={handleAIPreview}
        aiLoading={aiLoading}
      />

      {/* AI Preview Dialog */}
      <SkillAIPreviewDialog
        isOpen={showAIPreview}
        preview={aiPreview}
        isLoading={aiLoading}
        onCancel={handleAIReject}
        onAccept={handleSaveAIUpdate}
        onReject={handleAIReject}
      />

      {/* Pull Selection Dialog */}
      <PullSelectionDialog
        isOpen={showPullDialog}
        skills={skills}
        onCancel={() => setShowPullDialog(false)}
        onPull={handlePullSelected}
        isLoading={syncing}
      />

      {/* Sync Confirmation Dialog */}
      <SyncConfirmationDialog
        isOpen={showSyncConfirmation}
        skills={skills.filter(s => selectedPullIds.includes(s.id))}
        onCancel={() => setShowSyncConfirmation(false)}
        onPushFirst={handlePushFirst}
        onPullAnyway={handlePullAnyway}
      />

      {/* Floating Chat */}
      {selectedSkillId && skillDetail && (
        <SkillChatModal
          skillId={selectedSkillId}
          skillTitle={skillDetail.skill.title}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}
