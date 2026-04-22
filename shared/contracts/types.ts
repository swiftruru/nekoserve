// ============================================================
// NekoServe — Shared Data Contracts
// TypeScript interfaces shared between renderer and main process.
// Python simulator must produce/consume JSON matching these shapes.
// ============================================================

// ----------------------------------------------------------
// Input
// ----------------------------------------------------------

export interface SimulationConfig {
  /** 咖啡廳可用座位數 */
  seatCount: number
  /** 負責點餐與製作餐點的店員數 */
  staffCount: number
  /** 可供互動的貓咪數 */
  catCount: number
  /** 顧客平均到達間隔（分鐘）— Exponential 分佈 mean */
  customerArrivalInterval: number
  /** 點餐平均時間（分鐘）— Normal 分佈 mean */
  orderTime: number
  /** 餐點製作平均時間（分鐘）— Normal 分佈 mean */
  preparationTime: number
  /** 用餐平均時間（分鐘）— Normal 分佈 mean */
  diningTime: number
  /** 貓咪單次拜訪平均時間（分鐘）— Normal 分佈 mean */
  catInteractionTime: number
  /** 每隻貓兩次拜訪之間的平均空閒時間（分鐘）— Exponential 分佈 mean */
  catIdleInterval: number
  /** 每次拜訪後貓咪進入休息的機率 (0–1) */
  catRestProbability: number
  /** 貓咪休息持續時間 mean（分鐘）— Normal 分佈 mean */
  catRestDuration: number
  /** 顧客最大可接受等待座位時間（分鐘） */
  maxWaitTime: number
  /** 模擬總時長（分鐘）*/
  simulationDuration: number
  /** 隨機種子，用於可重現模擬結果 */
  randomSeed: number
  /** 暖機期（分鐘），暖機期間的指標不計入統計。預設 0（不啟用）。 */
  warmUpDuration: number
}

// ----------------------------------------------------------
// Output
// ----------------------------------------------------------

export interface MetricSummary {
  /** 平均等待座位時間（分鐘） */
  avgWaitForSeat: number
  /** 平均等待點餐完成時間（分鐘，含點餐+製作） */
  avgWaitForOrder: number
  /** 平均總停留時間（分鐘） */
  avgTotalStayTime: number
  /** 至少被一隻貓拜訪過一次的顧客比例 (0–1)，以完成服務顧客為分母 */
  catInteractionRate: number
  /** 平均每位完成服務的顧客被幾隻貓拜訪 */
  avgCatVisitsPerCustomer: number
  /** 完整用餐但一次都沒被貓拜訪的比例 (0–1) */
  noCatVisitRate: number
  /** 座位利用率 (0–1) */
  seatUtilization: number
  /** 店員利用率 (0–1) */
  staffUtilization: number
  /** 貓咪互動資源利用率 (0–1，含互動時間與休息時間) */
  catUtilization: number
  /** 系統總服務人數（完整完成流程） */
  totalCustomersServed: number
  /** 總到達人數 */
  totalCustomersArrived: number
  /** 放棄等待比例 (0–1) */
  abandonRate: number
  /** 到達率 λ（人/分鐘），古典排隊論用 */
  arrivalRate: number
  /** Reneging rate RR（人/分鐘），依 Dbeis & Al-Sahili (2024) 定義 */
  renegingRate: number
  /** 單服務台服務率 μ（人/分鐘），來自 1/(orderTime+preparationTime) */
  serviceRate: number
  /** 平均服務時間（分鐘），orderTime + preparationTime */
  meanServiceTime: number
  /** 古典 M/M/c 利用率 ρ = λ/(c·μ)，c = staffCount */
  rhoClassical: number
  /** Dbeis 2024 修正利用率 ρ_R = (λ−RR)/(c·μ) */
  rhoCorrected: number
  /** 等待座位 P50 (分鐘) */
  waitForSeatP50: number
  /** 等待座位 P95 (分鐘) */
  waitForSeatP95: number
  /** 等待座位 P99 (分鐘) */
  waitForSeatP99: number
  /** 等待點餐 P50 (分鐘) */
  waitForOrderP50: number
  /** 等待點餐 P95 (分鐘) */
  waitForOrderP95: number
  /** 等待點餐 P99 (分鐘) */
  waitForOrderP99: number
}

export type EventType =
  | 'CUSTOMER_ARRIVE'
  | 'CUSTOMER_WAIT_SEAT'
  | 'CUSTOMER_SEATED'
  | 'CUSTOMER_ORDER'
  | 'ORDER_START_PREPARE'
  | 'ORDER_READY'
  | 'CUSTOMER_START_DINING'
  | 'CUSTOMER_FINISH_DINING'
  | 'CUSTOMER_LEAVE'
  | 'CUSTOMER_ABANDON'
  // v0.4.0: cats autonomously visit seated customers. These events
  // replace the old customer-initiated CUSTOMER_WAIT_CAT /
  // CUSTOMER_START_CAT_INTERACTION / CUSTOMER_FINISH_CAT_INTERACTION
  // triple. `resourceId` carries the cat identity (e.g. "貓-2").
  | 'CAT_VISIT_SEAT'
  | 'CAT_LEAVE_SEAT'
  | 'CAT_START_REST'
  | 'CAT_END_REST'
  // v2.0 Epic B: 9-state ethogram transitions based on Hirsch et al. 2025.
  // Emitted whenever a cat's behavior state changes (entering / leaving
  // any of the nine states). `resourceId` is the cat label; `description`
  // carries "from → to" for readability.
  | 'CAT_STATE_CHANGE'

/**
 * v2.0 Epic B: the nine-state cat ethogram derived from
 * Hirsch et al. (2025), Figure 3, using Stanton et al. (2015) Felidae
 * taxonomy. Base probabilities live in
 * simulator-python/simulator/constants/hirsch2025.py and are mirrored
 * in src/renderer/src/data/hirsch2025.ts for UI display.
 */
export type CatBehaviorState =
  | 'OUT_OF_LOUNGE'  // in cat room, not visible to customers (31.6%)
  | 'RESTING'         // idle / dozing, not interacting (31.7%)
  | 'SOCIALIZING'     // actively engaging with customer or cat (12.8%)
  | 'HIDDEN'          // out of sight, avoiding attention (10.7%)
  | 'ALERT'           // watching / anxious / fearful (4.9%)
  | 'GROOMING'        // self-maintenance (4.5%)
  | 'MOVING'          // transitioning between spots (2.7%)
  | 'EXPLORING'       // investigating environment (0.8%)
  | 'PLAYING'         // active play (0.3%)

/**
 * v2.0 Epic C: the four customer types from Hirsch 2025 Figure 6.
 * Default generator uses the weights in CUSTOMER_TYPE_DEFAULT_MIX
 * (see constants/hirsch2025). Users can override via UI.
 */
export type CustomerType = 'WOMAN' | 'MAN' | 'GIRL' | 'BOY'

export interface EventLogItem {
  /** 模擬時間（分鐘，保留 2 位小數） */
  timestamp: number
  eventType: EventType
  /** 顧客 ID；貓咪休息事件填入觸發休息的最後一位顧客 ID */
  customerId: number
  /** 座位編號 / 店員編號 / 貓咪代號（可選） */
  resourceId?: string
  /** 人類可讀的事件描述（繁體中文） */
  description: string
  /** v2.0: the from / to state pair for CAT_STATE_CHANGE events. */
  fromState?: CatBehaviorState
  toState?: CatBehaviorState
  /** v2.0: the customer's archetype (for CUSTOMER_ARRIVE / interaction events). */
  customerType?: CustomerType
}

export interface SimulationResult {
  config: SimulationConfig
  metrics: MetricSummary
  eventLog: EventLogItem[]
}

// ----------------------------------------------------------
// Batch run (multi-seed replication)
// ----------------------------------------------------------

export interface MetricCI {
  mean: number
  stdDev: number
  ci95Lower: number
  ci95Upper: number
  halfWidth: number
  n: number
}

export interface BatchSummary {
  avgWaitForSeat: MetricCI
  avgWaitForOrder: MetricCI
  avgTotalStayTime: MetricCI
  catInteractionRate: MetricCI
  avgCatVisitsPerCustomer: MetricCI
  noCatVisitRate: MetricCI
  seatUtilization: MetricCI
  staffUtilization: MetricCI
  catUtilization: MetricCI
  totalCustomersServed: MetricCI
  totalCustomersArrived: MetricCI
  abandonRate: MetricCI
}

export interface BatchResult {
  config: SimulationConfig
  runs: SimulationResult[]
  summary: BatchSummary
  replicationCount: number
}

// ----------------------------------------------------------
// Sweep (parameter sensitivity analysis)
// ----------------------------------------------------------

export interface SweepPoint {
  paramValue: number
  metrics: Record<string, MetricCI>
}

export interface SweepResult {
  config: SimulationConfig
  paramKey: keyof SimulationConfig
  points: SweepPoint[]
}

// ----------------------------------------------------------
// Preset Scenarios
// ----------------------------------------------------------

export interface ScenarioPreset {
  id: string
  /** 繁體中文顯示名稱 */
  name: string
  /** 繁體中文情境說明 */
  description: string
  config: SimulationConfig
}

// ----------------------------------------------------------
// Error
// ----------------------------------------------------------

export type SimulatorErrorType =
  | 'INVALID_CONFIG'
  | 'SIMULATION_ERROR'
  | 'TIMEOUT'
  | 'BINARY_NOT_FOUND'
  | 'NO_EXEC_PERMISSION'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR'

export interface SimulatorError {
  /**
   * Developer-facing diagnostic detail (English, free-form).
   * Never displayed to users directly — use `type` to look up a localized message.
   */
  error: string
  type: SimulatorErrorType
}
