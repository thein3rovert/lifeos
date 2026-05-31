import { SmartBoardPanel } from './SmartBoardPanel'
import type { SuggestionsData } from '@/types'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'

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
  const activeSuggestions = data?.suggestions.filter((s) => s.status === 'active') || []

  return (
    <SmartBoardPanel
      title="Suggestions / Coach"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
    >
      {!data || data.suggestions.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No suggestions yet. Click refresh to get coaching insights.
        </div>
      ) : activeSuggestions.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          All suggestions completed or dismissed! 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {activeSuggestions.map((item) => (
            <div
              key={item.id}
              className="border border-default rounded-md p-3 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="pt-0.5">
                  <Circle className="w-4 h-4 text-accent" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary mb-1">
                    {item.suggestion}
                  </p>
                  <p className="text-xs text-secondary leading-relaxed">
                    {item.reasoning}
                  </p>

                  {/* Actions - shown on hover */}
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditItem(item.id, item.suggestion, item.reasoning)}
                      className="text-xs text-secondary hover:text-primary transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-tertiary">·</span>
                    <button
                      onClick={() => onChangeStatus(item.id, 'completed')}
                      className="flex items-center gap-1 text-xs text-secondary hover:text-green-500 transition-colors"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                      Complete
                    </button>
                    <span className="text-tertiary">·</span>
                    <button
                      onClick={() => onChangeStatus(item.id, 'dismissed')}
                      className="flex items-center gap-1 text-xs text-secondary hover:text-red-500 transition-colors"
                      title="Dismiss suggestion"
                    >
                      <XCircle className="w-3 h-3" strokeWidth={1.5} />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SmartBoardPanel>
  )
}
