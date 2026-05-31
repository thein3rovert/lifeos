import { SmartBoardPanel } from './SmartBoardPanel'
import type { AchievementsData } from '@/types'
import { Trophy } from 'lucide-react'

type AchievementsPanelProps = {
  data: AchievementsData | null
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  onEditItem: (itemId: string, achievement: string) => void
}

export function AchievementsPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
}: AchievementsPanelProps) {
  return (
    <SmartBoardPanel
      title="Weekly Achievements"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
    >
      {!data || data.achievements.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No achievements recorded yet. Click refresh to scan your journals.
        </div>
      ) : (
        <div className="space-y-2">
          {data.achievements.map((item) => (
            <div
              key={item.id}
              className="border border-default rounded-md px-3 py-2.5 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <Trophy className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary">{item.achievement}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-tertiary">{item.date}</span>
                    <span className="text-tertiary">·</span>
                    <span className="text-xs text-tertiary">{item.source}</span>
                  </div>
                </div>
                {/* Edit action - shown on hover */}
                <button
                  onClick={() => onEditItem(item.id, item.achievement)}
                  className="text-xs text-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SmartBoardPanel>
  )
}
