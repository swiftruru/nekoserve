import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../../types'
import type { HistoryEntry } from '../../hooks/useSimulation'

interface Props {
  currentMetrics: MetricSummary
  history: HistoryEntry[]
}

/**
 * v2.0 Epic D: Pareto frontier scatter of customer satisfaction vs
 * cat welfare. Each history run becomes a dot; the current run is
 * highlighted. An ideal run sits at the top-right corner (high on
 * both axes). Pareto-dominant points (nothing else is better on both
 * axes) are outlined so users can spot the trade-off frontier.
 */
export default function ParetoFrontier({ currentMetrics, history }: Props) {
  const { t } = useTranslation('results')

  const points = useMemo(() => {
    const pts = history.map((h) => ({
      id: h.id,
      label: h.label,
      satisfaction: h.result.metrics.customerSatisfactionScore ?? 0,
      welfare: (h.result.metrics.catWelfareScore ?? 0) / 5,  // normalize to [0,1]
      isCurrent: false,
    }))
    // Add the current run as a highlighted point
    pts.push({
      id: -1,
      label: 'current',
      satisfaction: currentMetrics.customerSatisfactionScore ?? 0,
      welfare: (currentMetrics.catWelfareScore ?? 0) / 5,
      isCurrent: true,
    })
    return pts
  }, [history, currentMetrics])

  const dominant = useMemo(() => {
    const set = new Set<number>()
    for (const p of points) {
      let dominated = false
      for (const q of points) {
        if (q === p) continue
        if (q.satisfaction >= p.satisfaction && q.welfare >= p.welfare) {
          if (q.satisfaction > p.satisfaction || q.welfare > p.welfare) {
            dominated = true
            break
          }
        }
      }
      if (!dominated) set.add(p.id)
    }
    return set
  }, [points])

  // Coordinate helpers: map [0,1] values to the 320×220 plot area with padding
  const W = 340
  const H = 240
  const PAD_L = 40
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 30
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const toX = (v: number) => PAD_L + v * plotW
  const toY = (v: number) => PAD_T + (1 - v) * plotH

  return (
    <section className="rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
      <header className="mb-2">
        <h3 className="text-sm font-bold tracking-wide text-orange-700 dark:text-orange-400">
          📈 {t('pareto.title')}
        </h3>
        <p className="mt-1 text-xs text-gray-600 dark:text-bark-300 leading-relaxed">
          {t('pareto.intro')}
        </p>
      </header>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('pareto.title')}
      >
        {/* Axis frame */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={plotW}
          height={plotH}
          fill="rgba(254, 243, 199, 0.25)"
          stroke="rgba(234, 88, 12, 0.35)"
          strokeWidth="1"
        />

        {/* Ideal corner indicator (top-right) */}
        <circle cx={toX(1)} cy={toY(1)} r="6" fill="none" stroke="rgba(16, 185, 129, 0.6)" strokeDasharray="2,2" />
        <text x={toX(1) + 8} y={toY(1) + 4} style={{ fontSize: 9, fill: 'rgba(16, 185, 129, 0.9)' }}>
          {t('pareto.ideal')}
        </text>

        {/* X axis (customer satisfaction) */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="rgba(120, 53, 15, 0.5)" />
        <text x={W / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: 'rgba(120, 53, 15, 0.9)' }}>
          {t('pareto.xAxis')}
        </text>
        {[0, 0.5, 1].map((v) => (
          <text
            key={v}
            x={toX(v)}
            y={H - PAD_B + 12}
            textAnchor="middle"
            style={{ fontSize: 9, fill: 'rgba(120, 53, 15, 0.7)' }}
          >
            {v.toFixed(1)}
          </text>
        ))}

        {/* Y axis (welfare) */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="rgba(120, 53, 15, 0.5)" />
        <text
          x={12}
          y={H / 2}
          transform={`rotate(-90 12 ${H / 2})`}
          textAnchor="middle"
          style={{ fontSize: 11, fill: 'rgba(120, 53, 15, 0.9)' }}
        >
          {t('pareto.yAxis')}
        </text>
        {[0, 0.5, 1].map((v) => (
          <text
            key={v}
            x={PAD_L - 6}
            y={toY(v) + 3}
            textAnchor="end"
            style={{ fontSize: 9, fill: 'rgba(120, 53, 15, 0.7)' }}
          >
            {v.toFixed(1)}
          </text>
        ))}

        {/* Points */}
        {points.map((p) => {
          const cx = toX(p.satisfaction)
          const cy = toY(p.welfare)
          const isDominant = dominant.has(p.id)
          return (
            <g key={p.id}>
              <circle
                cx={cx}
                cy={cy}
                r={p.isCurrent ? 6 : 4}
                fill={p.isCurrent ? 'rgba(234, 88, 12, 0.9)' : 'rgba(251, 146, 60, 0.75)'}
                stroke={isDominant ? 'rgba(16, 185, 129, 0.9)' : 'rgba(120, 53, 15, 0.5)'}
                strokeWidth={isDominant ? 2 : 0.8}
              />
              {p.isCurrent && (
                <text
                  x={cx + 8}
                  y={cy - 6}
                  style={{ fontSize: 10, fontWeight: 700, fill: 'rgba(234, 88, 12, 1)' }}
                >
                  {t('pareto.current')}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-bark-400">
        <span>
          <span className="inline-block w-3 h-3 rounded-full bg-orange-600 align-middle" /> {t('pareto.currentLegend')}
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-full ring-2 ring-emerald-500 align-middle" /> {t('pareto.dominantLegend')}
        </span>
      </div>
    </section>
  )
}
