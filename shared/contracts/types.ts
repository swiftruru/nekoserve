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
}

export interface SimulationResult {
  config: SimulationConfig
  metrics: MetricSummary
  eventLog: EventLogItem[]
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
