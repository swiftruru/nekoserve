import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CITATIONS, citationShort, citationUrl, type Citation } from '../../data/citations'
import { PARAMETER_META } from '../../data/parameterMeta'
import type { ParameterWithSource } from '../../types/ParameterWithSource'

/**
 * Tree layout: NekoServe on top → 4 source-paper hubs in a row →
 * each hub's parameter chips stacked vertically below. Columns are
 * sized by the largest group so nothing overlaps no matter how the
 * per-paper counts move around.
 */

const VB_W = 900
const CAPSTONE_W = 160
const CAPSTONE_H = 38
const HUB_W = 180
const HUB_H = 46
const PARAM_W = 160
const PARAM_H = 32
const COL_GAP = 12
const ROW_GAP = 8

const ROOT_Y = 16
const HUB_Y = 96
const PARAM_START_Y = HUB_Y + HUB_H + 24

const HUB_COLOR: Record<string, { fill: string; stroke: string }> = {
  hirsch2025cats:      { fill: '#fce7f3', stroke: '#ec4899' },
  dbeis2024enhancing:  { fill: '#fef3c7', stroke: '#f59e0b' },
  little1961proof:     { fill: '#e0e7ff', stroke: '#6366f1' },
  ancker1963balking1:  { fill: '#e0e7ff', stroke: '#6366f1' },
}

interface Column {
  citationKey: string
  paramKeys: string[]
  x: number
  width: number
}

export default function CitationParameterRadial() {
  const { t } = useTranslation('citations')
  const [hoveredHub, setHoveredHub] = useState<string | null>(null)
  const [hoveredParam, setHoveredParam] = useState<string | null>(null)
  const [selectedParam, setSelectedParam] = useState<string | null>(null)
  const [selectedHub, setSelectedHub] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Group params by source, sort columns by descending count so the
  // wide column sits closest to the capstone.
  const columns = useMemo<Column[]>(() => {
    const bucket: Record<string, string[]> = {}
    for (const [paramKey, meta] of Object.entries(PARAMETER_META)) {
      const k = meta.source.key
      ;(bucket[k] ||= []).push(paramKey)
    }
    const sorted = Object.entries(bucket).sort((a, b) => b[1].length - a[1].length)
    const colWidth = Math.max(HUB_W, PARAM_W) + COL_GAP * 2
    const totalW = sorted.length * colWidth
    const offsetX = (VB_W - totalW) / 2
    return sorted.map(([citationKey, paramKeys], i) => ({
      citationKey,
      paramKeys,
      x: offsetX + i * colWidth + colWidth / 2,
      width: colWidth,
    }))
  }, [])

  const maxParams = Math.max(...columns.map((c) => c.paramKeys.length), 1)
  const vbH = PARAM_START_Y + maxParams * (PARAM_H + ROW_GAP) + 20

  const rootX = VB_W / 2

  useEffect(() => {
    if (!selectedParam && !selectedHub) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) {
        setSelectedParam(null)
        setSelectedHub(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedParam(null)
        setSelectedHub(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedParam, selectedHub])

  function paramActive(paramKey: string, hubKey: string): boolean {
    if (hoveredHub) return hubKey === hoveredHub
    if (hoveredParam) return paramKey === hoveredParam
    return true
  }
  function hubActive(hubKey: string): boolean {
    if (hoveredHub) return hubKey === hoveredHub
    if (hoveredParam) {
      const col = columns.find((c) => c.paramKeys.includes(hoveredParam))
      return col?.citationKey === hubKey
    }
    return true
  }

  const selectedMeta = selectedParam ? PARAMETER_META[selectedParam as keyof typeof PARAMETER_META] : null
  const selectedCitation = selectedMeta ? selectedMeta.source : null
  const selectedPos = useMemo(() => {
    if (!selectedParam) return null
    for (const col of columns) {
      const idx = col.paramKeys.indexOf(selectedParam)
      if (idx >= 0) {
        return {
          x: col.x,
          y: PARAM_START_Y + idx * (PARAM_H + ROW_GAP) + PARAM_H / 2,
        }
      }
    }
    return null
  }, [selectedParam, columns])

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50 dark:bg-bark-900/40 p-3"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${vbH}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('story.radial.ariaLabel')}
      >
        {/* Root → hub connectors */}
        {columns.map((col) => {
          const faded = !hubActive(col.citationKey)
          const color = HUB_COLOR[col.citationKey]?.stroke ?? '#9ca3af'
          const x1 = rootX
          const y1 = ROOT_Y + CAPSTONE_H
          const x2 = col.x
          const y2 = HUB_Y
          const mid = (y1 + y2) / 2
          return (
            <path
              key={`root-${col.citationKey}`}
              d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity={faded ? 0.15 : 0.7}
              style={{ transition: 'opacity 200ms ease-out' }}
            />
          )
        })}

        {/* Hub → param vertical spokes */}
        {columns.map((col) =>
          col.paramKeys.map((pk, i) => {
            const faded = !paramActive(pk, col.citationKey)
            const color = HUB_COLOR[col.citationKey]?.stroke ?? '#9ca3af'
            const y2 = PARAM_START_Y + i * (PARAM_H + ROW_GAP) + PARAM_H / 2
            return (
              <line
                key={`spoke-${pk}`}
                x1={col.x}
                y1={HUB_Y + HUB_H}
                x2={col.x}
                y2={y2}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2,3"
                opacity={faded ? 0.12 : 0.5}
                style={{ transition: 'opacity 200ms ease-out' }}
              />
            )
          }),
        )}

        {/* Capstone: NekoServe */}
        <g transform={`translate(${rootX - CAPSTONE_W / 2}, ${ROOT_Y})`}>
          <rect width={CAPSTONE_W} height={CAPSTONE_H} rx="10" fill="#fb923c" stroke="#c2410c" strokeWidth="1.5" />
          <text x={CAPSTONE_W / 2} y={CAPSTONE_H / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">
            🐾 NekoServe
          </text>
        </g>

        {/* Hubs */}
        {columns.map((col) => {
          const c = CITATIONS[col.citationKey]
          if (!c) return null
          const faded = !hubActive(col.citationKey)
          const isHovered = hoveredHub === col.citationKey
          const isSelected = selectedHub === col.citationKey
          const color = HUB_COLOR[col.citationKey] ?? { fill: '#f3f4f6', stroke: '#9ca3af' }
          return (
            <g
              key={`hub-${col.citationKey}`}
              transform={`translate(${col.x - HUB_W / 2}, ${HUB_Y})`}
              style={{ transition: 'opacity 200ms ease-out', cursor: 'pointer' }}
              opacity={faded ? 0.35 : 1}
              onMouseEnter={() => setHoveredHub(col.citationKey)}
              onMouseLeave={() => setHoveredHub(null)}
              onFocus={() => setHoveredHub(col.citationKey)}
              onBlur={() => setHoveredHub(null)}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedParam(null)
                setSelectedHub((prev) => (prev === col.citationKey ? null : col.citationKey))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedParam(null)
                  setSelectedHub((prev) => (prev === col.citationKey ? null : col.citationKey))
                }
              }}
              tabIndex={0}
            >
              <rect
                width={HUB_W}
                height={HUB_H}
                rx="10"
                fill={color.fill}
                stroke={isSelected ? '#c2410c' : color.stroke}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
              />
              <text x={HUB_W / 2} y={HUB_H / 2 - 3} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1f2937">
                {citationShort(c)}
              </text>
              <text x={HUB_W / 2} y={HUB_H / 2 + 12} textAnchor="middle" fontSize="10" fill="#6b7280">
                {t('story.radial.paramCount', { count: col.paramKeys.length })}
              </text>
            </g>
          )
        })}

        {/* Param chips stacked */}
        {columns.map((col) =>
          col.paramKeys.map((pk, i) => {
            const meta = PARAMETER_META[pk as keyof typeof PARAMETER_META]
            const faded = !paramActive(pk, col.citationKey)
            const selected = selectedParam === pk
            const y = PARAM_START_Y + i * (PARAM_H + ROW_GAP)
            return (
              <g
                key={pk}
                transform={`translate(${col.x - PARAM_W / 2}, ${y})`}
                style={{
                  transition: 'opacity 200ms ease-out',
                  cursor: 'pointer',
                  animationDelay: `${i * 40}ms`,
                }}
                opacity={faded ? 0.2 : 1}
                className="neko-node-fade-in"
                onMouseEnter={() => setHoveredParam(pk)}
                onMouseLeave={() => setHoveredParam(null)}
                onFocus={() => setHoveredParam(pk)}
                onBlur={() => setHoveredParam(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedHub(null)
                  setSelectedParam((prev) => (prev === pk ? null : pk))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedHub(null)
                    setSelectedParam((prev) => (prev === pk ? null : pk))
                  }
                }}
                tabIndex={0}
              >
                <rect
                  width={PARAM_W}
                  height={PARAM_H}
                  rx="8"
                  fill="#ffffff"
                  stroke={selected ? '#c2410c' : HUB_COLOR[col.citationKey]?.stroke ?? '#9ca3af'}
                  strokeWidth={selected ? 2.2 : 1}
                />
                <text x={PARAM_W / 2} y={PARAM_H / 2 - 2} textAnchor="middle" fontSize="10" fontWeight="600" fill="#1f2937">
                  {pk}
                </text>
                <text x={PARAM_W / 2} y={PARAM_H / 2 + 11} textAnchor="middle" fontSize="9" fill="#6b7280">
                  {formatValue(meta?.value, meta?.unit)}
                </text>
              </g>
            )
          }),
        )}
      </svg>

      <p className="mt-2 text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug text-center">
        {t('story.radial.hoverHint')}
      </p>

      {selectedParam && selectedMeta && selectedCitation && selectedPos && (
        <ParamPopover
          paramKey={selectedParam}
          meta={selectedMeta}
          citation={selectedCitation}
          x={selectedPos.x}
          y={selectedPos.y}
          vbH={vbH}
          onClose={() => setSelectedParam(null)}
        />
      )}
      {selectedHub && (() => {
        const col = columns.find((c) => c.citationKey === selectedHub)
        const citation = CITATIONS[selectedHub]
        if (!col || !citation) return null
        return (
          <HubPopover
            citation={citation}
            paramKeys={col.paramKeys}
            x={col.x}
            y={HUB_Y + HUB_H}
            vbH={vbH}
            onClose={() => setSelectedHub(null)}
          />
        )
      })()}
    </div>
  )
}

function HubPopover({
  citation,
  paramKeys,
  x,
  y,
  vbH,
  onClose,
}: {
  citation: Citation
  paramKeys: string[]
  x: number
  y: number
  vbH: number
  onClose: () => void
}) {
  const { t } = useTranslation('citations')
  const anchorXPct = (x / VB_W) * 100
  const anchorYPct = (y / vbH) * 100
  const kind = t(`story.landscape.details.${citation.key}.kind`, { defaultValue: '' })
  const contribution = t(`story.landscape.details.${citation.key}.contribution`, { defaultValue: '' })

  return (
    <div
      className="absolute z-10 w-[320px] max-w-[92%] rounded-xl shadow-lg ring-1 ring-orange-200 dark:ring-bark-500 bg-white dark:bg-bark-700 p-3"
      role="dialog"
      aria-label={citationShort(citation)}
      style={{
        left: `${anchorXPct}%`,
        top: `${anchorYPct}%`,
        transform: 'translate(-50%, 8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-xs font-bold text-orange-700 dark:text-orange-400">
            {citationShort(citation)}
          </div>
          <div className="text-[11px] text-gray-700 dark:text-bark-200 leading-snug mt-0.5 mb-1">
            {citation.title}
          </div>
          <a
            href={citationUrl(citation)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-amber-700 dark:text-amber-400 underline decoration-dotted"
            onClick={(e) => e.stopPropagation()}
          >
            DOI: {citation.doi}
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 leading-none p-1"
          aria-label={t('story.landscape.close')}
        >
          ✕
        </button>
      </div>
      <div className="space-y-2 text-[11px] leading-relaxed">
        {kind && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-0.5">
              {t('story.landscape.kindLabel')}
            </div>
            <p className="text-gray-700 dark:text-bark-200">{kind}</p>
          </div>
        )}
        {contribution && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-0.5">
              {t('story.landscape.contributionLabel')}
            </div>
            <p className="text-gray-700 dark:text-bark-200">{contribution}</p>
          </div>
        )}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-0.5">
            {t('story.radial.paramsListLabel')}
          </div>
          <div className="flex flex-wrap gap-1">
            {paramKeys.map((pk) => (
              <span
                key={pk}
                className="rounded bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 font-mono text-[10px]"
              >
                {pk}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ParamPopover({
  paramKey,
  meta,
  citation,
  x,
  y,
  vbH,
  onClose,
}: {
  paramKey: string
  meta: ParameterWithSource<number>
  citation: Citation
  x: number
  y: number
  vbH: number
  onClose: () => void
}) {
  const { t } = useTranslation('citations')
  const anchorXPct = (x / VB_W) * 100
  const anchorYPct = (y / vbH) * 100
  const flipAbove = y > vbH * 0.55

  return (
    <div
      className="absolute z-10 w-[280px] max-w-[90%] rounded-xl shadow-lg ring-1 ring-orange-200 dark:ring-bark-500 bg-white dark:bg-bark-700 p-3"
      role="dialog"
      aria-label={paramKey}
      style={{
        left: `${anchorXPct}%`,
        top: flipAbove ? undefined : `${anchorYPct}%`,
        bottom: flipAbove ? `${100 - anchorYPct + 4}%` : undefined,
        transform: 'translate(-50%, 8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-xs font-bold text-orange-700 dark:text-orange-400 font-mono">
            {paramKey}
          </div>
          <div className="text-[11px] text-gray-700 dark:text-bark-200 leading-snug mt-0.5">
            {formatValue(meta.value, meta.unit)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 leading-none p-1"
          aria-label={t('story.landscape.close')}
        >
          ✕
        </button>
      </div>
      {meta.note && (
        <p className="text-[11px] leading-relaxed text-gray-700 dark:text-bark-200 mb-2">
          {meta.note}
        </p>
      )}
      <div className="text-[10px] text-gray-500 dark:text-bark-400">
        {t('story.radial.sourceLabel')}:{' '}
        <a
          href={citationUrl(citation)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-amber-700 dark:text-amber-400 underline decoration-dotted"
          onClick={(e) => e.stopPropagation()}
        >
          {citationShort(citation)}
        </a>
      </div>
    </div>
  )
}

function formatValue(value: number | undefined, unit: string | undefined): string {
  if (value === undefined) return ''
  return `${value} ${unit ?? ''}`.trim()
}
