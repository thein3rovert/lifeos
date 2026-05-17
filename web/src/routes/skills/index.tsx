import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AIPreviewResponse, SkillReference } from '@/types'
import { useSkills } from '@/hooks/useSkills'
import { useNotes } from '@/hooks/useNotes'
import { useSync } from '@/hooks/useSync'
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
  const {
    skills,
    selectedSkill,
    skillDetail,
    loading,
    selectSkill,
    refreshSkills,
    refreshDetail,
  } = useSkills()

  const {
    adding,
    addNote,
    editNote,
    deleteNote,
  } = useNotes()

  const {
    syncState,
    sync,
    push,
    pushSelected,
  } = useSync()

  // UI State
  const [selectedReference, setSelectedReference] = useState<SkillReference | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<AIPreviewResponse | null>(null)
  const [showAIPreview, setShowAIPreview] = useState(false)
  const [creatingSkill, setCreatingSkill] = useState(false)
  const [showPullDialog, setShowPullDialog] = useState(false)
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false)
  const [selectedPullIds, setSelectedPullIds] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)

  // Load skills on mount
  useEffect(() => {
    refreshSkills()
  }, [])

  // Load skill detail when selected
  useEffect(() => {
    if (selectedSkill) {
      if (selectedReference && selectedReference.skill_id !== selectedSkill.id) {
        setSelectedReference(null)
      }
      refreshDetail()
    }
  }, [selectedSkill?.id])

  // Handlers
  const handleSync = useCallback(() => {
    setShowPullDialog(true)
  }, [])

  const handlePullSelected = useCallback(async (skillIds: string[]) => {
    setShowPullDialog(false)
    const selectedSkills = skills.filter(s => skillIds.includes(s.id))
    const hasLocalChanges = selectedSkills.some(s => s.pending_sync || (s.note_count && s.note_count > 0))

    if (hasLocalChanges) {
      setSelectedPullIds(skillIds)
      setShowSyncConfirmation(true)
    } else {
      await performPull(skillIds)
    }
  }, [skills])

  const performPull = useCallback(async (skillIds: string[]) => {
    setShowSyncConfirmation(false)
    await sync()
    await refreshSkills()
    if (selectedSkill && skillIds.includes(selectedSkill.id)) {
      await refreshDetail()
    }
  }, [sync, refreshSkills, refreshDetail, selectedSkill])

  const handlePullAnyway = useCallback(() => {
    performPull(selectedPullIds)
  }, [performPull, selectedPullIds])

  const handlePushFirst = useCallback(async () => {
    setShowSyncConfirmation(false)
    await push()
    await performPull(selectedPullIds)
  }, [push, performPull, selectedPullIds])

  const handlePushSelected = useCallback(async (skillIds: string[]) => {
    await pushSelected(skillIds)
    await refreshSkills()
  }, [pushSelected, refreshSkills])

  const handleSaveSkill = useCallback(async (content: string) => {
    if (!selectedSkill) return
    setSaving(true)
    try {
      await api.skills.save(selectedSkill.id, content)
      await refreshSkills()
      await refreshDetail()
    } catch (err) {
      console.error('Failed to save skill:', err)
    } finally {
      setSaving(false)
    }
  }, [selectedSkill, refreshSkills, refreshDetail])

  const handleSelectReference = useCallback((reference: SkillReference | null) => {
    if (!reference) {
      setSelectedReference(null)
      return
    }
    setSelectedReference(reference)
    if (reference.skill_id !== selectedSkill?.id) {
      selectSkill(reference.skill_id)
    }
  }, [selectedSkill, selectSkill])

  const handleAddNote = useCallback(async (title: string, content: string) => {
    if (!title.trim() || !content.trim() || !selectedSkill) return
    const result = await addNote(selectedSkill.id, title, content)
    if (result) {
      await refreshSkills()
    }
  }, [selectedSkill, addNote, refreshSkills])

  const handleDeleteNote = useCallback(async (noteId: number) => {
    if (!selectedSkill) return
    await deleteNote(selectedSkill.id, noteId)
    await refreshSkills()
  }, [selectedSkill, deleteNote, refreshSkills])

  const handleEditNote = useCallback(async (noteId: number, title: string, content: string) => {
    if (!selectedSkill) return
    await editNote(selectedSkill.id, noteId, title, content)
  }, [selectedSkill, editNote])

  const handleAIPreview = useCallback(async () => {
    if (!selectedSkill) return
    setAiLoading(true)
    setShowAIPreview(true)
    try {
      const preview = await api.skills.previewAIUpdate(selectedSkill.id)
      setAiPreview(preview)
    } catch (err) {
      console.error('Failed to get AI preview:', err)
      setShowAIPreview(false)
    } finally {
      setAiLoading(false)
    }
  }, [selectedSkill])

  const handleSaveAIUpdate = useCallback(async () => {
    if (!selectedSkill || !aiPreview) return
    try {
      await api.skills.saveAIUpdate(selectedSkill.id, aiPreview.updated_content)
      await refreshSkills()
      await refreshDetail()
      setShowAIPreview(false)
      setAiPreview(null)
    } catch (err) {
      console.error('Failed to save AI update:', err)
    }
  }, [selectedSkill, aiPreview, refreshSkills, refreshDetail])

  const handleAIReject = useCallback(() => {
    setShowAIPreview(false)
    setAiPreview(null)
  }, [])

  const handleCreateSkill = useCallback(async (title: string, format: string, content: string) => {
    setCreatingSkill(true)
    try {
      const newSkill = await api.skills.create(title, format, content)
      await refreshSkills()
      selectSkill(newSkill.id)
    } catch (err) {
      console.error('Failed to create new skill:', err)
    } finally {
      setCreatingSkill(false)
    }
  }, [refreshSkills, selectSkill])

  const handleRefetchReference = useCallback(async () => {
    if (!selectedReference) return
    try {
      const updated = await api.references.get(selectedReference.skill_id, selectedReference.path)
      setSelectedReference(updated)
    } catch (err) {
      console.error('Failed to refetch reference:', err)
    }
  }, [selectedReference])

  const syncing = syncState === 'pulling'
  const pushing = syncState === 'pushing'

  return (
    <div className="flex h-full gap-3 p-4">
      <SkillsSidebar
        skills={skills}
        selectedSkillId={selectedSkill?.id || null}
        onSelectSkill={selectSkill}
        onSelectReference={handleSelectReference}
        loading={loading}
        syncing={syncing}
        onSync={handleSync}
        pushing={pushing}
        onPush={push}
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
        onRefetch={handleRefetchReference}
      />

      <SkillNotes
        skillDetail={skillDetail}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onEditNote={handleEditNote}
        addingNote={adding}
        onAIPreview={handleAIPreview}
        aiLoading={aiLoading}
      />

      <SkillAIPreviewDialog
        isOpen={showAIPreview}
        preview={aiPreview}
        isLoading={aiLoading}
        onCancel={handleAIReject}
        onAccept={handleSaveAIUpdate}
        onReject={handleAIReject}
      />

      <PullSelectionDialog
        isOpen={showPullDialog}
        skills={skills}
        onCancel={() => setShowPullDialog(false)}
        onPull={handlePullSelected}
        isLoading={syncing}
      />

      <SyncConfirmationDialog
        isOpen={showSyncConfirmation}
        skills={skills.filter(s => selectedPullIds.includes(s.id))}
        onCancel={() => setShowSyncConfirmation(false)}
        onPushFirst={handlePushFirst}
        onPullAnyway={handlePullAnyway}
      />

      {selectedSkill && skillDetail && (
        <SkillChatModal
          skillId={selectedSkill.id}
          skillTitle={skillDetail.skill.title}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}