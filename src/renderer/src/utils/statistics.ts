// ──────────────────────────────────────────────────────────────
// statistics — batch run statistics (mean, stdDev, 95% CI)
// ──────────────────────────────────────────────────────────────

/**
 * t-distribution critical values for 95% CI (two-tailed, alpha = 0.05).
 * Index = degrees of freedom (df). For df > 40 we approximate with z = 1.96.
 */
const T_TABLE: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 35: 2.030, 40: 2.021,
}

function tCritical(df: number): number {
  if (df in T_TABLE) return T_TABLE[df]
  // Find nearest lower key
  const keys = Object.keys(T_TABLE).map(Number).sort((a, b) => a - b)
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= df) return T_TABLE[keys[i]]
  }
  return 1.96
}

export function computeMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = computeMean(values)
  const sumSq = values.reduce((sum, v) => sum + (v - mean) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

export interface ConfidenceInterval {
  mean: number
  stdDev: number
  ci95Lower: number
  ci95Upper: number
  halfWidth: number
  n: number
}

export function computeCI95(values: number[]): ConfidenceInterval {
  const n = values.length
  const mean = computeMean(values)
  const stdDev = computeStdDev(values)

  if (n < 2) {
    return { mean, stdDev: 0, ci95Lower: mean, ci95Upper: mean, halfWidth: 0, n }
  }

  const df = n - 1
  const t = tCritical(df)
  const halfWidth = t * (stdDev / Math.sqrt(n))

  return {
    mean,
    stdDev,
    ci95Lower: mean - halfWidth,
    ci95Upper: mean + halfWidth,
    halfWidth,
    n,
  }
}
