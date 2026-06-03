import { ReactNode, useEffect, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'

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
    <div className={`bg-secondary border border-default rounded-lg flex flex-col h-full ${className}`}>
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
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {loading ? <LoadingState /> : children}
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

// Loading state with animated message + elapsed time
function LoadingState() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Show contextual message based on elapsed time
  const getMessage = () => {
    if (elapsed < 10) return 'Analyzing your notes...'
    if (elapsed < 30) return 'Reading vault files...'
    if (elapsed < 60) return 'AI is thinking...'
    if (elapsed < 120) return 'Processing meeting notes...'
    return 'Still working... AI tasks can take a few minutes'
  }

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 gap-3">
      <div className="relative">
        <Sparkles
          className="w-6 h-6 text-accent animate-pulse"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-sm text-primary font-medium">{getMessage()}</p>
      <p className="text-xs text-tertiary font-mono">{formatTime(elapsed)} elapsed</p>
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
