import type { ScenarioPreset } from '../types'

// Built-in scenarios: `name` and `description` on these presets are only
// used as a dev-side fallback. The UI resolves display text via the
// `scenarios` i18n namespace keyed by `id` — see ScenarioButtons.tsx.
export const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'weekday',
    name: 'weekday',
    description: '',
    config: {
      seatCount: 10,
      staffCount: 2,
      catCount: 3,
      customerArrivalInterval: 8,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 15,
      catInteractionTime: 10,
      catRestProbability: 0.2,
      catRestDuration: 10,
      maxWaitTime: 25,
      simulationDuration: 240,
      randomSeed: 42,
    },
  },
  {
    id: 'holiday-rush',
    name: 'holiday-rush',
    description: '',
    config: {
      seatCount: 10,
      staffCount: 3,
      catCount: 5,
      customerArrivalInterval: 3,
      orderTime: 2,
      preparationTime: 10,
      diningTime: 20,
      catInteractionTime: 8,
      catRestProbability: 0.3,
      catRestDuration: 15,
      maxWaitTime: 15,
      simulationDuration: 360,
      randomSeed: 42,
    },
  },
  {
    id: 'cat-nap',
    name: 'cat-nap',
    description: '',
    config: {
      seatCount: 10,
      staffCount: 2,
      catCount: 3,
      customerArrivalInterval: 6,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 15,
      catInteractionTime: 10,
      catRestProbability: 0.7,
      catRestDuration: 25,
      maxWaitTime: 20,
      simulationDuration: 240,
      randomSeed: 42,
    },
  },
]

export const DEFAULT_CONFIG = SCENARIOS[0].config

/**
 * The 3 built-in scenario IDs have translated display names/descriptions
 * in the `scenarios` i18n namespace. User-saved custom scenarios keep their
 * user-typed names verbatim and are not translated.
 */
export const BUILT_IN_SCENARIO_IDS = SCENARIOS.map((s) => s.id) as readonly string[]

export function isBuiltInScenarioId(id: string): boolean {
  return BUILT_IN_SCENARIO_IDS.includes(id)
}

// ── Custom scenario persistence (localStorage) ────────────────

const CUSTOM_KEY = 'nekoserve:custom-scenarios'

export function loadCustomScenarios(): ScenarioPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? (JSON.parse(raw) as ScenarioPreset[]) : []
  } catch {
    return []
  }
}

export function saveCustomScenario(preset: ScenarioPreset): void {
  const existing = loadCustomScenarios()
  const updated = [...existing.filter((p) => p.id !== preset.id), preset]
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
}

export function deleteCustomScenario(id: string): void {
  const existing = loadCustomScenarios()
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(existing.filter((p) => p.id !== id)))
}
