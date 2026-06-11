/**
 * Cumulative distribution (CDF) and attainment-probability math.
 *
 * This is the calculation layer behind the CDF analysis view. The teacher's
 * mid-term thread was: take a metric's distribution and turn it into a
 * decision screen that answers "what is the probability of clearing the
 * bar?". The histogram answers "how often", the KDE answers "what shape",
 * and the CDF answers "how much probability has accumulated by here".
 *
 * Everything here is a pure function -- no React, no Zustand, no DOM -- so
 * the report can demo the numbers in isolation and the unit tests in
 * cdf.test.ts can pin them against the formulas in the spec (sections 3 & 11).
 *
 * The attainment probability itself (P(X >= t) / P(X <= t)) is NOT
 * re-implemented here: it reuses calcExceedProb from exceedance.ts so the
 * CDF readout and the existing histogram readout never disagree. This
 * module adds the pieces exceedance.ts doesn't have: the empirical and
 * smoothed CDF curves, the Wilson interval for the point estimate, the DKW
 * band for the whole curve, quantiles, and inverse threshold lookup.
 */

import type { ThresholdDirection } from './exceedance'

// ──────────────────────────────────────────────────────────────
// Standard normal CDF (for the Gaussian-kernel smoothed CDF)
// ──────────────────────────────────────────────────────────────

/**
 * Error function via Abramowitz & Stegun 7.1.26 (max abs error ~1.5e-7).
 * Odd function: erf(-x) = -erf(x), so we fold negatives.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t) *
      Math.exp(-ax * ax)
  return sign * y
}

/** Standard normal CDF Φ(z) = 0.5 * (1 + erf(z / √2)). */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

// ──────────────────────────────────────────────────────────────
// Empirical CDF
// ──────────────────────────────────────────────────────────────

/** Ascending sort of the finite values only (NaN/Inf filtered out). */
export function sortedAsc(values: number[]): number[] {
  return values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
}

/** A single step in the empirical CDF: the value and the cumulative
 *  fraction F_N reached at (and including) that value. */
export interface EcdfStep {
  x: number
  /** Cumulative fraction #{v_i <= x} / N at this value. */
  f: number
}

export interface EcdfResult {
  /** N = number of finite samples the curve is built from. */
  n: number
  /** Distinct ascending values with the cumulative fraction at each. */
  steps: EcdfStep[]
  /** Evaluate F_N(x) = #{v_i <= x} / N at any x (binary search, O(log N)). */
  eval: (x: number) => number
}

/**
 * Empirical CDF. The curve is a step function that jumps by k/N at each
 * distinct value (k = multiplicity). `eval` works for any x, not just the
 * sampled points, by binary-searching the sorted samples.
 */
export function empiricalCdf(values: number[]): EcdfResult {
  const sorted = sortedAsc(values)
  const n = sorted.length

  // Collapse to distinct values with their cumulative fraction.
  const steps: EcdfStep[] = []
  for (let i = 0; i < n; i++) {
    const x = sorted[i]
    if (steps.length > 0 && steps[steps.length - 1].x === x) {
      // Same value: bump the cumulative count, fix up f below.
      steps[steps.length - 1].f = (i + 1) / n
    } else {
      steps.push({ x, f: (i + 1) / n })
    }
  }

  // F_N(x) = (count of samples <= x) / N. Find the rightmost sample <= x.
  const evalFn = (x: number): number => {
    if (n === 0) return 0
    if (x < sorted[0]) return 0
    if (x >= sorted[n - 1]) return 1
    // Upper bound: first index with sorted[idx] > x; count of <= x is idx.
    let lo = 0
    let hi = n // exclusive
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] <= x) lo = mid + 1
      else hi = mid
    }
    return lo / n
  }

  return { n, steps, eval: evalFn }
}

// ──────────────────────────────────────────────────────────────
// Smoothed CDF (Gaussian-kernel KDE integrated to a CDF)
// ──────────────────────────────────────────────────────────────

/**
 * Smoothed CDF from a Gaussian KDE with bandwidth h:
 *   F̂(x) = (1/N) Σ_i Φ((x - v_i) / h)
 * i.e. each data point becomes a normal CDF centred on it with sd = h,
 * then averaged. Pass the SAME h the KDE density used
 * (silvermanBandwidth from kde.ts) so the smooth curve and the smooth
 * density tell the same story. Returns F_N-style fallback (step eval) is
 * not done here; callers handle n < 2 by hiding the smooth layer.
 */
export function smoothedCdf(values: number[], x: number, h: number): number {
  const finite = values.filter((v) => Number.isFinite(v))
  const n = finite.length
  if (n === 0 || !(h > 0)) return 0
  let sum = 0
  for (const v of finite) sum += normalCdf((x - v) / h)
  return sum / n
}

// ──────────────────────────────────────────────────────────────
// Wilson score interval (for the threshold-point attainment prob)
// ──────────────────────────────────────────────────────────────

export interface WilsonInterval {
  lo: number
  hi: number
}

/**
 * Wilson score interval for a binomial proportion p = k/N. Stays inside
 * [0, 1] and stays sensible when p is near 0 or 1 or N is small, which is
 * exactly the regime the attainment probability lives in. z = 1.96 for 95%.
 */
export function wilson(k: number, n: number, z = 1.96): WilsonInterval {
  if (n <= 0) return { lo: 0, hi: 0 }
  const p = k / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))
  return {
    lo: Math.max(0, center - half),
    hi: Math.min(1, center + half),
  }
}

// ──────────────────────────────────────────────────────────────
// DKW simultaneous confidence band (for the whole CDF curve)
// ──────────────────────────────────────────────────────────────

/**
 * Dvoretzky–Kiefer–Wolfowitz half-width:
 *   ε = sqrt( ln(2/α) / (2N) )
 * The band F_N(x) ± ε holds simultaneously over the whole curve at level
 * 1 − α. Smaller N → wider band, which honestly visualises "few samples,
 * be humble". Returns 0 for N <= 0.
 */
export function dkwEpsilon(n: number, alpha = 0.05): number {
  if (n <= 0) return 0
  return Math.sqrt(Math.log(2 / alpha) / (2 * n))
}

export interface DkwBandPoint {
  x: number
  lower: number
  upper: number
}

/**
 * DKW band sampled at each empirical step (clamped to [0, 1]). Useful for
 * drawing the shaded region directly from the step points.
 */
export function dkwBand(values: number[], alpha = 0.05): DkwBandPoint[] {
  const ecdf = empiricalCdf(values)
  const eps = dkwEpsilon(ecdf.n, alpha)
  return ecdf.steps.map((s) => ({
    x: s.x,
    lower: Math.max(0, s.f - eps),
    upper: Math.min(1, s.f + eps),
  }))
}

// ──────────────────────────────────────────────────────────────
// Quantiles and inverse threshold lookup
// ──────────────────────────────────────────────────────────────

/**
 * Linear-interpolation quantile (type 7, the numpy/R default):
 *   h  = (N − 1) · α
 *   Q  = v_(⌊h⌋) + (h − ⌊h⌋) · (v_(⌊h⌋+1) − v_(⌊h⌋))
 * α is clamped to [0, 1]. Returns NaN for empty input.
 */
export function quantile(values: number[], alpha: number): number {
  const sorted = sortedAsc(values)
  const n = sorted.length
  if (n === 0) return NaN
  if (n === 1) return sorted[0]
  const a = Math.min(1, Math.max(0, alpha))
  const h = (n - 1) * a
  const lo = Math.floor(h)
  if (lo >= n - 1) return sorted[n - 1]
  return sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo])
}

export interface ThresholdLookup {
  /** The threshold that achieves (at least) the target attainment prob. */
  threshold: number
  /** Attainment prob actually achieved at that threshold (>= target). */
  achieved: number
}

/**
 * Inverse lookup: given a target attainment probability, return the
 * threshold that achieves it.
 *   higher_better (gte): we want a fraction p_target of runs >= t, so the
 *                        highest such t is the (1 − p_target) quantile.
 *   lower_better  (lte): we want p_target of runs <= t, so t is the
 *                        p_target quantile.
 * The empirical attainment is a step function, so the raw quantile can
 * land just shy of the target; we re-verify with calcExceedProb and, if
 * short, nudge the threshold across the nearest sample so the achieved
 * probability is genuinely >= target.
 */
export function thresholdForTargetP(
  values: number[],
  targetP: number,
  direction: ThresholdDirection,
): ThresholdLookup {
  const sorted = sortedAsc(values)
  const n = sorted.length
  const p = Math.min(1, Math.max(0, targetP))
  if (n === 0) return { threshold: NaN, achieved: 0 }

  const attainment = (t: number): number => {
    let count = 0
    for (const v of sorted) {
      if (direction === 'gte' ? v >= t : v <= t) count++
    }
    return count / n
  }

  let t = direction === 'gte' ? quantile(sorted, 1 - p) : quantile(sorted, p)

  // Re-verify and nudge toward the achievable side if the step function
  // left us just below target. For gte, lowering t raises attainment; for
  // lte, raising t raises attainment. We snap to neighbouring samples.
  let achieved = attainment(t)
  if (achieved + 1e-9 < p) {
    if (direction === 'gte') {
      // Walk t down through samples until attainment >= target.
      for (let i = n - 1; i >= 0; i--) {
        if (sorted[i] <= t) {
          t = sorted[i]
          achieved = attainment(t)
          if (achieved + 1e-9 >= p) break
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        if (sorted[i] >= t) {
          t = sorted[i]
          achieved = attainment(t)
          if (achieved + 1e-9 >= p) break
        }
      }
    }
  }

  return { threshold: t, achieved }
}
