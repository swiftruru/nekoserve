import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ConfirmDialogProps {
  visible: boolean
  icon?: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ visible, icon = '🔄', message, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation('common')
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, visible)

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onCancel])

  if (!visible) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-bark-800 rounded-2xl shadow-2xl border border-orange-100 dark:border-bark-600 w-[320px] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-5 flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">{icon}</span>
          <p className="text-sm text-gray-700 dark:text-bark-200 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="px-5 py-3 border-t border-orange-100 dark:border-bark-600 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            {t('button.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-500 hover:to-red-700 text-white font-semibold rounded-xl px-4 py-1.5 text-xs shadow-lg shadow-red-500/25 transition-all duration-150"
          >
            {t('button.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
