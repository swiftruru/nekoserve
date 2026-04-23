import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  chiSquareCritical05,
  chiSquarePValue,
} from '../../validation/statisticalInterpretation'
import { renderWithTerms } from '../results/TermTooltip'
import FormulaBox from './FormulaBox'

/**
 * v2.1 validation rigor upgrade — block B.1: chi-square breakdown.
 *
 * Expands the χ² score card into the per-category contribution table
 * behind it. For each of the 9 behavior categories, shows:
 *
 *   observed  expected  residual  standardized residual  contribution
 *
 * The "contribution" column is also rendered as a horizontal bar so
 * you can spot at a glance which category drives the χ² statistic.
 *
 * Formula reminder:
 *
 *   contribution(i) = (O_i − E_i)² / E_i
 *   χ²              = Σ contribution(i)
 *   std residual    = (O_i − E_i) / √E_i
 *
 * The bottom row sums to the χ² shown in the score card. The p-value
 * label is a coarse Agresti-2013-table bucket, intended for a
 * "significant / not significant" read, not for a decision rule.
 */
export default function ChiSquareBreakdown({
  observed,
  expected,
  orderedKeys,
  chiSquare,
}: {
  observed: Record<string, number>
  expected: Record<string, number>
  orderedKeys: string[]
  chiSquare: number
}) {
  const { t } = useTranslation('validation')

  const rows = useMemo(() => {
    return orderedKeys.map((key) => {
      const o = observed[key] ?? 0
      const e = expected[key] ?? 0
      const residual = o - e
      const stdResidual = e > 0 ? residual / Math.sqrt(e) : 0
      const contribution = e > 0 ? (residual * residual) / e : 0
      return { key, o, e, residual, stdResidual, contribution }
    })
  }, [observed, expected, orderedKeys])

  const totalContribution = rows.reduce((s, r) => s + r.contribution, 0)
  const maxContribution = Math.max(...rows.map((r) => r.contribution), 1e-12)

  const df = orderedKeys.length - 1
  const pBucket = chiSquarePValue(chiSquare, df)
  const crit05 = chiSquareCritical05(df)

  return (
    <div className="text-[11px] text-gray-700 dark:text-bark-200">
      <h4 className="text-[12px] font-bold text-gray-800 dark:text-bark-100 mb-1.5">
        {t('breakdown.chi.heading')}
      </h4>
      <p className="mb-2 leading-snug text-gray-600 dark:text-bark-300">
        {renderWithTerms(t('breakdown.chi.intro'))}
      </p>

      <FormulaBox
        label={t('breakdown.chi.formulaLabel')}
        tex="\chi^2 = \sum_{i=1}^{k} \frac{(O_i - E_i)^2}{E_i}"
        hint={t('breakdown.chi.formulaHint')}
        parts={[
          { symbol: '\\chi^2', partKey: 'chiStat' },
          { symbol: 'O_i', partKey: 'obsO' },
          { symbol: 'E_i', partKey: 'expE' },
          { symbol: '(O_i - E_i)^2', partKey: 'residualSquared' },
          { symbol: '\\sum', partKey: 'sigmaSum' },
          { symbol: 'k', partKey: 'kCategories' },
        ]}
      >
        <p className="mb-1">{renderWithTerms(t('breakdown.chi.formulaLong'))}</p>
      </FormulaBox>

      <div className="overflow-x-auto rounded-md ring-1 ring-inset ring-gray-200 dark:ring-bark-600 bg-white/80 dark:bg-bark-800/50">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-100/80 dark:bg-bark-700/80 text-gray-700 dark:text-bark-200">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">{t('breakdown.chi.colCategory')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.chi.colObserved')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.chi.colExpected')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.chi.colResidual')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.chi.colStdResidual')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('breakdown.chi.colContribution')}</th>
              <th className="px-2 py-1.5 text-left font-semibold w-28">{t('breakdown.chi.colShare')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const barWidth = (r.contribution / maxContribution) * 100
              const shareOfTotal =
                totalContribution > 0
                  ? (r.contribution / totalContribution) * 100
                  : 0
              return (
                <tr
                  key={r.key}
                  className="border-t border-gray-100 dark:border-bark-600"
                >
                  <td className="px-2 py-1.5 font-mono text-gray-800 dark:text-bark-100">{r.key}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.o.toFixed(3)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.e.toFixed(3)}</td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      r.residual >= 0
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    {r.residual >= 0 ? '+' : ''}
                    {r.residual.toFixed(4)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      Math.abs(r.stdResidual) >= 2
                        ? 'font-bold text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-bark-400'
                    }`}
                  >
                    {r.stdResidual >= 0 ? '+' : ''}
                    {r.stdResidual.toFixed(4)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                    {r.contribution.toFixed(5)}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 flex-1 min-w-[40px] rounded-full bg-gray-100 dark:bg-bark-700 overflow-hidden">
                        <div
                          className="h-full bg-orange-400 dark:bg-orange-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-bark-400 tabular-nums w-10 text-right">
                        {shareOfTotal.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-gray-300 dark:border-bark-500 bg-gray-50/60 dark:bg-bark-700/50 font-semibold">
              <td className="px-2 py-1.5 text-gray-800 dark:text-bark-100">{t('breakdown.chi.totalRow')}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">1.000</td>
              <td className="px-2 py-1.5 text-right tabular-nums">1.000</td>
              <td className="px-2 py-1.5">—</td>
              <td className="px-2 py-1.5">—</td>
              <td className="px-2 py-1.5 text-right tabular-nums">χ² = {totalContribution.toFixed(5)}</td>
              <td className="px-2 py-1.5 text-[10px] text-gray-500 dark:text-bark-400">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60 px-3 py-2 text-[11px] text-indigo-900 dark:text-indigo-100 leading-snug">
        <strong>{t('breakdown.chi.interpretLabel')}：</strong>{' '}
        {renderWithTerms(
          t('breakdown.chi.interpretBody', {
            chi: chiSquare.toFixed(5),
            df,
            crit: crit05.toFixed(2),
            pBucket,
          }),
        )}
      </div>
    </div>
  )
}
