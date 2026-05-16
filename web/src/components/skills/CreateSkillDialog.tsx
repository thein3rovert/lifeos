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
      <div className="w-full max-w-dialog-lg h-dialog bg-raised border border-default rounded-lg flex flex-col"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-default shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <span className="text-base font-medium text-white">
              Create New Skill
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-hover rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-xs text-secondary mb-2">
              Skill Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter skill title..."
              className="w-full h-8 px-3 bg-raised border border-default rounded-md text-base text-white placeholder:text-muted focus:outline-none focus:border-highlight"
              autoFocus
            />
          </div>

          {/* Format Select */}
          <div>
            <label className="block text-xs text-secondary mb-2">
              Format
            </label>
            <div className="flex gap-2">
              {SKILL_FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`h-7 px-3 text-xs font-medium rounded-md transition-colors duration-150 ${
                    format === f.value
                      ? 'bg-blue-600 text-white'
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
            <label className="block text-xs text-secondary mb-2">
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter skill content in markdown..."
              className="w-full h-[calc(100%-28px)] min-h-dialog-content-sm p-3 bg-raised border border-default rounded-md text-base text-secondary placeholder:text-muted focus:outline-none focus:border-highlight resize-none font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-default bg-raised shrink-0">
          <button
            onClick={handleClose}
            className="h-8 px-4 bg-raised hover:bg-hover text-secondary text-xs font-medium rounded-md transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isLoading}
            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md flex items-center gap-2 transition-colors duration-150"
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