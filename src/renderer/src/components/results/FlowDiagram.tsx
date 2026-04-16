import { useTranslation } from 'react-i18next'
import AnimatedNumber from './AnimatedNumber'

interface Props {
  arrived: number
  served: number
  abandoned: number
  inFlight: number
}

/**
 * Arrivals → outcomes Sankey-lite: a single "arrived" node on the
 * left with three outgoing bars whose widths are proportional to each
 * outcome (served / abandoned / in-flight). Pure SVG, no extra lib.
 *
 * Bars use CSS width transitions so they grow in when the component
 * mounts; the numbers next to each bar count up via AnimatedNumber.
 * This gives the whole diagram a "flowing in" feel.
 */
export default function FlowDiagram({
  arrived,
  served,
  abandoned,
  inFlight,
}: Props) {
  const { t } = useTranslation('results')

  const servedPct = arrived > 0 ? (served / arrived) * 100 : 0
  const abandonedPct = arrived > 0 ? (abandoned / arrived) * 100 : 0
  const inFlightPct = arrived > 0 ? (inFlight / arrived) * 100 : 0

  const rows: Array<{
    key: 'served' | 'abandoned' | 'inFlight'
    icon: string
    label: string
    count: number
    pct: number
    color: string
  }> = [
    {
      key: 'served',
      icon: '✅',
      label: t('flowDiagram.served'),
      count: served,
      pct: servedPct,
      color: '#16a34a',
    },
    {
      key: 'abandoned',
      icon: '❌',
      label: t('flowDiagram.abandoned'),
      count: abandoned,
      pct: abandonedPct,
      color: '#dc2626',
    },
    {
      key: 'inFlight',
      icon: '⏸',
      label: t('flowDiagram.inFlight'),
      count: inFlight,
      pct: inFlightPct,
      color: '#94a3b8',
    },
  ]

  return (
    <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure" aria-label={t('flowDiagram.arrived')}>
      {/* Arrived row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">
          🚶
        </span>
        <span className="text-xs text-gray-500 dark:text-bark-300">
          {t('flowDiagram.arrived')}
        </span>
        <span className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-400">
          <AnimatedNumber value={arrived} />
        </span>
      </div>

      {/* Three outcome bars */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className="text-sm w-5 text-center" aria-hidden="true">
              {row.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-gray-600 dark:text-bark-300 mb-0.5">
                <span className="truncate">{row.label}</span>
                <span className="tabular-nums text-gray-500 dark:text-bark-300 shrink-0">
                  <AnimatedNumber value={row.count} /> ({row.pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/70 dark:bg-bark-700/70 overflow-hidden border border-orange-100 dark:border-bark-600 relative">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, row.pct)}%`,
                    background: row.color,
                    transition: 'width 800ms ease-out',
                  }}
                />
                {/* Particle flow: two small dots sliding along the bar
                    to make the diagram feel like data is actively
                    moving through. Only rendered when the outcome is
                    non-empty (otherwise they'd slide over an empty bar). */}
                {row.count > 0 && (
                  <>
                    <span
                      className="neko-flow-particle absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                      style={{
                        background: row.color,
                        left: 0,
                        animationDelay: '0s',
                      }}
                    />
                    <span
                      className="neko-flow-particle absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                      style={{
                        background: row.color,
                        left: 0,
                        animationDelay: '0.8s',
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
