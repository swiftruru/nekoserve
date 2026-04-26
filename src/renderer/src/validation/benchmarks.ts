/**
 * v2.0 Epic F: validation benchmarks.
 *
 * Ground-truth distributions extracted from the literature. Simulation
 * results are compared against these to produce a 0-100 validation
 * score, plus advice for which parameters to tweak when the score is
 * low.
 *
 * v2.1: each category is now a {proportion, n, wilsonCI95, source}
 * object instead of a bare number, so the validation page can show
 * the full audit trail: "this 49.2% came from Hirsch 2025 Figure 3,
 * n = 4209 of 8547 in-lounge scans, 95% Wilson CI [48.2%, 50.3%]".
 * The old `benchmark.catBehavior[key]` accesses are replaced with
 * `.proportion`; see validator.ts.
 */

import { CITATIONS, type Citation } from '../data/citations'
import { countFromProportion, wilsonCI95 } from './wilsonCI'

/**
 * Per-category benchmark entry. Holds the point estimate plus the
 * provenance data the UI needs to render an audit card.
 */
export interface CategoryBenchmark {
  /** Empirical proportion (0-1). */
  proportion: number
  /** Observation count for this category. */
  n: number
  /** Sample total used to compute the Wilson CI (sum of all category n). */
  total: number
  /** 95% Wilson score confidence interval, clamped to [0, 1]. */
  wilsonCI95: [number, number]
  /** Where in the source paper this proportion was extracted from. */
  source: {
    figureOrTable: string
    /** Optional page reference (in the source paper). */
    page?: number
    /**
     * Short note flagging extraction judgment calls. For example
     * "n estimated from Figure 3 proportion × total scans 12,505".
     */
    note?: string
  }
}

/** Per-state share of a cat's time over some category axis. */
export type CatBehaviorDistribution = Record<string, CategoryBenchmark>

/** Per-level share of a cat's time (floor / furniture / shelf). */
export type VerticalLevelDistribution = Record<string, CategoryBenchmark>

/**
 * v2.3: human-cat interaction mix from Hirsch 2025 Figure 6.
 *
 * Four mutually exclusive modes describing what was happening at each
 * customer-scan instant: no interaction at all, non-contact attention
 * (looking, talking, soft-calling), contact attention (petting, lap),
 * and no attention from the human (cat soliciting but human ignoring).
 *
 * NekoServe does not yet emit per-customer attention-mode time-series,
 * so the validation page surfaces the paper's distribution + Wilson CI
 * for transparency, but leaves the "simulated %" column blank for now.
 */
export type HumanCatAttentionDistribution = Record<string, CategoryBenchmark>

/**
 * v2.3: paper-side caveat surfaced under a benchmark axis. Used to
 * flag known inconsistencies or extraction judgment calls right next
 * to the table they apply to (e.g. Figure 6 df=18 in body vs df=16 in
 * caption). Rendered as a small ⚠ note under the table title.
 */
export interface BenchmarkCaveat {
  /** i18n key under `validation:provenance.caveats`. */
  key: string
}

export interface ValidationBenchmark {
  id: string
  /** Short name for the UI card. */
  name: string
  source: Citation
  /** Method note shown under the name. */
  method: string
  /**
   * Per-category observation totals for the behavior axis. Sum equals
   * `catBehaviorTotalN` and is shared by every CategoryBenchmark in
   * `catBehavior`.
   */
  catBehaviorTotalN: number
  /** Hirsch 2025 Figure 3 — base rate across 227 hours of observation. */
  catBehavior: CatBehaviorDistribution
  /**
   * Per-category observation total for the vertical-level axis. May
   * differ from `catBehaviorTotalN` (vertical analysis excludes cat-room
   * observations since cats there have no vertical level).
   */
  catVerticalLevelTotalN: number
  /** Hirsch 2025 Figure 3 right panel — vertical-level share (in-lounge only). */
  catVerticalLevel: VerticalLevelDistribution
  /**
   * v2.3: total observation count for the area-level axis (sum equals
   * `catAreaTotalN` and matches `catBehaviorTotalN` since every scan
   * is classified into exactly one area).
   */
  catAreaTotalN?: number
  /**
   * v2.3: Hirsch 2025 Figure 3 left panel — three-area breakdown
   * (Area 1 / Area 2 / Cat Room) over all 12,505 scans.
   */
  catArea?: CatBehaviorDistribution
  /**
   * Sample total used to compute Wilson CIs on the human-cat attention
   * axis. Hirsch 2025 reports 3,310 classifiable customer-scan
   * dyads in Figure 6 (Women 1911 + Men 620 + Girls 447 + Boys 332).
   */
  humanCatAttentionTotalN?: number
  /** Hirsch 2025 Figure 6 — four-mode human-cat attention mix. */
  humanCatAttentionMix?: HumanCatAttentionDistribution
  /** Caveats specific to humanCatAttentionMix (e.g. Figure 6 df mismatch). */
  humanCatAttentionCaveats?: BenchmarkCaveat[]
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
  /**
   * Statistical tests the source paper itself used. Surfaced in the
   * methodology card to show our chi-square choice is aligned with
   * the paper's own analytical approach (not invented by us).
   */
  paperStatisticalTests?: {
    label: string
    statistic: string
  }[]
}

/**
 * Factory that builds a CategoryBenchmark from a raw proportion and a
 * shared total. Derives the count and Wilson 95% CI automatically.
 * Used below to keep the numeric literal for each category as close
 * to the published percentage as possible.
 */
function cat(
  proportion: number,
  total: number,
  source: CategoryBenchmark['source'],
): CategoryBenchmark {
  const n = countFromProportion(proportion, total)
  return {
    proportion,
    n,
    total,
    wilsonCI95: wilsonCI95(n, total),
    source,
  }
}

// ─── Hirsch 2025 raw numbers (from PDF) ─────────────────────
//
// - Total scans across all observations: 12,505 (Figure 3 caption)
// - In-lounge proportion: 68.4% → in-lounge scans ≈ 8,553
//   (within rounding of 1560 + 2778 + 4209 = 8,547 given in paper)
// - Cat-behavior proportions from Results §3.2 + Figure 3
// - Vertical-level proportions from Figure 3 right panel, renormalized
//   to the in-lounge subtotal 8,547 as per the paper
//
// The behavior category n values are estimated from the reported %
// × total scans (12,505), because the paper's Figure 3 bar labels
// aren't machine-readable from the PDF text. Each CategoryBenchmark
// tags this via `source.note`.

const HIRSCH_TOTAL_SCANS = 12505
const HIRSCH_INLOUNGE_N = 8547
// Figure 6 totals: 1911 (Women) + 620 (Men) + 447 (Girls) + 332 (Boys) = 3310
// classifiable customer-scan dyads. The 4-mode mix (no interaction
// 44.4% / non-contact 29.0% / contact 23.2% / no attention 3.4%) is
// reported as a percentage breakdown of these dyads.
const HIRSCH_ATTENTION_N = 3310

const BEHAVIOR_SOURCE = {
  figureOrTable: 'Figure 3, Results §3.2',
  note: 'n estimated from proportion × total scans (12,505)',
}
const VERTICAL_SOURCE = {
  figureOrTable: 'Figure 3 right panel (in-lounge)',
  note: 'n reported directly: 1560 (floor) + 2778 (furniture) + 4209 (shelf) = 8547',
}
const ATTENTION_SOURCE = {
  figureOrTable: 'Figure 6, Results §3.3',
  note: 'n = 3,310 classifiable customer-scan dyads (Women 1911 + Men 620 + Girls 447 + Boys 332)',
}
const AREA_SOURCE = {
  figureOrTable: 'Figure 3 left panel',
  note: 'n reported directly: AREA_1 5,653 + CAT_ROOM 3,948 + AREA_2 2,904 = 12,505',
}

export const HIRSCH_2025_BENCHMARK: ValidationBenchmark = {
  id: 'hirsch2025',
  name: 'Hirsch et al. (2025) — Stockholm cat café',
  source: CITATIONS.hirsch2025cats,
  method: '227 hours of direct behavioral observation, 70 days, 27 cats, 12,505 scans',
  catBehaviorTotalN: HIRSCH_TOTAL_SCANS,
  catBehavior: {
    OUT_OF_LOUNGE: cat(0.316, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    RESTING: cat(0.317, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    SOCIALIZING: cat(0.128, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    HIDDEN: cat(0.107, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    ALERT: cat(0.049, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    GROOMING: cat(0.045, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    MOVING: cat(0.027, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    EXPLORING: cat(0.008, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
    PLAYING: cat(0.003, HIRSCH_TOTAL_SCANS, BEHAVIOR_SOURCE),
  },
  catAreaTotalN: HIRSCH_TOTAL_SCANS,
  catArea: {
    AREA_1: {
      proportion: 0.452,
      n: 5653,
      total: HIRSCH_TOTAL_SCANS,
      wilsonCI95: wilsonCI95(5653, HIRSCH_TOTAL_SCANS),
      source: AREA_SOURCE,
    },
    CAT_ROOM: {
      proportion: 0.316,
      n: 3948,
      total: HIRSCH_TOTAL_SCANS,
      wilsonCI95: wilsonCI95(3948, HIRSCH_TOTAL_SCANS),
      source: AREA_SOURCE,
    },
    AREA_2: {
      proportion: 0.232,
      n: 2904,
      total: HIRSCH_TOTAL_SCANS,
      wilsonCI95: wilsonCI95(2904, HIRSCH_TOTAL_SCANS),
      source: AREA_SOURCE,
    },
  },
  catVerticalLevelTotalN: HIRSCH_INLOUNGE_N,
  catVerticalLevel: {
    FLOOR: {
      proportion: 0.182,
      n: 1560,
      total: HIRSCH_INLOUNGE_N,
      wilsonCI95: wilsonCI95(1560, HIRSCH_INLOUNGE_N),
      source: VERTICAL_SOURCE,
    },
    FURNITURE: {
      proportion: 0.325,
      n: 2778,
      total: HIRSCH_INLOUNGE_N,
      wilsonCI95: wilsonCI95(2778, HIRSCH_INLOUNGE_N),
      source: VERTICAL_SOURCE,
    },
    SHELF: {
      proportion: 0.492,
      n: 4209,
      total: HIRSCH_INLOUNGE_N,
      wilsonCI95: wilsonCI95(4209, HIRSCH_INLOUNGE_N),
      source: VERTICAL_SOURCE,
    },
  },
  humanCatAttentionTotalN: HIRSCH_ATTENTION_N,
  humanCatAttentionMix: {
    NO_INTERACTION: cat(0.444, HIRSCH_ATTENTION_N, ATTENTION_SOURCE),
    NON_CONTACT_ATTENTION: cat(0.290, HIRSCH_ATTENTION_N, ATTENTION_SOURCE),
    CONTACT_ATTENTION: cat(0.232, HIRSCH_ATTENTION_N, ATTENTION_SOURCE),
    NO_ATTENTION_FROM_HUMAN: cat(0.034, HIRSCH_ATTENTION_N, ATTENTION_SOURCE),
  },
  humanCatAttentionCaveats: [
    { key: 'figure6DfMismatch' },
  ],
  abandonRateRange: { min: 0.0, max: 0.25 },
  noInteractionRateRange: { min: 0.3, max: 0.6 },
  paperStatisticalTests: [
    {
      label: 'Vertical level goodness-of-fit',
      statistic: 'χ²(2) = 1234.2, p < 0.001, padj = 0.013',
    },
    {
      label: 'Vertical level × stay period',
      statistic: 'χ²(4) = 102.61, p < 0.001, padj = 0.013',
    },
    {
      label: 'Vertical level × customer occupancy',
      statistic: 'χ²(4) = 82.386, p < 0.001, padj = 0.013',
    },
    {
      label: 'Behavior × stay period',
      statistic: 'χ²(16) = 1113.2, p < 0.001, padj < 0.025',
    },
  ],
}

export const ALL_BENCHMARKS: ValidationBenchmark[] = [HIRSCH_2025_BENCHMARK]
