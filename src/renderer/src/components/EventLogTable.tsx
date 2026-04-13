import { useState, useMemo, useEffect } from 'react'
import type { EventLogItem, EventType } from '../types'
import { exportEventLogCSV } from '../utils/export'

interface EventLogTableProps {
  events: EventLogItem[]
  initialFilter?: EventType[]
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  CUSTOMER_ARRIVE:              '顧客到達',
  CUSTOMER_WAIT_SEAT:           '等待座位',
  CUSTOMER_SEATED:              '入座',
  CUSTOMER_ORDER:               '點餐',
  ORDER_START_PREPARE:          '開始製作',
  ORDER_READY:                  '餐點完成',
  CUSTOMER_START_DINING:        '開始用餐',
  CUSTOMER_FINISH_DINING:       '用餐完畢',
  CUSTOMER_WAIT_CAT:            '等待貓咪',
  CUSTOMER_START_CAT_INTERACTION: '開始互動',
  CUSTOMER_FINISH_CAT_INTERACTION: '完成互動',
  CUSTOMER_LEAVE:               '離開',
  CUSTOMER_ABANDON:             '放棄離開',
  CAT_START_REST:               '貓咪休息',
  CAT_END_REST:                 '休息結束',
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  CUSTOMER_ARRIVE:              'bg-blue-100 text-blue-700',
  CUSTOMER_WAIT_SEAT:           'bg-yellow-100 text-yellow-700',
  CUSTOMER_SEATED:              'bg-green-100 text-green-700',
  CUSTOMER_ORDER:               'bg-purple-100 text-purple-700',
  ORDER_START_PREPARE:          'bg-purple-100 text-purple-700',
  ORDER_READY:                  'bg-green-100 text-green-700',
  CUSTOMER_START_DINING:        'bg-orange-100 text-orange-700',
  CUSTOMER_FINISH_DINING:       'bg-orange-100 text-orange-700',
  CUSTOMER_WAIT_CAT:            'bg-pink-100 text-pink-700',
  CUSTOMER_START_CAT_INTERACTION: 'bg-pink-200 text-pink-800',
  CUSTOMER_FINISH_CAT_INTERACTION: 'bg-pink-100 text-pink-700',
  CUSTOMER_LEAVE:               'bg-gray-100 text-gray-600',
  CUSTOMER_ABANDON:             'bg-red-100 text-red-700',
  CAT_START_REST:               'bg-indigo-100 text-indigo-700',
  CAT_END_REST:                 'bg-indigo-100 text-indigo-600',
}

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export default function EventLogTable({ events, initialFilter }: EventLogTableProps) {
  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    () => (initialFilter ? new Set(initialFilter) : new Set())
  )

  useEffect(() => {
    if (initialFilter && initialFilter.length > 0) {
      setSelectedTypes(new Set(initialFilter))
    }
  }, [initialFilter])

  function toggleType(type: EventType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setSelectedTypes(new Set())
  }

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchType = selectedTypes.size === 0 || selectedTypes.has(e.eventType)
      const searchLower = search.toLowerCase()
      const matchSearch =
        !search ||
        e.description.toLowerCase().includes(searchLower) ||
        String(e.customerId).includes(searchLower) ||
        (e.resourceId ?? '').toLowerCase().includes(searchLower)
      return matchType && matchSearch
    })
  }, [events, search, selectedTypes])

  const hasFilters = search || selectedTypes.size > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="card">
        <div className="flex gap-3 items-start flex-wrap">
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder="搜尋描述、顧客編號、資源名稱…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              data-selectable
            />
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary text-sm">
              清除篩選
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                selectedTypes.has(type)
                  ? EVENT_TYPE_COLORS[type] + ' border-current'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {EVENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            顯示 {filtered.length} / {events.length} 筆事件
          </span>
          <button
            type="button"
            onClick={() => exportEventLogCSV(filtered)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            ⬇ 匯出 CSV
          </button>
        </div>

        <div className="event-log-scroll overflow-y-auto" style={{ maxHeight: '55vh' }}>
          <table className="w-full text-sm">
            <thead className="bg-orange-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-20">時間(分)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-28">事件類型</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-16">顧客</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-24">資源</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e, i) => (
                <tr key={i} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-4 py-2 font-mono text-gray-600">
                    {e.timestamp.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[e.eventType]}`}>
                      {EVENT_TYPE_LABELS[e.eventType]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {e.customerId > 0 ? `#${e.customerId}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {e.resourceId ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700" data-selectable>
                    {e.description}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    沒有符合條件的事件
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
