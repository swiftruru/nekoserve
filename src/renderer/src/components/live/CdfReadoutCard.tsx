import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LiveMetricKey } from '../../store/liveBatchStore'
import type { ThresholdConfig, ExceedanceResult } from '../../utils/exceedance'
import { empiricalCdf, wilson } from '../../utils/cdf'
import { buildCdfConclusion } from '../../utils/cdfConclusion'

/**
 * Attainment readout + CDF layer controls + inverse-lookup, sitting above
 * the three linked charts.
 *
 * It reads the attainment probability straight from the shared exceedance
 * result (so it never disagrees with the histogram readout) and adds what
 * the CDF analysis needs on top: the Wilson 95% interval for that point
 * estimate, the curve readings F(t) and 1 − F(t), a PASS/FAIL verdict
 * against a target attainment, the bilingual auto-conclusion, and the
 * "what threshold reaches X%?" inverse lookup.
 */

interface Props {
  metricKey: LiveMetricKey
  values: number[]
  threshold?: ThresholdConfig
  exceedance: ExceedanceResult | null
  /** Target attainment probability, 0..1. */
  targetP: number
  onTargetPChange: (p: number) => void
  showSmoothed: boolean
  onToggleSmoothed: (v: boolean) => void
  showDkw: boolean
  onToggleDkw: (v: boolean) => void
  /** Suggested threshold from the last inverse lookup, or null. */
  suggestedThreshold: number | null
  onComputeSuggestion: () => void
  onApplySuggestion: () => void
  onClearSuggestion: () => void
}

export default function CdfReadoutCard({
  metricKey,
  values,
  threshold,
  exceedance,
  targetP,
  onTargetPChange,
  showSmoothed,
  onToggleSmoothed,
  showDkw,
  onToggleDkw,
  suggestedThreshold,
  onComputeSuggestion,
  onApplySuggestion,
  onClearSuggestion,
}: Props) {
  const { t } = useTranslation(['liveOverlay'])

  const fAtThreshold = useMemo(() => {
    if (!threshold) return null
    return empiricalCdf(values).eval(threshold.value)
  }, [values, threshold])

  const hasData = exceedance != null && exceedance.total > 0
  const p = hasData ? exceedance.probability : null
  const ci = hasData ? wilson(exceedance.count, exceedance.total) : null
  const pass = p != null ? p >= targetP : null

  const conclusion = useMemo(() => {
    if (!threshold || p == null || ci == null) return null
    return buildCdfConclusion(t, {
      metricKey,
      direction: threshold.direction,
      thresholdValue: threshold.value,
      attainmentPct: p * 100,
      wilsonLoPct: ci.lo * 100,
      wilsonHiPct: ci.hi * 100,
      targetPct: targetP * 100,
      pass: !!pass,
    })
  }, [t, metricKey, threshold, p, ci, targetP, pass])

  const targetPctValue = Math.round(targetP * 100)

  return (
    <div className="rounded-lg border border-orange-200 dark:border-bark-600 bg-white/70 dark:bg-bark-700/30 p-3 space-y-3 text-sm" data-testid="cdf-readout">
      {/* Readout grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Readout
          label={threshold
            ? t('liveOverlay:cdf.attainmentLabel', {
                sign: threshold.direction === 'gte' ? '≥' : '≤',
                value: threshold.value.toFixed(2),
              })
            : t('liveOverlay:cdf.attainmentEmpty')}
          value={p != null ? `${(p * 100).toFixed(1)}%` : '—'}
          hint={ci != null
            ? t('liveOverlay:cdf.wilsonHint', {
                lo: (ci.lo * 100).toFixed(1),
                hi: (ci.hi * 100).toFixed(1),
              })
            : undefined}
        />
        <Readout
          label={t('liveOverlay:cdf.fOfT')}
          value={fAtThreshold != null ? `${(fAtThreshold * 100).toFixed(1)}%` : '—'}
        />
        <Readout
          label={t('liveOverlay:cdf.survivalOfT')}
          value={fAtThreshold != null ? `${((1 - fAtThreshold) * 100).toFixed(1)}%` : '—'}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-500 dark:text-bark-300">
            {t('liveOverlay:cdf.verdictLabel', { target: targetPctValue })}
          </span>
          {pass == null ? (
            <span className="text-base font-semibold text-gray-400">—</span>
          ) : pass ? (
            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-sm font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30">
              {t('liveOverlay:cdf.pass')}
            </span>
          ) : (
            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30">
              {t('liveOverlay:cdf.fail')}
            </span>
          )}
        </div>
      </div>

      {/* Plain-language gloss for the four numbers above, always visible so
          a first-time reader is not left staring at "F(t)" and "Wilson". */}
      <div className="text-[12px] text-gray-500 dark:text-bark-300 leading-relaxed space-y-0.5 border-t border-orange-100 dark:border-bark-600 pt-2" data-testid="cdf-readout-help">
        <p>{t('liveOverlay:cdf.readoutHelp.attainment')}</p>
        <p>{t('liveOverlay:cdf.readoutHelp.wilson')}</p>
        <p>{t('liveOverlay:cdf.readoutHelp.ft')}</p>
        <p>{t('liveOverlay:cdf.readoutHelp.verdict')}</p>
      </div>

      {/* Controls: layer toggles + target + inverse lookup */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-orange-100 dark:border-bark-600" data-testid="cdf-controls">
        <label className="inline-flex items-center gap-1.5 text-[13px] cursor-pointer">
          <input type="checkbox" checked={showSmoothed} onChange={(e) => onToggleSmoothed(e.target.checked)} className="accent-teal-600" />
          {t('liveOverlay:cdf.toggleSmoothed')}
        </label>
        <label className="inline-flex items-center gap-1.5 text-[13px] cursor-pointer">
          <input type="checkbox" checked={showDkw} onChange={(e) => onToggleDkw(e.target.checked)} className="accent-orange-600" />
          {t('liveOverlay:cdf.toggleDkw')}
        </label>

        <div className="inline-flex items-center gap-1.5 text-[13px] ml-auto">
          <span className="text-gray-600 dark:text-bark-300">{t('liveOverlay:cdf.targetLabel')}</span>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={targetPctValue}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) onTargetPChange(Math.min(0.99, Math.max(0.01, v / 100)))
            }}
            className="w-16 px-2 py-1 rounded border border-orange-300 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-800 dark:text-bark-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label={t('liveOverlay:cdf.targetLabel')}
            data-testid="cdf-target-input"
          />
          <span className="text-gray-600 dark:text-bark-300">%</span>
          <button
            type="button"
            onClick={onComputeSuggestion}
            disabled={!threshold || !hasData}
            className={
              'px-2 py-1 rounded text-xs font-semibold border transition-colors ' +
              (!threshold || !hasData
                ? 'opacity-50 cursor-not-allowed bg-white dark:bg-bark-700 text-blue-600 border-blue-300'
                : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700')
            }
            data-testid="cdf-reverse-lookup"
          >
            {t('liveOverlay:cdf.reverseLookup')}
          </button>
        </div>
      </div>

      {/* Inverse-lookup result */}
      {suggestedThreshold != null && Number.isFinite(suggestedThreshold) && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20 text-[13px] text-blue-800 dark:text-blue-200">
          <span>
            {t('liveOverlay:cdf.suggestText', {
              target: targetPctValue,
              value: suggestedThreshold.toFixed(2),
            })}
          </span>
          <button
            type="button"
            onClick={onApplySuggestion}
            className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white border border-blue-700 hover:bg-blue-700"
          >
            {t('liveOverlay:cdf.applySuggestion')}
          </button>
          <button
            type="button"
            onClick={onClearSuggestion}
            className="text-xs underline hover:text-blue-600"
          >
            {t('liveOverlay:cdf.clearSuggestion')}
          </button>
        </div>
      )}

      {/* Bilingual auto-conclusion */}
      {conclusion && (
        <div className="px-3 py-2 rounded bg-orange-50/80 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 space-y-1 text-[13px] leading-relaxed">
          <p className="text-gray-800 dark:text-bark-100">{conclusion.zh}</p>
          <p className="text-gray-500 dark:text-bark-300 italic">{conclusion.en}</p>
        </div>
      )}
    </div>
  )
}

function Readout({
  label,
  value,
  hint,
}: {
  label: React.ReactNode
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500 dark:text-bark-300">{label}</span>
      <span className="text-base font-semibold text-gray-800 dark:text-bark-100 tabular-nums">{value}</span>
      {hint && <span className="text-[10px] text-gray-400 dark:text-bark-400">{hint}</span>}
    </div>
  )
}
