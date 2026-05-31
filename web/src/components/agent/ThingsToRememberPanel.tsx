import { SmartBoardPanel } from './SmartBoardPanel'
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
  const urgent = data?.items.filter((i) => i.category === 'urgent') || []
  const important = data?.items.filter((i) => i.category === 'important') || []
  const notImportant = data?.items.filter((i) => i.category === 'not-important') || []

  return (
    <SmartBoardPanel
      title="Things to Remember"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
      className="row-span-2"
    >
      {!data || data.items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No items yet. Click refresh to analyze your notes.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Urgent */}
          {urgent.length > 0 && (
            <CategorySection
              title="Urgent"
              items={urgent}
              color="red"
              onEditItem={onEditItem}
              onChangeCategory={onChangeCategory}
            />
          )}

          {/* Important */}
          {important.length > 0 && (
            <CategorySection
              title="Important"
              items={important}
              color="yellow"
              onEditItem={onEditItem}
              onChangeCategory={onChangeCategory}
            />
          )}

          {/* Not Important */}
          {notImportant.length > 0 && (
            <CategorySection
              title="Not Important"
              items={notImportant}
              color="gray"
              onEditItem={onEditItem}
              onChangeCategory={onChangeCategory}
            />
          )}
        </div>
      )}
    </SmartBoardPanel>
  )
}

// Category section component
type CategorySectionProps = {
  title: string
  items: ThingsToRememberData['items']
  color: 'red' | 'yellow' | 'gray'
  onEditItem: (itemId: string, text: string) => void
  onChangeCategory: (itemId: string, category: 'urgent' | 'important' | 'not-important') => void
}

function CategorySection({
  title,
  items,
  color,
  onEditItem,
  onChangeCategory,
}: CategorySectionProps) {
  const colorClasses = {
    red: 'border-l-red-500 bg-red-500/5',
    yellow: 'border-l-yellow-500 bg-yellow-500/5',
    gray: 'border-l-gray-500 bg-gray-500/5',
  }

  const categoryMap = {
    Urgent: 'urgent' as const,
    Important: 'important' as const,
    'Not Important': 'not-important' as const,
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-secondary mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border-l-2 ${colorClasses[color]} rounded-r px-3 py-2 group`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-primary flex-1">{item.text}</p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditItem(item.id, item.text)}
                  className="text-xs text-secondary hover:text-primary transition-colors"
                  title="Edit"
                >
                  Edit
                </button>
                <span className="text-tertiary">·</span>
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
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-tertiary">{item.source}</span>
              <span className="text-tertiary">·</span>
              <span className="text-xs text-tertiary">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
