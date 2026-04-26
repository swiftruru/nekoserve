import type { ScenarioPreset } from '../types'

// Built-in scenarios: `name` and `description` on these presets are only
// used as a dev-side fallback. The UI resolves display text via the
// `scenarios` i18n namespace keyed by `id`. See ScenarioButtons.tsx.
export const SCENARIOS: ScenarioPreset[] = [
  {
    // Mirrors the Stockholm cat café setup observed in Hirsch et al. (2025):
    // 27 cats, 227 hours of observation. Used as the validation-mode anchor
    // — running this scenario should land the validator score in the 80s+.
    id: 'hirsch-paper',
    name: 'hirsch-paper',
    description: '',
    config: {
      seatCount: 35,
      staffCount: 3,
      catCount: 27,
      customerArrivalInterval: 4,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 30,
      catInteractionTime: 10,
      catIdleInterval: 4,
      catRestProbability: 0.3,
      catRestDuration: 15,
      maxWaitTime: 20,
      simulationDuration: 720,
      randomSeed: 42,
      warmUpDuration: 30,
      // Hirsch's behavior averages span LOW / MID / HIGH occupancy
      // days; pinning the cap to 14 here would force the sim into LOW
      // only and bias RESTING / OUT_OF_LOUNGE up. The cap stays
      // available for what-if runs (advanced settings), but is off in
      // the canonical paper preset so the validator compares apples
      // to apples.
      maxLoungeOccupancy: 0,
      weekendArrivalMultiplier: 1.0,
    },
  },
  {
    id: 'paper-weekday',
    name: 'paper-weekday',
    description: '',
    config: {
      seatCount: 35,
      staffCount: 2,
      catCount: 27,
      customerArrivalInterval: 6,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 30,
      catInteractionTime: 10,
      catIdleInterval: 4,
      catRestProbability: 0.25,
      catRestDuration: 15,
      maxWaitTime: 25,
      simulationDuration: 720,
      randomSeed: 42,
      warmUpDuration: 30,
    },
  },
  {
    id: 'paper-holiday-rush',
    name: 'paper-holiday-rush',
    description: '',
    config: {
      seatCount: 35,
      staffCount: 4,
      catCount: 27,
      customerArrivalInterval: 2.5,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 25,
      catInteractionTime: 10,
      catIdleInterval: 3,
      catRestProbability: 0.4,
      catRestDuration: 15,
      maxWaitTime: 12,
      simulationDuration: 720,
      randomSeed: 42,
      warmUpDuration: 30,
    },
  },
  {
    id: 'paper-cat-nap',
    name: 'paper-cat-nap',
    description: '',
    config: {
      seatCount: 35,
      staffCount: 3,
      catCount: 27,
      customerArrivalInterval: 4,
      orderTime: 3,
      preparationTime: 8,
      diningTime: 30,
      catInteractionTime: 10,
      catIdleInterval: 6,
      catRestProbability: 0.65,
      catRestDuration: 25,
      maxWaitTime: 20,
      simulationDuration: 720,
      randomSeed: 42,
      warmUpDuration: 30,
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

const CONFIG_NUMBER_KEYS: string[] = [
  'seatCount', 'staffCount', 'catCount', 'customerArrivalInterval',
  'orderTime', 'preparationTime', 'diningTime', 'catInteractionTime',
  'catIdleInterval', 'catRestProbability', 'catRestDuration',
  'maxWaitTime', 'simulationDuration', 'randomSeed',
]

function isValidScenario(p: unknown): p is ScenarioPreset {
  if (!p || typeof p !== 'object') return false
  const obj = p as Record<string, unknown>
  if (typeof obj.id !== 'string' || typeof obj.name !== 'string') return false
  if (!obj.config || typeof obj.config !== 'object') return false
  const cfg = obj.config as Record<string, unknown>
  return CONFIG_NUMBER_KEYS.every((k) => typeof cfg[k] === 'number' && isFinite(cfg[k] as number) && (cfg[k] as number) >= 0)
}

export function loadCustomScenarios(): ScenarioPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(isValidScenario)
    if (valid.length < parsed.length) {
      console.warn(`[NekoServe] Skipped ${parsed.length - valid.length} invalid custom scenario(s)`)
    }
    return valid
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
