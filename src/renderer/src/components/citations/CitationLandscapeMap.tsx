import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CITATIONS, citationShort, citationUrl, type Citation } from '../../data/citations'

/**
 * Three-tier landscape of the 8 citations that power NekoServe. Classic
 * theory on top, service-science empirics in the middle, cat-cafe
 * ethology + welfare at the bottom, and a single "NekoServe" capstone
 * node under them all. Hovering a citation highlights its tier and
 * dims the rest so the reader can see the layered dependency at a glance.
 *
 * Pure SVG + Tailwind + React state. No external diagram library.
 */

type Tier = 'classical' | 'empirical' | 'cat-cafe'

interface LandscapeNode {
  key: string
  tier: Tier
  x: number
  y: number
}

const VB_W = 820
const VB_H = 420
const NODE_W = 170
const NODE_H = 52

const NODES: LandscapeNode[] = [
  // Tier 1: classical theory (top)
  { key: 'little1961proof',     tier: 'classical', x: 110, y: 50 },
  { key: 'ancker1963balking1',  tier: 'classical', x: 320, y: 50 },
  { key: 'ancker1963balking2',  tier: 'classical', x: 540, y: 50 },

  // Tier 2: empirical service science (middle)
  { key: 'hasugian2020analysis',tier: 'empirical', x: 90,  y: 170 },
  { key: 'dbeis2024enhancing',  tier: 'empirical', x: 320, y: 170 },
  { key: 'li2025attributes',    tier: 'empirical', x: 550, y: 170 },

  // Tier 3: cat-cafe ethology + welfare (bottom)
  { key: 'hirsch2025cats',      tier: 'cat-cafe',  x: 210, y: 290 },
  { key: 'ropski2023analysis',  tier: 'cat-cafe',  x: 460, y: 290 },
]

const TIER_FILL: Record<Tier, string> = {
  classical: '#e0e7ff',  // indigo-100
  empirical: '#fef3c7',  // amber-100
  'cat-cafe': '#fce7f3', // pink-100
}
const TIER_STROKE: Record<Tier, string> = {
  classical: '#6366f1',  // indigo-500
  empirical: '#f59e0b',  // amber-500
  'cat-cafe': '#ec4899', // pink-500
}

const CAPSTONE = { x: 310, y: 360, w: 200, h: 40 }

export default function CitationLandscapeMap() {
  const { t } = useTranslation('citations')
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const hoveredTier: Tier | null = hovered
    ? (NODES.find((n) => n.key === hovered)?.tier ?? null)
    : null

  // Close the popover when clicking outside the landscape wrapper or
  // pressing Escape. Both listeners attach only while a node is open.
  useEffect(() => {
    if (!selected) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setSelected(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [selected])

  const selectedNode = selected ? NODES.find((n) => n.key === selected) ?? null : null
  const selectedCitation = selected ? CITATIONS[selected] : null

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50 dark:bg-bark-900/40 p-3"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('story.landscape.ariaLabel')}
      >
        {/* Tier labels on the left */}
        <TierLabel y={76}  text={t('story.landscape.tierClassical')} color={TIER_STROKE.classical} />
        <TierLabel y={196} text={t('story.landscape.tierEmpirical')} color={TIER_STROKE.empirical} />
        <TierLabel y={316} text={t('story.landscape.tierCatCafe')}  color={TIER_STROKE['cat-cafe']} />

        {/* Dashed down-arrows connecting each node to the capstone. */}
        {NODES.map((n) => {
          const dim =
            hovered !== null && n.tier !== hoveredTier && n.key !== hovered
          return (
            <line
              key={`arrow-${n.key}`}
              x1={n.x + NODE_W / 2}
              y1={n.y + NODE_H}
              x2={CAPSTONE.x + CAPSTONE.w / 2}
              y2={CAPSTONE.y}
              stroke={TIER_STROKE[n.tier]}
              strokeWidth="1.2"
              strokeDasharray="3,3"
              opacity={dim ? 0.12 : 0.55}
              className="neko-arrow-flow"
              style={{ transition: 'opacity 200ms ease-out' }}
            />
          )
        })}

        {/* Citation nodes */}
        {NODES.map((n, i) => {
          const c = CITATIONS[n.key]
          if (!c) return null
          const dim =
            hovered !== null && n.tier !== hoveredTier && n.key !== hovered
          const isSelected = selected === n.key
          return (
            <g
              key={n.key}
              transform={`translate(${n.x}, ${n.y})`}
              style={{
                transition: 'opacity 200ms ease-out',
                cursor: 'pointer',
                animationDelay: `${i * 120}ms`,
              }}
              opacity={dim ? 0.25 : 1}
              className="neko-node-fade-in"
              onMouseEnter={() => setHovered(n.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(n.key)}
              onBlur={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation()
                setSelected((prev) => (prev === n.key ? null : n.key))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected((prev) => (prev === n.key ? null : n.key))
                }
              }}
              tabIndex={0}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx="10"
                fill={TIER_FILL[n.tier]}
                stroke={isSelected ? '#c2410c' : TIER_STROKE[n.tier]}
                strokeWidth={isSelected ? 3 : hovered === n.key ? 2 : 1}
              />
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 - 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#1f2937"
              >
                {citationShort(c)}
              </text>
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 + 12}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {shortTitle(c)}
              </text>
            </g>
          )
        })}

        {/* Capstone node: NekoServe */}
        <g transform={`translate(${CAPSTONE.x}, ${CAPSTONE.y})`}>
          <rect
            width={CAPSTONE.w}
            height={CAPSTONE.h}
            rx="10"
            fill="#fb923c"
            stroke="#c2410c"
            strokeWidth="1.5"
          />
          <text
            x={CAPSTONE.w / 2}
            y={CAPSTONE.h / 2 + 4}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="#ffffff"
          >
            🐾 NekoServe
          </text>
        </g>
      </svg>

      <p className="mt-2 text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug text-center">
        {t('story.landscape.hoverHint')}
      </p>

      {/* Floating popover anchored near the clicked node. Positioned as
          a percentage of the SVG viewBox so it follows the responsive
          layout. Uses a pointer triangle pseudo-element via inline SVG
          for a tiny visual tie-in with the node. */}
      {selectedNode && selectedCitation && (
        <NodePopover
          node={selectedNode}
          citation={selectedCitation}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function NodePopover({
  node,
  citation,
  onClose,
}: {
  node: LandscapeNode
  citation: Citation
  onClose: () => void
}) {
  const { t } = useTranslation('citations')
  // Panel geometry: 280px wide. Anchor under the node; if the node is
  // in the bottom tier we flip the panel above to avoid overflowing.
  const anchorXPct = ((node.x + NODE_W / 2) / VB_W) * 100
  const anchorYPct = ((node.y + NODE_H) / VB_H) * 100
  const flipAbove = node.tier === 'cat-cafe'

  const kind = t(`story.landscape.details.${node.key}.kind`)
  const contribution = t(`story.landscape.details.${node.key}.contribution`)

  return (
    <div
      className="absolute z-10 w-[280px] max-w-[90%] rounded-xl shadow-lg ring-1 ring-orange-200 dark:ring-bark-500 bg-white dark:bg-bark-700 p-3"
      role="dialog"
      aria-label={citationShort(citation)}
      style={{
        left: `${anchorXPct}%`,
        top: flipAbove ? undefined : `${anchorYPct}%`,
        bottom: flipAbove ? `${100 - anchorYPct + 8}%` : undefined,
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
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-0.5">
            {t('story.landscape.kindLabel')}
          </div>
          <p className="text-gray-700 dark:text-bark-200">{kind}</p>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-0.5">
            {t('story.landscape.contributionLabel')}
          </div>
          <p className="text-gray-700 dark:text-bark-200">{contribution}</p>
        </div>
      </div>
    </div>
  )
}

function TierLabel({
  y,
  text,
  color,
}: {
  y: number
  text: string
  color: string
}) {
  return (
    <text
      x={14}
      y={y}
      fontSize="10"
      fontWeight="700"
      fill={color}
      letterSpacing="1"
    >
      {text}
    </text>
  )
}

/**
 * Short 2~3 word description for the landscape node's subtitle. Keeps
 * the SVG nodes legible even at low zoom. We don't localize this on
 * purpose; the short APA form above already carries the locale-sensitive
 * author + year.
 */
function shortTitle(c: Citation): string {
  switch (c.key) {
    case 'little1961proof':      return "Little's Law"
    case 'ancker1963balking1':   return 'Balking & reneging I'
    case 'ancker1963balking2':   return 'Balking & reneging II'
    case 'hasugian2020analysis': return 'Fast-food arrival'
    case 'dbeis2024enhancing':   return 'Reneging in M/M/1'
    case 'li2025attributes':     return 'Pet-café satisfaction'
    case 'hirsch2025cats':       return 'Cat-café ethogram'
    case 'ropski2023analysis':   return 'Cat welfare & stay'
    default:                     return c.key
  }
}
