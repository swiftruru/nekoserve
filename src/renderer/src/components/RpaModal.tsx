import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RpaLauncher from './RpaLauncher'

/**
 * Floating modal that hosts the RpaLauncher card.
 *
 * Triggered by the 🤖 button in the top-right header. The launcher
 * lives in a separate component so the card layout stays reusable
 * and the modal only adds chrome (overlay, close button, Esc-to-close,
 * click-outside-to-close).
 *
 * The "hidden" state lets the launcher's smart-capture flow temporarily
 * pull the modal out of view (so webContents.capturePage doesn't grab
 * the modal overlay instead of the underlying button) while staying
 * mounted, preserving all launcher state. A small floating chip in the
 * corner shows the capture progress in the meantime.
 */

interface Props {
  open: boolean
  onClose: () => void
}

export default function RpaModal({ open, onClose }: Props) {
  const { t } = useTranslation('about')
  const dialogRef = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)
  const [hiddenStatus, setHiddenStatus] = useState<string>('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        ref={dialogRef}
        className={
          'fixed inset-0 z-[9000] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 ' +
          (hidden ? 'invisible pointer-events-none' : '')
        }
        role="dialog"
        aria-modal="true"
        data-testid="rpa-modal"
        onClick={onClose}
      >
        <div
          className="relative w-[640px] max-w-[92vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('rpa.close', { defaultValue: 'Close' })}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-bark-800 border border-orange-200 dark:border-bark-500 text-gray-500 dark:text-bark-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-400 shadow-md flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
          <RpaLauncher
            onHide={setHidden}
            onHideStatus={setHiddenStatus}
          />
        </div>
      </div>

      {/* While the smart-capture flow has pulled the modal out of view,
          float a small status chip top-right so the user still sees
          progress (e.g. "smart capture 3/7"). */}
      {hidden && (
        <div className="fixed top-4 right-4 z-[9500] bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white rounded-full animate-spin" />
          {hiddenStatus || t('rpa.smartCapturing', { defaultValue: 'Smart capturing...' })}
        </div>
      )}
    </>
  )
}
