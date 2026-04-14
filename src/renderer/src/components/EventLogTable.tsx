import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventLogItem, EventType } from '../types'
import { exportEventLogCSV } from '../utils/export'

interface EventLogTableProps {
  events: EventLogItem[]
  initialFilter?: EventType[]
  /** Shared playback cursor — drives row highlight + auto-scroll. */
  highlightTime?: number
  /** Click handler for a row: seeks Playback to the row's timestamp. */
  onRowClick?: (timestamp: number) => void
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
  CUSTOMER_LEAVE:               'bg-gray-100 text-gray-600',
  CUSTOMER_ABANDON:             'bg-red-100 text-red-700',
  CAT_VISIT_SEAT:               'bg-pink-200 text-pink-800',
  CAT_LEAVE_SEAT:               'bg-pink-100 text-pink-700',
  CAT_START_REST:               'bg-indigo-100 text-indigo-700',
  CAT_END_REST:                 'bg-indigo-100 text-indigo-600',
}

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_COLORS) as EventType[]

const HIGHLIGHT_SCROLL_DEBOUNCE_MS = 150

export default function EventLogTable({
  events,
  initialFilter,
  highlightTime,
  onRowClick,
}: EventLogTableProps) {
  const { t } = useTranslation(['eventLog', 'events', 'common'])
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

  // Translate language-neutral resource ids ("cat-3", "seat-1") and
  // their legacy zh-TW forms ("貓-3", "座位-1") into the active locale's
  // display form ("Cat #3" / "Seat #1" / "貓 #3" / "座位 #1"). Returns
  // the raw id unchanged if it doesn't match a known pattern.
  function formatResourceId(raw: string | undefined): string {
    if (!raw) return ''
    const catMatch = raw.match(/^(?:cat|貓)-(\d+)$/)
    if (catMatch) return t('events:resource.cat', { n: catMatch[1] })
    const seatMatch = raw.match(/^(?:seat|座位)-(\d+)$/)
    if (seatMatch) return t('events:resource.seat', { n: seatMatch[1] })
    return raw
  }

  function describeEvent(e: EventLogItem): string {
    return t(`events:${e.eventType}` as const, {
      customerId: e.customerId,
      resourceId: formatResourceId(e.resourceId),
      defaultValue: e.description ?? '',
    })
  }

  function labelForType(type: EventType): string {
    return t(`events:label.${type}` as const)
  }

  // Pre-render descriptions so search (and re-render on language change) stays consistent
  const rendered = useMemo(
    () => events.map((e) => ({ e, description: describeEvent(e) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, t]
  )

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    return rendered.filter(({ e, description }) => {
      const matchType = selectedTypes.size === 0 || selectedTypes.has(e.eventType)
      const matchSearch =
        !search ||
        description.toLowerCase().includes(searchLower) ||
        String(e.customerId).includes(searchLower) ||
        (e.resourceId ?? '').toLowerCase().includes(searchLower)
      return matchType && matchSearch
    })
  }, [rendered, search, selectedTypes])

  // ── Playback-cursor highlight ─────────────────────────────
  // Find the last filtered row whose timestamp is ≤ highlightTime. That's
  // the "current" event in the animation. Binary search is overkill for
  // these sizes — linear scan in a memo is fine.
  const highlightedKey = useMemo(() => {
    if (highlightTime === undefined) return null
    let matched: number | null = null
    for (let i = 0; i < filtered.length; i += 1) {
      if (filtered[i].e.timestamp <= highlightTime + 1e-6) {
        matched = i
      } else {
        break
      }
    }
    return matched
  }, [filtered, highlightTime])

  // Auto-scroll the highlighted row into view, debounced so rAF-driven
  // playback updates don't thrash the scroll container.
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map())
  const scrollTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (highlightedKey === null) return
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current)
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const row = rowRefs.current.get(highlightedKey)
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, HIGHLIGHT_SCROLL_DEBOUNCE_MS)
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current)
      }
    }
  }, [highlightedKey])

  const hasFilters = search || selectedTypes.size > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="card">
        <div className="flex gap-3 items-start flex-wrap">
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder={t('eventLog:searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              data-selectable
            />
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary text-sm">
              {t('eventLog:clearFilters')}
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
              {labelForType(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {t('eventLog:summary', { filtered: filtered.length, total: events.length })}
          </span>
          <button
            type="button"
            onClick={() => exportEventLogCSV(filtered.map((r) => r.e))}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('eventLog:exportCsv')}
          </button>
        </div>

        <div
          ref={scrollRef}
          className="event-log-scroll overflow-y-auto"
          style={{ maxHeight: '55vh' }}
        >
          <table className="w-full text-sm">
            <thead className="bg-orange-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-20">
                  {t('eventLog:column.time')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-28">
                  {t('eventLog:column.type')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-16">
                  {t('eventLog:column.customer')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-24">
                  {t('eventLog:column.resource')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                  {t('eventLog:column.description')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(({ e, description }, i) => {
                const isHighlight = i === highlightedKey
                const baseClass = isHighlight
                  ? 'bg-orange-100 ring-2 ring-orange-400 ring-inset'
                  : 'hover:bg-orange-50/50'
                const rowClass = `transition-colors ${baseClass} ${
                  onRowClick ? '' : ''
                }`
                return (
                  <tr
                    key={i}
                    data-cursor={onRowClick ? 'pointer' : undefined}
                    className={rowClass}
                    ref={(node) => {
                      if (node) rowRefs.current.set(i, node)
                      else rowRefs.current.delete(i)
                    }}
                    onClick={onRowClick ? () => onRowClick(e.timestamp) : undefined}
                  >
                    <td className="px-4 py-2 font-mono text-gray-600">
                      {e.timestamp.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[e.eventType]}`}>
                        {labelForType(e.eventType)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {e.customerId > 0 ? `#${e.customerId}` : '–'}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {e.resourceId ? formatResourceId(e.resourceId) : '–'}
                    </td>
                    <td className="px-4 py-2 text-gray-700" data-selectable>
                      {description}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    {t('eventLog:empty')}
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
