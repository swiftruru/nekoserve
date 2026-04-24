import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HIRSCH_2025_BENCHMARK } from '../../validation/benchmarks'
import { CITATIONS, citationShort, citationUrl } from '../../data/citations'
import { renderWithTerms } from '../results/TermTooltip'
import { InlineMath } from '../Math'
import InteractiveFormula from '../results/InteractiveFormula'

const VB_W = 820
const VB_H = 420
const LEFT_PAD = 140
const RIGHT_PAD = 30
const TOP_PAD = 24
const ROW_H = 34
const BAR_MAX = VB_W - LEFT_PAD - RIGHT_PAD

const STATES: Array<keyof typeof HIRSCH_2025_BENCHMARK.catBehavior> = [
  'RESTING',
  'OUT_OF_LOUNGE',
  'SOCIALIZING',
  'HIDDEN',
  'ALERT',
  'GROOMING',
  'MOVING',
  'EXPLORING',
  'PLAYING',
]

const MAX_PROP = 0.35

export default function CitationBenchmarkBars({
  onJumpToMethodology,
}: {
  onJumpToMethodology?: () => void
}) {
  const { t } = useTranslation('citations')
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  const bench = HIRSCH_2025_BENCHMARK

  const methodChips = [
    { key: 'rubner2000emd',  labelKey: 'story.benchmark.chipEMD' },
    { key: 'wilson1927ci',   labelKey: 'story.benchmark.chipWilson' },
    { key: 'agresti2013cda', labelKey: 'story.benchmark.chipChi2' },
  ]

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50 dark:bg-bark-900/40 p-3"
    >
      <div className="mb-2 text-center">
        <div className="text-xs font-bold text-orange-700 dark:text-orange-400">
          {t('story.benchmark.title')}
        </div>
        <div className="text-[11px] text-gray-600 dark:text-bark-300 mt-0.5">
          {t('story.benchmark.method', {
            hours: 227,
            cats: 27,
            scans: bench.catBehaviorTotalN.toLocaleString(),
          })}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('story.benchmark.ariaLabel')}
      >
        {/* x-axis grid */}
        {[0, 0.1, 0.2, 0.3].map((p) => (
          <g key={`grid-${p}`}>
            <line
              x1={LEFT_PAD + (p / MAX_PROP) * BAR_MAX}
              y1={TOP_PAD}
              x2={LEFT_PAD + (p / MAX_PROP) * BAR_MAX}
              y2={TOP_PAD + STATES.length * ROW_H}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,3"
            />
            <text
              x={LEFT_PAD + (p / MAX_PROP) * BAR_MAX}
              y={TOP_PAD + STATES.length * ROW_H + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {Math.round(p * 100)}%
            </text>
          </g>
        ))}

        {STATES.map((state, i) => {
          const row = bench.catBehavior[state]
          const y = TOP_PAD + i * ROW_H
          const barW = mounted ? (row.proportion / MAX_PROP) * BAR_MAX : 0
          const [ciLow, ciHigh] = row.wilsonCI95
          const ciLowX = LEFT_PAD + (ciLow / MAX_PROP) * BAR_MAX
          const ciHighX = LEFT_PAD + (ciHigh / MAX_PROP) * BAR_MAX
          const isHovered = hovered === state
          const isSelected = selected === state

          return (
            <g
              key={state}
              onMouseEnter={() => setHovered(state)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(state)}
              onBlur={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation()
                setSelected((prev) => (prev === state ? null : state))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected((prev) => (prev === state ? null : state))
                }
              }}
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              {/* row background — highlight selected rows persistently */}
              {(isHovered || isSelected) && (
                <rect
                  x={0}
                  y={y - 2}
                  width={VB_W}
                  height={ROW_H - 4}
                  rx="4"
                  fill={isSelected ? '#ffedd5' : '#fff7ed'}
                  stroke={isSelected ? '#c2410c' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  opacity={isSelected ? 0.85 : 0.6}
                />
              )}
              <text
                x={LEFT_PAD - 8}
                y={y + ROW_H / 2 + 3}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#1f2937"
              >
                {t(`story.benchmark.state.${state}`)}
              </text>
              {/* bar */}
              <rect
                x={LEFT_PAD}
                y={y + 4}
                width={barW}
                height={ROW_H - 12}
                rx="3"
                fill={isHovered ? '#f97316' : '#fb923c'}
                style={{ transition: 'width 900ms cubic-bezier(.22,.9,.31,1.02), fill 150ms' }}
              />
              {/* Wilson CI whisker (only visible when mounted & bar drawn) */}
              {mounted && (
                <g opacity={isHovered ? 1 : 0.75}>
                  <line
                    x1={ciLowX}
                    y1={y + ROW_H / 2}
                    x2={ciHighX}
                    y2={y + ROW_H / 2}
                    stroke="#7c2d12"
                    strokeWidth="1.2"
                  />
                  <line x1={ciLowX} y1={y + ROW_H / 2 - 4} x2={ciLowX} y2={y + ROW_H / 2 + 4} stroke="#7c2d12" strokeWidth="1.2" />
                  <line x1={ciHighX} y1={y + ROW_H / 2 - 4} x2={ciHighX} y2={y + ROW_H / 2 + 4} stroke="#7c2d12" strokeWidth="1.2" />
                </g>
              )}
              {/* percentage label — anchored past whichever extends further:
                  the bar tip or the upper Wilson CI whisker */}
              <text
                x={Math.max(LEFT_PAD + barW, ciHighX) + 10}
                y={y + ROW_H / 2 + 3}
                fontSize="10"
                fontWeight="600"
                fill="#c2410c"
                style={{ transition: 'all 900ms' }}
              >
                {(row.proportion * 100).toFixed(1)}%
              </text>
              {/* "see details ↓" nudge on the selected row */}
              {isSelected && (
                <text
                  x={Math.max(LEFT_PAD + barW, ciHighX) + 48}
                  y={y + ROW_H / 2 + 3}
                  fontSize="10"
                  fontWeight="600"
                  fill="#c2410c"
                  className="neko-benchmark-nudge"
                >
                  {t('story.benchmark.nudge')}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Detail strip — mirrors hovered (preview) or selected (sticky) row */}
      <div className="mt-2 min-h-[44px] rounded-lg bg-white/60 dark:bg-bark-800/60 px-3 py-2 text-[11px] text-gray-700 dark:text-bark-200 leading-snug">
        {hovered || selected ? (
          <HoverDetail state={(hovered ?? selected) as string} />
        ) : (
          <span className="text-gray-500 dark:text-bark-400 italic">
            {t('story.benchmark.hoverHint')}
          </span>
        )}
      </div>

      {/* Sticky popover for the clicked row — explains what the state
          is, how NekoServe uses it, and links to the source paper. */}
      {selected && (
        <StateDetailCard
          state={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Methodology chips */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {methodChips.map((chip) => {
          const c = CITATIONS[chip.key]
          return (
            <button
              key={chip.key}
              type="button"
              onClick={onJumpToMethodology}
              className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              title={c ? citationShort(c) : ''}
            >
              {t(chip.labelKey)}
            </button>
          )
        })}
        <a
          href={citationUrl(bench.source)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-3 py-1 text-[11px] font-semibold hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"
        >
          {t('story.benchmark.chipSource', { short: citationShort(bench.source) })}
        </a>
      </div>
    </div>
  )
}

function StateDetailCard({ state, onClose }: { state: string; onClose: () => void }) {
  const { t } = useTranslation('citations')
  const cardRef = useRef<HTMLDivElement | null>(null)
  const row = HIRSCH_2025_BENCHMARK.catBehavior[state as keyof typeof HIRSCH_2025_BENCHMARK.catBehavior]

  // When a row is clicked, the details panel is further down the
  // chart — make sure it scrolls into view so the user sees the
  // response immediately instead of wondering if anything happened.
  useEffect(() => {
    if (!cardRef.current) return
    const el = cardRef.current
    const rect = el.getBoundingClientRect()
    const viewportH = window.innerHeight
    const fullyInView = rect.top >= 0 && rect.bottom <= viewportH
    if (!fullyInView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [state])

  if (!row) return null
  const [lo, hi] = row.wilsonCI95
  const source = HIRSCH_2025_BENCHMARK.source

  return (
    <div
      ref={cardRef}
      className="mt-3 rounded-xl ring-2 ring-orange-400 dark:ring-orange-500 bg-white dark:bg-bark-700 p-4 shadow-lg neko-benchmark-card-in"
      role="dialog"
      aria-label={t(`story.benchmark.state.${state}`)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
            {t(`story.benchmark.state.${state}`)}{' '}
            <span className="ml-1 text-xs font-mono text-gray-500 dark:text-bark-400">
              {state}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-bark-300 mt-1">
            <InlineMath formula={`p = ${(row.proportion * 100).toFixed(1)}\\%`} />
            <span className="mx-2">·</span>
            <InlineMath formula={`n = ${row.n.toLocaleString()} / ${row.total.toLocaleString()}`} />
            <span className="mx-2">·</span>
            {t('story.benchmark.ci95')}:{' '}
            <InlineMath formula={`[${(lo * 100).toFixed(1)}\\%,\\; ${(hi * 100).toFixed(1)}\\%]`} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-base text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 leading-none p-1"
          aria-label={t('story.landscape.close')}
        >
          ✕
        </button>
      </div>
      <div className="space-y-3 text-sm leading-relaxed">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-1">
            {t('story.benchmark.meaningLabel')}
          </div>
          <p className="text-gray-700 dark:text-bark-200">
            {renderWithTerms(t(`story.benchmark.description.${state}`))}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-1">
            {t('story.benchmark.nekoUseLabel')}
          </div>
          <p className="text-gray-700 dark:text-bark-200">
            {renderWithTerms(t(`story.benchmark.nekoUse.${state}`))}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-1">
            {t('story.benchmark.formulaLabel')}
          </div>
          <p className="text-gray-700 dark:text-bark-200 mb-2">
            {renderWithTerms(t('story.benchmark.formulaIntro'))}
          </p>
          <InteractiveFormula
            formula="\hat p_{\text{Wilson}} = \frac{\hat p + \dfrac{z^2}{2n}}{1 + \dfrac{z^2}{n}} \pm \frac{z}{1 + \dfrac{z^2}{n}} \sqrt{\dfrac{\hat p(1-\hat p)}{n} + \dfrac{z^2}{4n^2}}"
            i18nNs="citations"
            i18nBasePath="story.benchmark.formulaParts"
            parts={[
              { symbol: '\\hat p_{\\text{Wilson}}', partKey: 'pWilson' },
              { symbol: '\\hat p',                 partKey: 'pHat' },
              { symbol: 'n',                       partKey: 'n' },
              { symbol: 'z',                       partKey: 'z' },
              { symbol: '\\dfrac{z^2}{2n}',        partKey: 'shrinkage' },
              { symbol: '\\pm',                    partKey: 'halfWidth' },
            ]}
          />
        </div>
        <div className="pt-1 text-xs text-gray-500 dark:text-bark-400">
          {t('story.benchmark.sourcePrefix')}{' '}
          <a
            href={citationUrl(source)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-amber-700 dark:text-amber-400 underline decoration-dotted"
            onClick={(e) => e.stopPropagation()}
          >
            {citationShort(source)} · {row.source?.figureOrTable ?? 'Figure 3'}
          </a>
        </div>
      </div>
    </div>
  )
}

function HoverDetail({ state }: { state: string }) {
  const { t } = useTranslation('citations')
  const row = HIRSCH_2025_BENCHMARK.catBehavior[state as keyof typeof HIRSCH_2025_BENCHMARK.catBehavior]
  if (!row) return null
  const [lo, hi] = row.wilsonCI95
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span>
        <strong>{t(`story.benchmark.state.${state}`)}</strong>
      </span>
      <span>
        p = <span className="font-mono">{(row.proportion * 100).toFixed(1)}%</span>
      </span>
      <span>
        n = <span className="font-mono">{row.n.toLocaleString()}</span> / {row.total.toLocaleString()}
      </span>
      <span>
        {t('story.benchmark.ci95')}:{' '}
        <span className="font-mono">
          [{(lo * 100).toFixed(1)}%, {(hi * 100).toFixed(1)}%]
        </span>
      </span>
    </div>
  )
}
