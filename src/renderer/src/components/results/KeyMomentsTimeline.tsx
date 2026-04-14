import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { KeyMoment, KeyMomentKind } from '../../utils/keyMoments'

interface Props {
  moments: readonly KeyMoment[]
  totalDuration: number
  /**
   * Optional callback fired when the user clicks a moment bubble.
   * Wired up at the App level to jump to the Playback page and seek
   * to the clicked simTime, so students can see what the café actually
   * looked like at that instant.
   */
  onMomentClick?: (simTime: number) => void
}

const CHART_W = 480
const CHART_H = 78
const PADDING_X = 20
const TRACK_Y = 44
const BUBBLE_RADIUS = 11
/** Moments closer than this fraction of innerW are grouped together. */
const CLUSTER_THRESHOLD_FRAC = 0.08
/** Gap longer than this fraction of innerW triggers the "quiet middle" hint. */
const QUIET_GAP_FRAC = 0.4

const EMOJI_FOR_KIND: Record<KeyMomentKind, string> = {
  firstArrive: '🌅',
  peakQueue: '🔥',
  firstAbandon: '❌',
  peakBusy: '👥',
  lastServed: '✅',
}

const COLOR_FOR_KIND: Record<KeyMomentKind, string> = {
  firstArrive: '#fb923c',
  peakQueue: '#dc2626',
  firstAbandon: '#ef4444',
  peakBusy: '#a855f7',
  lastServed: '#16a34a',
}

interface ClusterBubble {
  /** Start sim-time of the first moment in this cluster. */
  simTime: number
  /** X coordinate of the first moment's position. */
  x: number
  /** All moment kinds rolled into this bubble, in chronological order. */
  kinds: KeyMomentKind[]
  /** Convenience: the first moment for tooltip / jump-to-playback. */
  primary: KeyMoment
}

/**
 * Group moments into spatial clusters where each bubble is within
 * CLUSTER_THRESHOLD_FRAC of the next. Single-moment clusters render as
 * normal bubbles; two-moment clusters stack vertically; three-plus
 * clusters collapse into one merged bubble that displays the first
 * icon plus a `+N` count badge to keep the timeline uncluttered.
 */
function groupClusters(
  moments: readonly KeyMoment[],
  totalDuration: number,
  innerW: number,
): ClusterBubble[] {
  const span = Math.max(1, totalDuration)
  const xScale = (t: number) => PADDING_X + (t / span) * innerW
  const threshold = innerW * CLUSTER_THRESHOLD_FRAC

  const out: ClusterBubble[] = []
  let i = 0
  while (i < moments.length) {
    let j = i
    while (j + 1 < moments.length) {
      const dx =
        xScale(moments[j + 1].simTime) - xScale(moments[i].simTime)
      if (dx < threshold) j += 1
      else break
    }
    const group = moments.slice(i, j + 1)
    out.push({
      simTime: group[0].simTime,
      x: xScale(group[0].simTime),
      kinds: group.map((g) => g.kind),
      primary: group[0],
    })
    i = j + 1
  }
  return out
}

export default function KeyMomentsTimeline({
  moments,
  totalDuration,
  onMomentClick,
}: Props) {
  const { t } = useTranslation(['results', 'common'])
  const innerW = CHART_W - PADDING_X * 2

  const { clusters, quietGaps } = useMemo(() => {
    const c = groupClusters(moments, totalDuration, innerW)
    // A "quiet gap" is a stretch of axis with no clusters whose width
    // exceeds QUIET_GAP_FRAC. We render a small italic label there so
    // users don't think the timeline is broken when the middle of a
    // smooth run has no drama to show.
    const gaps: Array<{ midX: number; widthFrac: number }> = []
    if (c.length >= 2) {
      for (let k = 0; k < c.length - 1; k++) {
        const widthFrac = (c[k + 1].x - c[k].x) / innerW
        if (widthFrac >= QUIET_GAP_FRAC) {
          gaps.push({
            midX: (c[k].x + c[k + 1].x) / 2,
            widthFrac,
          })
        }
      }
    }
    return { clusters: c, quietGaps: gaps }
  }, [moments, totalDuration, innerW])

  if (moments.length === 0) return null

  const minUnit = t('common:unit.min')

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold text-orange-700">
          {t('results:keyMoments.title')}
        </span>
        <span className="text-[10px] text-gray-500">
          {t('results:keyMoments.clickHint')}
        </span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={t('results:keyMoments.title')}
      >
        {/* Axis line */}
        <line
          x1={PADDING_X}
          y1={TRACK_Y}
          x2={CHART_W - PADDING_X}
          y2={TRACK_Y}
          stroke="#fed7aa"
          strokeWidth={1}
        />
        {/* Tick marks at 0 / 1/4 / 1/2 / 3/4 / end */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const tx = PADDING_X + innerW * frac
          return (
            <line
              key={i}
              x1={tx}
              y1={TRACK_Y - 3}
              x2={tx}
              y2={TRACK_Y + 3}
              stroke="#fdba74"
              strokeWidth={0.8}
            />
          )
        })}

        {/* Axis end labels */}
        <text
          x={PADDING_X}
          y={CHART_H - 2}
          fontSize={7}
          fill="#9ca3af"
          textAnchor="start"
        >
          0
        </text>
        <text
          x={CHART_W - PADDING_X}
          y={CHART_H - 2}
          fontSize={7}
          fill="#9ca3af"
          textAnchor="end"
        >
          {totalDuration} {minUnit}
        </text>

        {/* "Quiet middle" hint labels — one per wide gap between clusters. */}
        {quietGaps.map((gap, idx) => (
          <text
            key={`gap-${idx}`}
            x={gap.midX}
            y={TRACK_Y - 10}
            fontSize={8}
            fill="#9ca3af"
            fontStyle="italic"
            textAnchor="middle"
            pointerEvents="none"
          >
            {t('results:keyMoments.quietMiddle')}
          </text>
        ))}

        {/* Cluster bubbles */}
        {clusters.map((cluster, idx) => {
          const count = cluster.kinds.length
          if (count === 1) {
            return renderSingleBubble({
              x: cluster.x,
              y: TRACK_Y,
              moment: cluster.primary,
              keyId: `c-${idx}`,
              onClick: onMomentClick,
              minUnit,
              t,
            })
          }
          if (count === 2) {
            return (
              <g key={`c-${idx}`}>
                {renderSingleBubble({
                  x: cluster.x,
                  y: TRACK_Y,
                  moment: { ...cluster.primary, kind: cluster.kinds[0] },
                  keyId: `c-${idx}-a`,
                  onClick: onMomentClick,
                  minUnit,
                  t,
                })}
                {renderSingleBubble({
                  x: cluster.x,
                  y: TRACK_Y - 22,
                  moment: {
                    ...cluster.primary,
                    kind: cluster.kinds[1],
                  },
                  keyId: `c-${idx}-b`,
                  onClick: onMomentClick,
                  minUnit,
                  t,
                  drawStem: true,
                })}
              </g>
            )
          }
          // count >= 3 → merge into a single cluster bubble.
          return renderClusterBubble({
            x: cluster.x,
            y: TRACK_Y,
            cluster,
            keyId: `c-${idx}`,
            onClick: onMomentClick,
            minUnit,
            t,
          })
        })}
      </svg>

      {onMomentClick && (
        <div className="mt-1 text-[11px] text-gray-600 leading-snug">
          {t('results:keyMoments.jumpHint')}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Bubble render helpers (plain functions returning SVG so the
// main component stays readable).

interface BubbleArgs {
  x: number
  y: number
  moment: KeyMoment
  keyId: string
  onClick?: (simTime: number) => void
  minUnit: string
  t: ReturnType<typeof useTranslation>['t']
  drawStem?: boolean
}

function renderSingleBubble({
  x,
  y,
  moment,
  keyId,
  onClick,
  minUnit,
  t,
  drawStem,
}: BubbleArgs) {
  const color = COLOR_FOR_KIND[moment.kind]
  const emoji = EMOJI_FOR_KIND[moment.kind]
  const label = t(`results:keyMoments.labels.${moment.kind}`, {
    n: moment.value ?? 0,
    defaultValue: moment.kind,
  })
  const tooltip = `${label} · ${moment.simTime.toFixed(0)} ${minUnit}`
  const clickable = onClick !== undefined
  return (
    <g
      key={keyId}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      onClick={() => onClick?.(moment.simTime)}
    >
      <title>{tooltip}</title>
      {drawStem && (
        <line
          x1={x}
          y1={TRACK_Y}
          x2={x}
          y2={y + BUBBLE_RADIUS - 2}
          stroke={color}
          strokeWidth={0.8}
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={BUBBLE_RADIUS}
        fill="#fff"
        stroke={color}
        strokeWidth={1.6}
      />
      <text
        x={x}
        y={y + 4}
        fontSize={11}
        textAnchor="middle"
        pointerEvents="none"
      >
        {emoji}
      </text>
      <text
        x={x}
        y={y + BUBBLE_RADIUS + 9}
        fontSize={7}
        fill="#7c2d12"
        textAnchor="middle"
        pointerEvents="none"
      >
        {moment.simTime.toFixed(0)}
      </text>
    </g>
  )
}

interface ClusterArgs {
  x: number
  y: number
  cluster: ClusterBubble
  keyId: string
  onClick?: (simTime: number) => void
  minUnit: string
  t: ReturnType<typeof useTranslation>['t']
}

function renderClusterBubble({
  x,
  y,
  cluster,
  keyId,
  onClick,
  minUnit,
  t,
}: ClusterArgs) {
  const clickable = onClick !== undefined
  const firstEmoji = EMOJI_FOR_KIND[cluster.kinds[0]]
  const count = cluster.kinds.length
  const tooltipLines = cluster.kinds
    .map((k) =>
      t(`results:keyMoments.labels.${k}`, { n: 0, defaultValue: k }),
    )
    .join(' · ')
  const tooltip = `${t('results:keyMoments.clusterLabel', {
    n: count,
  })} — ${tooltipLines}`
  return (
    <g
      key={keyId}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      onClick={() => onClick?.(cluster.simTime)}
    >
      <title>{tooltip}</title>
      <circle
        cx={x}
        cy={y}
        r={BUBBLE_RADIUS + 2}
        fill="#fff"
        stroke="#7c2d12"
        strokeWidth={1.8}
      />
      <text
        x={x - 2}
        y={y + 3}
        fontSize={10}
        textAnchor="middle"
        pointerEvents="none"
      >
        {firstEmoji}
      </text>
      <text
        x={x + 7}
        y={y + 2}
        fontSize={8}
        fill="#7c2d12"
        fontWeight={700}
        textAnchor="start"
        pointerEvents="none"
      >
        +{count - 1}
      </text>
      <text
        x={x}
        y={y + BUBBLE_RADIUS + 11}
        fontSize={7}
        fill="#7c2d12"
        textAnchor="middle"
        pointerEvents="none"
      >
        {cluster.simTime.toFixed(0)} {minUnit}
      </text>
    </g>
  )
}
