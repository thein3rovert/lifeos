import { Badge } from '@/components/ui/Badge';

type BadgeVariant = 'urgent' | 'important' | 'not-important' | 'active' | 'completed' | 'dismissed';

type SmartBoardItemCardProps = {
  index: number;
  title: string;
  date: string;
  description?: string;
  badge?: {
    label: string;
    variant: BadgeVariant;
    onClick?: () => void;
  };
  dotColor?: 'red' | 'yellow' | 'gray' | 'green' | 'blue';
  onClick?: () => void;
};

export function SmartBoardItemCard({
  index,
  title,
  date,
  description,
  badge,
  dotColor = 'gray',
  onClick,
}: SmartBoardItemCardProps) {
  // Format index as 01, 02, 03...
  const formattedIndex = String(index).padStart(2, '0');

  // Dot color mapping
  const dotColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  };

  return (
    <div
      className={`group py-2 px-2 rounded ${
        onClick ? 'cursor-pointer hover:bg-tertiary/30' : ''
      } transition-colors`}
      onClick={onClick}
    >
      {/* First row: index, title, dot, date */}
      <div className="flex items-center gap-2">
        {/* Numbered badge with gray bg */}
        <span className="text-xs text-secondary font-mono bg-[var(--color-border-default)] px-1.5 py-0.5 rounded flex-shrink-0">
          {formattedIndex}
        </span>

        {/* Title - takes available space, truncates */}
        <h3 className="text-sm font-medium text-primary truncate flex-1 min-w-0">{title}</h3>

        {/* Colored dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[dotColor]}`}
          aria-hidden="true"
        />

        {/* Date at the end */}
        <span className="text-xs text-tertiary whitespace-nowrap flex-shrink-0">{date}</span>
      </div>

      {/* Second row: description preview (if exists) */}
      {description && (
        <p className="text-xs text-secondary mt-1 ml-8 line-clamp-2 break-words">{description}</p>
      )}

      {/* Third row: category badge (if exists) */}
      {badge && (
        <div className="mt-1 ml-8" onClick={(e) => e.stopPropagation()}>
          <Badge variant={badge.variant} onClick={badge.onClick}>
            {badge.label}
          </Badge>
        </div>
      )}
    </div>
  );
}
