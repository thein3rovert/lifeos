import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import {
  SkillContent,
  SkillDialogs,
  SkillNotes,
  SkillsSidebar,
  useNotes,
  useSkillDialogs,
  useSkills,
  useSync,
} from '@/features/skills';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { SkillReference } from '@/types';

export const Route = createFileRoute('/skills/')({
  component: SkillsPage,
});

function SkillsPage() {
  const { skills, selectedSkill, skillDetail, loading, selectSkill, refreshSkills, refreshDetail } =
    useSkills();

  const { adding, addNote, editNote, deleteNote } = useNotes();

  const { syncState, sync, push, pushSelected } = useSync();

  const {
    state: dialogState,
    openPullDialog,
    closePullDialog,
    closeSyncConfirmation,
    openChat,
    closeChat,
    handlePullSelected,
    handlePullAnyway,
    handlePushFirst,
    handlePushSelected,
    handleAIPreview,
    handleSaveAIUpdate,
    handleAIReject,
  } = useSkillDialogs({
    skills,
    selectedSkill,
    refreshSkills,
    refreshDetail,
    sync,
    push,
    pushSelected,
  });

  // Local UI state
  const [selectedReference, setSelectedReference] = useState<SkillReference | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingSkill, setCreatingSkill] = useState(false);

  // Load skills on mount
  useEffect(() => {
    refreshSkills();
  }, [refreshSkills]);

  // Load skill detail when selected
  useEffect(() => {
    if (selectedSkill) {
      if (selectedReference && selectedReference.skill_id !== selectedSkill.id) {
        setSelectedReference(null);
      }
      refreshDetail();
    }
  }, [
    selectedSkill?.id,
    selectedReference?.skill_id,
    selectedReference,
    selectedSkill,
    refreshDetail,
  ]);

  // Handlers
  const handleSaveSkill = useCallback(
    async (content: string) => {
      if (!selectedSkill) return;
      setSaving(true);
      try {
        await api.skills.save(selectedSkill.id, content);
        await refreshSkills();
        await refreshDetail();
      } catch (err) {
        const normalized = toError(err);
        console.error('Failed to save skill:', normalized);
        toast(normalized.message, 'error');
      } finally {
        setSaving(false);
      }
    },
    [selectedSkill, refreshSkills, refreshDetail]
  );

  const handleSelectReference = useCallback(
    (reference: SkillReference | null) => {
      if (!reference) {
        setSelectedReference(null);
        return;
      }
      setSelectedReference(reference);
      if (reference.skill_id !== selectedSkill?.id) {
        selectSkill(reference.skill_id);
      }
    },
    [selectedSkill, selectSkill]
  );

  const handleAddNote = useCallback(
    async (title: string, content: string) => {
      if (!title.trim() || !content.trim() || !selectedSkill) return;
      const result = await addNote(selectedSkill.id, title, content);
      if (result) {
        await refreshSkills();
      }
    },
    [selectedSkill, addNote, refreshSkills]
  );

  const handleDeleteNote = useCallback(
    async (noteId: number) => {
      if (!selectedSkill) return;
      await deleteNote(selectedSkill.id, noteId);
      await refreshSkills();
    },
    [selectedSkill, deleteNote, refreshSkills]
  );

  const handleEditNote = useCallback(
    async (noteId: number, title: string, content: string) => {
      if (!selectedSkill) return;
      await editNote(selectedSkill.id, noteId, title, content);
    },
    [selectedSkill, editNote]
  );

  const handleCreateSkill = useCallback(
    async (title: string, format: string, content: string) => {
      setCreatingSkill(true);
      try {
        const newSkill = await api.skills.create(title, format, content);
        await refreshSkills();
        selectSkill(newSkill.id);
      } catch (err) {
        const normalized = toError(err);
        console.error('Failed to create new skill:', normalized);
        toast(normalized.message, 'error');
      } finally {
        setCreatingSkill(false);
      }
    },
    [refreshSkills, selectSkill]
  );

  const handleRefetchReference = useCallback(async () => {
    if (!selectedReference) return;
    try {
      const updated = await api.references.get(selectedReference.skill_id, selectedReference.path);
      setSelectedReference(updated);
    } catch (err) {
      const normalized = toError(err);
      console.error('Failed to refetch reference:', normalized);
      toast(normalized.message, 'error');
    }
  }, [selectedReference]);

  const syncing = syncState === 'pulling';
  const pushing = syncState === 'pushing';

  return (
    <div className="flex h-full gap-3 p-4">
      <SkillsSidebar
        skills={skills}
        selectedSkillId={selectedSkill?.id || null}
        onSelectSkill={selectSkill}
        onSelectReference={handleSelectReference}
        loading={loading}
        syncing={syncing}
        onSync={openPullDialog}
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
        onOpenChat={openChat}
        onRefetch={handleRefetchReference}
      />

      <SkillNotes
        skillDetail={skillDetail}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onEditNote={handleEditNote}
        addingNote={adding}
        onAIPreview={handleAIPreview}
        aiLoading={dialogState.aiLoading}
      />

      <SkillDialogs
        state={dialogState}
        skills={skills}
        selectedSkill={selectedSkill}
        selectedSkillTitle={skillDetail?.skill.title ?? null}
        syncing={syncing}
        onCancelPull={closePullDialog}
        onPull={handlePullSelected}
        onCancelSyncConfirmation={closeSyncConfirmation}
        onPushFirst={handlePushFirst}
        onPullAnyway={handlePullAnyway}
        onCancelAIPreview={handleAIReject}
        onAcceptAIUpdate={handleSaveAIUpdate}
        onRejectAIUpdate={handleAIReject}
        onCloseChat={closeChat}
      />
    </div>
  );
}
