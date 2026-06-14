import { useCallback, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { AIPreviewResponse, Skill } from '@/types';

type UseSkillDialogsProps = {
  skills: Skill[];
  selectedSkill: Skill | null;
  refreshSkills: () => Promise<void>;
  refreshDetail: () => Promise<void>;
  sync: () => Promise<void>;
  push: () => Promise<boolean>;
  pushSelected: (skillIds: string[]) => Promise<boolean>;
};

export type DialogState = {
  showAIPreview: boolean;
  showPullDialog: boolean;
  showSyncConfirmation: boolean;
  showChat: boolean;
  aiPreview: AIPreviewResponse | null;
  aiLoading: boolean;
  selectedPullIds: string[];
};

export function useSkillDialogs({
  skills,
  selectedSkill,
  refreshSkills,
  refreshDetail,
  sync,
  push,
  pushSelected,
}: UseSkillDialogsProps) {
  const [state, setState] = useState<DialogState>({
    showAIPreview: false,
    showPullDialog: false,
    showSyncConfirmation: false,
    showChat: false,
    aiPreview: null,
    aiLoading: false,
    selectedPullIds: [],
  });

  const update = useCallback(<K extends keyof DialogState>(key: K, value: DialogState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openPullDialog = useCallback(() => update('showPullDialog', true), [update]);
  const closePullDialog = useCallback(() => update('showPullDialog', false), [update]);
  const closeSyncConfirmation = useCallback(() => update('showSyncConfirmation', false), [update]);
  const openChat = useCallback(() => update('showChat', true), [update]);
  const closeChat = useCallback(() => update('showChat', false), [update]);

  const performPull = useCallback(
    async (skillIds: string[]) => {
      update('showSyncConfirmation', false);
      await sync();
      await refreshSkills();
      if (selectedSkill && skillIds.includes(selectedSkill.id)) {
        await refreshDetail();
      }
    },
    [sync, refreshSkills, refreshDetail, selectedSkill, update]
  );

  const handlePullSelected = useCallback(
    async (skillIds: string[]) => {
      closePullDialog();
      const selectedSkills = skills.filter((s) => skillIds.includes(s.id));
      const hasLocalChanges = selectedSkills.some(
        (s) => s.pending_sync || (s.note_count && s.note_count > 0)
      );

      if (hasLocalChanges) {
        setState((prev) => ({ ...prev, selectedPullIds: skillIds, showSyncConfirmation: true }));
      } else {
        await performPull(skillIds);
      }
    },
    [skills, performPull, closePullDialog]
  );

  const handlePullAnyway = useCallback(() => {
    performPull(state.selectedPullIds);
  }, [performPull, state.selectedPullIds]);

  const handlePushFirst = useCallback(async () => {
    update('showSyncConfirmation', false);
    await push();
    await performPull(state.selectedPullIds);
  }, [push, performPull, state.selectedPullIds, update]);

  const handlePushSelected = useCallback(
    async (skillIds: string[]) => {
      await pushSelected(skillIds);
      await refreshSkills();
    },
    [pushSelected, refreshSkills]
  );

  const handleAIPreview = useCallback(async () => {
    if (!selectedSkill) return;
    update('aiLoading', true);
    update('showAIPreview', true);
    try {
      const preview = await api.skills.previewAIUpdate(selectedSkill.id);
      setState((prev) => ({ ...prev, aiPreview: preview }));
    } catch (err) {
      const normalized = toError(err);
      console.error('Failed to get AI preview:', normalized);
      toast(normalized.message, 'error');
      update('showAIPreview', false);
    } finally {
      update('aiLoading', false);
    }
  }, [selectedSkill, update]);

  const handleSaveAIUpdate = useCallback(async () => {
    if (!selectedSkill || !state.aiPreview) return;
    try {
      await api.skills.saveAIUpdate(selectedSkill.id, state.aiPreview.updated_content);
      await refreshSkills();
      await refreshDetail();
      setState((prev) => ({ ...prev, showAIPreview: false, aiPreview: null }));
    } catch (err) {
      const normalized = toError(err);
      console.error('Failed to save AI update:', normalized);
      toast(normalized.message, 'error');
    }
  }, [selectedSkill, state.aiPreview, refreshSkills, refreshDetail]);

  const handleAIReject = useCallback(() => {
    setState((prev) => ({ ...prev, showAIPreview: false, aiPreview: null }));
  }, []);

  return {
    state,
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
  };
}
