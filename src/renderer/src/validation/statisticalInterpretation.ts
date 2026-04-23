/**
 * Statistical interpretation helpers for the validation page.
 *
 * Provides coarse p-value and critical-value lookups so the UI can
 * translate raw test statistics into plain-language "significant /
 * not significant" annotations, and cite the threshold source.
 *
 * Precision disclaimer: these are lookup-table approximations, not a
 * replacement for a real stats library. The validation page uses them
 * only for labels ("p > 0.05", "p < 0.001"), never for decision rules
 * that actually gate the composite score.
 */

// ─── Chi-square critical values ────────────────────────────
//
// Agresti (2013) §1.5.3 Table A.4. Row = degrees of freedom, column =
// upper-tail area α. Stops at df = 20 because our validation never
// uses more categories than that. df = 0 is a placeholder; real
// callers pass df = categories − 1 ≥ 1.
const CHI_SQUARE_CRIT: Record<number, { p10: number; p05: number; p01: number; p001: number }> = {
  1: { p10: 2.71, p05: 3.84, p01: 6.63, p001: 10.83 },
  2: { p10: 4.61, p05: 5.99, p01: 9.21, p001: 13.82 },
  3: { p10: 6.25, p05: 7.81, p01: 11.34, p001: 16.27 },
  4: { p10: 7.78, p05: 9.49, p01: 13.28, p001: 18.47 },
  5: { p10: 9.24, p05: 11.07, p01: 15.09, p001: 20.52 },
  6: { p10: 10.64, p05: 12.59, p01: 16.81, p001: 22.46 },
  7: { p10: 12.02, p05: 14.07, p01: 18.48, p001: 24.32 },
  8: { p10: 13.36, p05: 15.51, p01: 20.09, p001: 26.12 },
  9: { p10: 14.68, p05: 16.92, p01: 21.67, p001: 27.88 },
  10: { p10: 15.99, p05: 18.31, p01: 23.21, p001: 29.59 },
}

/** Rough p-value bucket for a chi-square statistic. */
export type PValueBucket =
  | 'p>0.10'
  | 'p≈0.10'
  | 'p≈0.05'
  | 'p≈0.01'
  | 'p<0.001'

export function chiSquarePValue(chi: number, df: number): PValueBucket {
  const crit = CHI_SQUARE_CRIT[df]
  if (!crit) return 'p>0.10'
  if (chi < crit.p10) return 'p>0.10'
  if (chi < crit.p05) return 'p≈0.10'
  if (chi < crit.p01) return 'p≈0.05'
  if (chi < crit.p001) return 'p≈0.01'
  return 'p<0.001'
}

/**
 * Chi-square critical value at α = 0.05 for the given df. Returned
 * so the UI can print "threshold = 15.51 for df = 8" alongside the
 * observed statistic. df outside the table returns NaN.
 */
export function chiSquareCritical05(df: number): number {
  return CHI_SQUARE_CRIT[df]?.p05 ?? NaN
}

// ─── KS critical values (two-sample, one-distribution) ───────
//
// For comparing one observed sample of size n to a reference
// distribution, the KS critical value at α = 0.05 is approximately
//   D_α ≈ 1.36 / √n
// (Massey 1951; see Sheskin 2011 §9.1.)
//
// We export this as a helper so the UI can show:
//   "D = 0.0791 vs. critical D_0.05 = 0.0147 for n = 8547"
export function ksCritical05(n: number): number {
  if (n <= 0) return 1
  return 1.36 / Math.sqrt(n)
}

/** Rough p-value bucket for a one-sample KS statistic. */
export function ksPValue(d: number, n: number): PValueBucket {
  const d05 = ksCritical05(n)
  const d01 = 1.63 / Math.sqrt(n)
  const d001 = 1.95 / Math.sqrt(n)
  if (d < d05 * 0.9) return 'p>0.10'
  if (d < d05) return 'p≈0.10'
  if (d < d01) return 'p≈0.05'
  if (d < d001) return 'p≈0.01'
  return 'p<0.001'
}

// ─── KL divergence → fidelity ─────────────────────────────
//
// exp(−KL(p‖q)) lies in (0, 1] and has an intuitive reading as
// "effective fidelity of the approximation": KL = 0 ⇒ 100% fidelity,
// KL = 0.1 nats ⇒ ~90% fidelity, KL = 1 nat ⇒ ~37%.
export function klFidelity(kl: number): number {
  return Math.exp(-kl)
}
