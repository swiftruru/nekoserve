import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Page } from '../../types'
import {
  CITATIONS,
  citationShort,
  citationUrl,
  type Citation,
} from '../../data/citations'
import { renderWithTerms } from '../results/TermTooltip'
import { ArrivalDropperScripted } from './concepts/ArrivalDropper'
import { BalkReneScripted } from './concepts/BalkReneQueue'
import { LittlesLawScripted } from './concepts/LittlesLawGauge'
import { EthogramScripted } from './concepts/EthogramWheel'
import { RenegingFaderScripted } from './concepts/RenegingFader'
import { WelfareBarsScripted } from './concepts/WelfareBars'

/**
 * Finale pipeline: 7 horizontal stages from arrival through validation.
 *
 * Click a stage to open a floating popover that shows:
 *   1. the stage's one-paragraph summary
 *   2. the concept animation most relevant to the stage (scripted, so
 *      it plays once per open — tap the node again to replay)
 *   3. citation pills linking to the DOIs of the backing papers
 *   4. an optional "jump to the matching app page" escape hatch
 *
 * Earlier version navigated straight to Playback/Results/Validation on
 * click, which broke the reading flow (the user lost the story page
 * entirely). The popover keeps the narrative in view; jumping is now
 * a deliberate secondary action.
 */

type StageId =
  | 'arrive'
  | 'queue'
  | 'seat'
  | 'serve'
  | 'cat'
  | 'exit'
  | 'verify'

interface PipelineNode {
  id: StageId
  emoji: string
  citations: string[]
  jumpTo?: Page
}

const NODES: PipelineNode[] = [
  { id: 'arrive', emoji: '🚪', citations: ['hasugian2020analysis'],                                                  jumpTo: 'playback' },
  { id: 'queue',  emoji: '⏳', citations: ['ancker1963balking1', 'ancker1963balking2', 'little1961proof'],            jumpTo: 'playback' },
  { id: 'seat',   emoji: '🪑', citations: ['little1961proof'],                                                        jumpTo: 'playback' },
  { id: 'serve',  emoji: '🍜', citations: [],                                                                          jumpTo: 'playback' },
  { id: 'cat',    emoji: '🐈', citations: ['hirsch2025cats'],                                                         jumpTo: 'playback' },
  { id: 'exit',   emoji: '👋', citations: ['dbeis2024enhancing', 'li2025attributes'],                                 jumpTo: 'results' },
  { id: 'verify', emoji: '✅', citations: ['hirsch2025cats', 'ropski2023analysis'],                                    jumpTo: 'validation' },
]

const VB_W = 860
const VB_H = 180
const LANE_Y = 110
const NODE_R = 22

interface Props {
  onNavigate?: (page: Page) => void
}

export default function CitationPipelineFlow({ onNavigate }: Props) {
  const { t } = useTranslation('citations')
  const [selected, setSelected] = useState<PipelineNode | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Close on outside-click or Esc while the popover is open.
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

  const xStart = 50
  const xEnd = VB_W - 50
  const step = (xEnd - xStart) / (NODES.length - 1)

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50 dark:bg-bark-900/40 p-3"
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
        <text
          x={VB_W / 2}
          y={28}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#7c2d12"
        >
          {t('story.pipeline.title')}
        </text>

        <line
          x1={xStart}
          y1={LANE_Y}
          x2={xEnd}
          y2={LANE_Y}
          stroke="#fb923c"
          strokeWidth="3"
          strokeDasharray="6,6"
          strokeLinecap="round"
          className="neko-pipeline-flow"
          opacity="0.6"
        />

        {NODES.map((n, i) => {
          const x = xStart + i * step
          const isActive = selected?.id === n.id
          return (
            <g
              key={n.id}
              transform={`translate(${x}, ${LANE_Y})`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                setSelected((prev) => (prev?.id === n.id ? null : n))
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected((prev) => (prev?.id === n.id ? null : n))
                }
              }}
            >
              <circle
                r={NODE_R}
                fill={isActive ? '#fff7ed' : '#fff7ed'}
                stroke={isActive ? '#c2410c' : '#c2410c'}
                strokeWidth={isActive ? 3 : 2}
              />
              <text textAnchor="middle" y="6" fontSize="20">
                {n.emoji}
              </text>
              <text
                y={NODE_R + 16}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#7c2d12"
              >
                {t(`story.pipeline.nodes.${n.id}`)}
              </text>
              {n.citations.length > 0 && (
                <text
                  y={NODE_R + 30}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#9a3412"
                >
                  {n.citations.length} ref
                </text>
              )}
              <text
                y={-NODE_R - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#c2410c"
                fontStyle="italic"
              >
                {t('story.pipeline.clickHint')}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="mt-2 text-[11px] text-gray-500 dark:text-bark-400 italic leading-snug text-center">
        {t('story.pipeline.caption')}
      </p>

      {/* Floating stage popover */}
      {selected && (
        <StagePopover
          node={selected}
          onClose={() => setSelected(null)}
          onJump={
            selected.jumpTo && onNavigate
              ? () => {
                  const target = selected.jumpTo!
                  setSelected(null)
                  onNavigate(target)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function StagePopover({
  node,
  onClose,
  onJump,
}: {
  node: PipelineNode
  onClose: () => void
  onJump?: () => void
}) {
  const { t } = useTranslation('citations')
  // Which x-axis slot the stage occupies, used to position the popover
  // above-ish the node so the arrow can point down at it.
  const stageIndex = NODES.findIndex((n) => n.id === node.id)
  const anchorFrac = stageIndex / (NODES.length - 1) // 0..1
  // Keep popover within [8%, 92%] to avoid clipping at the edges.
  const leftPct = Math.min(92, Math.max(8, 7 + anchorFrac * 86))

  const citations = node.citations
    .map((k) => CITATIONS[k])
    .filter((c): c is Citation => Boolean(c))

  return (
    <div
      className="absolute z-20 w-[340px] max-w-[92%] rounded-xl shadow-xl ring-1 ring-orange-300 dark:ring-orange-800 bg-white dark:bg-bark-700 p-4"
      role="dialog"
      aria-label={t(`story.pipeline.nodes.${node.id}`)}
      style={{
        left: `${leftPct}%`,
        top: '76%',
        transform: 'translate(-50%, 0)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>{node.emoji}</span>
          <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
            {t(`story.pipeline.nodes.${node.id}`)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 leading-none p-1"
          aria-label={t('story.pipeline.popover.close')}
        >
          ✕
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-gray-700 dark:text-bark-200 mb-3">
        {renderWithTerms(t(`story.pipeline.popover.stageSummary.${node.id}`))}
      </p>

      <div className="mb-3 rounded-lg bg-cream-50 dark:bg-bark-800/70 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 p-2">
        {renderStageAnimation(node.id)}
      </div>

      {citations.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-1">
            {t('story.pipeline.popover.citationsLabel')}
          </div>
          <div className="flex flex-wrap gap-1">
            {citations.map((c) => (
              <a
                key={c.key}
                href={citationUrl(c)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold tracking-wide rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                title={c.title}
              >
                {citationShort(c)}
              </a>
            ))}
          </div>
        </div>
      )}

      {onJump && (
        <button
          type="button"
          onClick={onJump}
          className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-3 py-2 text-xs font-semibold transition-colors"
        >
          {t('story.pipeline.popover.jumpLabel')} →
        </button>
      )}
    </div>
  )
}

/**
 * Per-stage concept animation picker. Each stage reuses the scripted
 * version of an existing chapter concept, so the reader sees the same
 * visual language in both the chapter card and the pipeline popover.
 * We cold-mount a fresh component each open, which resets the scripted
 * animation to t=0 cleanly without needing an extra ref API.
 */
function renderStageAnimation(stage: StageId): ReactNode {
  switch (stage) {
    case 'arrive':
      return <ArrivalDropperScripted />
    case 'queue':
      return <BalkReneScripted />
    case 'seat':
      return <LittlesLawScripted />
    case 'serve':
      return <LittlesLawScripted />
    case 'cat':
      return <EthogramScripted />
    case 'exit':
      return <RenegingFaderScripted />
    case 'verify':
      return <WelfareBarsScripted />
    default:
      return null
  }
}
