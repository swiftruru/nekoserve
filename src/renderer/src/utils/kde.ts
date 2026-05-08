/**
 * Gaussian Kernel Density Estimation.
 *
 * Used to overlay a smooth distribution curve on top of LiveHistogram bars.
 * The histogram answers "how many runs landed in each bin"; the KDE
 * answers "what shape does the underlying distribution actually take" —
 * that's the missing Crystal Ball-style visual the teacher was asking
 * about.
 *
 * Bandwidth selection uses Silverman's rule of thumb:
 *   h = 1.06 * σ * n^(-1/5)
 * which is good for roughly bell-shaped data and degrades gracefully
 * for skewed distributions. We don't bother with cross-validation here
 * because the visual story (sparse → smooth bell) does not require
 * statistical optimality.
 *
 * Complexity: O(n × m) where n = samples and m = grid points (default
 * 80). At n=1000 and m=80 that's 80K Gaussian evaluations, well under
 * a millisecond on modern hardware.
 */

export interface KdeResult {
  /** Evaluation x-coordinates (uniformly spaced over [min, max] of samples). */
  xs: number[]
  /** Density values at each x. Sums to ~1 / dx (probability density, not mass). */
  ys: number[]
  /** Bandwidth used (Silverman). Useful for diagnostics. */
  bandwidth: number
}

const SQRT_2PI = Math.sqrt(2 * Math.PI)

function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / SQRT_2PI
}

/**
 * Sample standard deviation. Returns 0 for n < 2 (degenerate KDE).
 */
function sampleStdDev(samples: number[]): number {
  const n = samples.length
  if (n < 2) return 0
  let sum = 0
  for (const x of samples) sum += x
  const mean = sum / n
  let sq = 0
  for (const x of samples) {
    const d = x - mean
    sq += d * d
  }
  return Math.sqrt(sq / (n - 1))
}

/**
 * Silverman's rule of thumb for Gaussian KDE bandwidth.
 *
 * Floors the bandwidth at a small positive number so a degenerate
 * sample (all values equal, σ = 0) still produces a visible spike
 * rather than dividing by zero downstream.
 */
export function silvermanBandwidth(samples: number[]): number {
  const n = samples.length
  if (n < 2) return 1
  const sd = sampleStdDev(samples)
  // For data that's perfectly constant, fall back to a small fraction
  // of the value's magnitude so the KDE renders as a tight peak rather
  // than vanishing entirely.
  const fallback = Math.max(1e-6, Math.abs(samples[0]) * 0.01)
  const sigma = sd > 0 ? sd : fallback
  return 1.06 * sigma * Math.pow(n, -1 / 5)
}

interface KdeOptions {
  /** Number of x-grid points. Default 80. */
  gridPoints?: number
  /** Override bandwidth instead of using Silverman's rule. */
  bandwidth?: number
  /** Pad x-range outward by this multiple of bandwidth. Default 3. */
  rangePadding?: number
}

/**
 * Compute a Gaussian KDE from samples.
 *
 * Returns null when n < 2 (need at least two points for a meaningful
 * density). Callers should fall back to drawing nothing in that case.
 */
export function computeKde(samples: number[], opts: KdeOptions = {}): KdeResult | null {
  const filtered = samples.filter((x) => Number.isFinite(x))
  const n = filtered.length
  if (n < 2) return null

  const gridPoints = opts.gridPoints ?? 80
  const padding = opts.rangePadding ?? 3
  const h = opts.bandwidth ?? silvermanBandwidth(filtered)
  if (!(h > 0)) return null

  let lo = Infinity
  let hi = -Infinity
  for (const x of filtered) {
    if (x < lo) lo = x
    if (x > hi) hi = x
  }
  // Pad the range so the curve has tails visible, otherwise the leftmost
  // and rightmost grid points sit at the data edge with high density and
  // truncate visually.
  if (lo === hi) {
    const eps = Math.max(0.01, Math.abs(lo) * 0.05) + padding * h
    lo -= eps
    hi += eps
  } else {
    lo -= padding * h
    hi += padding * h
  }

  const xs = new Array<number>(gridPoints)
  const ys = new Array<number>(gridPoints)
  const step = (hi - lo) / (gridPoints - 1)
  const invHN = 1 / (h * n)

  for (let i = 0; i < gridPoints; i++) {
    const x = lo + i * step
    let sum = 0
    for (let j = 0; j < n; j++) {
      sum += gaussianKernel((x - filtered[j]) / h)
    }
    xs[i] = x
    ys[i] = sum * invHN
  }

  return { xs, ys, bandwidth: h }
}
