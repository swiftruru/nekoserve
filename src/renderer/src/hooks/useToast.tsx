import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// ── Types ────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: (message: string, type?: ToastType) => void
}

// ── Context ──────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

const DURATION_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
