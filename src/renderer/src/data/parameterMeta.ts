/**
 * Sidecar metadata for every parameter in SimulationConfig.
 *
 * The runtime SimulationConfig stays flat (`number`) so the Python
 * simulator can consume it directly. This file adds ParameterWithSource
 * metadata on top, so:
 *
 *   1. UI can read `PARAMETER_META[key].source` to render provenance
 *   2. BibTeX generator collects every Citation referenced
 *   3. Event log export appends a source summary block
 *
 * Values here are the empirical defaults from the literature, not
 * necessarily the scenario preset defaults (those live in
 * simulator-python/simulator/models.py SCENARIO_* and scenarios.ts).
 */

import type { SimulationConfig } from '../types'
import { CITATIONS } from './citations'
import type { ParameterWithSource } from '../types/ParameterWithSource'

type NumericParamKey = Exclude<keyof SimulationConfig, never>

export const PARAMETER_META: Record<NumericParamKey, ParameterWithSource<number>> = {
  seatCount: {
    value: 10,
    unit: 'seats',
    source: CITATIONS.hirsch2025cats,
    note: 'Swedish cat café observed 14-customer capacity cap. NekoServe default 10 is a small-shop midpoint.',
    bounds: { min: 6, max: 15 },
  },
  staffCount: {
    value: 2,
    unit: 'staff',
    source: CITATIONS.hirsch2025cats,
    note: 'Hirsch 2025 reports weekday=2, weekend=3 staffing. Default 2 matches weekday baseline.',
    bounds: { min: 1, max: 4 },
  },
  catCount: {
    value: 3,
    unit: 'cats',
    source: CITATIONS.hirsch2025cats,
    note: 'Hirsch 2025 observed 8–9 cats per café. Default 3 is the visible-at-once subset.',
    bounds: { min: 2, max: 9 },
  },
  customerArrivalInterval: {
    value: 8,
    unit: 'minutes',
    source: CITATIONS.dbeis2024enhancing,
    note:
      'Dbeis 2024 drive-thru empirics: 22 cust/hr Poisson (≈2.7 min interval). NekoServe default 8 reflects typical cat-café pace (~7.5 cust/hr).',
    bounds: { min: 2, max: 20 },
  },
  orderTime: {
    value: 3,
    unit: 'minutes',
    source: CITATIONS.dbeis2024enhancing,
    note: 'Empirical Log-Normal service (mean 2.01 min). NekoServe uses Normal(3, 0.6²) as a safe small-café midpoint.',
  },
  preparationTime: {
    value: 8,
    unit: 'minutes',
    source: CITATIONS.dbeis2024enhancing,
    note: 'Coffee + light-meal prep median 6–10 min in service-industry sources; 8 is midpoint.',
  },
  diningTime: {
    value: 15,
    unit: 'minutes',
    source: CITATIONS.dbeis2024enhancing,
    note: 'Short-stay scenario (one drink + snack). For full-meal scenarios scale up to 30–45 min.',
  },
  catInteractionTime: {
    value: 10,
    unit: 'minutes',
    source: CITATIONS.hirsch2025cats,
    note: 'Per-visit engagement duration. Hirsch 2025 reports 23.2% contact interaction; 10 min per encounter is consistent.',
  },
  catIdleInterval: {
    value: 4,
    unit: 'minutes',
    source: CITATIONS.hirsch2025cats,
    note: 'Cat-cat rate 0.58/hr and 44.4% no-interaction implies ~4 min between visits for an engaged cat.',
  },
  catRestProbability: {
    value: 0.2,
    unit: 'probability',
    source: CITATIONS.hirsch2025cats,
    note: 'Hirsch 2025 resting share 31.7% + out-of-sight 10.7%. Bernoulli(0.2) after each visit approximates it.',
    bounds: { min: 0, max: 1 },
  },
  catRestDuration: {
    value: 10,
    unit: 'minutes',
    source: CITATIONS.hirsch2025cats,
    note: 'House-cat short-nap length 5–15 min. Normal(10, 2²).',
  },
  maxWaitTime: {
    value: 25,
    unit: 'minutes',
    source: CITATIONS.ancker1963balking1,
    note:
      'Classical reneging patience. Ancker & Gafarian 1963 assume Exponential patience; Dbeis 2024 confirmed the shape empirically.',
    bounds: { min: 10, max: 60 },
  },
  simulationDuration: {
    value: 240,
    unit: 'minutes',
    source: CITATIONS.hirsch2025cats,
    note: 'One lunch shift (~4 h). Hirsch 2025 used 227 observation hours across 70 days as a much larger empirical window.',
  },
  randomSeed: {
    value: 42,
    unit: 'seed',
    source: CITATIONS.little1961proof,
    note: 'Seed is an arbitrary integer for reproducibility; cited here only to attach the modeling paper that motivates reproducible runs.',
  },
  warmUpDuration: {
    value: 0,
    unit: 'minutes',
    source: CITATIONS.little1961proof,
    note: 'DES convention: discard warm-up transients before collecting metrics. 0 disables.',
  },
}

/**
 * All citations that any parameter references. Used by the BibTeX
 * generator and the Citations page to avoid listing unused papers.
 */
export function parameterCitations(): string[] {
  const keys = new Set<string>()
  for (const meta of Object.values(PARAMETER_META)) {
    keys.add(meta.source.key)
  }
  return Array.from(keys)
}
