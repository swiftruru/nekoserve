import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SimulationConfig } from '../../types'
import { buildReplayContext, replayUpTo } from '../../utils/replay'
import { extractCustomerMetrics } from '../../utils/customerMetrics'
import { passiveSaturated } from '../../utils/passiveExposure'

interface Props {
  baseConfig: SimulationConfig
}

interface SweepRow {
  catCount: number
  avgActive: number
  avgPassive: number
  saturatedScore: number
  servedCount: number
}

const CAT_COUNT_RANGE = [1, 2, 3, 4, 5, 6, 7, 8] as const

/**
 * v2.2 - Passive-channel sensitivity.
 *
 * Runs a catCount sweep (1..8) on demand and charts the two cat-time
 * channels side by side so the diminishing-returns structure is legible:
 *   - Active contact minutes (measured channel, Hirsch 2025)
 *   - Passive exposure minutes (simulator-proposed second channel)
 *
 * Both curves typically rise with catCount, but at different rates -
 * the active channel is capacity-limited by how many cats can physically
 * sit on customers at once, while the passive channel scales with
 * ambient visibility and saturates more smoothly. The crossover (if any)
 * tells you how many cats are "enough" before adding more just padding
 * the ambient pile.
 *
 * Kept out of the default run path: this triggers ~8 background sims so
 * we only kick it off when the user asks.
 */
export default function PassiveChannelSensitivity({ baseConfig }: Props) {
  const { t } = useTranslation('results')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [rows, setRows] = useState<SweepRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSweep() {
    setRunning(true)
    setError(null)
    setRows(null)
    setProgress({ done: 0, total: CAT_COUNT_RANGE.length })
    const out: SweepRow[] = []
    try {
      for (let i = 0; i < CAT_COUNT_RANGE.length; i++) {
        const catCount = CAT_COUNT_RANGE[i]
        const cfg: SimulationConfig = { ...baseConfig, catCount }
        const result = await window.electronAPI.runSimulation(cfg)
        const ctx = buildReplayContext(result.eventLog, cfg)
        const finalState = replayUpTo(ctx, cfg.simulationDuration)
        const customers = extractCustomerMetrics(
          result.eventLog,
          finalState.customerPassiveExposure,
        )
        const served = customers.filter((c) => c.outcome === 'served')
        const totalActive = served.reduce((s, c) => s + c.activeContactMin, 0)
        const totalPassive = served.reduce((s, c) => s + c.passiveExposureMin, 0)
        const avgActive = served.length > 0 ? totalActive / served.length : 0
        const avgPassive = served.length > 0 ? totalPassive / served.length : 0
        out.push({
          catCount,
          avgActive,
          avgPassive,
          saturatedScore: passiveSaturated(avgPassive),
          servedCount: served.length,
        })
        setProgress({ done: i + 1, total: CAT_COUNT_RANGE.length })
      }
      setRows(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const crossover = rows ? findCrossover(rows) : null

  return (
    <section
      className="rounded-xl ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-900/10 p-4"
      data-testid="results-passive-sensitivity"
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold tracking-wide text-indigo-700 dark:text-indigo-300">
          📈 {t('passiveSweep.title')}
        </h3>
        <span className="text-[11px] text-gray-500 dark:text-bark-400 italic">
          {t('passiveSweep.tagline')}
        </span>
        <button
          type="button"
          onClick={runSweep}
          disabled={running}
          className="ml-auto btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
          data-testid="results-passive-sensitivity-run"
        >
          {running
            ? t('passiveSweep.running', {
                done: progress?.done ?? 0,
                total: progress?.total ?? CAT_COUNT_RANGE.length,
              })
            : rows
              ? t('passiveSweep.rerun')
              : t('passiveSweep.run')}
        </button>
      </header>

      <p className="text-xs text-gray-700 dark:text-bark-200 leading-relaxed mb-3">
        {t('passiveSweep.intro')}
      </p>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 mb-2">
          {t('passiveSweep.error', { message: error })}
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="bg-white/80 dark:bg-bark-700/70 rounded-lg p-2">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={rows}
                margin={{ top: 10, right: 20, bottom: 24, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="catCount"
                  label={{
                    value: t('passiveSweep.xLabel'),
                    position: 'insideBottom',
                    offset: -6,
                    fontSize: 11,
                  }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={45}
                  label={{
                    value: t('passiveSweep.yLabel'),
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)} min`,
                    name,
                  ]}
                  labelFormatter={(label) =>
                    `${t('passiveSweep.xLabel')}: ${label}`
                  }
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  dataKey="avgActive"
                  name={t('passiveSweep.seriesActive')}
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f97316' }}
                  type="monotone"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="avgPassive"
                  name={t('passiveSweep.seriesPassive')}
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ec4899' }}
                  type="monotone"
                  isAnimationActive={false}
                />
                {crossover && (
                  <ReferenceDot
                    x={crossover.x}
                    y={crossover.y}
                    r={6}
                    fill="#10b981"
                    stroke="#047857"
                    strokeWidth={1.5}
                    isFront
                    label={{
                      value: t('passiveSweep.crossoverLabel'),
                      position: 'top',
                      fontSize: 10,
                      fill: '#047857',
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-lg ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 bg-white/70 dark:bg-bark-700/70 p-2">
              <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                {t('passiveSweep.readingTitle')}
              </div>
              <p className="text-gray-700 dark:text-bark-200 leading-snug">
                {crossover
                  ? t('passiveSweep.readingWithCrossover', {
                      catCount: crossover.x,
                      value: crossover.y.toFixed(1),
                    })
                  : t('passiveSweep.readingNoCrossover')}
              </p>
            </div>
            <div className="rounded-lg ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 bg-white/70 dark:bg-bark-700/70 p-2">
              <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                {t('passiveSweep.marginalTitle')}
              </div>
              <ul className="text-gray-700 dark:text-bark-200 leading-snug list-disc list-inside space-y-0.5">
                {rows.slice(1).map((r, i) => {
                  const prev = rows[i]
                  const dA = r.avgActive - prev.avgActive
                  const dP = r.avgPassive - prev.avgPassive
                  return (
                    <li key={r.catCount} className="tabular-nums">
                      {t('passiveSweep.marginalRow', {
                        from: prev.catCount,
                        to: r.catCount,
                        dActive: formatSigned(dA),
                        dPassive: formatSigned(dP),
                      })}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      <p className="mt-3 text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug">
        {t('passiveSweep.caveat')}
      </p>
    </section>
  )
}

function formatSigned(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

/**
 * First point where passive overtakes active (linearly interpolated
 * between integer catCounts). Null if they never cross in the swept
 * range, in which case the "which channel dominates" verdict is stable
 * and we say so in the reading panel.
 */
function findCrossover(
  rows: readonly SweepRow[],
): { x: number; y: number } | null {
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const curr = rows[i]
    const prevDiff = prev.avgPassive - prev.avgActive
    const currDiff = curr.avgPassive - curr.avgActive
    if (prevDiff === 0) {
      return { x: prev.catCount, y: prev.avgActive }
    }
    if (prevDiff * currDiff < 0) {
      const frac = -prevDiff / (currDiff - prevDiff)
      const x = prev.catCount + frac * (curr.catCount - prev.catCount)
      const y =
        prev.avgActive + frac * (curr.avgActive - prev.avgActive)
      return { x: Number(x.toFixed(2)), y }
    }
  }
  return null
}
