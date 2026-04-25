import { ChevronLeft, ChevronRight, RefreshCw, Upload, StickyNote } from 'lucide-react'
import type { Skill } from '@/lib/skills/types'

type SkillsSidebarProps = {
  skills: Skill[]
  selectedSkillId: string | null
  onSelectSkill: (id: string) => void
  loading: boolean
  syncing: boolean
  onSync: () => void
  pushing?: boolean
  onPush?: () => void
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
  pushing,
  onPush,
  collapsed,
  onToggleCollapse,
}: SkillsSidebarProps) {
  // Calculate pending sync count
  const pendingCount = skills.filter(s => s.pending_sync).length
  // Calculate skills with notes
  const skillsWithNotes = skills.filter(s => (s.note_count || 0) > 0).length
  
  // Get last synced time from skills
  const lastSynced = skills.length > 0 
    ? skills.filter(s => s.synced_at).sort((a, b) => 
        new Date(b.synced_at!).getTime() - new Date(a.synced_at!).getTime()
      )[0]?.synced_at
    : null

  if (collapsed) {
    return (
      <button
        onClick={() => onToggleCollapse(false)}
        className="flex-shrink-0 w-8 h-8 self-start bg-[#0f0f0f] border border-[#1e1e1e] rounded hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center justify-center relative"
      >
        <ChevronRight className="w-4 h-4 text-[#777]" strokeWidth={1.5} />
        {(pendingCount > 0 || skillsWithNotes > 0) && (
          <div className="absolute -top-1 -right-1 flex">
            {pendingCount > 0 && (
              <span className="w-4 h-4 bg-[#0070f3] rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                {pendingCount}
              </span>
            )}
          </div>
        )}
      </button>
    )
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-black border border-[#1e1e1e] rounded flex flex-col overflow-hidden">
      {/* Panel Header - Atlas: 32px height */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[#1e1e1e] flex-shrink-0">
        <span className="text-[11px] font-medium text-[#aaa] uppercase tracking-[0.08em]">
          Skills
          {pendingCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#0070f3] rounded text-[9px] text-white">
              {pendingCount} pending
            </span>
          )}
          {skillsWithNotes > 0 && !pendingCount && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#f5a623] rounded text-[9px] text-black">
              {skillsWithNotes} notes
            </span>
          )}
        </span>
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
          skills.map((skill) => {
            const hasNotes = (skill.note_count || 0) > 0
            const hasPendingSync = skill.pending_sync
            
            return (
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
                <span className="truncate flex-1">{skill.title}</span>
                
                {/* Status indicators */}
                <div className="flex items-center gap-1">
                  {hasNotes && (
                    <span 
                      className="w-2 h-2 bg-[#f5a623] rounded-full flex-shrink-0" 
                      title={`${skill.note_count} pending note${skill.note_count !== 1 ? 's' : ''}`}
                    />
                  )}
                  {hasPendingSync && (
                    <span 
                      className="w-2 h-2 bg-[#0070f3] rounded-full flex-shrink-0" 
                      title="Pending sync"
                    />
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Sync status & buttons */}
      <div className="p-3 border-t border-[#1e1e1e] flex-shrink-0 space-y-2">
        {/* Last synced info */}
        {lastSynced && (
          <p className="text-[10px] text-[#666] text-center">
            Last synced: {new Date(lastSynced).toLocaleDateString()}
          </p>
        )}
        
        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={syncing}
          className="w-full h-7 flex items-center justify-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-50 text-[#aaa] text-xs font-medium rounded transition-colors duration-150"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {syncing ? 'Syncing...' : 'Pull from GitHub'}
        </button>
        
        {/* Push button - only show if pending changes */}
        {pendingCount > 0 && onPush && (
          <button
            onClick={onPush}
            disabled={pushing}
            className="w-full h-7 flex items-center justify-center gap-2 bg-[#0070f3] hover:bg-[#0060d3] disabled:opacity-50 text-white text-xs font-medium rounded transition-colors duration-150"
          >
            <Upload className={`w-3.5 h-3.5 ${pushing ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
            {pushing ? 'Pushing...' : `Push ${pendingCount} change${pendingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </aside>
  )
}