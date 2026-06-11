import { describe, it, expect } from 'vitest'
import {
  erf,
  normalCdf,
  sortedAsc,
  empiricalCdf,
  smoothedCdf,
  wilson,
  dkwEpsilon,
  dkwBand,
  quantile,
  thresholdForTargetP,
} from './cdf'
import { silvermanBandwidth } from './kde'
import { calcExceedProb } from './exceedance'

// The report's acceptance scenario: cat welfare index, higher_better,
// threshold 3.5, target attainment 50%. We build a small sample whose
// values straddle 3.5 so every layer (ecdf, smoothed, wilson, dkw,
// inverse lookup) has something to chew on.
const WELFARE = [2.1, 2.8, 3.0, 3.4, 3.5, 3.6, 3.9, 4.1, 4.4, 4.8]
// A lower_better metric (abandon rate fractions), threshold 0.15.
const ABANDON = [0.05, 0.08, 0.1, 0.12, 0.15, 0.18, 0.22, 0.3]

describe('erf / normalCdf', () => {
  it('erf is odd and bounded', () => {
    expect(erf(0)).toBeCloseTo(0, 6)
    expect(erf(-1)).toBeCloseTo(-erf(1), 6)
    expect(erf(5)).toBeCloseTo(1, 4)
  })

  it('normalCdf matches known standard-normal values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 5)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3)
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3)
  })
})

describe('sortedAsc', () => {
  it('sorts ascending and drops non-finite', () => {
    expect(sortedAsc([3, 1, 2, NaN, Infinity, -1])).toEqual([-1, 1, 2, 3])
  })
})

describe('empiricalCdf', () => {
  it('F_N(x) = #{v_i <= x} / N', () => {
    const { eval: F, n } = empiricalCdf(WELFARE)
    expect(n).toBe(10)
    expect(F(2.0)).toBeCloseTo(0, 9) // below min
    expect(F(3.5)).toBeCloseTo(0.5, 9) // 5 of 10 values <= 3.5
    expect(F(5.0)).toBeCloseTo(1, 9) // above max
  })

  it('is monotone non-decreasing across steps', () => {
    const { steps } = empiricalCdf(WELFARE)
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].f).toBeGreaterThanOrEqual(steps[i - 1].f)
    }
    expect(steps[steps.length - 1].f).toBeCloseTo(1, 9)
  })

  it('jumps by multiplicity / N on repeated values', () => {
    const { steps, eval: F } = empiricalCdf([1, 1, 1, 2])
    // First distinct value 1 reaches 3/4.
    expect(steps[0].x).toBe(1)
    expect(steps[0].f).toBeCloseTo(0.75, 9)
    expect(F(1)).toBeCloseTo(0.75, 9)
    expect(F(2)).toBeCloseTo(1, 9)
  })
})

describe('smoothedCdf', () => {
  const h = silvermanBandwidth(WELFARE)

  it('is monotone non-decreasing and bounded in [0,1]', () => {
    let prev = -1
    for (let x = 1; x <= 6; x += 0.25) {
      const f = smoothedCdf(WELFARE, x, h)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = f
    }
  })

  it('tracks the empirical CDF roughly at the centre', () => {
    // Around the median the smooth and empirical curves should agree to
    // within a bandwidth's worth of slack.
    const ecdf = empiricalCdf(WELFARE)
    expect(smoothedCdf(WELFARE, 3.5, h)).toBeCloseTo(ecdf.eval(3.5), 1)
  })

  it('uses the SAME bandwidth as the KDE density', () => {
    // Sanity: a larger h smears the curve so far tails move toward 0.5.
    const tight = smoothedCdf(WELFARE, 4.8, 0.05)
    const wide = smoothedCdf(WELFARE, 4.8, 2.0)
    expect(tight).toBeGreaterThan(wide)
  })
})

describe('wilson', () => {
  it('brackets p and stays within [0,1]', () => {
    const ci = wilson(5, 10)
    expect(ci.lo).toBeGreaterThanOrEqual(0)
    expect(ci.hi).toBeLessThanOrEqual(1)
    expect(ci.lo).toBeLessThan(0.5)
    expect(ci.hi).toBeGreaterThan(0.5)
  })

  it('stays in bounds at the extremes (p=0, p=1)', () => {
    const lo = wilson(0, 8)
    expect(lo.lo).toBeCloseTo(0, 9)
    expect(lo.hi).toBeGreaterThan(0)
    expect(lo.hi).toBeLessThanOrEqual(1)
    const hi = wilson(8, 8)
    expect(hi.hi).toBeCloseTo(1, 9)
    expect(hi.lo).toBeLessThan(1)
  })

  it('narrows as N grows', () => {
    const small = wilson(5, 10)
    const big = wilson(500, 1000)
    expect(hi(small)).toBeGreaterThan(hi(big))
  })
  function hi(ci: { lo: number; hi: number }): number {
    return ci.hi - ci.lo
  }
})

describe('dkw', () => {
  it('epsilon shrinks as N grows', () => {
    expect(dkwEpsilon(10)).toBeGreaterThan(dkwEpsilon(1000))
    expect(dkwEpsilon(0)).toBe(0)
  })

  it('band brackets the empirical CDF and clamps to [0,1]', () => {
    const ecdf = empiricalCdf(WELFARE)
    const band = dkwBand(WELFARE)
    for (const pt of band) {
      const f = ecdf.eval(pt.x)
      expect(pt.lower).toBeLessThanOrEqual(f + 1e-9)
      expect(pt.upper).toBeGreaterThanOrEqual(f - 1e-9)
      expect(pt.lower).toBeGreaterThanOrEqual(0)
      expect(pt.upper).toBeLessThanOrEqual(1)
    }
  })
})

describe('quantile (type 7 linear interpolation)', () => {
  it('matches numpy-style endpoints and midpoint', () => {
    const v = [1, 2, 3, 4]
    expect(quantile(v, 0)).toBe(1)
    expect(quantile(v, 1)).toBe(4)
    expect(quantile(v, 0.5)).toBeCloseTo(2.5, 9) // (n-1)*0.5 = 1.5 → 2 + 0.5*(3-2)
  })

  it('interpolates between samples', () => {
    expect(quantile([10, 20], 0.25)).toBeCloseTo(12.5, 9)
  })
})

describe('thresholdForTargetP (inverse lookup, AC5)', () => {
  it('higher_better: achieved attainment >= target', () => {
    const target = 0.75
    const { threshold, achieved } = thresholdForTargetP(WELFARE, target, 'gte')
    expect(achieved).toBeGreaterThanOrEqual(target - 1e-9)
    // Re-verify against the shared exceedance function.
    const re = calcExceedProb(WELFARE, threshold, 'gte')
    expect(re.probability).toBeGreaterThanOrEqual(target - 1e-9)
  })

  it('lower_better: achieved attainment >= target', () => {
    const target = 0.5
    const { threshold, achieved } = thresholdForTargetP(ABANDON, target, 'lte')
    expect(achieved).toBeGreaterThanOrEqual(target - 1e-9)
    const re = calcExceedProb(ABANDON, threshold, 'lte')
    expect(re.probability).toBeGreaterThanOrEqual(target - 1e-9)
  })
})

describe('attainment reuses calcExceedProb (AC1/AC6)', () => {
  it('higher_better welfare at 3.5 is 1 - F(3.5-) = 6/10', () => {
    // values >= 3.5: 3.5,3.6,3.9,4.1,4.4,4.8 = 6 of 10.
    const res = calcExceedProb(WELFARE, 3.5, 'gte')
    expect(res.probability).toBeCloseTo(0.6, 9)
    expect(res.count).toBe(6)
  })

  it('lower_better abandon at 0.15 is F(0.15) = 5/8', () => {
    const res = calcExceedProb(ABANDON, 0.15, 'lte')
    expect(res.probability).toBeCloseTo(5 / 8, 9)
  })
})
