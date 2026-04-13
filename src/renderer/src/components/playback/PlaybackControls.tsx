import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Playback transport: reset / step / play-pause / step / speed.
 *
 * Hover the keyboard glyph on the right to see the shortcut cheat sheet.
 * All state is owned by PlaybackPage; this component is a pure view.
 */

interface PlaybackControlsProps {
  playing: boolean
  speed: number
  onTogglePlay: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  onStepPrev: () => void
  onStepNext: () => void
}

export const SPEED_OPTIONS = [0.5, 1, 2, 4, 8] as const

export default function PlaybackControls({
  playing,
  speed,
  onTogglePlay,
  onReset,
  onSpeedChange,
  onStepPrev,
  onStepNext,
}: PlaybackControlsProps) {
  const { t } = useTranslation('playback')

  return (
    <div className="card flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={onReset}
        className="btn-secondary min-w-[90px]"
        title={t('playback:controls.reset')}
      >
        🔄 {t('playback:controls.reset')}
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onStepPrev}
          className="btn-secondary px-3"
          title={t('playback:controls.stepPrev')}
          aria-label={t('playback:controls.stepPrev')}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="btn-primary min-w-[120px]"
        >
          {playing
            ? '⏸ ' + t('playback:controls.pause')
            : '▶ ' + t('playback:controls.play')}
        </button>
        <button
          type="button"
          onClick={onStepNext}
          className="btn-secondary px-3"
          title={t('playback:controls.stepNext')}
          aria-label={t('playback:controls.stepNext')}
        >
          ⏭
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('playback:controls.speed')}
        </span>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((s) => {
            const active = Math.abs(s - speed) < 0.001
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`btn-scenario ${
                  active ? 'btn-scenario-active' : 'btn-scenario-inactive'
                }`}
              >
                {s}×
              </button>
            )
          })}
        </div>
        <ShortcutHelp />
      </div>
    </div>
  )
}

/**
 * Little "keyboard" pill that shows the shortcut cheat sheet on hover.
 * Matches the ParamInput HelpButton aesthetic.
 */
function ShortcutHelp() {
  const { t } = useTranslation('playback')
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full
                   bg-orange-50 text-xs text-orange-500
                   ring-1 ring-inset ring-orange-100
                   transition-colors duration-150
                   hover:bg-orange-100 hover:text-orange-600 hover:ring-orange-200
                   focus:outline-none focus:ring-2 focus:ring-orange-400"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={t('playback:shortcuts.title')}
      >
        ⌨
      </button>
      {open && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-8 right-0 z-20 w-64
                     rounded-xl bg-gray-900/95 px-3 py-2.5 text-xs font-normal
                     leading-relaxed text-white shadow-xl backdrop-blur-sm
                     tooltip-pop"
        >
          <div className="font-semibold mb-1.5">
            {t('playback:shortcuts.title')}
          </div>
          <ShortcutRow keys="Space" label={t('playback:shortcuts.playPause')} />
          <ShortcutRow keys="← →" label={t('playback:shortcuts.seek10')} />
          <ShortcutRow keys=", ." label={t('playback:shortcuts.stepEvent')} />
          <ShortcutRow keys="0" label={t('playback:shortcuts.reset')} />
          <ShortcutRow keys="1–5" label={t('playback:shortcuts.speed')} />
          <div className="absolute -bottom-1 right-3 h-2.5 w-2.5 rotate-45 bg-gray-900/95" />
        </div>
      )}
    </div>
  )
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="font-mono text-orange-300">{keys}</span>
      <span className="text-gray-300">{label}</span>
    </div>
  )
}
