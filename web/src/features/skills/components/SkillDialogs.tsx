import type { SkillSummary } from '@/types';
import type { DialogState } from '../hooks/useSkillDialogs';
import { PullSelectionDialog } from './PullSelectionDialog';
import { SkillAIPreviewDialog } from './SkillAIPreviewDialog';
import { SkillChatModal } from './SkillChatModal';
import { SyncConfirmationDialog } from './SyncConfirmationDialog';

type SkillDialogsProps = {
  state: DialogState;
  skills: SkillSummary[];
  selectedSkill: SkillSummary | null;
  selectedSkillTitle: string | null;
  syncing: boolean;
  onCancelPull: () => void;
  onPull: (skillIds: string[]) => void;
  onCancelSyncConfirmation: () => void;
  onPushFirst: () => void;
  onPullAnyway: () => void;
  onCancelAIPreview: () => void;
  onAcceptAIUpdate: () => void;
  onRejectAIUpdate: () => void;
  onCloseChat: () => void;
};

export function SkillDialogs({
  state,
  skills,
  selectedSkill,
  selectedSkillTitle,
  syncing,
  onCancelPull,
  onPull,
  onCancelSyncConfirmation,
  onPushFirst,
  onPullAnyway,
  onCancelAIPreview,
  onAcceptAIUpdate,
  onRejectAIUpdate,
  onCloseChat,
}: SkillDialogsProps) {
  const confirmationSkills = skills.filter((s) => state.selectedPullIds.includes(s.id));

  return (
    <>
      <SkillAIPreviewDialog
        isOpen={state.showAIPreview}
        preview={state.aiPreview}
        isLoading={state.aiLoading}
        onCancel={onCancelAIPreview}
        onAccept={onAcceptAIUpdate}
        onReject={onRejectAIUpdate}
      />

      <PullSelectionDialog
        isOpen={state.showPullDialog}
        skills={skills}
        onCancel={onCancelPull}
        onPull={onPull}
        isLoading={syncing}
      />

      <SyncConfirmationDialog
        isOpen={state.showSyncConfirmation}
        skills={confirmationSkills}
        onCancel={onCancelSyncConfirmation}
        onPushFirst={onPushFirst}
        onPullAnyway={onPullAnyway}
      />

      {selectedSkill && selectedSkillTitle && (
        <SkillChatModal
          skillId={selectedSkill.id}
          skillTitle={selectedSkillTitle}
          isOpen={state.showChat}
          onClose={onCloseChat}
        />
      )}
    </>
  );
}
