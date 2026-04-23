/**
 * v2.0 Epic F: validator.
 *
 * Compares a simulation result against a ValidationBenchmark using
 * three complementary statistical indicators:
 *
 *   1. Chi-square goodness-of-fit on the categorical cat-behavior
 *      distribution. Small chi-square → distributions match.
 *   2. Kolmogorov-Smirnov-like (KS) max-gap on the vertical-level
 *      CDF. Returns the maximum absolute difference between observed
 *      and expected cumulative distributions.
 *   3. Kullback-Leibler divergence on the same behavior distribution.
 *      KL = 0 when identical; penalizes extreme mismatches.
 *
 * These are combined into a 0-100 composite score (chi-square 40% +
 * KS 30% + KL 30%). Below 80 we surface concrete parameter-tweak
 * suggestions.
 */

import type { MetricSummary } from '../types'
import type { ValidationBenchmark } from './benchmarks'

export interface ValidationScores {
  /** Chi-square statistic (lower is better). */
  chiSquare: number
  /** Max cumulative-distribution gap [0,1] (lower is better). */
  ksGap: number
  /** Kullback-Leibler divergence in nats (lower is better). */
  klDivergence: number
  /** Per-indicator 0-100 sub-scores (higher is better). */
  subScores: {
    chiSquare: number
    ksGap: number
    klDivergence: number
  }
  /** Composite 0-100 score. 80+ passes. */
  total: number
  /** True when the composite score is >= 80. */
  passed: boolean
}

export interface ValidationIssue {
  /** Which state / level caused the mismatch. */
  key: string
  /** Expected share from benchmark. */
  expected: number
  /** Observed share from simulation. */
  observed: number
  /** Human-readable advice keyed off `suggestionKey`. */
  suggestionKey: string
}

export interface ValidationWarning {
  /** i18n key under the `validation` namespace. */
  key: string
  /** Interpolation params for the i18n string. */
  params: Record<string, string | number>
}

export interface ValidationReport {
  benchmarkId: string
  benchmarkName: string
  scores: ValidationScores
  issues: ValidationIssue[]
  /** Soft-check warnings beyond the three stats (abandon rate, etc.). */
  warnings: ValidationWarning[]
  /** ISO timestamp at which validation ran. */
  ranAt: string
}

// ─── Statistical primitives ────────────────────────────────

/**
 * Pearson's chi-square on two discrete distributions over the same
 * category set. Both must be probability distributions (sum ≈ 1).
 */
export function chiSquareGoodnessOfFit(
  observed: Record<string, number>,
  expected: Record<string, number>,
): number {
  let stat = 0
  for (const key of Object.keys(expected)) {
    const e = expected[key]
    const o = observed[key] ?? 0
    if (e <= 0) continue
    stat += ((o - e) ** 2) / e
  }
  return stat
}

/**
 * KS-style max absolute gap between cumulative distributions, using
 * the ordering of the category keys as passed in. For categorical
 * data this is not a formal KS test (which needs ordered data), but
 * it's a robust shape-match indicator that stays bounded in [0, 1].
 */
export function ksMaxGap(
  observed: Record<string, number>,
  expected: Record<string, number>,
  orderedKeys: string[],
): number {
  let cumO = 0
  let cumE = 0
  let maxGap = 0
  for (const key of orderedKeys) {
    cumO += observed[key] ?? 0
    cumE += expected[key] ?? 0
    const gap = Math.abs(cumO - cumE)
    if (gap > maxGap) maxGap = gap
  }
  return maxGap
}

/**
 * Kullback-Leibler divergence D(P || Q) in nats.
 * Zero-probability observations are clamped to avoid log(0).
 */
export function klDivergence(
  observed: Record<string, number>,
  expected: Record<string, number>,
): number {
  const EPS = 1e-9
  let kl = 0
  for (const key of Object.keys(expected)) {
    const p = Math.max(observed[key] ?? 0, EPS)
    const q = Math.max(expected[key], EPS)
    kl += p * Math.log(p / q)
  }
  return Math.max(0, kl)
}

// ─── Score composition ─────────────────────────────────────

/**
 * Map chi-square to 0-100 via a soft clamp. chi² = 0 → 100;
 * chi² >= 0.5 → 0 (scaled against the small probability-space values
 * typical for these nine-state distributions).
 */
function chiSquareToScore(chi: number): number {
  if (chi <= 0) return 100
  const mapped = Math.max(0, 1 - chi / 0.5)
  return Math.round(mapped * 100)
}

/** KS gap 0 → 100; gap 0.3 → 0. */
function ksGapToScore(gap: number): number {
  const mapped = Math.max(0, 1 - gap / 0.3)
  return Math.round(mapped * 100)
}

/** KL 0 → 100; KL 0.3 nat → 0. */
function klToScore(kl: number): number {
  const mapped = Math.max(0, 1 - kl / 0.3)
  return Math.round(mapped * 100)
}

// ─── Full validator ────────────────────────────────────────

export function validateAgainst(
  metrics: MetricSummary,
  benchmark: ValidationBenchmark,
): ValidationReport {
  const behaviorObs = metrics.catBehaviorShare ?? {}
  const verticalObs = metrics.catVerticalLevelShare ?? {}

  // For vertical level we re-normalize the OUT_OF_LOUNGE share out of
  // the observed distribution so we compare apples to apples against
  // Hirsch's in-lounge-only figures.
  const verticalRenorm = renormalizeOnKeys(verticalObs, [
    'FLOOR',
    'FURNITURE',
    'SHELF',
  ])

  const chi = chiSquareGoodnessOfFit(behaviorObs, benchmark.catBehavior)
  const behaviorKeys = [
    'OUT_OF_LOUNGE',
    'RESTING',
    'SOCIALIZING',
    'HIDDEN',
    'ALERT',
    'GROOMING',
    'MOVING',
    'EXPLORING',
    'PLAYING',
  ]
  const ks = ksMaxGap(behaviorObs, benchmark.catBehavior, behaviorKeys)
  const kl = klDivergence(behaviorObs, benchmark.catBehavior)

  const subScores = {
    chiSquare: chiSquareToScore(chi),
    ksGap: ksGapToScore(ks),
    klDivergence: klToScore(kl),
  }
  const total = Math.round(
    0.4 * subScores.chiSquare +
      0.3 * subScores.ksGap +
      0.3 * subScores.klDivergence,
  )
  const passed = total >= 80

  const issues: ValidationIssue[] = []
  const SIGNIFICANT_GAP = 0.06
  for (const key of behaviorKeys) {
    const e = benchmark.catBehavior[key] ?? 0
    const o = behaviorObs[key] ?? 0
    if (Math.abs(o - e) >= SIGNIFICANT_GAP) {
      issues.push({
        key,
        expected: e,
        observed: o,
        suggestionKey: suggestionFor(key, o, e),
      })
    }
  }

  // Vertical issues (re-normalized)
  for (const key of ['FLOOR', 'FURNITURE', 'SHELF'] as const) {
    const e = benchmark.catVerticalLevel[key] ?? 0
    const o = verticalRenorm[key] ?? 0
    if (Math.abs(o - e) >= 0.1) {
      issues.push({
        key,
        expected: e,
        observed: o,
        suggestionKey: `suggest.vertical.${key.toLowerCase()}.${o > e ? 'too_high' : 'too_low'}`,
      })
    }
  }

  const warnings: ValidationWarning[] = []
  if (
    metrics.abandonRate < benchmark.abandonRateRange.min ||
    metrics.abandonRate > benchmark.abandonRateRange.max
  ) {
    warnings.push({
      key:
        metrics.abandonRate > benchmark.abandonRateRange.max
          ? 'warn.abandonRate.tooHigh'
          : 'warn.abandonRate.tooLow',
      params: {
        observed: (metrics.abandonRate * 100).toFixed(1),
        min: (benchmark.abandonRateRange.min * 100).toFixed(0),
        max: (benchmark.abandonRateRange.max * 100).toFixed(0),
      },
    })
  }
  if (
    metrics.noCatVisitRate < benchmark.noInteractionRateRange.min ||
    metrics.noCatVisitRate > benchmark.noInteractionRateRange.max
  ) {
    warnings.push({
      key:
        metrics.noCatVisitRate > benchmark.noInteractionRateRange.max
          ? 'warn.noCatVisitRate.tooHigh'
          : 'warn.noCatVisitRate.tooLow',
      params: {
        observed: (metrics.noCatVisitRate * 100).toFixed(1),
        min: (benchmark.noInteractionRateRange.min * 100).toFixed(0),
        max: (benchmark.noInteractionRateRange.max * 100).toFixed(0),
      },
    })
  }

  return {
    benchmarkId: benchmark.id,
    benchmarkName: benchmark.name,
    scores: {
      chiSquare: Number(chi.toFixed(5)),
      ksGap: Number(ks.toFixed(4)),
      klDivergence: Number(kl.toFixed(5)),
      subScores,
      total,
      passed,
    },
    issues,
    warnings,
    ranAt: new Date().toISOString(),
  }
}

function renormalizeOnKeys(
  dist: Record<string, number>,
  keys: string[],
): Record<string, number> {
  const sub: Record<string, number> = {}
  let total = 0
  for (const k of keys) {
    sub[k] = dist[k] ?? 0
    total += sub[k]
  }
  if (total <= 0) return sub
  for (const k of keys) sub[k] = sub[k] / total
  return sub
}

function suggestionFor(
  stateKey: string,
  observed: number,
  expected: number,
): string {
  const direction = observed > expected ? 'too_high' : 'too_low'
  return `suggest.behavior.${stateKey.toLowerCase()}.${direction}`
}
