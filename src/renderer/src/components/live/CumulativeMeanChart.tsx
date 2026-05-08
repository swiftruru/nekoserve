import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConvergencePoint } from '../../store/liveBatchStore'
import { TermTooltip } from '../results/TermTooltip'

interface Props {
  series: ConvergencePoint[]
  total: number
  metricLabel: string
  /** When set, the X-range [convergedAt - convergenceWindow, currentN] is
   *  tinted green to mark the "stable" zone. */
  convergedAt: number | null
  convergenceWindow: number
  /** Compact mode (small multiples grid): smaller dimensions, no axis
   *  labels, no first-run reference, no chart hint. The defining curve
   *  + CI band + blip + current-mean line stay so the visual identity
   *  reads at a glance even at 240×120. */
  compact?: boolean
}

const FULL_DIMS = {
  W: 720, H: 240,
  paddingLeft: 42, paddingRight: 12,
  paddingTop: 14, paddingBottom: 26,
}
const COMPACT_DIMS = {
  W: 320, H: 160,
  paddingLeft: 32, paddingRight: 8,
  paddingTop: 10, paddingBottom: 18,
}

export default function CumulativeMeanChart({
  series, total, metricLabel, convergedAt, convergenceWindow, compact = false,
}: Props) {
  const { t } = useTranslation(['liveOverlay'])
  const dims = compact ? COMPACT_DIMS : FULL_DIMS
  const { W: CHART_W, H: CHART_H,
    paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT,
    paddingTop: PADDING_TOP, paddingBottom: PADDING_BOTTOM } = dims

  const layout = useMemo(() => {
    if (series.length === 0) {
      return null
    }
    let yMin = Infinity
    let yMax = -Infinity
    for (const p of series) {
      const lo = p.mean - p.halfWidth
      const hi = p.mean + p.halfWidth
      if (lo < yMin) yMin = lo
      if (hi > yMax) yMax = hi
    }
    if (yMin === yMax) {
      const eps = Math.max(0.05, Math.abs(yMin) * 0.1)
      yMin -= eps
      yMax += eps
    } else {
      const pad = (yMax - yMin) * 0.08
      yMin -= pad
      yMax += pad
    }

    const innerW = CHART_W - PADDING_LEFT - PADDING_RIGHT
    const innerH = CHART_H - PADDING_TOP - PADDING_BOTTOM
    const xMax = Math.max(2, total)
    const xScale = (n: number) =>
      PADDING_LEFT + ((n - 1) / Math.max(1, xMax - 1)) * innerW
    const yScale = (v: number) =>
      PADDING_TOP + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    const meanPts = series.map((p) => `${xScale(p.n).toFixed(1)},${yScale(p.mean).toFixed(2)}`).join(' ')
    const upperEdge = series.map((p) => `${xScale(p.n).toFixed(1)},${yScale(p.mean + p.halfWidth).toFixed(2)}`)
    const lowerEdge = series.map((p) => `${xScale(p.n).toFixed(1)},${yScale(p.mean - p.halfWidth).toFixed(2)}`)
    const bandPts = [...upperEdge, ...lowerEdge.reverse()].join(' ')

    const last = series[series.length - 1]
    const first = series[0]

    // Newest-segment "draw on" path: just the last two points. We render
    // it as its own polyline so we can apply stroke-dasharray + offset
    // animation that re-runs each time `last.n` changes (key-on-n).
    let newSegmentPts: string | null = null
    let newSegmentLength = 0
    if (series.length >= 2) {
      const prev = series[series.length - 2]
      const x1 = xScale(prev.n)
      const y1 = yScale(prev.mean)
      const x2 = xScale(last.n)
      const y2 = yScale(last.mean)
      newSegmentPts = `${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`
      newSegmentLength = Math.hypot(x2 - x1, y2 - y1)
    }

    return {
      meanPts, bandPts,
      newSegmentPts, newSegmentLength,
      yMin, yMax, xMax, innerW, innerH,
      xScale, yScale,
      first, last,
    }
  }, [series, total, CHART_W, CHART_H, PADDING_LEFT, PADDING_RIGHT, PADDING_TOP, PADDING_BOTTOM])

  // Hover tooltip state — non-compact mode only. Stores the hovered
  // ConvergencePoint index in the local series array so we can render
  // a guide line + value chip. Declared above the empty-state early
  // return so hook order stays stable across renders (rules of hooks).
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (!layout) {
    return (
      <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure">
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
          {metricLabel}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-bark-400 text-center py-12">
          {t('liveOverlay:chart.empty')}
        </div>
      </div>
    )
  }

  const { meanPts, bandPts, newSegmentPts, newSegmentLength,
    yMin, yMax, xMax, xScale, yScale, first, last } = layout
  const firstY = yScale(first.mean)
  const currentY = yScale(last.mean)
  const lastX = xScale(last.n)

  // Convert a clientX from a mouse event into a series-array index by
  // mapping it through the SVG's user-space x-coordinate, then taking
  // the nearest n that exists in the data. We find the nearest by
  // computing the index from the (nearly linear) n-values, since
  // series is already sorted by n.
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (compact) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Map client x into the viewBox x — the SVG uses the same
    // dimensions as the viewBox so a simple ratio works.
    const userX = ((e.clientX - rect.left) / rect.width) * CHART_W
    if (userX < PADDING_LEFT - 4 || userX > CHART_W - PADDING_RIGHT + 4) {
      setHoverIdx(null)
      return
    }
    // Invert xScale: userX = PADDING_LEFT + ((n-1) / (xMax-1)) * innerW
    const innerW = CHART_W - PADDING_LEFT - PADDING_RIGHT
    const denom = Math.max(1, xMax - 1)
    const approxN = 1 + ((userX - PADDING_LEFT) / innerW) * denom
    // Find the series index whose .n is closest to approxN
    let bestIdx = 0
    let bestDiff = Infinity
    for (let i = 0; i < series.length; i++) {
      const d = Math.abs(series[i].n - approxN)
      if (d < bestDiff) { bestDiff = d; bestIdx = i }
    }
    setHoverIdx(bestIdx)
  }
  function handleMouseLeave() {
    if (compact) return
    setHoverIdx(null)
  }

  const hovered = hoverIdx !== null ? series[hoverIdx] : null
  const hoverX = hovered ? xScale(hovered.n) : null
  const hoverY = hovered ? yScale(hovered.mean) : null
  const hoverCiUpperY = hovered ? yScale(hovered.mean + hovered.halfWidth) : null
  const hoverCiLowerY = hovered ? yScale(hovered.mean - hovered.halfWidth) : null

  // Tooltip card layout: 130x60, positioned to the right of the cursor
  // unless that would clip the chart edge — then flip to the left.
  const TT_W = 134
  const TT_H = 56
  let tooltipX = 0
  let tooltipY = 0
  if (hovered && hoverX !== null && hoverY !== null) {
    const wantRight = hoverX + 12 + TT_W <= CHART_W - PADDING_RIGHT
    tooltipX = wantRight ? hoverX + 10 : hoverX - 10 - TT_W
    tooltipY = Math.max(PADDING_TOP, Math.min(CHART_H - PADDING_BOTTOM - TT_H, hoverY - TT_H / 2))
  }

  const stableX1 = convergedAt !== null
    ? xScale(Math.max(1, convergedAt - convergenceWindow + 1))
    : 0
  const stableX2 = convergedAt !== null ? xScale(last.n) : 0

  return (
    <div className={`rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 ${compact ? 'p-2' : 'p-3'}`} role="figure" aria-label={metricLabel}>
      <div className="flex items-baseline justify-between mb-1">
        <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-orange-700 dark:text-orange-400 truncate`}>
          {metricLabel}
        </span>
        {!compact && (
          <span className="text-[10px] text-gray-500 dark:text-bark-300 tabular-nums">
            <TermTooltip termKey="bigN">
              {t('liveOverlay:chart.xMaxLabel', { n: xMax })}
            </TermTooltip>
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={metricLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect x={0} y={0} width={CHART_W} height={CHART_H} className="fill-[#fff7ed] dark:fill-bark-800" rx={6} />

        {/* Baseline + left axis */}
        <line
          x1={PADDING_LEFT} y1={CHART_H - PADDING_BOTTOM}
          x2={CHART_W - PADDING_RIGHT} y2={CHART_H - PADDING_BOTTOM}
          className="stroke-[#fed7aa] dark:stroke-bark-600"
          strokeWidth={0.8}
        />
        <line
          x1={PADDING_LEFT} y1={PADDING_TOP}
          x2={PADDING_LEFT} y2={CHART_H - PADDING_BOTTOM}
          className="stroke-[#fed7aa] dark:stroke-bark-600"
          strokeWidth={0.8}
        />

        {/* Stable-region tint */}
        {convergedAt !== null && stableX2 > stableX1 && (
          <rect
            x={stableX1} y={PADDING_TOP}
            width={stableX2 - stableX1}
            height={CHART_H - PADDING_TOP - PADDING_BOTTOM}
            fill="#22c55e"
            opacity={0.10}
          />
        )}

        {/* CI band */}
        {series.length >= 2 && (
          <polygon
            points={bandPts}
            fill="#fb923c"
            opacity={0.18}
          />
        )}

        {/* First-run reference (full mode only — too noisy in compact).
            Label sits in the top-right corner as a static legend so it
            never collides with the blip dot or current-mean label. */}
        {!compact && (
          <line
            x1={PADDING_LEFT} y1={firstY}
            x2={CHART_W - PADDING_RIGHT} y2={firstY}
            stroke="#94a3b8"
            strokeDasharray="4 3"
            strokeWidth={0.8}
            opacity={0.7}
          />
        )}

        {/* Cumulative-mean line */}
        <polyline
          points={meanPts}
          fill="none"
          stroke="#ea580c"
          strokeWidth={compact ? 1.4 : 1.8}
          strokeLinejoin="round"
        />

        {/* Newest segment overlay with draw-on animation. We render the
            same line again, but only its last segment, with
            stroke-dasharray = segment length and an animation that
            slides stroke-dashoffset from full → 0 each time `last.n`
            changes (key-on-n forces remount). */}
        {newSegmentPts && newSegmentLength > 0 && (
          <polyline
            key={last.n}
            className="live-segment-draw"
            points={newSegmentPts}
            fill="none"
            stroke="#ea580c"
            strokeWidth={compact ? 1.4 : 1.8}
            strokeLinejoin="round"
            style={{
              strokeDasharray: newSegmentLength,
              ['--live-seg-length' as string]: newSegmentLength.toFixed(2),
            } as React.CSSProperties}
          />
        )}

        {/* Newest-point blip */}
        <circle
          key={`blip-${last.n}`}
          className="live-blip"
          cx={lastX}
          cy={currentY}
          r={compact ? 3 : 4}
          fill="#ea580c"
        />

        {/* Current cumulative mean reference */}
        <line
          x1={PADDING_LEFT} y1={currentY}
          x2={CHART_W - PADDING_RIGHT} y2={currentY}
          stroke="#dc2626"
          strokeWidth={1}
          opacity={0.6}
          style={{ transition: 'y1 280ms ease-out, y2 280ms ease-out' }}
        />

        {/* Static legend in the top-right corner: red current-mean
            value on top, gray first-run value below. Pinning these to
            the corner avoids the case where last.n sits at the right
            edge of the chart and the label collides with the blip
            dot or the line itself. A faint white backing rect keeps
            both readable when the curve drifts close. */}
        {!compact && (
          <>
            <rect
              x={CHART_W - PADDING_RIGHT - 130}
              y={PADDING_TOP - 2}
              width={130}
              height={28}
              fill="#fff7ed"
              opacity={0.85}
              rx={3}
            />
            <text
              x={CHART_W - PADDING_RIGHT - 6}
              y={PADDING_TOP + 9}
              fontSize={10}
              textAnchor="end"
              fill="#dc2626"
              fontWeight={700}
            >
              {t('liveOverlay:chart.currentMeanLabel', { value: last.mean.toFixed(3) })}
            </text>
            <text
              x={CHART_W - PADDING_RIGHT - 6}
              y={PADDING_TOP + 22}
              fontSize={10}
              textAnchor="end"
              fill="#64748b"
            >
              {t('liveOverlay:chart.firstRunLabel', { value: first.mean.toFixed(3) })}
            </text>
          </>
        )}

        {/* Hover overlay (full mode only): vertical guide line + marker
            ring on the curve + small tooltip card with n/mean/CI. */}
        {!compact && hovered && hoverX !== null && hoverY !== null && (
          <g pointerEvents="none">
            <line
              x1={hoverX} y1={PADDING_TOP}
              x2={hoverX} y2={CHART_H - PADDING_BOTTOM}
              stroke="#7c2d12"
              strokeDasharray="2 2"
              strokeWidth={0.8}
              opacity={0.55}
            />
            {/* CI tick on the guide */}
            {hoverCiUpperY !== null && hoverCiLowerY !== null && hovered.halfWidth > 0 && (
              <line
                x1={hoverX - 4} y1={hoverCiUpperY}
                x2={hoverX + 4} y2={hoverCiUpperY}
                stroke="#c2410c"
                strokeWidth={1}
              />
            )}
            {hoverCiLowerY !== null && hovered.halfWidth > 0 && (
              <line
                x1={hoverX - 4} y1={hoverCiLowerY}
                x2={hoverX + 4} y2={hoverCiLowerY}
                stroke="#c2410c"
                strokeWidth={1}
              />
            )}
            <circle
              cx={hoverX} cy={hoverY}
              r={4.5}
              fill="#fff"
              stroke="#ea580c"
              strokeWidth={2}
            />

            {/* Tooltip card */}
            <rect
              x={tooltipX} y={tooltipY}
              width={TT_W} height={TT_H}
              fill="#fff7ed"
              stroke="#ea580c"
              strokeWidth={1}
              rx={4}
              opacity={0.97}
            />
            <text
              x={tooltipX + 8} y={tooltipY + 14}
              fontSize={10}
              fontWeight={700}
              fill="#7c2d12"
            >
              n = {hovered.n}
            </text>
            <text
              x={tooltipX + 8} y={tooltipY + 28}
              fontSize={10}
              fill="#1f2937"
            >
              {t('liveOverlay:cumulativeMean')}: {hovered.mean.toFixed(4)}
            </text>
            <text
              x={tooltipX + 8} y={tooltipY + 42}
              fontSize={10}
              fill="#1f2937"
            >
              ± {hovered.halfWidth.toFixed(4)}
            </text>
          </g>
        )}

        {/* Y-axis ticks */}
        <text x={PADDING_LEFT - 4} y={PADDING_TOP + 4} fontSize={compact ? 8 : 9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
          {yMax.toFixed(2)}
        </text>
        <text x={PADDING_LEFT - 4} y={CHART_H - PADDING_BOTTOM} fontSize={compact ? 8 : 9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
          {yMin.toFixed(2)}
        </text>

        {/* X-axis ticks */}
        <text x={PADDING_LEFT} y={CHART_H - (compact ? 4 : 8)} fontSize={compact ? 8 : 9} className="fill-gray-500 dark:fill-bark-300">
          1
        </text>
        <text x={CHART_W - PADDING_RIGHT} y={CHART_H - (compact ? 4 : 8)} fontSize={compact ? 8 : 9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
          {xMax}
        </text>
        {!compact && (
          <text x={(PADDING_LEFT + CHART_W - PADDING_RIGHT) / 2} y={CHART_H - 8} fontSize={9} textAnchor="middle" className="fill-gray-500 dark:fill-bark-300">
            {t('liveOverlay:chart.xAxisTitle')}
          </text>
        )}
      </svg>

      {!compact && (
        <>
          <div className="mt-2 text-[13px] text-gray-700 dark:text-bark-200 leading-relaxed">
            {t('liveOverlay:chart.hint')}
          </div>
          <details className="mt-2 group">
            <summary className="cursor-pointer text-[13px] font-semibold text-orange-700 dark:text-orange-400 hover:underline select-none">
              {t('liveOverlay:chart.help.summary')}
            </summary>
            <div className="mt-3 px-3 py-3 rounded-lg bg-orange-50/80 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 text-[13px] text-gray-800 dark:text-bark-100 leading-relaxed space-y-3">
              <section>
                <div className="font-semibold mb-1">{t('liveOverlay:chart.help.axesTitle')}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('liveOverlay:chart.help.xAxis')}</li>
                  <li>{t('liveOverlay:chart.help.yAxis')}</li>
                </ul>
              </section>
              <section>
                <div className="font-semibold mb-1">{t('liveOverlay:chart.help.elementsTitle')}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('liveOverlay:chart.help.elementOrangeLine')}</li>
                  <li>{t('liveOverlay:chart.help.elementBand')}</li>
                  <li>{t('liveOverlay:chart.help.elementBlip')}</li>
                  <li>{t('liveOverlay:chart.help.elementGrayDashed')}</li>
                  <li>{t('liveOverlay:chart.help.elementRedLine')}</li>
                  <li>{t('liveOverlay:chart.help.elementGreenZone')}</li>
                </ul>
              </section>
              <section>
                <div className="font-semibold mb-1">{t('liveOverlay:chart.help.howToReadTitle')}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('liveOverlay:chart.help.howRead1')}</li>
                  <li>{t('liveOverlay:chart.help.howRead2')}</li>
                  <li>{t('liveOverlay:chart.help.howRead3')}</li>
                  <li>{t('liveOverlay:chart.help.howRead4')}</li>
                  <li>{t('liveOverlay:chart.help.howRead5')}</li>
                </ul>
              </section>
              <section>
                <div className="font-semibold mb-1">{t('liveOverlay:chart.help.notationTitle')}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li dangerouslySetInnerHTML={{ __html: renderInlineBold(t('liveOverlay:chart.help.notationN')) }} />
                  <li dangerouslySetInnerHTML={{ __html: renderInlineBold(t('liveOverlay:chart.help.notationLowerN')) }} />
                  <li>{t('liveOverlay:chart.help.notationWhyDifferent')}</li>
                </ul>
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

/**
 * Convert a small subset of inline Markdown — only **bold** — into HTML.
 * The translated help strings use **N** to call out the symbol; we want
 * that emphasis to render rather than show literal asterisks. Inputs
 * come from the translation files we control, so HTML injection is not
 * a concern here.
 */
function renderInlineBold(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
