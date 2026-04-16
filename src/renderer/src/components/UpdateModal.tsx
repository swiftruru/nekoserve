import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UpdateStatus } from '../hooks/useUpdateCheck'
import { useFocusTrap } from '../hooks/useFocusTrap'
import appIconUrl from '@assets/app-icon.png'

interface UpdateModalProps {
  visible: boolean
  status: UpdateStatus
  manual: boolean
  currentVersion?: string
  latestVersion?: string
  releaseNotes?: string
  errorMessage?: string | null
  onGoToDownload: () => void
  onSkipVersion: () => void
  onRemindLater: () => void
  onRetry: () => void
  onDismiss: () => void
}

export default function UpdateModal({
  visible,
  status,
  manual,
  currentVersion,
  latestVersion,
  releaseNotes,
  errorMessage,
  onGoToDownload,
  onSkipVersion,
  onRemindLater,
  onRetry,
  onDismiss,
}: UpdateModalProps) {
  const { t } = useTranslation('update')
  const primaryRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [notesExpanded, setNotesExpanded] = useState(false)

  useFocusTrap(dialogRef, visible && status !== 'checking', { initialFocusRef: primaryRef })

  // Escape key to dismiss (except during checking)
  useEffect(() => {
    if (!visible) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && status !== 'checking') {
        onDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, status, onDismiss])

  // Reset notes expanded state when modal reopens
  useEffect(() => {
    if (visible) setNotesExpanded(false)
  }, [visible])

  if (!visible) return null

  // Determine the heading id for aria-labelledby
  const headingId = 'update-modal-heading'

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (status !== 'checking') onDismiss()
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-orange-100 w-[360px] max-w-[90vw] p-6 animate-fade-in">

        {/* ── Checking ───────────────────────────────── */}
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 border-[3px] border-orange-300 border-t-orange-500 rounded-full animate-spin" />
            <p id={headingId} className="text-sm text-gray-600 font-medium">{t('checking')}</p>
          </div>
        )}

        {/* ── Update available ───────────────────────── */}
        {status === 'available' && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">🎉</span>
            <h3 id={headingId} className="text-base font-bold text-gray-800">{t('available')}</h3>
            <div className="text-sm text-gray-500 space-y-0.5 text-center">
              <p>{t('currentVersion', { current: currentVersion })}</p>
              <p className="font-semibold text-orange-600">
                {t('latestVersion', { latest: latestVersion })}
              </p>
            </div>

            {/* ── Release notes collapsible ─────────── */}
            {releaseNotes && releaseNotes.trim().length > 0 && (
              <details
                className="w-full mt-1"
                open={notesExpanded}
                onToggle={(e) => setNotesExpanded((e.target as HTMLDetailsElement).open)}
              >
                <summary className="text-xs text-orange-500 cursor-pointer hover:text-orange-600 transition-colors text-center select-none">
                  {t('whatsNew')}
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-cream-50 border border-orange-100 p-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                  {releaseNotes.length > 800
                    ? releaseNotes.slice(0, 800) + '...'
                    : releaseNotes}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2 w-full mt-3">
              <button
                ref={primaryRef}
                onClick={onGoToDownload}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:opacity-90 active:opacity-75 transition-opacity"
              >
                {t('goToDownload')}
              </button>
              <button
                onClick={onSkipVersion}
                className="w-full py-2 rounded-xl border border-orange-200 text-orange-600 text-sm font-medium hover:bg-orange-50 active:bg-orange-100 transition-colors"
              >
                {t('skipVersion')}
              </button>
              <button
                onClick={onRemindLater}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                {t('remindLater')}
              </button>
            </div>
          </div>
        )}

        {/* ── Up to date ─────────────────────────────── */}
        {status === 'up-to-date' && manual && (
          <div className="flex flex-col items-center gap-3">
            <img src={appIconUrl} alt="NekoServe" className="w-16 h-16 rounded-2xl shadow-md" />
            <h3 id={headingId} className="text-base font-bold text-gray-800">{t('upToDate')}</h3>
            <p className="text-sm text-gray-500 text-center">
              {t('upToDateDetail', { version: currentVersion })}
            </p>
            <button
              ref={primaryRef}
              onClick={onDismiss}
              className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              {t('ok')}
            </button>
          </div>
        )}

        {/* ── Error ──────────────────────────────────── */}
        {status === 'error' && manual && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <h3 id={headingId} className="text-base font-bold text-gray-800">{t('error')}</h3>
            <p className="text-sm text-gray-500 text-center">{t('errorDetail')}</p>
            {errorMessage && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 w-full text-center font-mono">
                {errorMessage}
              </p>
            )}
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                ref={primaryRef}
                onClick={onRetry}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:opacity-90 active:opacity-75 transition-opacity"
              >
                {t('retry')}
              </button>
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                {t('ok')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
