import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neuro';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-highlight hover:bg-highlight-hover text-white disabled:opacity-50',
  secondary:
    'bg-raised border border-default text-secondary hover:bg-hover hover:text-white disabled:opacity-50',
  ghost: 'bg-transparent text-secondary hover:bg-hover hover:text-white disabled:opacity-50',
  danger: 'bg-error text-white hover:brightness-110 disabled:opacity-50',
  neuro:
    'bg-button text-secondary hover:text-primary disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-6 px-2.5 text-xs gap-1.5',
  md: 'h-7 px-3 text-xs gap-2',
  lg: 'h-8 px-4 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  // Add neuro shadow for neuro variant
  const needsShadow = variant === 'neuro';
  const shadowStyle = needsShadow && !disabled && !isLoading
    ? { boxShadow: 'var(--shadow-neuro-raised)' }
    : {};

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center
        rounded-md font-medium
        transition-all duration-150
        active:scale-98
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      style={shadowStyle}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
