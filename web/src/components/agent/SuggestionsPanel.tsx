import { SmartBoardPanel } from './SmartBoardPanel'
import { SmartBoardItemCard } from './SmartBoardItemCard'
import type { SuggestionsData } from '@/types'

type SuggestionsPanelProps = {
  data: SuggestionsData | null
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  onEditItem: (itemId: string, suggestion: string, reasoning: string) => void
  onChangeStatus: (itemId: string, status: 'active' | 'dismissed' | 'completed') => void
}

export function SuggestionsPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
  onChangeStatus,
}: SuggestionsPanelProps) {
  const items = data?.suggestions || []

  // Map status to dot color
  const statusToDotColor = (status: string): 'green' | 'gray' | 'blue' => {
    switch (status) {
      case 'completed':
        return 'green'
      case 'dismissed':
        return 'gray'
      default:
        return 'blue'
    }
  }

  return (
    <SmartBoardPanel
      title="Suggestions / Coach"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No suggestions yet. Click refresh to get coaching insights.
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <SmartBoardItemCard
              key={item.id}
              index={idx + 1}
              title={item.title || item.suggestion.substring(0, 40)}
              date={item.createdAt?.substring(0, 10) || ''}
              dotColor={statusToDotColor(item.status)}
              onClick={() => onEditItem(item.id, item.suggestion, item.reasoning)}
              rightActions={
                <select
                  value={item.status}
                  onChange={(e) =>
                    onChangeStatus(
                      item.id,
                      e.target.value as 'active' | 'dismissed' | 'completed'
                    )
                  }
                  className="text-xs bg-transparent text-secondary hover:text-primary border-none focus:outline-none cursor-pointer"
                  title="Change status"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              }
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  )
}
