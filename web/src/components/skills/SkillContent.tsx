import { FileEdit, X, Save } from 'lucide-react'
import { useState } from 'react'
import type { SkillDetail } from '@/lib/skills/types'
import { stripFrontmatter } from '@/lib/skills/utils'
import { RenderMarkdown } from '@/components/RenderMarkdown'

type SkillContentProps = {
  skillDetail: SkillDetail | null
  onSave?: (content: string) => void
  saving?: boolean
}

export function SkillContent({ skillDetail, onSave, saving }: SkillContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  const handleEdit = () => {
    if (skillDetail) {
      setEditContent(skillDetail.skill.content)
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleSave = () => {
    if (onSave && editContent.trim()) {
      onSave(editContent)
      setIsEditing(false)
    }
  }

  return (
    <main className="flex-1 min-w-0 bg-black border border-[#1e1e1e] rounded flex flex-col">
      {skillDetail ? (
        <>
          {/* Panel Header - Atlas: 32px height */}
          <div className="h-8 flex items-center justify-between px-4 border-b border-[#1e1e1e] flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-white">{skillDetail.skill.title}</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] bg-[#0f0f0f] border border-[#1e1e1e] rounded text-[#777]">
                {skillDetail.skill.format}
              </span>
              {skillDetail.skill.pending_sync && (
                <span className="px-2 py-0.5 text-[10px] bg-[#0070f3] rounded text-white">
                  Modified
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#aaa] text-xs font-medium rounded transition-colors duration-150"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-[#0070f3] hover:bg-[#0060d3] disabled:opacity-50 text-white text-xs font-medium rounded transition-colors duration-150"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEdit}
                className="flex items-center gap-1.5 h-6 px-2.5 bg-[#ededed] hover:bg-white text-black text-xs font-medium rounded transition-colors duration-150"
              >
                <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
                Edit
              </button>
            )}
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-auto p-4">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[400px] bg-[#0f0f0f] border border-[#1e1e1e] rounded p-4 text-[#aaa] text-sm font-mono resize-none focus:outline-none focus:border-[#0070f3]"
                placeholder="Enter markdown content..."
              />
            ) : (
              <RenderMarkdown>
                {stripFrontmatter(skillDetail.skill.content)}
              </RenderMarkdown>
            )}
          </div>

          {/* Status Bar - Atlas: 28px height */}
          <div className="h-7 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-[11px] flex-shrink-0">
            {isEditing ? 'Editing raw markdown' : 'Leave blank'}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#585858]">
          Select a skill to view
        </div>
      )}
    </main>
  )
}