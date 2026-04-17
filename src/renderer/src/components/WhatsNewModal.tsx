import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'

const STORAGE_KEY = 'nekoserve:last-seen-version'

interface WhatsNewModalProps {
  onDismiss: () => void
  visible: boolean
  version: string
}

export function useWhatsNew() {
  const [visible, setVisible] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then((v) => {
      setVersion(v)
      try {
        const lastSeen = localStorage.getItem(STORAGE_KEY)
        if (lastSeen !== v && v) {
          setVisible(true)
        }
      } catch { /* ok */ }
    })
  }, [])

  function dismiss() {
    setVisible(false)
    if (version) {
      try { localStorage.setItem(STORAGE_KEY, version) } catch { /* ok */ }
    }
  }

  return { visible, version, dismiss }
}

export default function WhatsNewModal({ visible, version, onDismiss }: WhatsNewModalProps) {
  const { t } = useTranslation('common')
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, visible && !!version)

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onDismiss])

  if (!visible || !version) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-heading"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-bark-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-orange-100 dark:border-bark-600 flex items-center justify-between">
          <h2 id="whats-new-heading" className="text-base font-bold text-orange-700 dark:text-orange-400">
            {t('whatsNew.title')}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 text-lg leading-none"
            aria-label={t('button.close')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-bark-100">
                {t('whatsNew.updated', { version: `v${version}` })}
              </p>
              <p className="text-xs text-gray-500 dark:text-bark-300 mt-1">
                {t('whatsNew.body')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-orange-100 dark:border-bark-600 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="btn-primary text-xs px-4 py-1.5"
          >
            {t('whatsNew.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
