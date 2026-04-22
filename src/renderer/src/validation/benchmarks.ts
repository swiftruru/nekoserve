/**
 * v2.0 Epic F: validation benchmarks.
 *
 * Ground-truth distributions extracted from the literature. Simulation
 * results are compared against these to produce a 0-100 validation
 * score, plus advice for which parameters to tweak when the score is
 * low.
 *
 * Each benchmark points to the citation in data/citations.ts, so the
 * UI can link users straight to the paper that justifies the target.
 */

import { CITATIONS, type Citation } from '../data/citations'

/** Per-state share of a cat's time (must sum to ~1.0). */
export type CatBehaviorDistribution = Record<string, number>

/** Per-level share of a cat's time (floor / furniture / shelf). */
export type VerticalLevelDistribution = Record<string, number>

export interface ValidationBenchmark {
  id: string
  /** Short name for the UI card. */
  name: string
  source: Citation
  /** Method note shown under the name. */
  method: string
  /** Hirsch 2025 Figure 3 — base rate across 227 hours of observation. */
  catBehavior: CatBehaviorDistribution
  /** Hirsch 2025 Figure 4 — vertical-level share (averaged across occupancy). */
  catVerticalLevel: VerticalLevelDistribution
  /**
   * Expected range for customer-abandonment rate in cat-café settings.
   * Used as a soft validation: if the simulation's abandonRate is way
   * outside this range, we flag a mismatch (not a chi-square failure).
   */
  abandonRateRange: { min: number; max: number }
  /**
   * Expected range for no-interaction share of cat time (44.4% in
   * Hirsch 2025). Not a direct metric but derivable from behavior +
   * interaction counts.
   */
  noInteractionRateRange: { min: number; max: number }
}

export const HIRSCH_2025_BENCHMARK: ValidationBenchmark = {
  id: 'hirsch2025',
  name: 'Hirsch et al. (2025) — Stockholm cat café',
  source: CITATIONS.hirsch2025cats,
  method: '227 hours of direct behavioral observation, 70 days, 27 cats',
  catBehavior: {
    OUT_OF_LOUNGE: 0.316,
    RESTING: 0.317,
    SOCIALIZING: 0.128,
    HIDDEN: 0.107,
    ALERT: 0.049,
    GROOMING: 0.045,
    MOVING: 0.027,
    EXPLORING: 0.008,
    PLAYING: 0.003,
  },
  catVerticalLevel: {
    FLOOR: 0.156,
    FURNITURE: 0.278,
    SHELF: 0.421,
    // Cat-room share (0.145) is intentionally excluded from the
    // vertical-level benchmark; cats in the cat room don't have a
    // vertical level to compare.
  },
  abandonRateRange: { min: 0.0, max: 0.25 },
  noInteractionRateRange: { min: 0.3, max: 0.6 },
}

export const ALL_BENCHMARKS: ValidationBenchmark[] = [HIRSCH_2025_BENCHMARK]
