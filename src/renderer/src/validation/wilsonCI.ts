/**
 * Wilson score 95% confidence interval for a binomial proportion.
 *
 * Preferred over the naive Wald interval (p̂ ± 1.96·√(p̂(1−p̂)/n)) because
 * Wald collapses to a zero-width interval at p̂ = 0 or 1, and is
 * systematically too narrow at small n. Wilson (1927) stays well-behaved
 * at the boundaries and is the current standard for reporting
 * proportion CIs in applied statistics (Agresti & Coull, 1998).
 *
 * Formula (z = 1.96 for 95% CI):
 *
 *     center = (p̂ + z²/(2n)) / (1 + z²/n)
 *     margin = z · √(p̂·(1−p̂)/n + z²/(4n²)) / (1 + z²/n)
 *     CI = [center − margin, center + margin]   clamped to [0, 1]
 *
 * See: Wilson, E. B. (1927). Probable inference, the law of succession,
 * and statistical inference. JASA 22(158), 209-212.
 */
export function wilsonCI95(
  successes: number,
  trials: number,
): [number, number] {
  if (trials <= 0) return [0, 0]
  const z = 1.96
  const z2 = z * z
  const phat = successes / trials
  const denom = 1 + z2 / trials
  const center = (phat + z2 / (2 * trials)) / denom
  const margin =
    (z * Math.sqrt((phat * (1 - phat)) / trials + z2 / (4 * trials * trials))) /
    denom
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin),
  ]
}

/**
 * Given a known total n and a reported proportion p, derive the
 * integer success count that the proportion implies. Used when the
 * source paper reports a % without the raw count (we round to the
 * nearest integer, which is what the paper would have done).
 */
export function countFromProportion(proportion: number, total: number): number {
  return Math.round(proportion * total)
}

/** True when `value` is inside the closed interval [lo, hi]. */
export function inRange(value: number, [lo, hi]: [number, number]): boolean {
  return value >= lo && value <= hi
}
