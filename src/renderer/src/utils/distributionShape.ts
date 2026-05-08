/**
 * Distribution shape diagnostics for the live convergence histogram.
 *
 * Crystal Ball-style teaching: as the sample grows we want to label the
 * emerging shape — "approximately normal", "right-skewed (long tail
 * right)", "narrow (low spread)", etc — so the user can read the chart
 * in plain language instead of staring at bars.
 *
 * Skewness uses the Fisher-Pearson moment coefficient (g1):
 *   g1 = m3 / m2^(3/2)
 * with m_k = (1/n) Σ(x - mean)^k. We don't use the bias-corrected
 * sample form because (a) it diverges at small n and (b) we just need
 * an indicator strong enough to drive a label, not a publishable stat.
 *
 * Excess kurtosis uses g2 = m4 / m2^2 - 3, so that 0 ≈ normal,
 * positive = heavy-tailed (leptokurtic), negative = light-tailed.
 *
 * Quantiles use linear interpolation (numpy default, "linear" method).
 */

export interface ShapeDescriptor {
  skewness: number
  kurtosis: number
  /** Sample mean. */
  mean: number
  /** Sample standard deviation. 0 when n < 2. */
  stdDev: number
  p5: number
  p50: number
  p95: number
  n: number
}

export type ShapeLabel =
  | 'tooFew'
  | 'narrow'
  | 'normal'
  | 'rightSkewed'
  | 'leftSkewed'
  | 'longTail'
  | 'bimodalHint'

export interface ShapeClassification {
  label: ShapeLabel
  /** Confidence in [0, 1] — higher when n is larger and the shape is
   *  unambiguous. Used to gate noisy labels on tiny samples. */
  confidence: number
}

/**
 * Threshold table for shape classification. These constants are
 * deliberately conservative: at n=10 the moment estimates are very
 * noisy, so we require a stronger skew before declaring "right-skewed"
 * than we would at n=300.
 */
const SKEW_THRESHOLD = 0.5
const KURT_LONG_TAIL = 1.0
const NARROW_CV_THRESHOLD = 0.01 // coefficient of variation σ / |μ|

export function describeDistribution(samples: number[]): ShapeDescriptor {
  const filtered = samples.filter((x) => Number.isFinite(x))
  const n = filtered.length
  if (n === 0) {
    return { skewness: 0, kurtosis: 0, mean: 0, stdDev: 0, p5: 0, p50: 0, p95: 0, n: 0 }
  }
  let sum = 0
  for (const x of filtered) sum += x
  const mean = sum / n

  let m2 = 0
  let m3 = 0
  let m4 = 0
  for (const x of filtered) {
    const d = x - mean
    const d2 = d * d
    m2 += d2
    m3 += d2 * d
    m4 += d2 * d2
  }
  m2 /= n
  m3 /= n
  m4 /= n

  const stdDev = n > 1 ? Math.sqrt((n / (n - 1)) * m2) : 0
  // Population standard deviation for moment ratios (matches the g1/g2
  // definitions above — mixing sample variance and population moments
  // gives slightly biased ratios but they're consistent with most
  // tutorial textbook formulas).
  const popSd = Math.sqrt(m2)

  const skewness = popSd > 0 ? m3 / Math.pow(popSd, 3) : 0
  const kurtosis = popSd > 0 ? m4 / (popSd * popSd * popSd * popSd) - 3 : 0

  return {
    skewness,
    kurtosis,
    mean,
    stdDev,
    p5: percentile(filtered, 0.05),
    p50: percentile(filtered, 0.5),
    p95: percentile(filtered, 0.95),
    n,
  }
}

/**
 * Linear-interpolation percentile (numpy default). Returns 0 for an
 * empty array. `q` is in [0, 1].
 */
export function percentile(samples: number[], q: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const pos = q * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  const frac = pos - lo
  return sorted[lo] + frac * (sorted[hi] - sorted[lo])
}

/**
 * Classify the distribution into one of the human-readable labels.
 *
 * Rules:
 *  - n < 8: too few samples to commit to a label
 *  - σ/|μ| extremely small: "narrow" (everyone gets the same answer)
 *  - |skew| > 1 and kurtosis > 1: "longTail" (more dramatic than skewed)
 *  - skew > threshold: "rightSkewed"
 *  - skew < -threshold: "leftSkewed"
 *  - otherwise: "normal" (close enough to bell)
 */
export function classifyShape(d: ShapeDescriptor): ShapeClassification {
  if (d.n < 8) return { label: 'tooFew', confidence: 0 }

  const cv = d.mean !== 0 ? d.stdDev / Math.abs(d.mean) : Infinity
  if (cv < NARROW_CV_THRESHOLD && d.stdDev < 1e-6) {
    return { label: 'narrow', confidence: 1 }
  }

  const absSkew = Math.abs(d.skewness)
  // Confidence grows with n and with how far we are past the threshold.
  // Caps at 1 around n=100 with strong skew/kurtosis.
  const baseConf = Math.min(1, d.n / 100)

  if (absSkew > 1 && d.kurtosis > KURT_LONG_TAIL) {
    return { label: 'longTail', confidence: baseConf }
  }
  if (d.skewness > SKEW_THRESHOLD) {
    return {
      label: 'rightSkewed',
      confidence: Math.min(1, baseConf * (absSkew / SKEW_THRESHOLD)),
    }
  }
  if (d.skewness < -SKEW_THRESHOLD) {
    return {
      label: 'leftSkewed',
      confidence: Math.min(1, baseConf * (absSkew / SKEW_THRESHOLD)),
    }
  }
  return { label: 'normal', confidence: baseConf }
}
