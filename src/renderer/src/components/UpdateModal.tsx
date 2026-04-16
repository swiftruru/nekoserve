import { useTranslation } from 'react-i18next'
import type { UpdateStatus } from '../hooks/useUpdateCheck'
import appIconUrl from '@assets/app-icon.png'

interface UpdateModalProps {
  visible: boolean
  status: UpdateStatus
  manual: boolean
  currentVersion?: string
  latestVersion?: string
  errorMessage?: string | null
  onGoToDownload: () => void
  onSkipVersion: () => void
  onRemindLater: () => void
  onDismiss: () => void
}

export default function UpdateModal({
  visible,
  status,
  manual,
  currentVersion,
  latestVersion,
  errorMessage,
  onGoToDownload,
  onSkipVersion,
  onRemindLater,
  onDismiss,
}: UpdateModalProps) {
  const { t } = useTranslation('update')

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Clicking backdrop: dismiss for non-critical states
          if (status !== 'checking') onDismiss()
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-orange-100 w-[360px] max-w-[90vw] p-6 animate-fade-in">

        {/* ── Checking ───────────────────────────────── */}
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 border-[3px] border-orange-300 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">{t('checking')}</p>
          </div>
        )}

        {/* ── Update available ───────────────────────── */}
        {status === 'available' && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">🎉</span>
            <h3 className="text-base font-bold text-gray-800">{t('available')}</h3>
            <div className="text-sm text-gray-500 space-y-0.5 text-center">
              <p>{t('currentVersion', { current: currentVersion })}</p>
              <p className="font-semibold text-orange-600">
                {t('latestVersion', { latest: latestVersion })}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full mt-3">
              <button
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
            <h3 className="text-base font-bold text-gray-800">{t('upToDate')}</h3>
            <p className="text-sm text-gray-500 text-center">
              {t('upToDateDetail', { version: currentVersion })}
            </p>
            <button
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
            <h3 className="text-base font-bold text-gray-800">{t('error')}</h3>
            <p className="text-sm text-gray-500 text-center">{t('errorDetail')}</p>
            {errorMessage && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 w-full text-center font-mono">
                {errorMessage}
              </p>
            )}
            <button
              onClick={onDismiss}
              className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              {t('ok')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
