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
  const data = [
    { name: '座位', value: Math.round(seatUtilization * 100) },
    { name: '店員', value: Math.round(staffUtilization * 100) },
    { name: '貓咪', value: Math.round(catUtilization * 100) },
  ]

  return (
    <div className="card">
      <div className="card-title">🐾 各資源利用率 (%)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            formatter={(v: number) => [`${v}%`, '利用率']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
