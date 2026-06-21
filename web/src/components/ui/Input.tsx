import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-primary block">{label}</label>}
      <input
        className={`
          w-full h-7 px-2.5
          bg-input border border-default rounded-md
          text-xs text-primary
          placeholder:text-muted
          focus:border-highlight focus:outline-none
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
