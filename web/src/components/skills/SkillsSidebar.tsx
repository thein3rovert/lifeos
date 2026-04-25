import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { Skill } from '../../lib/skills/types'

type SkillsSidebarProps = {
  skills: Skill[]
  selectedSkillId: string | null
  onSelectSkill: (id: string) => void
  loading: boolean
  syncing: boolean
  onSync: () => void
  collapsed: boolean
  onToggleCollapse: (collapsed: boolean) => void
}

export function SkillsSidebar({
  skills,
  selectedSkillId,
  onSelectSkill,
  loading,
  syncing,
  onSync,
  collapsed,
  onToggleCollapse,
}: SkillsSidebarProps) {
  if (collapsed) {
    return (
      <button
        onClick={() => onToggleCollapse(false)}
        className="flex-shrink-0 w-8 h-8 self-start bg-[#0f0f0f] border border-[#1e1e1e] rounded hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center justify-center"
      >
        <ChevronRight className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-black border border-[#1e1e1e] rounded flex flex-col overflow-hidden">
      {/* Panel Header - Atlas: 32px height */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[#1e1e1e] flex-shrink-0">
        <span className="text-[11px] font-medium text-[#aaa] uppercase tracking-[0.08em]">Skills</span>
        <button
          onClick={() => onToggleCollapse(true)}
          className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Skills list */}
      <div className="flex-1 overflow-auto py-1">
        {loading ? (
          <div className="px-3 py-2 text-xs text-[#777]">Loading...</div>
        ) : skills.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[#777]">No skills yet</div>
        ) : (
          skills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSelectSkill(skill.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left text-[13px]
                transition-colors duration-150
                ${selectedSkillId === skill.id
                  ? 'bg-[rgba(255,255,255,0.06)] text-white border-l-2 border-[#0070f3]'
                  : 'text-[#aaa] hover:bg-[rgba(255,255,255,0.04)] hover:text-white border-l-2 border-transparent'
                }
              `}
            >
              <ChevronRight className="w-3.5 h-3.5 text-[#585858]" strokeWidth={1.5} />
              <span className="truncate">{skill.title}</span>
            </button>
          ))
        )}
      </div>

      {/* Sync button */}
      <div className="p-3 border-t border-[#1e1e1e] flex-shrink-0">
        <button
          onClick={onSync}
          disabled={syncing}
          className="w-full h-7 flex items-center justify-center gap-2 bg-[#ededed] hover:bg-white disabled:opacity-50 text-black text-xs font-medium rounded transition-colors duration-150"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {syncing ? 'Syncing...' : 'Sync Skills'}
        </button>
      </div>
    </aside>
  )
}
