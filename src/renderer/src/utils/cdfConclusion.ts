/**
 * Builds the auto-generated conclusion sentence for the CDF readout card.
 *
 * The report wants a one-liner it can screenshot and read aloud, in both
 * Traditional Chinese and English at once ("中英對照"), with every number
 * driven by the live calculation (never hardcoded). So this returns BOTH
 * language strings regardless of the active UI locale, by forcing i18next's
 * `lng` per call. The sentence templates themselves live in liveOverlay.json
 * so wording stays editable without touching code.
 */

import type { TFunction } from 'i18next'
import type { ThresholdDirection } from './exceedance'

export interface CdfConclusionInput {
  /** Metric key, e.g. 'catWelfareScore' — resolved to a localized name. */
  metricKey: string
  direction: ThresholdDirection
  thresholdValue: number
  /** Attainment probability as a percentage, 0..100. */
  attainmentPct: number
  /** Wilson 95% interval bounds as percentages, 0..100. */
  wilsonLoPct: number
  wilsonHiPct: number
  /** Target attainment as a percentage, 0..100. */
  targetPct: number
  /** Whether attainment >= target. */
  pass: boolean
}

export interface CdfConclusion {
  zh: string
  en: string
}

export function buildCdfConclusion(t: TFunction, input: CdfConclusionInput): CdfConclusion {
  const build = (lng: 'zh-TW' | 'en'): string => {
    const metric = t(`liveOverlay:metric.${input.metricKey}`, {
      lng,
      defaultValue: input.metricKey,
    })
    const relPhrase = t(
      input.direction === 'gte'
        ? 'liveOverlay:cdf.conclusion.relGte'
        : 'liveOverlay:cdf.conclusion.relLte',
      { lng, threshold: input.thresholdValue.toFixed(2) },
    )
    const compare = t(
      input.pass
        ? 'liveOverlay:cdf.conclusion.above'
        : 'liveOverlay:cdf.conclusion.below',
      { lng },
    )
    const verdict = t(
      input.pass
        ? 'liveOverlay:cdf.conclusion.pass'
        : 'liveOverlay:cdf.conclusion.fail',
      { lng },
    )
    return t('liveOverlay:cdf.conclusion.sentence', {
      lng,
      metric,
      relPhrase,
      prob: input.attainmentPct.toFixed(0),
      ciLo: input.wilsonLoPct.toFixed(0),
      ciHi: input.wilsonHiPct.toFixed(0),
      target: input.targetPct.toFixed(0),
      compare,
      verdict,
    })
  }
  return { zh: build('zh-TW'), en: build('en') }
}
