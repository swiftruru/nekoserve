import i18n from '@i18n/index'
import type { SimulationResult, EventLogItem, EventType } from '../types'

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
//
// CSV headers are always in English regardless of the UI language.
// This keeps exports Excel-compatible across locales and avoids
// encoding/mojibake issues when spreadsheets are shared across teams.

const METRIC_KEYS: (keyof SimulationResult['metrics'])[] = [
  'totalCustomersArrived',
  'totalCustomersServed',
  'abandonRate',
  'catInteractionRate',
  'avgWaitForSeat',
  'avgWaitForOrder',
  'avgTotalStayTime',
  'seatUtilization',
  'staffUtilization',
  'catUtilization',
]

const METRIC_HEADERS: Record<keyof SimulationResult['metrics'], string> = {
  totalCustomersArrived: 'total_customers_arrived',
  totalCustomersServed:  'total_customers_served',
  abandonRate:           'abandon_rate',
  catInteractionRate:    'cat_interaction_rate',
  avgWaitForSeat:        'avg_wait_for_seat_min',
  avgWaitForOrder:       'avg_wait_for_order_min',
  avgTotalStayTime:      'avg_total_stay_time_min',
  seatUtilization:       'seat_utilization',
  staffUtilization:      'staff_utilization',
  catUtilization:        'cat_utilization',
}

const CONFIG_KEYS: (keyof SimulationResult['config'])[] = [
  'seatCount',
  'staffCount',
  'catCount',
  'customerArrivalInterval',
  'maxWaitTime',
  'orderTime',
  'preparationTime',
  'diningTime',
  'catInteractionTime',
  'catRestProbability',
  'catRestDuration',
  'simulationDuration',
  'randomSeed',
]

const CONFIG_HEADERS: Record<keyof SimulationResult['config'], string> = {
  seatCount:               'seat_count',
  staffCount:              'staff_count',
  catCount:                'cat_count',
  customerArrivalInterval: 'customer_arrival_interval_min',
  maxWaitTime:             'max_wait_time_min',
  orderTime:               'order_time_min',
  preparationTime:         'preparation_time_min',
  diningTime:              'dining_time_min',
  catInteractionTime:      'cat_interaction_time_min',
  catRestProbability:      'cat_rest_probability',
  catRestDuration:         'cat_rest_duration_min',
  simulationDuration:      'simulation_duration_min',
  randomSeed:              'random_seed',
}

function escapeCSV(value: unknown): string {
  const s = String(value)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function exportMetricsCSV(result: SimulationResult): void {
  const headers = [
    ...CONFIG_KEYS.map((k) => CONFIG_HEADERS[k]),
    ...METRIC_KEYS.map((k) => METRIC_HEADERS[k]),
  ]
  const values = [
    ...CONFIG_KEYS.map((key) => escapeCSV(result.config[key])),
    ...METRIC_KEYS.map((key) => escapeCSV(result.metrics[key])),
  ]
  const csv = [headers.join(','), values.join(',')].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `nekoserve-metrics-${timestamp()}.csv`)
}

// ── Event log CSV ─────────────────────────────────────────────
//
// Column headers stay in English for portability; the description
// column is rendered through the current i18n locale (so users get a
// CSV whose text matches the UI they were looking at).

const EVENT_LOG_HEADERS = [
  'time_min',
  'event_type',
  'customer_id',
  'resource_id',
  'description',
]

function localizedEventDescription(e: EventLogItem): string {
  return i18n.t(`events:${e.eventType as EventType}` as const, {
    customerId: e.customerId,
    resourceId: e.resourceId ?? '',
    defaultValue: e.description ?? '',
  })
}

export function exportEventLogCSV(events: EventLogItem[]): void {
  const rows = events.map((e) => [
    escapeCSV(e.timestamp.toFixed(2)),
    escapeCSV(e.eventType),
    escapeCSV(e.customerId > 0 ? `#${e.customerId}` : ''),
    escapeCSV(e.resourceId ?? ''),
    escapeCSV(localizedEventDescription(e)),
  ])
  const csv = [EVENT_LOG_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `nekoserve-eventlog-${timestamp()}.csv`)
}
