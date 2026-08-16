import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui';

const SKILL_FORMATS = [
  { value: 'opencode', label: 'OpenCode' },
  { value: 'claude', label: 'Claude' },
  { value: 'copilot', label: 'Copilot' },
];

type CreateSkillDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onCreate: (title: string, format: string, content: string) => void;
  isLoading?: boolean;
};

const DEFAULT_CONTENT = `---
name:
description:
format: opencode
---

## Overview

## Instructions

## Examples
`;

export function CreateSkillDialog({
  isOpen,
  onCancel,
  onCreate,
  isLoading,
}: CreateSkillDialogProps) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('opencode');
  const [content, setContent] = useState(DEFAULT_CONTENT);

  const handleClose = () => {
    setTitle('');
    setFormat('opencode');
    setContent(DEFAULT_CONTENT);
    onCancel();
  };

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      onCreate(title.trim(), format, content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="w-full max-w-dialog-lg h-dialog">
      <DialogHeader
        title="Create New Skill"
        icon={<Plus className="w-4 h-4 text-highlight" strokeWidth={1.5} />}
        onClose={handleClose}
      />

      <DialogBody className="space-y-4">
        {/* Title Input */}
        <div>
          <label htmlFor="skill-title" className="block text-xs text-secondary mb-2">
            Skill Title
          </label>
          <input
            id="skill-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter skill title..."
            className="w-full h-8 px-3 bg-raised border border-default rounded-md text-base text-white placeholder:text-muted focus:outline-none focus:border-highlight"
          />
        </div>

        {/* Format Select */}
        <div>
          <span className="block text-xs text-secondary mb-2">Format</span>
          <div className="flex gap-2">
            {SKILL_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`h-7 px-3 text-xs font-medium rounded-md transition-colors duration-150 ${
                  format === f.value
                    ? 'bg-highlight text-white'
                    : 'bg-raised text-secondary hover:bg-hover'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Editor */}
        <div className="flex-1 min-h-0">
          <label htmlFor="skill-content" className="block text-xs text-secondary mb-2">
            Content (Markdown)
          </label>
          <textarea
            id="skill-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter skill content in markdown..."
            className="w-full h-[calc(100%-28px)] min-h-dialog-content-sm p-3 bg-raised border border-default rounded-md text-base text-secondary placeholder:text-muted focus:outline-none focus:border-highlight resize-none font-mono"
          />
        </div>
      </DialogBody>

      <DialogFooter className="bg-raised">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!title.trim() || !content.trim()}
          leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />}
        >
          {isLoading ? 'Creating...' : 'Create Skill'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
