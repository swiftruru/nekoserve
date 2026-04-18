import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig, MetricSummary } from '../../types'

interface WhatIfExplorerProps {
  baseConfig: SimulationConfig
  baseMetrics: MetricSummary
}

const TWEAK_PARAMS: {
  key: keyof SimulationConfig
  min: number
  max: number
  step: number
}[] = [
  { key: 'seatCount', min: 1, max: 30, step: 1 },
  { key: 'staffCount', min: 1, max: 10, step: 1 },
  { key: 'catCount', min: 1, max: 10, step: 1 },
  { key: 'customerArrivalInterval', min: 0.5, max: 20, step: 0.5 },
]

const COMPARE_METRICS: {
  key: keyof MetricSummary
  scale: number
  suffix: string
  lowerIsBetter: boolean | null
}[] = [
  { key: 'abandonRate', scale: 100, suffix: '%', lowerIsBetter: true },
  { key: 'avgWaitForSeat', scale: 1, suffix: ' min', lowerIsBetter: true },
  { key: 'totalCustomersServed', scale: 1, suffix: '', lowerIsBetter: false },
  { key: 'seatUtilization', scale: 100, suffix: '%', lowerIsBetter: null },
  { key: 'staffUtilization', scale: 100, suffix: '%', lowerIsBetter: null },
  { key: 'catInteractionRate', scale: 100, suffix: '%', lowerIsBetter: false },
]

export default function WhatIfExplorer({ baseConfig, baseMetrics }: WhatIfExplorerProps) {
  const { t } = useTranslation(['results', 'settings', 'common'])
  const [open, setOpen] = useState(false)
  const [tweakConfig, setTweakConfig] = useState<SimulationConfig>(baseConfig)
  const [whatIfMetrics, setWhatIfMetrics] = useState<MetricSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset when base config changes
  useEffect(() => {
    setTweakConfig(baseConfig)
    setWhatIfMetrics(null)
  }, [baseConfig])

  const runWhatIf = useCallback((cfg: SimulationConfig) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await window.electronAPI.runSimulation(cfg)
        setWhatIfMetrics(result.metrics)
      } catch {
        setWhatIfMetrics(null)
      }
      setLoading(false)
    }, 500)
  }, [])

  function handleChange(key: keyof SimulationConfig, value: number) {
    const updated = { ...tweakConfig, [key]: value }
    setTweakConfig(updated)
    runWhatIf(updated)
  }

  const hasChanges = TWEAK_PARAMS.some(
    ({ key }) => tweakConfig[key] !== baseConfig[key]
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="results-whatif-toggle"
        className="card flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-bark-700 transition-colors cursor-pointer"
      >
        <span className="text-lg">🔮</span>
        {t('results:whatIf.expand')}
      </button>
    )
  }

  return (
    <div className="card border-purple-200 dark:border-purple-800/50" data-testid="results-whatif-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
            {t('results:whatIf.title')}
          </span>
          {loading && (
            <span
              className="inline-block w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"
              data-testid="results-whatif-loading"
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setTweakConfig(baseConfig); setWhatIfMetrics(null) }}
          data-testid="results-whatif-collapse"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {t('results:whatIf.collapse')}
        </button>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {TWEAK_PARAMS.map(({ key, min, max, step }) => {
          const changed = tweakConfig[key] !== baseConfig[key]
          return (
            <div key={key}>
              <label className="text-[10px] font-medium text-gray-500 dark:text-bark-300 block mb-0.5">
                {t(`settings:parameters.${key}.label` as const)}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={tweakConfig[key] as number}
                  onChange={(e) => handleChange(key, Number(e.target.value))}
                  data-testid={`results-whatif-slider-${key}`}
                  className="flex-1 accent-purple-500 h-1.5"
                />
                <span className={`text-xs font-mono w-8 text-center ${changed ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-500 dark:text-bark-300'}`}>
                  {tweakConfig[key]}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      {hasChanges && whatIfMetrics && (
        <div
          className="rounded-lg border border-purple-100 dark:border-purple-800/30 overflow-hidden"
          data-testid="results-whatif-comparison"
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-purple-50/50 dark:bg-purple-900/20">
                <th className="text-left px-2 py-1.5 text-gray-500 dark:text-bark-300 font-medium" />
                <th className="text-center px-2 py-1.5 text-gray-500 dark:text-bark-300 font-medium">
                  {t('results:whatIf.original')}
                </th>
                <th className="text-center px-2 py-1.5 text-purple-600 dark:text-purple-400 font-medium">
                  {t('results:whatIf.whatIf')}
                </th>
                <th className="text-center px-2 py-1.5 text-gray-400 font-medium">
                  {t('results:whatIf.delta')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 dark:divide-purple-800/20">
              {COMPARE_METRICS.map(({ key, scale, suffix, lowerIsBetter }) => {
                const base = baseMetrics[key] * scale
                const whatIf = whatIfMetrics[key] * scale
                const delta = whatIf - base
                const improved = lowerIsBetter === null ? null : lowerIsBetter ? delta < -0.01 : delta > 0.01
                const worsened = lowerIsBetter === null ? null : lowerIsBetter ? delta > 0.01 : delta < -0.01

                return (
                  <tr key={key}>
                    <td className="px-2 py-1 text-gray-600 dark:text-bark-200">
                      {t(`results:kpi.${key}.label` as const)}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-500 dark:text-bark-300 tabular-nums">
                      {base.toFixed(1)}{suffix}
                    </td>
                    <td className="px-2 py-1 text-center font-medium tabular-nums text-purple-700 dark:text-purple-300">
                      {whatIf.toFixed(1)}{suffix}
                    </td>
                    <td className={`px-2 py-1 text-center tabular-nums font-medium ${
                      improved ? 'text-green-600' : worsened ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}{suffix}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasChanges && !whatIfMetrics && !loading && (
        <div className="text-xs text-gray-400 text-center py-2">
          {t('results:whatIf.adjustHint')}
        </div>
      )}
    </div>
  )
}
