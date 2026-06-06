import { SmartBoardPanel } from './SmartBoardPanel'
import { SmartBoardItemCard } from './SmartBoardItemCard'
import type { BlockersData } from '@/types'

type BlockersPanelProps = {
  data: BlockersData | null
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  onEditItem: (itemId: string, blocker: string, context: string, title?: string) => void
}

export function BlockersPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
}: BlockersPanelProps) {
  const items = data?.blockers || []

  return (
    <SmartBoardPanel
      title="Blockers"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
      accentColor="yellow"
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No blockers detected. Great job! 🚀
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <SmartBoardItemCard
              key={item.id}
              index={idx + 1}
              title={item.title || item.blocker.substring(0, 40)}
              date={item.date}
              description={item.blocker}
              dotColor="red"
              onClick={() => onEditItem(item.id, item.blocker, item.context, item.title)}
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  )
}
