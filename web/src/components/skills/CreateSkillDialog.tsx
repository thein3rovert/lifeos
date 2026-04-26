import { useState } from 'react'
import { X, Plus } from 'lucide-react'

type CreateSkillDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onCreate: (title: string, format: string, content: string) => void
  isLoading?: boolean
}

const SKILL_FORMATS = [
  { value: 'opencode', label: 'OpenCode' },
  { value: 'claude', label: 'Claude' },
  { value: 'copilot', label: 'Copilot' },
]

export function CreateSkillDialog({
  isOpen,
  onCancel,
  onCreate,
  isLoading,
}: CreateSkillDialogProps) {
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState('opencode')
  const [content, setContent] = useState(`---
name: 
description: 
format: opencode
---

## Overview

## Instructions

## Examples
`)

  const handleClose = () => {
    setTitle('')
    setFormat('opencode')
    setContent(`---
name: 
description: 
format: opencode
---

## Overview

## Instructions

## Examples
`)
    onCancel()
  }

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      onCreate(title.trim(), format, content)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-[700px] h-[80vh] bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--accent-highlight)]" strokeWidth={1.5} />
            <span className="text-[var(--text-md)] font-medium text-[var(--text-primary)]">
              Create New Skill
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-[var(--text-xs)] text-[var(--text-secondary)] mb-2">
              Skill Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter skill title..."
              className="w-full h-8 px-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              autoFocus
            />
          </div>

          {/* Format Select */}
          <div>
            <label className="block text-[var(--text-xs)] text-[var(--text-secondary)] mb-2">
              Format
            </label>
            <div className="flex gap-2">
              {SKILL_FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`h-7 px-3 text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150 ${
                    format === f.value
                      ? 'bg-[var(--accent-highlight)] text-white'
                      : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1 min-h-0">
            <label className="block text-[var(--text-xs)] text-[var(--text-secondary)] mb-2">
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter skill content in markdown..."
              className="w-full h-[calc(100%-28px)] min-h-[300px] p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] resize-none font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-[var(--border-default)] bg-[var(--bg-raised)] flex-shrink-0">
          <button
            onClick={handleClose}
            className="h-8 px-4 bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isLoading}
            className="h-8 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 text-[var(--text-inverse)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] flex items-center gap-2 transition-colors duration-150"
          >
            {isLoading ? (
              <>Creating...</>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Create Skill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}