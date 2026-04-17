import type { MetricSummary } from '../types'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Challenge {
  id: string
  difficulty: Difficulty
  condition: (metrics: MetricSummary) => boolean
}

/**
 * Built-in challenges. Prompt, hints, and explanation text are in i18n
 * JSON files (challenges namespace) keyed by challenge id.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: 'low_abandon',
    difficulty: 'easy',
    condition: (m) => m.abandonRate < 0.10,
  },
  {
    id: 'high_served',
    difficulty: 'easy',
    condition: (m) => m.totalCustomersServed >= 50,
  },
  {
    id: 'staff_efficiency',
    difficulty: 'medium',
    condition: (m) => m.staffUtilization > 0.7 && m.abandonRate < 0.15,
  },
  {
    id: 'cat_paradise',
    difficulty: 'medium',
    condition: (m) => m.catInteractionRate > 0.8 && m.abandonRate < 0.20,
  },
  {
    id: 'balanced_cafe',
    difficulty: 'medium',
    condition: (m) =>
      m.abandonRate < 0.10 &&
      m.seatUtilization > 0.5 &&
      m.staffUtilization > 0.5 &&
      m.catInteractionRate > 0.5,
  },
  {
    id: 'speed_service',
    difficulty: 'hard',
    condition: (m) => m.avgWaitForSeat < 2 && m.avgWaitForOrder < 3 && m.totalCustomersServed >= 30,
  },
  {
    id: 'max_throughput',
    difficulty: 'hard',
    condition: (m) => m.totalCustomersServed >= 80 && m.abandonRate < 0.05,
  },
  {
    id: 'minimal_resources',
    difficulty: 'hard',
    condition: (m) => m.abandonRate < 0.15 && m.totalCustomersServed >= 40,
    // Hint: use minimal seat/staff/cat counts
  },
]
