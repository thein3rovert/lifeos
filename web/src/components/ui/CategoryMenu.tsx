import { useState, useRef, useEffect } from 'react'

type CategoryOption = {
  value: string
  label: string
}

type CategoryMenuProps = {
  options: CategoryOption[]
  onSelect: (value: string) => void
  trigger: React.ReactNode
}

export function CategoryMenu({ options, onSelect, trigger }: CategoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (value: string) => {
    onSelect(value)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 bg-[var(--color-surface-secondary)] border border-[var(--color-border-default)] rounded-md shadow-lg py-1 min-w-[140px]">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
