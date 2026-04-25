import { FileEdit } from 'lucide-react'
import type { SkillDetail } from '@/lib/skills/types'
import { stripFrontmatter } from '@/lib/skills/utils'
import { RenderMarkdown } from '@/components/RenderMarkdown'

type SkillContentProps = {
  skillDetail: SkillDetail | null
}

export function SkillContent({ skillDetail }: SkillContentProps) {
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
            </div>
            <button className="flex items-center gap-1.5 h-6 px-2.5 bg-[#ededed] hover:bg-white text-black text-xs font-medium rounded transition-colors duration-150">
              <FileEdit className="w-3.5 h-3.5" strokeWidth={1.5} />
              Edit
            </button>
          </div>

          {/* Markdown Content - Scrollable */}
          <div className="flex-1 overflow-auto p-4">
            <RenderMarkdown>
              {stripFrontmatter(skillDetail.skill.content)}
            </RenderMarkdown>
          </div>

          {/* Status Bar - Atlas: 28px height */}
          <div className="h-7 border-t border-[#1e1e1e] flex items-center justify-center text-[#585858] text-[11px] flex-shrink-0">
            Leave blank
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
