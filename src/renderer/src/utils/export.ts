import type { SimulationResult, EventLogItem } from '../types'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}

// ── JSON export ───────────────────────────────────────────────

export function exportResultJSON(result: SimulationResult): void {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `nekoserve-result-${timestamp()}.json`)
}

// ── Metrics CSV ───────────────────────────────────────────────

const METRIC_LABELS: [keyof SimulationResult['metrics'], string][] = [
  ['totalCustomersArrived',  '總到達人數'],
  ['totalCustomersServed',   '完成服務人數'],
  ['abandonRate',            '放棄率'],
  ['catInteractionRate',     '貓咪互動率'],
  ['avgWaitForSeat',         '平均等待座位(分)'],
  ['avgWaitForOrder',        '平均等待點餐(分)'],
  ['avgTotalStayTime',       '平均總停留(分)'],
  ['seatUtilization',        '座位利用率'],
  ['staffUtilization',       '店員利用率'],
  ['catUtilization',         '貓咪利用率'],
]

const CONFIG_LABELS: [keyof SimulationResult['config'], string][] = [
  ['seatCount',                '座位數'],
  ['staffCount',               '店員數'],
  ['catCount',                 '貓咪數'],
  ['customerArrivalInterval',  '到達間隔(分)'],
  ['maxWaitTime',              '最大等待(分)'],
  ['orderTime',                '點餐時間(分)'],
  ['preparationTime',          '製作時間(分)'],
  ['diningTime',               '用餐時間(分)'],
  ['catInteractionTime',       '互動時間(分)'],
  ['catRestProbability',       '休息機率'],
  ['catRestDuration',          '休息時間(分)'],
  ['simulationDuration',       '模擬時長(分)'],
  ['randomSeed',               '隨機種子'],
]

function escapeCSV(value: unknown): string {
  const s = String(value)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function exportMetricsCSV(result: SimulationResult): void {
  const headers = [
    ...CONFIG_LABELS.map(([, label]) => label),
    ...METRIC_LABELS.map(([, label]) => label),
  ]
  const values = [
    ...CONFIG_LABELS.map(([key]) => escapeCSV(result.config[key])),
    ...METRIC_LABELS.map(([key]) => escapeCSV(result.metrics[key])),
  ]
  const csv = [headers.join(','), values.join(',')].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `nekoserve-metrics-${timestamp()}.csv`)
}

// ── Event log CSV ─────────────────────────────────────────────

const EVENT_LOG_HEADERS = ['時間(分)', '事件類型', '顧客ID', '資源', '描述']

export function exportEventLogCSV(events: EventLogItem[]): void {
  const rows = events.map((e) => [
    escapeCSV(e.timestamp.toFixed(2)),
    escapeCSV(e.eventType),
    escapeCSV(e.customerId > 0 ? `#${e.customerId}` : ''),
    escapeCSV(e.resourceId ?? ''),
    escapeCSV(e.description),
  ])
  const csv = [EVENT_LOG_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `nekoserve-eventlog-${timestamp()}.csv`)
}
