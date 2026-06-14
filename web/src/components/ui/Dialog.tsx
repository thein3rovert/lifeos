import { X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, children, className = '' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        className={`bg-raised border border-default rounded-lg flex flex-col ${className}`}
        style={{ boxShadow: 'var(--shadow-overlay)' }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
}

export function DialogHeader({ title, icon, onClose }: DialogHeaderProps) {
  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-default shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-base font-medium text-white">{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 hover:bg-hover rounded-md transition-colors"
        aria-label="Close dialog"
      >
        <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
      </button>
    </div>
  );
}

interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

export function DialogBody({ children, className = '' }: DialogBodyProps) {
  return <div className={`flex-1 overflow-auto p-4 ${className}`}>{children}</div>;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div
      className={`h-14 flex items-center justify-end gap-2 px-4 border-t border-default bg-input shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
