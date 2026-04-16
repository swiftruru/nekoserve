import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'

interface UtilizationChartProps {
  seatUtilization: number
  staffUtilization: number
  catUtilization: number
}

const COLORS = ['#f97316', '#6366f1', '#ec4899']

export default function UtilizationChart({
  seatUtilization,
  staffUtilization,
  catUtilization,
}: UtilizationChartProps) {
  const { t } = useTranslation('results')

  const data = [
    { name: t('results:charts.utilization.seat'),  value: Math.round(seatUtilization * 100) },
    { name: t('results:charts.utilization.staff'), value: Math.round(staffUtilization * 100) },
    { name: t('results:charts.utilization.cat'),   value: Math.round(catUtilization * 100) },
  ]

  const tooltipLabel = t('results:charts.utilization.tooltipLabel')

  const summaryText = data.map((d) => `${d.name}: ${d.value}%`).join(', ')

  return (
    <div className="card" role="figure" aria-label={t('results:charts.utilization.title')}>
      <div className="card-title">{t('results:charts.utilization.title')}</div>
      <p className="sr-only">{summaryText}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            formatter={(v: number) => [`${v}%`, tooltipLabel]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationBegin={100}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
