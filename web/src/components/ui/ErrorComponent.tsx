import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorComponentProps {
  error: Error
  onRetry?: () => void
}

export default function ErrorComponent({ error, onRetry }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <AlertCircle className="w-8 h-8 text-error mb-3" strokeWidth={1.5} />
      <h1 className="text-md font-medium text-primary mb-1">Something went wrong</h1>
      <p className="text-xs text-secondary mb-4 max-w-xs">{error.message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="h-7 px-3 bg-accent-primary hover:brightness-95 text-black text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
          Try again
        </button>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="h-7 px-3 bg-accent-primary hover:brightness-95 text-black text-xs font-medium rounded transition-colors"
        >
          Reload page
        </button>
      )}
    </div>
  )
}
