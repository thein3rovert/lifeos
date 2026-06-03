import { ReactNode } from 'react'

type SmartBoardItemCardProps = {
  index: number
  title: string
  date: string
  dotColor?: 'red' | 'yellow' | 'gray' | 'green' | 'blue'
  onClick?: () => void
  rightActions?: ReactNode
}

export function SmartBoardItemCard({
  index,
  title,
  date,
  dotColor = 'gray',
  onClick,
  rightActions,
}: SmartBoardItemCardProps) {
  // Format index as 01, 02, 03...
  const formattedIndex = String(index).padStart(2, '0')

  // Dot color mapping
  const dotColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  }

  return (
    <div
      className={`group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded ${
        onClick ? 'cursor-pointer hover:bg-tertiary/30' : ''
      } transition-colors`}
      onClick={onClick}
    >
      {/* Numbered badge with gray bg */}
      <span className="text-xs text-secondary font-mono bg-[var(--color-border-default)] px-1.5 py-0.5 rounded flex-shrink-0">
        {formattedIndex}
      </span>

      {/* Title - takes available space, truncates */}
      <h3 className="text-sm font-medium text-primary truncate flex-1 min-w-0">
        {title}
      </h3>

      {/* Colored dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[dotColor]}`}
        aria-hidden="true"
      />

      {/* Date at the end */}
      <span className="text-xs text-tertiary whitespace-nowrap flex-shrink-0">
        {date}
      </span>

      {/* Hidden actions, shown on hover */}
      {rightActions && (
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {rightActions}
        </div>
      )}
    </div>
  )
}
