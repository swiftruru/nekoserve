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

interface WaitTimeChartProps {
  avgWaitForSeat: number
  avgWaitForOrder: number
  avgTotalStayTime: number
}

const COLORS = ['#fb923c', '#a78bfa', '#34d399']

export default function WaitTimeChart({
  avgWaitForSeat,
  avgWaitForOrder,
  avgTotalStayTime,
}: WaitTimeChartProps) {
  const { t } = useTranslation(['results', 'common'])

  const data = [
    { name: t('results:charts.waitTime.waitSeat'),  value: avgWaitForSeat },
    { name: t('results:charts.waitTime.waitOrder'), value: avgWaitForOrder },
    { name: t('results:charts.waitTime.totalStay'), value: avgTotalStayTime },
  ]

  const yUnit = t('results:charts.waitTime.yAxisUnit')
  const minUnit = t('common:unit.min')

  const summaryText = data.map((d) => `${d.name}: ${d.value.toFixed(1)} ${minUnit}`).join(', ')

  return (
    <div className="card" role="figure" aria-label={t('results:charts.waitTime.title')}>
      <div className="card-title">{t('results:charts.waitTime.title')}</div>
      <p className="sr-only">{summaryText}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit={yUnit} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)} ${minUnit}`, '']}
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
