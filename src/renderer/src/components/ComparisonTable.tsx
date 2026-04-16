import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '../hooks/useSimulation'
import type { MetricSummary } from '../types'

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

  const unitShort = (row: KpiRow) => {
    if (row.unit === 'percent') return '%'
    if (row.unit === 'people') return t('common:unit.people')
    return t('common:unit.min')
  }

  return (
    <div className="card overflow-x-auto">
      <div className="card-title mb-3">{t('results:comparison.title')}</div>
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
