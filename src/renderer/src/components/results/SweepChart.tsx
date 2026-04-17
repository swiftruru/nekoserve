import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area,
} from 'recharts'
import type { MetricCI } from '../../types'

interface SweepPoint {
  paramValue: number
  metrics: Record<string, MetricCI>
}

interface SweepChartProps {
  paramLabel: string
  points: SweepPoint[]
}

const METRIC_OPTIONS = [
  { key: 'abandonRate', scale: 100, suffix: '%', color: '#ef4444' },
  { key: 'avgWaitForSeat', scale: 1, suffix: '', color: '#f97316' },
  { key: 'avgWaitForOrder', scale: 1, suffix: '', color: '#eab308' },
  { key: 'seatUtilization', scale: 100, suffix: '%', color: '#3b82f6' },
  { key: 'staffUtilization', scale: 100, suffix: '%', color: '#8b5cf6' },
  { key: 'catUtilization', scale: 100, suffix: '%', color: '#ec4899' },
  { key: 'totalCustomersServed', scale: 1, suffix: '', color: '#22c55e' },
  { key: 'catInteractionRate', scale: 100, suffix: '%', color: '#14b8a6' },
  { key: 'avgTotalStayTime', scale: 1, suffix: '', color: '#6366f1' },
] as const

export default function SweepChart({ paramLabel, points }: SweepChartProps) {
  const { t } = useTranslation(['results'])
  const [selectedMetric, setSelectedMetric] = useState('abandonRate')

  const opt = METRIC_OPTIONS.find((o) => o.key === selectedMetric) ?? METRIC_OPTIONS[0]

  const data = points.map((p) => {
    const ci = p.metrics[selectedMetric]
    return {
      x: p.paramValue,
      y: ci ? ci.mean * opt.scale : 0,
      yLower: ci ? ci.ci95Lower * opt.scale : 0,
      yUpper: ci ? ci.ci95Upper * opt.scale : 0,
    }
  })

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="card-title">{t('results:sweep.title')}</div>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="text-xs rounded border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-800 text-gray-700 dark:text-bark-200 px-2 py-1"
        >
          {METRIC_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {t(`results:kpi.${o.key}.label` as const)}
            </option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            label={{ value: paramLabel, position: 'insideBottom', offset: -3, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={45}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}${opt.suffix}`, t(`results:kpi.${selectedMetric}.label` as const)]}
            labelFormatter={(label) => `${paramLabel}: ${label}`}
            contentStyle={{ fontSize: 11 }}
          />
          {/* CI band */}
          {data.some((d) => d.yLower !== d.yUpper) && (
            <Area
              dataKey="yUpper"
              stroke="none"
              fill={opt.color}
              fillOpacity={0.12}
              type="monotone"
              isAnimationActive={false}
            />
          )}
          {data.some((d) => d.yLower !== d.yUpper) && (
            <Area
              dataKey="yLower"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              type="monotone"
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="y"
            stroke={opt.color}
            strokeWidth={2}
            dot={{ r: 3, fill: opt.color }}
            type="monotone"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
