import { SmartBoardPanel } from './SmartBoardPanel'
import { SmartBoardItemCard } from './SmartBoardItemCard'
import type { ThingsToRememberData } from '@/types'

type ThingsToRememberPanelProps = {
  data: ThingsToRememberData | null
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  onEditItem: (itemId: string, text: string) => void
  onChangeCategory: (itemId: string, category: 'urgent' | 'important' | 'not-important') => void
}

export function ThingsToRememberPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
  onChangeCategory,
}: ThingsToRememberPanelProps) {
  const items = data?.items || []

  // Map category to dot color
  const categoryToDotColor = (category: string): 'red' | 'yellow' | 'gray' => {
    switch (category) {
      case 'urgent':
        return 'red'
      case 'important':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  return (
    <SmartBoardPanel
      title="Things to Remember"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No items yet. Click refresh to analyze your notes.
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <SmartBoardItemCard
              key={item.id}
              index={idx + 1}
              title={item.title || item.text.substring(0, 40)}
              date={item.date}
              dotColor={categoryToDotColor(item.category)}
              onClick={() => onEditItem(item.id, item.text)}
              rightActions={
                <select
                  value={item.category}
                  onChange={(e) =>
                    onChangeCategory(
                      item.id,
                      e.target.value as 'urgent' | 'important' | 'not-important'
                    )
                  }
                  className="text-xs bg-transparent text-secondary hover:text-primary border-none focus:outline-none cursor-pointer"
                  title="Change category"
                >
                  <option value="urgent">Urgent</option>
                  <option value="important">Important</option>
                  <option value="not-important">Not Important</option>
                </select>
              }
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  )
}
