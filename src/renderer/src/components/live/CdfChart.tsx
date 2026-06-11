import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { silvermanBandwidth } from '../../utils/kde'
import { empiricalCdf, smoothedCdf, dkwEpsilon } from '../../utils/cdf'
import type { ThresholdConfig } from '../../utils/exceedance'
import { useThresholdDrag, type ThresholdBounds } from './useThresholdDrag'

/**
 * Cumulative distribution (CDF) view — the main act of the attainment
 * analysis. It answers the teacher's question directly: drag the bar and
 * read how much probability has accumulated by there.
 *
 * Three optional layers over a shared x-axis (the metric's value range):
 *  1. Empirical CDF — the exact staircase F_N(x) = #{v_i <= x} / N.
 *  2. Smoothed CDF — the Gaussian-kernel curve F̂(x) = (1/N)ΣΦ((x-v_i)/h),
 *     reusing the SAME bandwidth h the KDE density uses (silvermanBandwidth)
 *     so the smooth shape on the histogram and here tell one story.
 *  3. DKW band — F_N ± ε simultaneous 95% band; widens honestly when N is
 *     small.
 *
 * The threshold line is shared with the histogram (it writes through to the
 * same store via onThresholdChange) and is draggable. A guide line reads
 * F(t) off the y-axis; 1 − F(t) is labelled at the line. Self-drawn SVG, no
 * D3, matching the other live charts.
 */

const CHART_W = 720
const CHART_H = 260
const PADDING_LEFT = 38
const PADDING_RIGHT = 12
const PADDING_TOP = 14
const PADDING_BOTTOM = 30
const SMOOTH_SAMPLES = 200

const EMPIRICAL_STROKE = '#c2410c'
const SMOOTH_STROKE = '#0f766e'
const DKW_FILL = 'rgba(234, 88, 12, 0.12)'
const THRESHOLD_STROKE = '#E05A2B'
const SUGGEST_STROKE = '#2563eb'
const GUIDE_STROKE = '#64748b'

interface Props {
  values: number[]
  metricLabel: string
  threshold?: ThresholdConfig
  bounds: ThresholdBounds
  /** Write-through to the store. Undefined → read-only (no dragging). */
  onThresholdChange?: (value: number) => void
  /** Suggested threshold from the inverse lookup (drawn in a distinct style). */
  suggestedThreshold?: number | null
  showSmoothed: boolean
  showDkw: boolean
}

export default function CdfChart({
  values,
  metricLabel,
  threshold,
  bounds,
  onThresholdChange,
  suggestedThreshold,
  showSmoothed,
  showDkw,
}: Props) {
  const { t } = useTranslation(['liveOverlay'])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const model = useMemo(() => {
    const finite = values.filter((v) => Number.isFinite(v))
    if (finite.length < 1) return null
    const ecdf = empiricalCdf(finite)
    let lo = Infinity
    let hi = -Infinity
    for (const v of finite) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    if (lo === hi) {
      const eps = Math.max(0.01, Math.abs(lo) * 0.05)
      lo -= eps
      hi += eps
    }
    // Pad the domain so the flat F=0 and F=1 tails are visible and the
    // threshold can be dragged a little beyond the data edges.
    const pad = (hi - lo) * 0.05
    const xLo = lo - pad
    const xHi = hi + pad
    const h = silvermanBandwidth(finite)
    const eps = dkwEpsilon(ecdf.n)
    return { ecdf, xLo, xHi, dataLo: lo, dataHi: hi, h, eps, n: ecdf.n }
  }, [values])

  const innerW = CHART_W - PADDING_LEFT - PADDING_RIGHT
  const innerH = CHART_H - PADDING_TOP - PADDING_BOTTOM

  // Hooks must run unconditionally; compute scales defensively.
  const xLo = model?.xLo ?? 0
  const xHi = model?.xHi ?? 1
  const xScale = (v: number) =>
    PADDING_LEFT + ((v - xLo) / Math.max(1e-9, xHi - xLo)) * innerW
  const pxToValue = (userX: number) =>
    xLo + ((userX - PADDING_LEFT) / Math.max(1e-9, innerW)) * (xHi - xLo)
  const yScale = (f: number) => PADDING_TOP + (1 - Math.min(1, Math.max(0, f))) * innerH

  const { dragging, handlers } = useThresholdDrag({
    svgRef,
    chartWidth: CHART_W,
    pxToValue,
    bounds,
    onChange: onThresholdChange ?? (() => {}),
    enabled: !!onThresholdChange && !!threshold,
  })

  if (!model) {
    return (
      <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure">
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
          {t('liveOverlay:cdf.title', { metric: metricLabel })}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-bark-400 text-center py-12">
          {t('liveOverlay:chart.empty')}
        </div>
      </div>
    )
  }

  const { ecdf, eps, h, n } = model

  // ── Empirical step path ──
  let empiricalPath = `M ${xScale(xLo).toFixed(2)} ${yScale(0).toFixed(2)}`
  let prevF = 0
  for (const s of ecdf.steps) {
    const sx = xScale(s.x).toFixed(2)
    empiricalPath += ` L ${sx} ${yScale(prevF).toFixed(2)} L ${sx} ${yScale(s.f).toFixed(2)}`
    prevF = s.f
  }
  empiricalPath += ` L ${xScale(xHi).toFixed(2)} ${yScale(1).toFixed(2)}`

  // ── Smoothed CDF polyline + DKW band (sampled on a shared grid) ──
  const smoothPts: string[] = []
  const dkwUpper: string[] = []
  const dkwLower: string[] = []
  if (SMOOTH_SAMPLES > 1) {
    const step = (xHi - xLo) / (SMOOTH_SAMPLES - 1)
    for (let i = 0; i < SMOOTH_SAMPLES; i++) {
      const x = xLo + i * step
      const px = xScale(x).toFixed(2)
      if (showSmoothed && n >= 2 && h > 0) {
        smoothPts.push(`${px},${yScale(smoothedCdf(values, x, h)).toFixed(2)}`)
      }
      if (showDkw && eps > 0) {
        const f = ecdf.eval(x)
        dkwUpper.push(`${px},${yScale(Math.min(1, f + eps)).toFixed(2)}`)
        dkwLower.push(`${px},${yScale(Math.max(0, f - eps)).toFixed(2)}`)
      }
    }
  }
  const dkwPolygon = showDkw && dkwUpper.length > 0
    ? [...dkwUpper, ...dkwLower.reverse()].join(' ')
    : null

  // ── Threshold geometry ──
  const fAtThreshold = threshold ? ecdf.eval(threshold.value) : null
  const rawTx = threshold ? xScale(threshold.value) : null
  const thresholdInView =
    rawTx !== null && rawTx >= PADDING_LEFT - 6 && rawTx <= CHART_W - PADDING_RIGHT + 6
  const tx = rawTx !== null
    ? Math.max(PADDING_LEFT, Math.min(CHART_W - PADDING_RIGHT, rawTx))
    : null

  const suggestX = suggestedThreshold != null && Number.isFinite(suggestedThreshold)
    ? Math.max(PADDING_LEFT, Math.min(CHART_W - PADDING_RIGHT, xScale(suggestedThreshold)))
    : null

  // ── Hover readout ──
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const userX = ((e.clientX - rect.left) / rect.width) * CHART_W
    if (userX < PADDING_LEFT || userX > CHART_W - PADDING_RIGHT) {
      setHoverX(null)
      return
    }
    setHoverX(userX)
  }
  function handleMouseLeave() {
    setHoverX(null)
  }
  const hoverValue = hoverX !== null ? pxToValue(hoverX) : null
  const hoverF = hoverValue !== null ? ecdf.eval(hoverValue) : null

  const gridYs: { f: number; label: string }[] = [
    { f: 0, label: '0%' },
    { f: 0.5, label: '50%' },
    { f: 1, label: '100%' },
  ]

  return (
    <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure" aria-label={metricLabel} data-testid="cdf-chart">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
          {t('liveOverlay:cdf.title', { metric: metricLabel })}
        </span>
        <span className="text-[10px] text-gray-500 dark:text-bark-300 tabular-nums">
          {t('liveOverlay:cdf.sampleCount', { n })}
        </span>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ touchAction: 'none' }}
      >
        <rect x={0} y={0} width={CHART_W} height={CHART_H} className="fill-[#fff7ed] dark:fill-bark-800" rx={6} />

        {/* Y gridlines at 0% / 50% / 100% */}
        {gridYs.map((g) => (
          <g key={g.f}>
            <line
              x1={PADDING_LEFT} y1={yScale(g.f)}
              x2={CHART_W - PADDING_RIGHT} y2={yScale(g.f)}
              className="stroke-[#fed7aa] dark:stroke-bark-600"
              strokeWidth={0.8}
            />
            <text x={PADDING_LEFT - 5} y={yScale(g.f) + 3} fontSize={9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
              {g.label}
            </text>
          </g>
        ))}

        {/* DKW band */}
        {dkwPolygon && (
          <polygon points={dkwPolygon} fill={DKW_FILL} pointerEvents="none" />
        )}

        {/* Empirical step CDF */}
        <path d={empiricalPath} fill="none" stroke={EMPIRICAL_STROKE} strokeWidth={1.8} strokeLinejoin="round" />

        {/* Smoothed CDF */}
        {smoothPts.length > 1 && (
          <polyline
            points={smoothPts.join(' ')}
            fill="none"
            stroke={SMOOTH_STROKE}
            strokeWidth={1.4}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}

        {/* F(t) guide line to the y-axis */}
        {threshold && tx !== null && fAtThreshold !== null && thresholdInView && (
          <g pointerEvents="none">
            <line
              x1={PADDING_LEFT} y1={yScale(fAtThreshold)}
              x2={tx} y2={yScale(fAtThreshold)}
              stroke={GUIDE_STROKE}
              strokeDasharray="3 3"
              strokeWidth={0.9}
            />
            <text x={PADDING_LEFT + 3} y={yScale(fAtThreshold) - 3} fontSize={9} fill={GUIDE_STROKE}>
              {t('liveOverlay:cdf.fLabel', { value: (fAtThreshold * 100).toFixed(0) })}
            </text>
          </g>
        )}

        {/* Suggested threshold (inverse lookup) */}
        {suggestX !== null && (
          <g pointerEvents="none">
            <line
              x1={suggestX} y1={PADDING_TOP}
              x2={suggestX} y2={CHART_H - PADDING_BOTTOM}
              stroke={SUGGEST_STROKE}
              strokeDasharray="2 2"
              strokeWidth={1.4}
            />
            <text x={suggestX + 3} y={CHART_H - PADDING_BOTTOM - 4} fontSize={9} fontWeight={700} fill={SUGGEST_STROKE}>
              {t('liveOverlay:cdf.suggestLabel', { value: suggestedThreshold!.toFixed(2) })}
            </text>
          </g>
        )}

        {/* Threshold line + 1-F(t) label */}
        {threshold && tx !== null && thresholdInView && (
          <g>
            <line
              x1={tx} y1={PADDING_TOP}
              x2={tx} y2={CHART_H - PADDING_BOTTOM}
              stroke={THRESHOLD_STROKE}
              strokeDasharray="4 3"
              strokeWidth={1.6}
              pointerEvents="none"
            />
            <text x={tx + 4} y={PADDING_TOP + 11} fontSize={11} fontWeight={700} fill={THRESHOLD_STROKE}>
              {t('liveOverlay:cdf.thresholdLabel', {
                value: threshold.value.toFixed(2),
                survival: fAtThreshold !== null ? ((1 - fAtThreshold) * 100).toFixed(0) : '—',
              })}
            </text>
            {/* Draggable hit-area: widened transparent strip + grip handle. */}
            {onThresholdChange && (
              <g
                onPointerDown={handlers.onPointerDown}
                onPointerMove={handlers.onPointerMove}
                onPointerUp={handlers.onPointerUp}
                style={{ cursor: 'ew-resize' }}
              >
                <rect
                  x={tx - 7}
                  y={PADDING_TOP}
                  width={14}
                  height={CHART_H - PADDING_TOP - PADDING_BOTTOM}
                  fill="transparent"
                />
                <rect
                  x={tx - 4}
                  y={PADDING_TOP}
                  width={8}
                  height={9}
                  rx={2}
                  fill={THRESHOLD_STROKE}
                  data-testid="cdf-threshold-grip"
                />
              </g>
            )}
          </g>
        )}

        {/* Hover readout: vertical guide + tooltip (x, F(x), 1-F(x)) */}
        {hoverX !== null && hoverValue !== null && hoverF !== null && !dragging && (() => {
          const TT_W = 150
          const TT_H = 52
          const wantRight = hoverX + 12 + TT_W <= CHART_W - PADDING_RIGHT
          const ttx = wantRight ? hoverX + 10 : hoverX - 10 - TT_W
          const tty = PADDING_TOP + 4
          return (
            <g pointerEvents="none">
              <line
                x1={hoverX} y1={PADDING_TOP}
                x2={hoverX} y2={CHART_H - PADDING_BOTTOM}
                stroke="#7c2d12"
                strokeDasharray="2 2"
                strokeWidth={0.8}
                opacity={0.6}
              />
              <circle cx={hoverX} cy={yScale(hoverF)} r={2.5} fill={EMPIRICAL_STROKE} />
              <rect x={ttx} y={tty} width={TT_W} height={TT_H} fill="#fff7ed" stroke="#ea580c" strokeWidth={1} rx={4} opacity={0.97} />
              <text x={ttx + 8} y={tty + 15} fontSize={10} fontWeight={700} fill="#7c2d12">
                x = {hoverValue.toFixed(3)}
              </text>
              <text x={ttx + 8} y={tty + 30} fontSize={10} fill="#1f2937">
                {t('liveOverlay:cdf.hoverF', { value: (hoverF * 100).toFixed(1) })}
              </text>
              <text x={ttx + 8} y={tty + 44} fontSize={10} fill="#1f2937">
                {t('liveOverlay:cdf.hoverSurvival', { value: ((1 - hoverF) * 100).toFixed(1) })}
              </text>
            </g>
          )
        })()}

        {/* X-axis min/max labels */}
        <text x={PADDING_LEFT} y={CHART_H - 10} fontSize={9} className="fill-gray-500 dark:fill-bark-300">
          {model.dataLo.toFixed(2)}
        </text>
        <text x={CHART_W - PADDING_RIGHT} y={CHART_H - 10} fontSize={9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
          {model.dataHi.toFixed(2)}
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-bark-300">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-4 h-0.5" style={{ background: EMPIRICAL_STROKE }} />
          {t('liveOverlay:cdf.legendEmpirical')}
        </span>
        {showSmoothed && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-4 h-0.5" style={{ background: SMOOTH_STROKE }} />
            {t('liveOverlay:cdf.legendSmoothed')}
          </span>
        )}
        {showDkw && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-4 h-2 rounded-sm" style={{ background: DKW_FILL }} />
            {t('liveOverlay:cdf.legendDkw')}
          </span>
        )}
      </div>

      {/* Plain-language explanation, always visible. The whole point of
          this view is teaching, so we don't hide the "how to read it"
          behind a toggle. Only mention the smoothed / DKW lines when they
          are actually drawn, and the suggested line only after a lookup. */}
      <div className="mt-3 px-3 py-3 rounded-lg bg-orange-50/80 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 text-[13px] text-gray-800 dark:text-bark-100 leading-relaxed space-y-1.5" data-testid="cdf-explain">
        <div className="font-semibold text-orange-700 dark:text-orange-400">
          🐾 {t('liveOverlay:cdf.explain.title')}
        </div>
        <p>{t('liveOverlay:cdf.explain.intro')}</p>
        <ul className="space-y-1 pl-1">
          <li className="flex gap-2"><span aria-hidden>•</span><span>{t('liveOverlay:cdf.explain.empirical')}</span></li>
          {showSmoothed && (
            <li className="flex gap-2"><span aria-hidden>•</span><span>{t('liveOverlay:cdf.explain.smoothed')}</span></li>
          )}
          {showDkw && (
            <li className="flex gap-2"><span aria-hidden>•</span><span>{t('liveOverlay:cdf.explain.dkw')}</span></li>
          )}
          {threshold && (
            <li className="flex gap-2"><span aria-hidden>•</span><span>{t('liveOverlay:cdf.explain.threshold')}</span></li>
          )}
          {suggestedThreshold != null && Number.isFinite(suggestedThreshold) && (
            <li className="flex gap-2"><span aria-hidden>•</span><span>{t('liveOverlay:cdf.explain.suggest')}</span></li>
          )}
        </ul>
        <p className="font-medium text-orange-800 dark:text-orange-300">
          {t('liveOverlay:cdf.explain.howto')}
        </p>
      </div>
    </div>
  )
}
