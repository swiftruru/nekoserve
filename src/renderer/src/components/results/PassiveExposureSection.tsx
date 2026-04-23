import { useTranslation } from 'react-i18next'
import type { CustomerMetrics } from '../../utils/customerMetrics'
import { passiveSaturated } from '../../utils/passiveExposure'

interface Props {
  customers: readonly CustomerMetrics[]
}

/**
 * v2.2 — Passive Exposure KPI panel.
 *
 * Reports the "ambient cat-visibility" channel (customer sees cat nearby
 * without direct contact). Separate from the existing
 * customerSatisfactionScore so the validation baseline stays untouched.
 * See utils/passiveExposure.ts for the rate formula.
 *
 * Three KPIs:
 *   - Avg weighted passive-exposure minutes per served customer
 *   - Passive:Active ratio (how much of the cat-time pie is ambient)
 *   - Saturated 0-1 score (1 - exp(-avg/15)) for side-by-side comparison
 *     with existing normalized metrics
 */
export default function PassiveExposureSection({ customers }: Props) {
  const { t } = useTranslation('results')

  const served = customers.filter((c) => c.outcome === 'served')
  const servedCount = served.length

  const totalPassive = served.reduce((s, c) => s + c.passiveExposureMin, 0)
  const totalActive = served.reduce((s, c) => s + c.activeContactMin, 0)

  const avgPassive = servedCount > 0 ? totalPassive / servedCount : 0
  const avgActive = servedCount > 0 ? totalActive / servedCount : 0
  const saturatedScore = passiveSaturated(avgPassive)
  const ratio =
    totalActive > 0
      ? totalPassive / totalActive
      : totalPassive > 0
      ? Infinity
      : 0

  const ratioLabel =
    ratio === Infinity
      ? '∞'
      : ratio === 0
      ? '0'
      : ratio >= 100
      ? ratio.toFixed(0)
      : ratio.toFixed(2)

  return (
    <section className="rounded-xl ring-1 ring-inset ring-pink-200 dark:ring-pink-800/60 bg-pink-50/70 dark:bg-pink-900/20 p-4">
      <header className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-bold tracking-wide text-pink-700 dark:text-pink-300">
          👀 {t('passive.title')}
        </h3>
        <span className="ml-auto text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug">
          {t('passive.tagline')}
        </span>
      </header>

      <p className="text-xs text-gray-700 dark:text-bark-200 leading-relaxed mb-4">
        {t('passive.intro')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi
          label={t('passive.kpi.avgMinutes')}
          value={`${avgPassive.toFixed(1)}`}
          unit={t('passive.kpi.minutes')}
          hint={t('passive.kpi.avgMinutesHint', { count: servedCount })}
          accent="strong"
        />
        <Kpi
          label={t('passive.kpi.ratio')}
          value={ratioLabel}
          unit={t('passive.kpi.ratioUnit')}
          hint={t('passive.kpi.ratioHint', {
            active: avgActive.toFixed(1),
            passive: avgPassive.toFixed(1),
          })}
          accent="mid"
        />
        <Kpi
          label={t('passive.kpi.score')}
          value={(saturatedScore * 100).toFixed(0)}
          unit="%"
          hint={t('passive.kpi.scoreHint')}
          accent="soft"
        />
      </div>

      <p className="mt-4 text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug">
        {t('passive.caveat')}
      </p>
    </section>
  )
}

interface KpiProps {
  label: string
  value: string
  unit: string
  hint: string
  accent: 'strong' | 'mid' | 'soft'
}

function Kpi({ label, value, unit, hint, accent }: KpiProps) {
  const ring =
    accent === 'strong'
      ? 'ring-pink-300 dark:ring-pink-700'
      : accent === 'mid'
      ? 'ring-pink-200 dark:ring-pink-800'
      : 'ring-pink-100 dark:ring-pink-900'
  return (
    <div
      className={`rounded-lg ring-1 ring-inset ${ring} bg-white/80 dark:bg-bark-700/70 p-3`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-pink-700 dark:text-pink-300 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-pink-800 dark:text-pink-200">
        {value}
        <span className="text-xs font-normal text-pink-600 dark:text-pink-400 ml-1">
          {unit}
        </span>
      </div>
      <div className="text-[11px] text-gray-600 dark:text-bark-300 leading-snug mt-1">
        {hint}
      </div>
    </div>
  )
}
