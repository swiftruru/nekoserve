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
export type Page = 'settings' | 'results' | 'eventlog' | 'howitworks' | 'about'

// ── Simulation state machine ──────────────────────────────────
export type SimulationStatus = 'idle' | 'running' | 'success' | 'error'
