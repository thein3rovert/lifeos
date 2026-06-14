import { Check, Download } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui';
import type { Skill } from '@/types';

type PullSelectionDialogProps = {
  isOpen: boolean;
  skills: Skill[];
  onCancel: () => void;
  onPull: (selectedIds: string[]) => void;
  isLoading?: boolean;
};

export function PullSelectionDialog({
  isOpen,
  skills,
  onCancel,
  onPull,
  isLoading,
}: PullSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = (skillId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId);
    } else {
      newSelected.add(skillId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === skills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(skills.map((s) => s.id)));
    }
  };

  const handlePull = () => {
    onPull(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onCancel();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="w-full max-w-dialog-sm max-h-dialog">
      <DialogHeader
        title="Pull from GitHub"
        icon={<Download className="w-4 h-4 text-blue-500" strokeWidth={1.5} />}
        onClose={handleClose}
      />

      <DialogBody className="py-1 px-0">
        {/* Select All */}
        <div className="px-4 py-2 border-b border-default bg-raised">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-xs text-secondary hover:text-white transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selectedIds.size === skills.length && skills.length > 0
                  ? 'bg-blue-600 border-highlight'
                  : 'border-default'
              }`}
            >
              {selectedIds.size === skills.length && skills.length > 0 && (
                <Check className="w-3 h-3 text-white" strokeWidth={2} />
              )}
            </div>
            Select All ({skills.length} skills)
          </button>
        </div>

        {/* Skills List */}
        <div className="flex-1 overflow-auto py-1">
          {skills.length === 0 ? (
            <div className="px-4 py-8 text-center text-tertiary text-xs">No skills available</div>
          ) : (
            skills.map((skill) => {
              const isSelected = selectedIds.has(skill.id);
              const hasLocalChanges = skill.pending_sync;

              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleToggle(skill.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-selected' : 'hover:bg-hover'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-600 border-highlight' : 'border-default'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={2} />}
                  </div>

                  {/* Skill Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base text-white truncate">{skill.title}</p>
                      {hasLocalChanges && (
                        <span className="px-1.5 py-0.5 bg-warning-muted border border-warning text-warning text-xxs rounded shrink-0">
                          Local changes
                        </span>
                      )}
                    </div>
                    <p className="text-xxs text-muted">{skill.format}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogBody>

      <DialogFooter className="bg-raised justify-between">
        <span className="text-xs text-secondary">{selectedIds.size} selected</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePull}
            isLoading={isLoading}
            disabled={selectedIds.size === 0}
            leftIcon={<Download className="w-3.5 h-3.5" strokeWidth={1.5} />}
          >
            {isLoading
              ? 'Pulling...'
              : `Pull ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
