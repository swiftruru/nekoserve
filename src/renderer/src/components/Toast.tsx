import { useToast } from '../hooks/useToast'
import type { ToastType } from '../hooks/useToast'

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLOR: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-500',
  info: 'bg-orange-500',
}

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9998] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${COLOR[t.type]} text-white px-4 py-2.5 rounded-lg shadow-lg
            flex items-center gap-2 text-sm font-medium
            animate-fade-in pointer-events-auto min-w-[200px] max-w-[360px]`}
        >
          <span className="text-base leading-none">{ICON[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
