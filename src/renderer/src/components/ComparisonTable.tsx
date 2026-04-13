import type { HistoryEntry } from '../hooks/useSimulation'
import type { MetricSummary } from '../types'

interface KpiRow {
  key: keyof MetricSummary
  label: string
  icon: string
  unit: string
  isPercent: boolean
  // true = higher is better (green); false = lower is better (green); null = no highlight
  higherIsBetter: boolean | null
}

const KPI_ROWS: KpiRow[] = [
  { key: 'totalCustomersArrived',  label: '總到達人數',    icon: '🚶', unit: '人',  isPercent: false, higherIsBetter: null },
  { key: 'totalCustomersServed',   label: '完成服務人數',  icon: '✅', unit: '人',  isPercent: false, higherIsBetter: true },
  { key: 'abandonRate',            label: '放棄率',        icon: '❌', unit: '%',   isPercent: true,  higherIsBetter: false },
  { key: 'catInteractionRate',     label: '貓咪互動率',    icon: '🐱', unit: '%',   isPercent: true,  higherIsBetter: true },
  { key: 'avgWaitForSeat',         label: '平均等待座位',  icon: '🪑', unit: '分鐘', isPercent: false, higherIsBetter: false },
  { key: 'avgWaitForOrder',        label: '平均等待點餐',  icon: '☕', unit: '分鐘', isPercent: false, higherIsBetter: false },
  { key: 'avgTotalStayTime',       label: '平均總停留時間',icon: '⏱️', unit: '分鐘', isPercent: false, higherIsBetter: null },
  { key: 'seatUtilization',        label: '座位利用率',    icon: '🏠', unit: '%',   isPercent: true,  higherIsBetter: null },
  { key: 'staffUtilization',       label: '店員利用率',    icon: '👩‍💼', unit: '%',   isPercent: true,  higherIsBetter: null },
  { key: 'catUtilization',         label: '貓咪利用率',    icon: '😺', unit: '%',   isPercent: true,  higherIsBetter: null },
]

interface ComparisonTableProps {
  history: HistoryEntry[]
}

function formatValue(value: number, row: KpiRow): string {
  if (row.isPercent) return `${(value * 100).toFixed(1)}%`
  if (row.unit === '人') return String(Math.round(value))
  return value.toFixed(1)
}

export default function ComparisonTable({ history }: ComparisonTableProps) {
  if (history.length < 2) return null

  return (
    <div className="card overflow-x-auto">
      <div className="card-title mb-3">對比檢視</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs text-gray-500 font-semibold pb-2 w-36">指標</th>
            {history.map((entry, i) => (
              <th
                key={i}
                className="text-center text-xs font-semibold pb-2 px-3 min-w-28"
              >
                <div className="text-orange-600">{entry.label}</div>
                <div className="text-gray-400 font-normal mt-0.5">
                  {entry.result.config.seatCount} 座・
                  {entry.result.config.staffCount} 員・
                  {entry.result.config.catCount} 貓
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {KPI_ROWS.map((row) => {
            const values = history.map((e) => e.result.metrics[row.key] as number)
            const maxVal = Math.max(...values)
            const minVal = Math.min(...values)
            const hasSpread = maxVal - minVal > 0.001

            return (
              <tr key={row.key} className="hover:bg-orange-50/40 transition-colors">
                <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">
                  <span className="mr-1">{row.icon}</span>
                  {row.label}
                  <span className="ml-1 text-gray-400">({row.unit})</span>
                </td>
                {values.map((val, i) => {
                  let cellClass = 'text-gray-700'
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
        綠色 = 較佳值・紅色 = 較差值（僅在有明顯差異時標示）
      </p>
    </div>
  )
}
