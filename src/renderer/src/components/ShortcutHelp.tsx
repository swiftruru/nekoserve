import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ShortcutHelpProps {
  visible: boolean
  onClose: () => void
}

interface ShortcutEntry {
  key: string
  labelKey: string
}

const PLAYBACK_SHORTCUTS: ShortcutEntry[] = [
  { key: 'Space',      labelKey: 'shortcutHelp.playPause' },
  { key: '\u2190',     labelKey: 'shortcutHelp.seekBack' },
  { key: '\u2192',     labelKey: 'shortcutHelp.seekForward' },
  { key: ',',          labelKey: 'shortcutHelp.stepPrev' },
  { key: '.',          labelKey: 'shortcutHelp.stepNext' },
  { key: '0',          labelKey: 'shortcutHelp.resetTime' },
  { key: '1 \u2013 5', labelKey: 'shortcutHelp.setSpeed' },
  { key: 'Esc',        labelKey: 'shortcutHelp.closePopover' },
  { key: 'F',          labelKey: 'shortcutHelp.toggleFullscreen' },
]

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { key: '?', labelKey: 'shortcutHelp.openOnboarding' },
  { key: '\u2318K / Ctrl+K', labelKey: 'shortcutHelp.openHelp' },
]

export default function ShortcutHelp({ visible, onClose }: ShortcutHelpProps) {
  const { t } = useTranslation('common')
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, visible)

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-heading"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-bark-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-orange-100 dark:border-bark-600 flex items-center justify-between">
          <h2 id="shortcut-help-heading" className="text-base font-bold text-orange-700 dark:text-orange-400">
            {t('shortcutHelp.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label={t('button.close')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Playback section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-bark-300 uppercase tracking-wider mb-2">
              {t('shortcutHelp.sectionPlayback')}
            </h3>
            <div className="space-y-1.5">
              {PLAYBACK_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.labelKey} keyLabel={s.key} description={t(s.labelKey)} />
              ))}
            </div>
          </div>

          {/* Global section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-bark-300 uppercase tracking-wider mb-2">
              {t('shortcutHelp.sectionGlobal')}
            </h3>
            <div className="space-y-1.5">
              {GLOBAL_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.labelKey} keyLabel={s.key} description={t(s.labelKey)} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-orange-100 dark:border-bark-600 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            {t('button.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keyLabel, description }: { keyLabel: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700 dark:text-bark-200">{description}</span>
      <kbd className="ml-3 shrink-0 inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-bark-700 border border-gray-200 dark:border-bark-500 text-xs font-mono text-gray-600 dark:text-bark-200">
        {keyLabel}
      </kbd>
    </div>
  )
}
