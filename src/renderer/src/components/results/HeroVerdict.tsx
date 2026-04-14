import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../../types'
import { generateVerdict } from '../../utils/verdict'
import type { LearningLevel } from '../learning/types'
import { renderWithTerms } from './TermTooltip'

interface Props {
  metrics: MetricSummary
  level: LearningLevel
}

/**
 * One-card headline summary at the top of Results: reduces every run
 * to a situation (healthy / strained / overloaded) and renders a 1-2
 * sentence verdict in plain language (Beginner) or with ρ terminology
 * (Pro). This is the very first thing students see when they land on
 * the page — it should answer "did my run go well?" in one glance.
 */
export default function HeroVerdict({ metrics, level }: Props) {
  const { t } = useTranslation('results')
  const verdict = useMemo(() => generateVerdict(metrics), [metrics])

  const {
    situation,
    bottleneck,
    arrivedCount,
    servedCount,
    abandonedCount,
    servedPct,
    abandonedPct,
  } = verdict

  const tone = TONE_FOR_SITUATION[situation]
  const icon = ICON_FOR_SITUATION[situation]
  const bottleneckLabel = t(`verdict.bottleneckResource.${bottleneck.resource}`)
  const messageKey = `verdict.${situation}.${level}`

  const message = t(messageKey, {
    arrived: arrivedCount,
    served: servedCount,
    abandoned: abandonedCount,
    servedPct: servedPct.toFixed(0),
    abandonedPct: abandonedPct.toFixed(0),
    bottleneck: bottleneckLabel,
    rho: (bottleneck.ratio * 100).toFixed(0),
  })

  const pulseClass = PULSE_CLASS_FOR_SITUATION[situation]

  return (
    <div
      className={
        'rounded-2xl border-2 p-4 shadow-sm flex items-start gap-3 ' + tone
      }
    >
      <div
        className={`text-3xl leading-none mt-0.5 ${pulseClass}`}
        aria-hidden="true"
        style={{ display: 'inline-block', transformOrigin: 'center' }}
        key={`${situation}-${icon}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">
          {t(`verdict.${situation}.label`)}
        </div>
        <p className="text-sm leading-relaxed font-medium">
          {renderWithTerms(message)}
        </p>
      </div>
    </div>
  )
}

const TONE_FOR_SITUATION: Record<string, string> = {
  healthy: 'bg-green-50 border-green-200 text-green-900',
  strained: 'bg-amber-50 border-amber-300 text-amber-900',
  overloaded: 'bg-red-50 border-red-300 text-red-900',
}

const ICON_FOR_SITUATION: Record<string, string> = {
  healthy: '🎉',
  strained: '⚠️',
  overloaded: '🚨',
}

const PULSE_CLASS_FOR_SITUATION: Record<string, string> = {
  healthy: 'verdict-pulse-healthy',
  strained: 'verdict-pulse-strained',
  overloaded: 'verdict-pulse-overloaded',
}
