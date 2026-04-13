import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { EventType } from '../../types'

interface CustomerPieChartProps {
  totalCustomersServed: number
  totalCustomersArrived: number
  catInteractionRate: number
  abandonRate: number
  onSegmentClick?: (eventTypes: EventType[]) => void
}

const COLORS = ['#ec4899', '#94a3b8', '#f87171']

interface PieEntry {
  name: string
  value: number
  eventTypes: EventType[]
}

export default function CustomerPieChart({
  totalCustomersServed,
  totalCustomersArrived,
  catInteractionRate,
  abandonRate,
  onSegmentClick,
}: CustomerPieChartProps) {
  const { t } = useTranslation(['results', 'common'])

  const catInteracted = Math.round(catInteractionRate * totalCustomersServed)
  const noInteraction = totalCustomersServed - catInteracted
  const abandoned = Math.round(abandonRate * totalCustomersArrived)

  const data: PieEntry[] = [
    {
      name: t('results:charts.customerPie.catInteracted'),
      value: catInteracted,
      eventTypes: ['CUSTOMER_FINISH_CAT_INTERACTION'],
    },
    {
      name: t('results:charts.customerPie.noInteraction'),
      value: noInteraction,
      eventTypes: ['CUSTOMER_FINISH_DINING'],
    },
    {
      name: t('results:charts.customerPie.abandoned'),
      value: abandoned,
      eventTypes: ['CUSTOMER_ABANDON'],
    },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">
        {t('results:charts.customerPie.empty')}
      </div>
    )
  }

  const clickable = !!onSegmentClick
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const tooltipUnit = t('results:charts.customerPie.tooltipUnit')

  return (
    <div className="card">
      <div className="card-title flex items-center gap-2">
        {t('results:charts.customerPie.title')}
        {clickable && (
          <span className="text-xs text-gray-400 font-normal">
            {t('results:charts.customerPie.clickHint')}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="46%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={() => onSegmentClick?.(entry.eventTypes)}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [
              tooltipUnit ? `${v} ${tooltipUnit}` : `${v}`,
              name,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={9}
            formatter={(value) => {
              const item = data.find((d) => d.name === value)
              if (!item || total === 0) return value
              const percent = ((item.value / total) * 100).toFixed(0)
              return `${value}  ${t('results:charts.customerPie.legendSuffix', {
                count: item.value,
                percent,
              })}`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
