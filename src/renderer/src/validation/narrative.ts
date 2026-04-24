/**
 * v2.2: narrative verdict generator for the validation page.
 *
 * Turns a ValidationReport into a short 2-3 sentence story: tier
 * (pass/marginal/fail), which sub-metric is weakest, and which
 * category inside that sub-metric drives the gap. The consumer
 * renders these fragments with i18n templates.
 */

import type { ValidationReport, ValidationIssue } from './validator'

export type NarrativeTier = 'pass' | 'marginal' | 'fail'

/** Which of the three sub-scores is the weakest, by numeric score. */
export type WeakestDim = 'chiSquare' | 'ksGap' | 'klDivergence'

export interface ValidationNarrative {
  tier: NarrativeTier
  /** Weakest sub-metric by score (ties resolve to χ² → KS → KL). */
  weakestDim: WeakestDim
  /** The single most-deviant category (if any). */
  weakestCategory: ValidationIssue | null
}

export function generateValidationNarrative(
  report: ValidationReport,
): ValidationNarrative {
  const { scores, issues } = report
  const tier: NarrativeTier =
    scores.total >= 80 ? 'pass' : scores.total >= 60 ? 'marginal' : 'fail'

  const dims: { key: WeakestDim; score: number }[] = [
    { key: 'chiSquare', score: scores.subScores.chiSquare },
    { key: 'ksGap', score: scores.subScores.ksGap },
    { key: 'klDivergence', score: scores.subScores.klDivergence },
  ]
  dims.sort((a, b) => a.score - b.score)
  const weakestDim = dims[0].key

  // Pick the issue with the largest absolute gap; issues list is
  // already filtered to SIGNIFICANT_GAP+, so if empty we leave null.
  let weakestCategory: ValidationIssue | null = null
  let maxGap = 0
  for (const issue of issues) {
    const gap = Math.abs(issue.observed - issue.expected)
    if (gap > maxGap) {
      maxGap = gap
      weakestCategory = issue
    }
  }

  return { tier, weakestDim, weakestCategory }
}
