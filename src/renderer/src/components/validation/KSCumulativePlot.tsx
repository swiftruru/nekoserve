import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ksCritical05,
  ksPValue,
} from '../../validation/statisticalInterpretation'
import { renderWithTerms } from '../results/TermTooltip'
import FormulaBox from './FormulaBox'

/**
 * v2.1 validation rigor upgrade — block B.2: KS cumulative overlay.
 *
 * Renders the KS max-gap visually: two CDFs (empirical + simulation)
 * drawn on the same axis, with a vertical guide at the category where
 * the max absolute gap occurs. The side table lists the running
 * cumulative O, E, and |O−E| so the visual and the numbers stay in
 * sync.
 *
 * This is the visualisation the score card is lacking: "D = 0.0791"
 * doesn't tell you whether the mismatch is evenly spread or
 * concentrated. The overlay answers that at a glance.
 *
 * The statistical interpretation below notes the tension between
 * "p < 0.001 at n = 8,547" (strict KS says reject) and our soft-cap
 * mapping to a 74-point pass-level score. We spell this out honestly
 * so the reader sees the design choice, not a hidden fudge.
 */
export default function KSCumulativePlot({
  observed,
  expected,
  orderedKeys,
  ksGap,
  sampleN,
}: {
  observed: Record<string, number>
  expected: Record<string, number>
  orderedKeys: string[]
  ksGap: number
  /** The n used to compute KS critical values (Hirsch 2025 total scans). */
  sampleN: number
}) {
  const { t } = useTranslation('validation')

  const rows = useMemo(() => {
    let cumO = 0
    let cumE = 0
    const out = orderedKeys.map((key) => {
      cumO += observed[key] ?? 0
      cumE += expected[key] ?? 0
      return {
        key,
        cumO,
        cumE,
        gap: Math.abs(cumO - cumE),
      }
    })
    return out
  }, [observed, expected, orderedKeys])

  const maxGapIdx = rows.reduce(
    (maxI, r, i) => (r.gap > rows[maxI].gap ? i : maxI),
    0,
  )

  const crit05 = ksCritical05(sampleN)
  const pBucket = ksPValue(ksGap, sampleN)

  // ─── SVG geometry ──────────────────────────────────────
  const W = 600
  const H = 200
  const PAD_L = 40
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 36
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  function xAt(i: number): number {
    return PAD_L + (i / (rows.length - 1)) * plotW
  }
  function yAt(p: number): number {
    return PAD_T + (1 - p) * plotH
  }

  const empiricalPoints = rows
    .map((r, i) => `${xAt(i)},${yAt(r.cumE)}`)
    .join(' ')
  const simulationPoints = rows
    .map((r, i) => `${xAt(i)},${yAt(r.cumO)}`)
    .join(' ')

  const maxRow = rows[maxGapIdx]

  return (
    <div className="text-[11px] text-gray-700 dark:text-bark-200">
      <h4 className="text-[12px] font-bold text-gray-800 dark:text-bark-100 mb-1.5">
        {t('breakdown.ks.heading')}
      </h4>
      <p className="mb-2 leading-snug text-gray-600 dark:text-bark-300">
        {renderWithTerms(t('breakdown.ks.intro'))}
      </p>

      <FormulaBox
        label={t('breakdown.ks.formulaLabel')}
        tex="D = \max_{x} \bigl| F_{\text{sim}}(x) - F_{\text{emp}}(x) \bigr|"
        hint={t('breakdown.ks.formulaHint')}
        parts={[
          { symbol: 'D', partKey: 'ksD' },
          { symbol: 'F_{\\text{sim}}', partKey: 'fSim' },
          { symbol: 'F_{\\text{emp}}', partKey: 'fEmp' },
          { symbol: '\\max_x', partKey: 'maxOp' },
          { symbol: '|\\cdot|', partKey: 'absValue' },
        ]}
      >
        <p>{renderWithTerms(t('breakdown.ks.formulaLong'))}</p>
      </FormulaBox>

      <div className="rounded-md ring-1 ring-inset ring-gray-200 dark:ring-bark-600 bg-white/80 dark:bg-bark-800/50 p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('breakdown.ks.svgAlt')}
        >
          {/* axes */}
          <line
            x1={PAD_L}
            y1={H - PAD_B}
            x2={W - PAD_R}
            y2={H - PAD_B}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1"
          />
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={H - PAD_B}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1"
          />

          {/* Y gridlines at 0 / 0.5 / 1 */}
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={yAt(v)}
                x2={W - PAD_R}
                y2={yAt(v)}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <text
                x={PAD_L - 6}
                y={yAt(v) + 3}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                opacity="0.6"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Empirical CDF (amber / expected) */}
          <polyline
            points={empiricalPoints}
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {rows.map((r, i) => (
            <circle
              key={`e-${r.key}`}
              cx={xAt(i)}
              cy={yAt(r.cumE)}
              r="3"
              fill="#d97706"
            />
          ))}

          {/* Simulation CDF (orange) */}
          <polyline
            points={simulationPoints}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {rows.map((r, i) => (
            <circle
              key={`s-${r.key}`}
              cx={xAt(i)}
              cy={yAt(r.cumO)}
              r="3"
              fill="#ea580c"
            />
          ))}

          {/* Max-gap indicator */}
          <line
            x1={xAt(maxGapIdx)}
            y1={yAt(maxRow.cumE)}
            x2={xAt(maxGapIdx)}
            y2={yAt(maxRow.cumO)}
            stroke="#dc2626"
            strokeWidth="2"
          />
          <circle
            cx={xAt(maxGapIdx)}
            cy={yAt(Math.max(maxRow.cumE, maxRow.cumO))}
            r="4"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.5"
          />
          <text
            x={xAt(maxGapIdx) + 8}
            y={yAt((maxRow.cumE + maxRow.cumO) / 2) + 4}
            fontSize="11"
            fontWeight="bold"
            fill="#dc2626"
          >
            D = {ksGap.toFixed(4)}
          </text>

          {/* X-axis category labels */}
          {rows.map((r, i) => (
            <text
              key={`x-${r.key}`}
              x={xAt(i)}
              y={H - PAD_B + 14}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              opacity="0.65"
              transform={`rotate(-28 ${xAt(i)} ${H - PAD_B + 14})`}
            >
              {r.key}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] mt-1 pl-10 text-gray-600 dark:text-bark-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-amber-600" />
            {t('breakdown.ks.legendEmpirical')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-orange-600" />
            {t('breakdown.ks.legendSimulation')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-red-600" />
            {t('breakdown.ks.legendMaxGap')}
          </span>
        </div>
      </div>

      {/* Cumulative table */}
      <div className="mt-2 overflow-x-auto rounded-md ring-1 ring-inset ring-gray-200 dark:ring-bark-600 bg-white/80 dark:bg-bark-800/50">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-100/80 dark:bg-bark-700/80 text-gray-700 dark:text-bark-200">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">{t('breakdown.ks.colCategory')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.ks.colCumObserved')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.ks.colCumExpected')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.ks.colGap')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.key}
                className={`border-t border-gray-100 dark:border-bark-600 ${
                  i === maxGapIdx
                    ? 'bg-red-50 dark:bg-red-900/20 font-semibold'
                    : ''
                }`}
              >
                <td className="px-2 py-1.5 font-mono text-gray-800 dark:text-bark-100">
                  {r.key}
                  {i === maxGapIdx && (
                    <span className="ml-1 text-[9px] text-red-600 dark:text-red-400">
                      ← max
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.cumO.toFixed(4)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.cumE.toFixed(4)}</td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums ${
                    i === maxGapIdx
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-bark-400'
                  }`}
                >
                  {r.gap.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60 px-3 py-2 text-[11px] text-indigo-900 dark:text-indigo-100 leading-snug">
        <strong>{t('breakdown.ks.interpretLabel')}：</strong>{' '}
        {renderWithTerms(
          t('breakdown.ks.interpretBody', {
            d: ksGap.toFixed(4),
            n: sampleN.toLocaleString(),
            crit: crit05.toFixed(4),
            pBucket,
            maxCategory: maxRow.key,
          }),
        )}
      </div>
    </div>
  )
}
