// Re-export all shared contracts for use within the renderer
export type {
  SimulationConfig,
  MetricSummary,
  EventType,
  EventLogItem,
  SimulationResult,
  ScenarioPreset,
  SimulatorError,
  SimulatorErrorType,
} from '@shared/contracts/types'

// ── Page navigation ───────────────────────────────────────────
export type Page =
  | 'settings'
  | 'results'
  | 'eventlog'
  | 'playback'
  | 'howitworks'
  | 'about'

/**
 * Canonical display order of the nav tabs, shared by `App.tsx` NAV_ITEMS and
 * `PageTransition` (which uses the index delta to decide whether the mascot
 * should sweep left-to-right or right-to-left). Keep in sync with NAV_ITEMS.
 */
export const PAGE_ORDER: readonly Page[] = [
  'settings',
  'results',
  'eventlog',
  'playback',
  'howitworks',
  'about',
] as const

// ── Simulation state machine ──────────────────────────────────
export type SimulationStatus = 'idle' | 'running' | 'success' | 'error'
