import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'
import { BlockMath } from '../Math'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  Area, ResponsiveContainer, ComposedChart,
} from 'recharts'

// Small t-table for df 2..49 at 90%, 95%, 99%
const T_TABLE: Record<number, { 90: number; 95: number; 99: number }> = {
  2: { 90: 2.920, 95: 4.303, 99: 9.925 },
  3: { 90: 2.353, 95: 3.182, 99: 5.841 },
  4: { 90: 2.132, 95: 2.776, 99: 4.604 },
  5: { 90: 2.015, 95: 2.571, 99: 4.032 },
  6: { 90: 1.943, 95: 2.447, 99: 3.707 },
  7: { 90: 1.895, 95: 2.365, 99: 3.499 },
  8: { 90: 1.860, 95: 2.306, 99: 3.355 },
  9: { 90: 1.833, 95: 2.262, 99: 3.250 },
  10: { 90: 1.812, 95: 2.228, 99: 3.169 },
  14: { 90: 1.761, 95: 2.145, 99: 2.977 },
  19: { 90: 1.729, 95: 2.093, 99: 2.861 },
  24: { 90: 1.711, 95: 2.064, 99: 2.797 },
  29: { 90: 1.699, 95: 2.045, 99: 2.756 },
  39: { 90: 1.685, 95: 2.023, 99: 2.708 },
  49: { 90: 1.677, 95: 2.010, 99: 2.680 },
}

function lookupT(df: number, conf: 90 | 95 | 99): number {
  const keys = Object.keys(T_TABLE).map(Number).sort((a, b) => a - b)
  // Find closest df
  let best = keys[0]
  for (const k of keys) {
    if (k <= df) best = k
    else break
  }
  return T_TABLE[best][conf]
}

// Seeded RNG
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function generateSamples(n: number, seed: number): number[] {
  const rng = seededRandom(seed)
  const mean = 4.8
  const std = 1.8
  return Array.from({ length: n }, () => {
    const u1 = rng()
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0.5, mean + std * z)
  })
}

// Pre-computed sensitivity data: staff count -> avg wait
// ciRange is [lower, upper] for Area with type="monotone"
const SENSITIVITY_DATA = [
  { staff: 1, mean: 12.3, ciRange: [10.1, 14.5] },
  { staff: 2, mean: 5.2, ciRange: [4.1, 6.3] },
  { staff: 3, mean: 2.8, ciRange: [2.0, 3.6] },
  { staff: 4, mean: 1.4, ciRange: [0.8, 2.0] },
  { staff: 5, mean: 0.6, ciRange: [0.2, 1.0] },
]

interface Props {
  level: LearningLevel
}

export default function DemoCiExplorer({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [n, setN] = useState(10)
  const [conf, setConf] = useState<90 | 95 | 99>(95)

  const samples = useMemo(() => generateSamples(n, 77), [n])
  const mean = useMemo(() => samples.reduce((a, b) => a + b, 0) / samples.length, [samples])
  const std = useMemo(() => {
    const m = mean
    const variance = samples.reduce((s, x) => s + (x - m) ** 2, 0) / (samples.length - 1)
    return Math.sqrt(variance)
  }, [samples, mean])

  const tVal = lookupT(n - 1, conf)
  const halfWidth = tVal * std / Math.sqrt(n)
  const lower = mean - halfWidth
  const upper = mean + halfWidth

  const isNarrow = halfWidth < mean * 0.15

  // Number line scale
  const lineMin = Math.max(0, lower - 1.5)
  const lineMax = upper + 1.5
  const lineW = 320
  const toX = (v: number) => ((v - lineMin) / (lineMax - lineMin)) * lineW

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-gray-600 dark:text-bark-300 font-medium block mb-1">
            {t('demo.ciExplorer.nLabel')}: <span className="font-mono text-orange-600 dark:text-orange-400">{n}</span>
          </label>
          <input
            type="range" min={3} max={50} value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>
        <div>
          <label className="text-gray-600 dark:text-bark-300 font-medium block mb-1">
            {t('demo.ciExplorer.confLabel')}:
          </label>
          <div className="flex rounded-full border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 overflow-hidden">
            {([90, 95, 99] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConf(c)}
                className={`flex-1 px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  conf === c
                    ? 'bg-orange-500 text-white'
                    : 'text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600'
                }`}
              >
                {c}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CI visualization: number line */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${lineW} 50`} className="w-full max-w-[320px]" role="img" aria-label={t('demo.ciExplorer.ciLabel')}>
          {/* Base line */}
          <line x1={0} y1={25} x2={lineW} y2={25} stroke="currentColor" className="text-gray-300 dark:text-bark-500" strokeWidth={1} />

          {/* CI band */}
          <rect
            x={toX(lower)} y={12}
            width={Math.max(0, toX(upper) - toX(lower))} height={26}
            rx={4}
            className="fill-orange-200/50 dark:fill-orange-800/30"
          />

          {/* Error bar arms */}
          <line x1={toX(lower)} y1={18} x2={toX(lower)} y2={32} stroke="currentColor" className="text-orange-500" strokeWidth={2} />
          <line x1={toX(upper)} y1={18} x2={toX(upper)} y2={32} stroke="currentColor" className="text-orange-500" strokeWidth={2} />

          {/* Mean dot */}
          <circle cx={toX(mean)} cy={25} r={5} className="fill-orange-500 dark:fill-orange-400" />

          {/* Labels */}
          <text x={toX(lower)} y={10} textAnchor="middle" className="text-[8px] fill-orange-600 dark:fill-orange-400 font-mono">{lower.toFixed(1)}</text>
          <text x={toX(mean)} y={44} textAnchor="middle" className="text-[8px] fill-orange-600 dark:fill-orange-400 font-bold font-mono">{mean.toFixed(2)}</text>
          <text x={toX(upper)} y={10} textAnchor="middle" className="text-[8px] fill-orange-600 dark:fill-orange-400 font-mono">{upper.toFixed(1)}</text>
        </svg>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-bark-400">{t('demo.ciExplorer.meanLabel')}: </span>
          <span className="font-mono font-bold tabular-nums">{mean.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-bark-400">{t('demo.ciExplorer.lowerLabel')}: </span>
          <span className="font-mono tabular-nums">{lower.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-bark-400">{t('demo.ciExplorer.upperLabel')}: </span>
          <span className="font-mono tabular-nums">{upper.toFixed(2)}</span>
        </div>
      </div>

      {/* Narrow/wide hint */}
      <div className={`text-[10px] font-medium ${isNarrow ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
        {isNarrow ? '✅ ' + t('demo.ciExplorer.narrowHint') : '⚠️ ' + t('demo.ciExplorer.wideHint')}
      </div>

      {/* Friendly: guide text */}
      {level === 'friendly' && (
        <div className="text-xs text-orange-500 dark:text-orange-400 font-medium">
          {t('demo.ciExplorer.friendlyHint')}
        </div>
      )}

      {/* Expert: formula with substituted values */}
      {level === 'expert' && (
        <BlockMath formula={String.raw`\bar{x} \pm t_{\alpha/2} \cdot \frac{s}{\sqrt{n}} = ${mean.toFixed(2)} \pm ${tVal.toFixed(3)} \cdot \frac{${std.toFixed(2)}}{\sqrt{${n}}} = [${lower.toFixed(2)},\; ${upper.toFixed(2)}]`} />
      )}

      {/* Sensitivity analysis sub-demo */}
      {level === 'expert' && (
        <div className="mt-4 pt-3 border-t border-orange-100 dark:border-bark-600">
          <div className="text-xs font-semibold text-gray-600 dark:text-bark-300 mb-2">
            {t('demo.ciExplorer.sensitivityTitle')}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={SENSITIVITY_DATA} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="staff"
                tick={{ fontSize: 10 }}
                label={{ value: t('demo.ciExplorer.xAxis'), position: 'insideBottom', offset: -2, fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{ value: t('demo.ciExplorer.yAxis'), angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number | number[]) =>
                  Array.isArray(value) ? `[${value[0].toFixed(1)}, ${value[1].toFixed(1)}]` : (value as number).toFixed(1)
                }
              />
              <Area
                dataKey="ciRange"
                stroke="none"
                fill="#fdba74"
                fillOpacity={0.25}
                type="monotone"
              />
              <Area
                dataKey="mean"
                stroke="#f97316"
                strokeWidth={2}
                fill="none"
                dot={{ fill: '#f97316', r: 3, stroke: 'none' }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
