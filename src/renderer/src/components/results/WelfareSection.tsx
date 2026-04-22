import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../../types'

interface Props {
  metrics: MetricSummary
}

const POSITIVE_STATES: Array<{ key: string; emoji: string; i18nLabel: string }> = [
  { key: 'PLAYING',   emoji: '🎾', i18nLabel: 'welfare.playing' },
  { key: 'EXPLORING', emoji: '🗺️', i18nLabel: 'welfare.exploring' },
  { key: 'GROOMING',  emoji: '✨', i18nLabel: 'welfare.grooming' },
]
const NEGATIVE_STATES: Array<{ key: string; emoji: string; i18nLabel: string }> = [
  { key: 'HIDDEN', emoji: '🙈', i18nLabel: 'welfare.hidden' },
  { key: 'ALERT',  emoji: '😾', i18nLabel: 'welfare.alert' },
]

/**
 * v2.0 Epic D: cat welfare panel.
 *
 * Hirsch et al. (2025) discussion identifies five behavioral indicators
 * of welfare. NekoServe aggregates them into a 0–5 score, shown here
 * alongside the per-state shares so users can see which indicator drags
 * the score down.
 */
export default function WelfareSection({ metrics }: Props) {
  const { t } = useTranslation('results')
  const score = metrics.catWelfareScore ?? 0
  const behavior = metrics.catBehaviorShare ?? {}
  const vertical = metrics.catVerticalLevelShare ?? {}

  const severity: 'good' | 'warn' | 'bad' =
    score >= 3.5 ? 'good' : score >= 2.0 ? 'warn' : 'bad'
  const severityColor =
    severity === 'good'
      ? 'text-emerald-700 dark:text-emerald-400'
      : severity === 'warn'
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-red-700 dark:text-red-400'

  return (
    <section className="rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
      <header className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-bold tracking-wide text-orange-700 dark:text-orange-400">
          🐾 {t('welfare.title')}
        </h3>
        <span className={`text-2xl font-bold tabular-nums ${severityColor}`}>
          {score.toFixed(2)}<span className="text-sm text-gray-400 ml-1">/ 5</span>
        </span>
        <span className="ml-auto text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug">
          {t('welfare.citation')}
        </span>
      </header>

      <p className="text-xs text-gray-600 dark:text-bark-300 leading-relaxed mb-3">
        {t('welfare.intro')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
            {t('welfare.positive')}
          </div>
          <ul className="space-y-1">
            {POSITIVE_STATES.map(({ key, emoji, i18nLabel }) => (
              <IndicatorRow
                key={key}
                emoji={emoji}
                label={t(i18nLabel)}
                share={behavior[key] ?? 0}
                higherIsBetter
              />
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400 mb-1">
            {t('welfare.negative')}
          </div>
          <ul className="space-y-1">
            {NEGATIVE_STATES.map(({ key, emoji, i18nLabel }) => (
              <IndicatorRow
                key={key}
                emoji={emoji}
                label={t(i18nLabel)}
                share={behavior[key] ?? 0}
                higherIsBetter={false}
              />
            ))}
          </ul>
        </div>
      </div>

      {Object.keys(vertical).length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-300 mb-1">
            {t('welfare.verticalLevels')}
          </div>
          <div className="flex items-center gap-1 text-[11px] tabular-nums">
            <LevelBar label={t('welfare.floor')} value={vertical.FLOOR ?? 0} color="bg-amber-300" />
            <LevelBar label={t('welfare.furniture')} value={vertical.FURNITURE ?? 0} color="bg-amber-500" />
            <LevelBar label={t('welfare.shelf')} value={vertical.SHELF ?? 0} color="bg-amber-700" />
          </div>
          <p className="mt-1 text-[10px] text-gray-500 dark:text-bark-400 leading-snug">
            {t('welfare.shelfHint')}
          </p>
        </div>
      )}
    </section>
  )
}

function IndicatorRow({
  emoji,
  label,
  share,
  higherIsBetter,
}: {
  emoji: string
  label: string
  share: number
  higherIsBetter: boolean
}) {
  const pct = Math.round(share * 100)
  const widthPct = Math.min(100, pct * (higherIsBetter ? 10 : 4))
  return (
    <li className="flex items-center gap-2 text-xs">
      <span aria-hidden>{emoji}</span>
      <span className="flex-1 text-gray-700 dark:text-bark-200">{label}</span>
      <div className="w-24 h-1.5 rounded-full bg-orange-100 dark:bg-bark-600 overflow-hidden">
        <div
          className={
            higherIsBetter
              ? 'h-full bg-emerald-500 rounded-full'
              : 'h-full bg-red-500 rounded-full'
          }
          style={{ width: `${widthPct}%`, transition: 'width 300ms ease-out' }}
        />
      </div>
      <span className="tabular-nums text-gray-500 dark:text-bark-300 w-10 text-right">
        {(share * 100).toFixed(1)}%
      </span>
    </li>
  )
}

function LevelBar({ label, value, color }: { label: string; value: number; color: string }) {
  const widthPct = Math.max(2, value * 100)
  return (
    <div className="flex-1 flex items-center gap-1">
      <span className="text-[10px] text-gray-500 dark:text-bark-400 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-orange-50 dark:bg-bark-700 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="tabular-nums text-gray-600 dark:text-bark-300 w-10 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}
