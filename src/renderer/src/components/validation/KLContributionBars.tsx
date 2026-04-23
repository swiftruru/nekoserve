import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { klFidelity } from '../../validation/statisticalInterpretation'
import { renderWithTerms } from '../results/TermTooltip'
import FormulaBox from './FormulaBox'

/**
 * v2.1 validation rigor upgrade — block B.3: KL contribution bars.
 *
 * Each category contributes `p · log(p / q)` nats to the total KL(P‖Q).
 * A positive contribution means the simulation puts too much mass on
 * that category (relative to the empirical); a negative contribution
 * means too little. Visualising the signed contributions shows where
 * the model is "over-committing" and where it's "under-committing"
 * probability mass.
 *
 * The small values use natural log (nats) to match standard statistical
 * convention. `exp(−KL)` is reported alongside as an intuitive
 * "approximation fidelity" reading (KL = 0 → 100%, KL = 0.1 → 90%, etc.)
 *
 * Numerical note: both p and q are clamped to 1e-9 to avoid log(0).
 * This matches the clamp in validator.ts klDivergence().
 */
export default function KLContributionBars({
  observed,
  expected,
  orderedKeys,
  klDivergence,
}: {
  observed: Record<string, number>
  expected: Record<string, number>
  orderedKeys: string[]
  klDivergence: number
}) {
  const { t } = useTranslation('validation')
  const EPS = 1e-9

  const rows = useMemo(() => {
    return orderedKeys.map((key) => {
      const p = Math.max(observed[key] ?? 0, EPS)
      const q = Math.max(expected[key] ?? 0, EPS)
      const logRatio = Math.log(p / q)
      const contribution = p * logRatio
      return { key, p, q, logRatio, contribution }
    })
  }, [observed, expected, orderedKeys])

  const sum = rows.reduce((s, r) => s + r.contribution, 0)
  const maxAbs = Math.max(
    ...rows.map((r) => Math.abs(r.contribution)),
    1e-12,
  )
  const fidelity = klFidelity(klDivergence)

  return (
    <div className="text-[11px] text-gray-700 dark:text-bark-200">
      <h4 className="text-[12px] font-bold text-gray-800 dark:text-bark-100 mb-1.5">
        {t('breakdown.kl.heading')}
      </h4>
      <p className="mb-2 leading-snug text-gray-600 dark:text-bark-300">
        {renderWithTerms(t('breakdown.kl.intro'))}
      </p>

      <FormulaBox
        label={t('breakdown.kl.formulaLabel')}
        tex="D_{\mathrm{KL}}(P \Vert Q) = \sum_{i=1}^{k} p_i \log \frac{p_i}{q_i}"
        hint={t('breakdown.kl.formulaHint')}
        parts={[
          { symbol: 'D_{\\mathrm{KL}}', partKey: 'dkl' },
          { symbol: 'P', partKey: 'pDist' },
          { symbol: 'Q', partKey: 'qDist' },
          { symbol: 'p_i', partKey: 'pi' },
          { symbol: 'q_i', partKey: 'qi' },
          { symbol: '\\log \\frac{p_i}{q_i}', partKey: 'logRatio' },
        ]}
      >
        <p>{renderWithTerms(t('breakdown.kl.formulaLong'))}</p>
      </FormulaBox>

      <div className="rounded-md ring-1 ring-inset ring-gray-200 dark:ring-bark-600 bg-white/80 dark:bg-bark-800/50 p-2 space-y-1">
        {rows.map((r) => {
          const positive = r.contribution >= 0
          const barWidth = (Math.abs(r.contribution) / maxAbs) * 50
          return (
            <div key={r.key} className="flex items-center gap-2 text-[10.5px]">
              <span className="font-mono w-28 shrink-0 text-gray-800 dark:text-bark-100">
                {r.key}
              </span>
              <span className="tabular-nums w-20 shrink-0 text-right text-gray-600 dark:text-bark-400">
                p = {(r.p * 100).toFixed(1)}%
              </span>
              <span className="tabular-nums w-20 shrink-0 text-right text-gray-600 dark:text-bark-400">
                q = {(r.q * 100).toFixed(1)}%
              </span>

              {/* Divergent bar: centered at midline, extends left/right */}
              <div className="flex-1 relative h-3 bg-gray-50 dark:bg-bark-700/40 rounded-sm">
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400/60 dark:bg-bark-500" />
                {positive ? (
                  <div
                    className="absolute top-0 bottom-0 left-1/2 bg-orange-400 dark:bg-orange-500 rounded-r-sm"
                    style={{ width: `${barWidth}%` }}
                    title={`+${r.contribution.toFixed(5)} nats`}
                  />
                ) : (
                  <div
                    className="absolute top-0 bottom-0 right-1/2 bg-sky-400 dark:bg-sky-500 rounded-l-sm"
                    style={{ width: `${barWidth}%` }}
                    title={`${r.contribution.toFixed(5)} nats`}
                  />
                )}
              </div>

              <span
                className={`tabular-nums w-24 shrink-0 text-right font-semibold ${
                  positive
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-sky-700 dark:text-sky-300'
                }`}
              >
                {positive ? '+' : ''}
                {r.contribution.toFixed(5)}
              </span>
            </div>
          )
        })}

        <div className="flex items-center gap-2 text-[10.5px] pt-1 border-t border-gray-200 dark:border-bark-600 font-semibold text-gray-800 dark:text-bark-100">
          <span className="w-28 shrink-0">{t('breakdown.kl.totalRow')}</span>
          <span className="w-20 shrink-0 text-right">1.000</span>
          <span className="w-20 shrink-0 text-right">1.000</span>
          <div className="flex-1" />
          <span className="tabular-nums w-24 shrink-0 text-right">
            {sum.toFixed(5)} nats
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-bark-400 pl-1">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-orange-400 dark:bg-orange-500" />
          {t('breakdown.kl.legendOver')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-sky-400 dark:bg-sky-500" />
          {t('breakdown.kl.legendUnder')}
        </span>
      </div>

      <div className="mt-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60 px-3 py-2 text-[11px] text-indigo-900 dark:text-indigo-100 leading-snug">
        <strong>{t('breakdown.kl.interpretLabel')}：</strong>{' '}
        {renderWithTerms(
          t('breakdown.kl.interpretBody', {
            kl: klDivergence.toFixed(5),
            fidelity: (fidelity * 100).toFixed(1),
            loss: ((1 - fidelity) * 100).toFixed(2),
          }),
        )}
      </div>
    </div>
  )
}
