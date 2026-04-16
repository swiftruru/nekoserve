import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../../types'
import {
  BOTTLENECK_THRESHOLD,
  detectBottleneck,
} from '../../utils/verdict'
import type { LearningLevel } from '../learning/types'
import { renderWithTerms } from './TermTooltip'

interface Props {
  metrics: MetricSummary
  level: LearningLevel
}

/**
 * Actionable "your bottleneck is X" card. Renders only when the max
 * utilization crosses BOTTLENECK_THRESHOLD (0.85). Below that the run
 * has no clear bottleneck so the callout would just be noise.
 */
export default function BottleneckCallout({ metrics, level }: Props) {
  const { t } = useTranslation('results')
  const bottleneck = detectBottleneck(metrics)

  if (bottleneck.ratio < BOTTLENECK_THRESHOLD) return null

  const resourceLabel = t(`verdict.bottleneckResource.${bottleneck.resource}`)
  const advice = t(`bottleneck.advice.${bottleneck.resource}.${level}`)
  const hint = t(`bottleneck.hint.${level}`)

  return (
    <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl leading-none" aria-hidden="true">
          🔥
        </span>
        <div className="text-[10px] font-bold uppercase tracking-widest text-red-800 dark:text-red-300">
          {t('bottleneck.title')}
        </div>
      </div>
      <div className="mb-2 text-sm text-red-900 dark:text-red-200">
        <span className="font-bold">{resourceLabel}</span>{' '}
        <span className="tabular-nums">
          {(bottleneck.ratio * 100).toFixed(0)}%
        </span>{' '}
        <span className="text-red-700 dark:text-red-400">
          {t('bottleneck.arrow')}
        </span>
      </div>
      <p className="text-xs text-red-900 dark:text-red-200 leading-relaxed mb-2">
        {renderWithTerms(advice)}
      </p>
      <p className="text-[11px] text-red-700/80 dark:text-red-400/80 leading-relaxed">
        💡 {renderWithTerms(hint)}
      </p>
    </div>
  )
}
