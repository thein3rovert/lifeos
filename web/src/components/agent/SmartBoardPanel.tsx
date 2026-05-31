import { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'

type SmartBoardPanelProps = {
  title: string
  loading: boolean
  lastRefreshed: Date | null
  onRefresh: () => void
  children: ReactNode
  className?: string
}

export function SmartBoardPanel({
  title,
  loading,
  lastRefreshed,
  onRefresh,
  children,
  className = '',
}: SmartBoardPanelProps) {
  return (
    <div className={`bg-secondary border border-default rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-default flex items-center justify-between">
        <h2 className="text-sm font-medium text-primary">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 hover:bg-tertiary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Refresh ${title}`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-secondary transition-transform ${
              loading ? 'animate-spin' : ''
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? <SkeletonCard /> : children}
      </div>

      {/* Footer - Last updated timestamp */}
      {lastRefreshed && !loading && (
        <div className="px-4 py-2 border-t border-default">
          <span className="text-xs text-tertiary">
            Updated {formatRelativeTime(lastRefreshed)}
          </span>
        </div>
      )}
    </div>
  )
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  // Format as date if older than 7 days
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}
