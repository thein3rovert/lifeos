import type { ReactNode } from 'react';

type BadgeVariant =
  | 'urgent'
  | 'important'
  | 'not-important'
  | 'active'
  | 'completed'
  | 'dismissed'
  | 'default';

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  onClick?: () => void;
  className?: string;
};

export function Badge({ children, variant = 'default', onClick, className = '' }: BadgeProps) {
  // Variant styling
  const variantStyles = {
    urgent: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    important: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    'not-important': 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
    active: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
    dismissed: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
    default: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
  };

  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border';
  const interactiveStyles = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
