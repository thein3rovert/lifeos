import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="w-10 h-10 rounded-full bg-raised border border-default flex items-center justify-center mb-3">
        {icon || <Inbox className="w-5 h-5 text-tertiary" strokeWidth={1.5} />}
      </div>
      <h3 className="text-md font-medium text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-secondary max-w-xs mb-3">{description}</p>
      )}
      {action}
    </div>
  )
}