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
  const data = [
    { name: '等待座位', value: avgWaitForSeat },
    { name: '等待點餐', value: avgWaitForOrder },
    { name: '總停留時間', value: avgTotalStayTime },
  ]

  return (
    <div className="card">
      <div className="card-title">⏱️ 各階段平均時間 (分鐘)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="分" />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)} 分鐘`, '']}
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
