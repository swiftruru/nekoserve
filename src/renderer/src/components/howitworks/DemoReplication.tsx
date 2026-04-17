import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'
import { BlockMath } from '../Math'

// Seeded pseudo-random for deterministic bar heights
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

// Generate N samples around a mean (simulating avg wait time)
function generateSamples(n: number, seed: number): number[] {
  const rng = seededRandom(seed)
  const mean = 5.0 // target mean: ~5 min
  const std = 2.0
  return Array.from({ length: n }, () => {
    // Box-Muller for normal distribution
    const u1 = rng()
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0.5, mean + std * z)
  })
}

const BAR_H = 100
const BAR_W = 28
const GAP = 4

interface Props {
  level: LearningLevel
}

export default function DemoReplication({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [n, setN] = useState(5)
  const [seed, setSeed] = useState(42)

  const samples = useMemo(() => generateSamples(n, seed), [n, seed])
  const mean = useMemo(() => samples.reduce((a, b) => a + b, 0) / samples.length, [samples])
  const std = useMemo(() => {
    if (samples.length < 2) return 0
    const m = mean
    const variance = samples.reduce((s, x) => s + (x - m) ** 2, 0) / (samples.length - 1)
    return Math.sqrt(variance)
  }, [samples, mean])

  const maxVal = Math.max(...samples, mean + 2)
  const svgW = n * (BAR_W + GAP) + GAP
  const meanY = BAR_H - (mean / maxVal) * BAR_H

  const reroll = () => setSeed((s) => s + 100)

  return (
    <div className="space-y-3">
      {/* Slider */}
      <div className="flex items-center gap-3 text-xs">
        <label className="text-gray-600 dark:text-bark-300 font-medium">
          {t('demo.replication.countLabel')}:
        </label>
        <input
          type="range" min={3} max={10} value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-28 accent-orange-500"
        />
        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{n}</span>
      </div>

      {/* Bar chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${BAR_H + 20}`}
          className="w-full"
          style={{ maxWidth: Math.min(svgW, 400) }}
          role="img"
          aria-label={t('demo.replication.kpiLabel')}
        >
          {/* Bars */}
          {samples.map((val, i) => {
            const barH = (val / maxVal) * BAR_H
            const x = GAP + i * (BAR_W + GAP)
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={BAR_H - barH}
                  width={BAR_W}
                  height={barH}
                  rx={3}
                  className="fill-orange-300 dark:fill-orange-600 transition-all duration-500"
                />
                <text
                  x={x + BAR_W / 2}
                  y={BAR_H + 12}
                  textAnchor="middle"
                  className="text-[8px] fill-gray-400 dark:fill-bark-500 font-mono"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Mean line */}
          <line
            x1={0} y1={meanY}
            x2={svgW} y2={meanY}
            stroke="currentColor"
            className="text-orange-600 dark:text-orange-400"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={svgW - 2}
            y={meanY - 4}
            textAnchor="end"
            className="text-[9px] fill-orange-600 dark:fill-orange-400 font-bold"
          >
            x&#x0304; = {mean.toFixed(2)}
          </text>
        </svg>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-gray-500 dark:text-bark-400">{t('demo.replication.meanLabel')}: </span>
          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums">{mean.toFixed(2)}</span>
        </div>
        {level === 'expert' && (
          <div>
            <span className="text-gray-500 dark:text-bark-400">{t('demo.replication.stdLabel')}: </span>
            <span className="font-mono font-bold text-gray-600 dark:text-bark-300 tabular-nums">{std.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Expert: formula */}
      {level === 'expert' && (
        <BlockMath formula={String.raw`\sigma_{\bar{x}} = \frac{\sigma}{\sqrt{n}} = \frac{${std.toFixed(2)}}{\sqrt{${n}}} = ${(std / Math.sqrt(n)).toFixed(2)}`} />
      )}

      {/* Friendly: guide text */}
      {level === 'friendly' && (
        <div className="text-xs text-orange-500 dark:text-orange-400 font-medium">
          {t('demo.replication.friendlyHint')}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reroll}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          🎲 {t('demo.replication.rerollBtn')}
        </button>
      </div>
    </div>
  )
}
