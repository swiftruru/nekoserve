import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '../hooks/useSimulation'
import type { MetricSummary, SimulationConfig } from '../types'

type ResultsKpiKey =
  | 'totalCustomersArrived'
  | 'totalCustomersServed'
  | 'abandonRate'
  | 'catInteractionRate'
  | 'avgWaitForSeat'
  | 'avgWaitForOrder'
  | 'avgTotalStayTime'
  | 'seatUtilization'
  | 'staffUtilization'
  | 'catUtilization'

interface KpiRow {
  key: keyof MetricSummary
  i18nKey: ResultsKpiKey
  icon: string
  unit: 'percent' | 'people' | 'minutes'
  higherIsBetter: boolean | null
}

const KPI_ROWS: KpiRow[] = [
  { key: 'totalCustomersArrived', i18nKey: 'totalCustomersArrived', icon: '🚶',    unit: 'people',  higherIsBetter: null  },
  { key: 'totalCustomersServed',  i18nKey: 'totalCustomersServed',  icon: '✅',    unit: 'people',  higherIsBetter: true  },
  { key: 'abandonRate',           i18nKey: 'abandonRate',           icon: '❌',    unit: 'percent', higherIsBetter: false },
  { key: 'catInteractionRate',    i18nKey: 'catInteractionRate',    icon: '🐱',    unit: 'percent', higherIsBetter: true  },
  { key: 'avgWaitForSeat',        i18nKey: 'avgWaitForSeat',        icon: '🪑',    unit: 'minutes', higherIsBetter: false },
  { key: 'avgWaitForOrder',       i18nKey: 'avgWaitForOrder',       icon: '☕',    unit: 'minutes', higherIsBetter: false },
  { key: 'avgTotalStayTime',      i18nKey: 'avgTotalStayTime',      icon: '⏱️',   unit: 'minutes', higherIsBetter: null  },
  { key: 'seatUtilization',       i18nKey: 'seatUtilization',       icon: '🏠',    unit: 'percent', higherIsBetter: null  },
  { key: 'staffUtilization',      i18nKey: 'staffUtilization',      icon: '👩‍💼', unit: 'percent', higherIsBetter: null  },
  { key: 'catUtilization',        i18nKey: 'catUtilization',        icon: '😺',    unit: 'percent', higherIsBetter: null  },
]

// Config keys we want to compare, mapped to their i18n label in configSummary
const CONFIG_KEYS: { key: keyof SimulationConfig; i18nKey: string; unit?: string }[] = [
  { key: 'seatCount', i18nKey: 'seats' },
  { key: 'staffCount', i18nKey: 'staff' },
  { key: 'catCount', i18nKey: 'cats' },
  { key: 'customerArrivalInterval', i18nKey: 'arrivalInterval', unit: 'min' },
  { key: 'orderTime', i18nKey: 'orderTime', unit: 'min' },
  { key: 'preparationTime', i18nKey: 'preparationTime', unit: 'min' },
  { key: 'diningTime', i18nKey: 'diningTime', unit: 'min' },
  { key: 'catInteractionTime', i18nKey: 'interactionTime', unit: 'min' },
  { key: 'catIdleInterval', i18nKey: 'catIdleInterval', unit: 'min' },
  { key: 'catRestProbability', i18nKey: 'restProbability' },
  { key: 'catRestDuration', i18nKey: 'restDuration', unit: 'min' },
  { key: 'maxWaitTime', i18nKey: 'maxWait', unit: 'min' },
  { key: 'simulationDuration', i18nKey: 'simulationDuration', unit: 'min' },
  { key: 'randomSeed', i18nKey: 'seed' },
]

interface ComparisonTableProps {
  history: HistoryEntry[]
}

function formatValue(value: number, row: KpiRow): string {
  if (row.unit === 'percent') return `${(value * 100).toFixed(1)}%`
  if (row.unit === 'people') return String(Math.round(value))
  return value.toFixed(1)
}

export default function ComparisonTable({ history }: ComparisonTableProps) {
  const { t } = useTranslation(['results', 'common'])
  if (history.length < 2) return null

  const configs = history.map((e) => e.result.config)

  // Find config keys that differ across any pair of runs
  const diffKeys = useMemo(() => {
    return CONFIG_KEYS.filter(({ key }) => {
      const vals = configs.map((c) => c[key])
      return vals.some((v) => v !== vals[0])
    })
  }, [configs])

  const unitShort = (row: KpiRow) => {
    if (row.unit === 'percent') return '%'
    if (row.unit === 'people') return t('common:unit.people')
    return t('common:unit.min')
  }

  return (
    <div className="card overflow-x-auto">
      <div className="card-title mb-3">{t('results:comparison.title')}</div>

      {/* ── Config Diff ────────────────────────────────────── */}
      <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-900/20 px-3 py-2">
        <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
          {t('results:comparison.configDiff.title')}
        </div>
        {diffKeys.length === 0 ? (
          <div className="text-xs text-amber-600/70 dark:text-amber-500/70">
            {t('results:comparison.configDiff.noChange')}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left text-amber-600 dark:text-amber-400 font-semibold pb-1 w-28" />
                {history.map((entry, i) => (
                  <th key={i} className="text-center text-amber-600 dark:text-amber-400 font-semibold pb-1 px-3 min-w-20">
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diffKeys.map(({ key, i18nKey, unit }) => {
                const values = configs.map((c) => c[key])
                return (
                  <tr key={key}>
                    <td className="py-0.5 pr-2 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
                      {t(`results:configSummary.${i18nKey}` as const)}
                    </td>
                    {values.map((val, i) => {
                      const differs = val !== values[0]
                      return (
                        <td
                          key={i}
                          className={`py-0.5 px-3 text-center font-mono ${
                            differs
                              ? 'text-amber-800 dark:text-amber-200 font-bold bg-amber-100/60 dark:bg-amber-800/30 rounded'
                              : 'text-amber-600/60 dark:text-amber-400/60'
                          }`}
                        >
                          {val}{unit ? ` ${unit}` : ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── KPI comparison table ──────────────────────────── */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs text-gray-500 dark:text-bark-300 font-semibold pb-2 w-36">
              {t('results:comparison.indicator')}
            </th>
            {history.map((entry, i) => (
              <th
                key={i}
                className="text-center text-xs font-semibold pb-2 px-3 min-w-28"
              >
                <div className="text-orange-600 dark:text-orange-400">{entry.label}</div>
                <div className="text-gray-400 font-normal mt-0.5">
                  {t('results:comparison.configSummary', {
                    seats: entry.result.config.seatCount,
                    staff: entry.result.config.staffCount,
                    cats: entry.result.config.catCount,
                  })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-bark-600">
          {KPI_ROWS.map((row) => {
            const values = history.map((e) => e.result.metrics[row.key] as number)
            const maxVal = Math.max(...values)
            const minVal = Math.min(...values)
            const hasSpread = maxVal - minVal > 0.001

            return (
              <tr key={row.key} className="hover:bg-orange-50/40 dark:hover:bg-bark-700/40 transition-colors">
                <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">
                  <span className="mr-1">{row.icon}</span>
                  {t(`results:kpi.${row.i18nKey}.label` as const)}
                  <span className="ml-1 text-gray-400">({unitShort(row)})</span>
                </td>
                {values.map((val, i) => {
                  let cellClass = 'text-gray-700 dark:text-bark-200'
                  if (hasSpread && row.higherIsBetter !== null) {
                    const isBest = row.higherIsBetter ? val === maxVal : val === minVal
                    const isWorst = row.higherIsBetter ? val === minVal : val === maxVal
                    if (isBest) cellClass = 'text-green-600 font-semibold'
                    else if (isWorst) cellClass = 'text-red-500 font-medium'
                  }
                  return (
                    <td key={i} className={`py-2 px-3 text-center text-sm ${cellClass}`}>
                      {formatValue(val, row)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400">
        {t('results:comparison.legend')}
      </p>
    </div>
  )
}
