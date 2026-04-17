import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventLogItem, EventType } from '../types'
import { exportEventLogCSV } from '../utils/export'
import { useToast } from '../hooks/useToast'

interface EventLogTableProps {
  events: EventLogItem[]
  initialFilter?: EventType[]
  highlightTime?: number
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

type SortColumn = 'timestamp' | 'eventType' | 'customerId'
type SortDirection = 'asc' | 'desc'

// ── Sort arrow SVG ────────────────────────────────────────
function SortArrow({ active, dir }: { active: boolean; dir: SortDirection }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={`inline-block ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
      <path
        d={dir === 'asc' ? 'M5 2 L8 6 L2 6 Z' : 'M5 8 L8 4 L2 4 Z'}
        fill="currentColor"
      />
    </svg>
  )
}

export default function EventLogTable({
  events,
  initialFilter,
  highlightTime,
  onRowClick,
}: EventLogTableProps) {
  const { t } = useTranslation(['eventLog', 'events', 'common'])
  const { toast } = useToast()

  // ── State ─────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    () => (initialFilter ? new Set(initialFilter) : new Set())
  )
  const [timeFrom, setTimeFrom] = useState<string>('')
  const [timeTo, setTimeTo] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [trackedCustomer, setTrackedCustomer] = useState<number | null>(null)
  const [jumpTime, setJumpTime] = useState('')

  useEffect(() => {
    if (initialFilter && initialFilter.length > 0) {
      setSelectedTypes(new Set(initialFilter))
    }
  }, [initialFilter])

  // ── Helpers ───────────────────────────────────────────────
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
    setTimeFrom('')
    setTimeTo('')
    setTrackedCustomer(null)
  }

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortColumn(null); setSortDir('asc') }
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
  }

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

  // ── Derived data ──────────────────────────────────────────
  const rendered = useMemo(
    () => events.map((e) => ({ e, description: describeEvent(e) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, t]
  )

  const timeRange = useMemo(() => {
    if (events.length === 0) return { min: 0, max: 0 }
    return { min: events[0].timestamp, max: events[events.length - 1].timestamp }
  }, [events])

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    const fromVal = timeFrom !== '' ? parseFloat(timeFrom) : null
    const toVal = timeTo !== '' ? parseFloat(timeTo) : null
    return rendered.filter(({ e, description }) => {
      const matchType = selectedTypes.size === 0 || selectedTypes.has(e.eventType)
      const matchSearch =
        !search ||
        description.toLowerCase().includes(searchLower) ||
        String(e.customerId).includes(searchLower) ||
        (e.resourceId ?? '').toLowerCase().includes(searchLower)
      const matchTime =
        (fromVal === null || e.timestamp >= fromVal) &&
        (toVal === null || e.timestamp <= toVal)
      const matchCustomer = trackedCustomer === null || e.customerId === trackedCustomer
      return matchType && matchSearch && matchTime && matchCustomer
    })
  }, [rendered, search, selectedTypes, timeFrom, timeTo, trackedCustomer])

  // Sort (separate from filter so CSV export uses filtered but unsorted)
  const sorted = useMemo(() => {
    if (!sortColumn) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'timestamp': return dir * (a.e.timestamp - b.e.timestamp)
        case 'eventType': return dir * labelForType(a.e.eventType).localeCompare(labelForType(b.e.eventType))
        case 'customerId': return dir * (a.e.customerId - b.e.customerId)
        default: return 0
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortColumn, sortDir, t])

  // Event type counts for statistics
  const typeCounts = useMemo(() => {
    const counts = new Map<EventType, number>()
    for (const { e } of filtered) {
      counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1)
    }
    return counts
  }, [filtered])

  // Journey lifecycle for tracked customer
  const journeySteps = useMemo(() => {
    if (trackedCustomer === null) return []
    return filtered.map(({ e }) => labelForType(e.eventType))
  }, [filtered, trackedCustomer, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Playback cursor highlight ─────────────────────────────
  const highlightedKey = useMemo(() => {
    if (highlightTime === undefined) return null
    let matched: number | null = null
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].e.timestamp <= highlightTime + 1e-6) {
        matched = i
      } else {
        break
      }
    }
    return matched
  }, [sorted, highlightTime])

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

  // ── Jump-to-time handler ──────────────────────────────────
  function handleJump() {
    const target = parseFloat(jumpTime)
    if (isNaN(target)) return
    const idx = sorted.findIndex(({ e }) => e.timestamp >= target - 1e-6)
    if (idx >= 0) {
      rowRefs.current.get(idx)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }

  const hasFilters = search || selectedTypes.size > 0 || timeFrom !== '' || timeTo !== '' || trackedCustomer !== null

  // ── Sortable header helper ────────────────────────────────
  function SortableHeader({ col, label, className }: { col: SortColumn; label: string; className?: string }) {
    const isActive = sortColumn === col
    return (
      <th scope="col" className={className} aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => toggleSort(col)}
          className="group flex items-center gap-0.5 text-xs font-semibold text-gray-500 dark:text-bark-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          {label}
          <SortArrow active={isActive} dir={isActive ? sortDir : 'asc'} />
        </button>
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Controls ──────────────────────────────────────── */}
      <div className="card">
        <div className="flex gap-3 items-start flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder={t('eventLog:searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              data-selectable
              aria-label={t('eventLog:searchLabel')}
            />
          </div>
          {/* Jump-to-time */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder={t('eventLog:jumpTime.placeholder')}
              value={jumpTime}
              onChange={(e) => setJumpTime(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJump() }}
              className="w-20 px-2 py-2 text-xs rounded-lg border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-700 dark:text-bark-200"
              data-selectable
            />
            <button type="button" onClick={handleJump} className="btn-secondary text-xs px-2 py-2">
              {t('eventLog:jumpTime.go')}
            </button>
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary text-sm">
              {t('eventLog:clearFilters')}
            </button>
          )}
        </div>

        {/* Type chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={selectedTypes.has(type)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                selectedTypes.has(type)
                  ? EVENT_TYPE_COLORS[type] + ' border-current'
                  : 'bg-gray-50 dark:bg-bark-700 text-gray-500 dark:text-bark-300 border-gray-200 dark:border-bark-500 hover:border-gray-400'
              }`}
            >
              {labelForType(type)}
            </button>
          ))}
        </div>

        {/* Time range filter */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-gray-400 dark:text-bark-400">
            {t('eventLog:column.time')}:
          </span>
          <span className="text-gray-400 dark:text-bark-400">{t('eventLog:timeRange.from')}</span>
          <input
            type="number"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            placeholder={timeRange.min.toFixed(1)}
            step="0.1"
            className="w-20 px-1.5 py-1 text-xs rounded border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-700 dark:text-bark-200 tabular-nums"
            data-selectable
          />
          <span className="text-gray-400 dark:text-bark-400">{t('eventLog:timeRange.to')}</span>
          <input
            type="number"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            placeholder={timeRange.max.toFixed(1)}
            step="0.1"
            className="w-20 px-1.5 py-1 text-xs rounded border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-700 dark:text-bark-200 tabular-nums"
            data-selectable
          />
          <span className="text-gray-300 dark:text-bark-500">{t('eventLog:timeRange.unit')}</span>
          {(timeFrom !== '' || timeTo !== '') && (
            <button
              type="button"
              onClick={() => { setTimeFrom(''); setTimeTo('') }}
              className="text-gray-400 hover:text-orange-500 transition-colors"
            >
              {t('eventLog:timeRange.reset')}
            </button>
          )}
        </div>

        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {t('eventLog:filterResultAnnounce', { count: filtered.length })}
        </div>
      </div>

      {/* ── Customer journey banner ───────────────────────── */}
      {trackedCustomer !== null && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-900/20 px-4 py-2.5 flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {t('eventLog:journey.tracking', { id: trackedCustomer })}
            </div>
            <div className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5 truncate">
              {journeySteps.join(' → ')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTrackedCustomer(null)}
            className="text-xs text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors shrink-0"
          >
            {t('eventLog:journey.clear')}
          </button>
        </div>
      )}

      {/* ── Event statistics ─────────────────────────────── */}
      <details className="rounded-xl border border-orange-100 dark:border-bark-600 bg-white dark:bg-bark-800 overflow-hidden">
        <summary className="px-4 py-2.5 text-xs font-semibold text-orange-700 dark:text-orange-400 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-bark-700/50 transition-colors select-none">
          {t('eventLog:stats.title')} ({t('eventLog:stats.total', { count: filtered.length })})
        </summary>
        <div className="px-4 py-2 border-t border-orange-50 dark:border-bark-600 flex flex-wrap gap-1.5">
          {ALL_EVENT_TYPES.filter((type) => (typeCounts.get(type) ?? 0) > 0).map((type) => (
            <span
              key={type}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${EVENT_TYPE_COLORS[type]}`}
            >
              {labelForType(type)} {typeCounts.get(type)}
            </span>
          ))}
        </div>
      </details>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100 dark:border-bark-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-bark-300">
              {t('eventLog:summary', { filtered: filtered.length, total: events.length })}
            </span>
            {trackedCustomer === null && (
              <span className="text-[10px] text-gray-300 dark:text-bark-500">
                {t('eventLog:journey.clickHint')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { exportEventLogCSV(filtered.map((r) => r.e)); toast(t('common:toast.exportSuccess')) }}
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
            <thead className="bg-orange-50 dark:bg-bark-800 sticky top-0 z-10">
              <tr>
                <SortableHeader col="timestamp" label={t('eventLog:column.time')} className="px-4 py-2.5 text-left w-20" />
                <SortableHeader col="eventType" label={t('eventLog:column.type')} className="px-4 py-2.5 text-left w-28" />
                <SortableHeader col="customerId" label={t('eventLog:column.customer')} className="px-4 py-2.5 text-left w-16" />
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-bark-300 w-24">
                  {t('eventLog:column.resource')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-bark-300">
                  {t('eventLog:column.description')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-bark-600">
              {sorted.map(({ e, description }, i) => {
                const isHighlight = i === highlightedKey
                const baseClass = isHighlight
                  ? 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-400 ring-inset'
                  : 'hover:bg-orange-50/50 dark:hover:bg-bark-700/50'
                return (
                  <tr
                    key={i}
                    data-cursor={onRowClick ? 'pointer' : undefined}
                    className={`transition-colors ${baseClass}`}
                    ref={(node) => {
                      if (node) rowRefs.current.set(i, node)
                      else rowRefs.current.delete(i)
                    }}
                    onClick={onRowClick ? () => onRowClick(e.timestamp) : undefined}
                    onKeyDown={onRowClick ? (ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        onRowClick(e.timestamp)
                      }
                    } : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    <td className="px-4 py-2 font-mono text-gray-600 dark:text-bark-300">
                      {e.timestamp.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[e.eventType]}`}>
                        {labelForType(e.eventType)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {e.customerId > 0 ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setTrackedCustomer((prev) => prev === e.customerId ? null : e.customerId)
                          }}
                          className={`text-xs font-medium transition-colors ${
                            trackedCustomer === e.customerId
                              ? 'text-blue-600 dark:text-blue-400 underline'
                              : 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline'
                          }`}
                        >
                          #{e.customerId}
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-bark-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-bark-300 text-xs">
                      {e.resourceId ? formatResourceId(e.resourceId) : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-bark-100" data-selectable>
                      {description}
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-bark-400">
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
