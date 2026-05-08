import type { ConvergencePoint } from '../store/liveBatchStore'

/** Window of trailing samples used to detect a stable cumulative mean. */
export const CONVERGENCE_WINDOW = 100

/** Relative-change threshold over the trailing window. 1% by default. */
export const CONVERGENCE_THRESHOLD = 0.01

/**
 * Detect the first n at which the cumulative-mean curve has stabilized:
 * within the trailing CONVERGENCE_WINDOW samples ending at n, every
 * point's deviation from the window's center mean is under
 * CONVERGENCE_THRESHOLD * |center mean|.
 *
 * The Crystal Ball framing: "after this many runs, more samples don't
 * meaningfully move the answer". Returns null while the curve is still
 * wobbling so the UI can suppress the "stable" annotation cleanly.
 *
 * Implementation note: O(N * W) is fine for our scale (N <= ~5000,
 * W = 100). A sliding-window O(N) version would need a deque of extrema
 * and isn't worth the complexity here.
 */
export function detectConvergedAt(
  series: ConvergencePoint[],
  window: number = CONVERGENCE_WINDOW,
  threshold: number = CONVERGENCE_THRESHOLD,
): number | null {
  if (series.length < window) return null
  for (let end = window; end <= series.length; end++) {
    const start = end - window
    const slice = series.slice(start, end)
    let sum = 0
    for (const p of slice) sum += p.mean
    const center = sum / window
    if (center === 0) continue
    const denom = Math.abs(center)
    let stable = true
    for (const p of slice) {
      if (Math.abs(p.mean - center) / denom > threshold) {
        stable = false
        break
      }
    }
    if (stable) return slice[slice.length - 1].n
  }
  return null
}
