import type { ReactNode } from 'react';

type BadgeVariant =
  | 'urgent'
  | 'important'
  | 'not-important'
  | 'active'
  | 'completed'
  | 'dismissed'
  | 'default';

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  onClick?: () => void;
  className?: string;
};

export function Badge({ children, variant = 'default', onClick, className = '' }: BadgeProps) {
  // Variant styling
  const variantStyles = {
    urgent: 'bg-error/20 text-error border-error/30',
    important: 'bg-warning/20 text-warning border-warning/30',
    'not-important': 'bg-muted/20 text-muted border-muted/30',
    active: 'bg-highlight/20 text-highlight border-highlight/30',
    completed: 'bg-success/20 text-success border-success/30',
    dismissed: 'bg-muted/20 text-muted border-muted/30',
    default: 'bg-muted/20 text-muted border-muted/30',
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
