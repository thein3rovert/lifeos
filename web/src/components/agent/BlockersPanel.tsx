import { SmartBoardPanel } from './SmartBoardPanel'
import type { BlockersData } from '@/types'
import { AlertCircle } from 'lucide-react'

type BlockersPanelProps = {
  data: BlockersData | null
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  onEditItem: (itemId: string, blocker: string, context: string) => void
}

export function BlockersPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
}: BlockersPanelProps) {
  return (
    <SmartBoardPanel
      title="Blockers"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
    >
      {!data || data.blockers.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No blockers detected. Great job! 🚀
        </div>
      ) : (
        <div className="space-y-2">
          {data.blockers.map((item) => (
            <div
              key={item.id}
              className="border border-default rounded-md px-3 py-2.5 hover:border-red-500/50 transition-colors group bg-red-500/5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{item.blocker}</p>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    {item.context}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-tertiary">{item.date}</span>
                    <span className="text-tertiary">·</span>
                    <span className="text-xs text-tertiary">{item.source}</span>
                  </div>
                </div>
                {/* Edit action - shown on hover */}
                <button
                  onClick={() => onEditItem(item.id, item.blocker, item.context)}
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
