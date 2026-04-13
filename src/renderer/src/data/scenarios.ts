import type { ScenarioPreset } from '../types'

export const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'weekday',
    name: '平日白天',
    description: '悠閒步調，顧客到達間隔較長，店員與貓咪壓力適中',
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
    name: '假日尖峰',
    description: '人潮洶湧，顧客耐心較低，資源壓力最大，放棄率偏高',
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
    name: '貓咪午睡模式',
    description: '貓咪頻繁休息，互動資源嚴重不足，展示排隊瓶頸效果',
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
