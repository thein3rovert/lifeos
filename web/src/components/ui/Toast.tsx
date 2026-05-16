import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]))
}

export function toast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, type, message }]
  notifyListeners()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notifyListeners()
  }, 4000)
}

export function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  notifyListeners()
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-highlight',
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = icons[t.type]
  return (
    <div className="flex items-center gap-2 bg-raised border border-default rounded p-3 shadow-lg min-w-64 max-w-96">
      <Icon className={`w-4 h-4 shrink-0 ${colors[t.type]}`} strokeWidth={1.5} />
      <span className="text-xs text-secondary flex-1">{t.message}</span>
      <button
        onClick={onDismiss}
        className="text-tertiary hover:text-secondary transition-colors"
      >
        <X className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setItems(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2">
      {items.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  )
}