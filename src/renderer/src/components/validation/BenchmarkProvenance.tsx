import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CategoryBenchmark,
  ValidationBenchmark,
} from '../../validation/benchmarks'
import { inRange } from '../../validation/wilsonCI'
import { citationShort, citationUrl, CITATIONS } from '../../data/citations'
import { renderWithTerms } from '../results/TermTooltip'
import FormulaBox from './FormulaBox'

/**
 * v2.1 validation rigor upgrade — block C: benchmark provenance.
 *
 * Audit-trail card that sits below the benchmark header. For every
 * category in the benchmark, shows:
 *
 *   - empirical proportion
 *   - observation count n
 *   - 95% Wilson score CI (Wilson 1927)
 *   - source location in the paper (Figure / Table + optional note)
 *   - simulation value and whether it falls inside the CI
 *
 * The point is to let the reader click from "49.2%" back to the
 * paper's Figure 3 right panel, via the CI, without leaving the app.
 * Nothing here is fabricated — the numbers all come from benchmarks.ts,
 * which cites the PDF page and extraction method for every row.
 *
 * Voice: dense fact card, short headings, numerics dominant. No
 * editorialising about whether the simulation is "good" or "bad";
 * the CI membership flag tells that story visually.
 */
export default function BenchmarkProvenance({
  benchmark,
  observedBehavior,
  observedVertical,
  forceOpen = false,
}: {
  benchmark: ValidationBenchmark
  observedBehavior: Record<string, number>
  observedVertical: Record<string, number>
  /** v2.2: when true, always render the provenance body (used by print layout). */
  forceOpen?: boolean
}) {
  const { t } = useTranslation('validation')
  const [open, setOpen] = useState(false)
  const isOpen = open || forceOpen

  const wilsonCitation = CITATIONS.wilson1927ci

  return (
    <section className="mt-3 rounded-xl ring-1 ring-inset ring-slate-200 dark:ring-bark-600 bg-slate-50/60 dark:bg-bark-700/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left print:hidden"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-slate-700 dark:text-bark-100">
          📜 {t('provenance.title')}
        </span>
        <span className="text-xs text-slate-500 dark:text-bark-400">
          {isOpen ? t('provenance.collapse') : t('provenance.expand')}
        </span>
      </button>
      <div className="hidden print:block px-4 pt-3 pb-1 text-sm font-bold text-slate-700">
        📜 {t('provenance.title')}
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 text-xs text-gray-700 dark:text-bark-200 leading-relaxed space-y-4">
          <p>
            {renderWithTerms(t('provenance.intro'))}{' '}
            <a
              href={citationUrl(wilsonCitation)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-700 dark:text-slate-200 underline decoration-dotted underline-offset-2"
            >
              {citationShort(wilsonCitation)}
            </a>
            .
          </p>

          <FormulaBox
            label={t('provenance.wilsonFormulaLabel')}
            tex="\mathrm{CI}_{95\%} = \frac{\hat{p} + \frac{z^2}{2n} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}"
            hint={t('provenance.wilsonFormulaHint')}
            parts={[
              { symbol: '\\hat{p}', partKey: 'phat' },
              { symbol: 'n', partKey: 'nSize' },
              { symbol: 'z', partKey: 'zValue' },
              { symbol: '\\frac{z^2}{2n}', partKey: 'biasTerm' },
              { symbol: '\\pm', partKey: 'plusMinus' },
            ]}
          >
            <p>{renderWithTerms(t('provenance.wilsonFormulaLong'))}</p>
          </FormulaBox>

          <ProvenanceTable
            title={t('provenance.behaviorTitle')}
            categories={benchmark.catBehavior}
            observed={observedBehavior}
            total={benchmark.catBehaviorTotalN}
          />
          <ProvenanceTable
            title={t('provenance.verticalTitle')}
            categories={benchmark.catVerticalLevel}
            observed={observedVertical}
            total={benchmark.catVerticalLevelTotalN}
          />

          {benchmark.paperStatisticalTests && (
            <PaperStatsCard tests={benchmark.paperStatisticalTests} />
          )}
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────────────────── */

function ProvenanceTable({
  title,
  categories,
  observed,
  total,
}: {
  title: string
  categories: Record<string, CategoryBenchmark>
  observed: Record<string, number>
  total: number
}) {
  const { t } = useTranslation('validation')
  const entries = Object.entries(categories)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {title}
        </h4>
        <span className="text-[11px] text-slate-500 dark:text-bark-400 font-mono">
          n<sub>total</sub> = {total.toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md ring-1 ring-inset ring-slate-200 dark:ring-bark-600 bg-white/80 dark:bg-bark-800/50">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-100/80 dark:bg-bark-700/80 text-slate-700 dark:text-bark-200">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">{t('provenance.colCategory')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('provenance.colProportion')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">n</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('provenance.colCI')}</th>
              <th className="px-2 py-1.5 text-right font-semibold">{t('provenance.colObserved')}</th>
              <th className="px-2 py-1.5 text-center font-semibold">{t('provenance.colInCI')}</th>
              <th className="px-2 py-1.5 text-left font-semibold">{t('provenance.colSource')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, c]) => {
              const obs = observed[key] ?? 0
              const inside = inRange(obs, c.wilsonCI95)
              return (
                <tr
                  key={key}
                  className="border-t border-slate-100 dark:border-bark-600"
                >
                  <td className="px-2 py-1.5 text-gray-800 dark:text-bark-100 align-top">
                    <div className="font-mono">{key}</div>
                    <CategoryGloss categoryKey={key} />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{(c.proportion * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-bark-400">{c.n.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-bark-400">
                    [{(c.wilsonCI95[0] * 100).toFixed(1)}%, {(c.wilsonCI95[1] * 100).toFixed(1)}%]
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-orange-700 dark:text-orange-300">
                    {(obs * 100).toFixed(1)}%
                  </td>
                  <td
                    className={`px-2 py-1.5 text-center font-semibold ${
                      inside
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                    title={
                      inside
                        ? t('provenance.inCIYes')
                        : t('provenance.inCINo')
                    }
                  >
                    {inside ? '✓' : '⚠'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 dark:text-bark-400">
                    <div>{c.source.figureOrTable}</div>
                    {c.source.note && (
                      <div className="text-[10px] text-gray-500 dark:text-bark-500 italic">
                        {c.source.note}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function CategoryGloss({ categoryKey }: { categoryKey: string }) {
  const { t, i18n } = useTranslation('validation')
  const zh = t(`provenance.gloss.${categoryKey}.zh`, { defaultValue: '' })
  const en = t(`provenance.gloss.${categoryKey}.en`, { defaultValue: '' })
  if (!zh && !en) return null
  const isZh = i18n.language?.startsWith('zh')
  const primary = isZh ? zh : en
  const secondary = isZh ? en : zh
  return (
    <div className="mt-0.5 leading-snug">
      {primary && (
        <div className="text-[10.5px] text-gray-600 dark:text-bark-300 font-normal">
          {primary}
        </div>
      )}
      {secondary && (
        <div className="text-[10px] text-gray-400 dark:text-bark-500 italic font-normal">
          {secondary}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function PaperStatsCard({
  tests,
}: {
  tests: { label: string; statistic: string }[]
}) {
  const { t } = useTranslation('validation')
  return (
    <div className="rounded-md bg-amber-100/60 dark:bg-amber-900/30 ring-1 ring-inset ring-amber-300/70 dark:ring-amber-700/50 px-3 py-2">
      <div className="text-[12px] font-bold text-amber-900 dark:text-amber-100 mb-1">
        🧪 {t('provenance.paperStatsTitle')}
      </div>
      <p className="text-[11px] text-amber-900/80 dark:text-amber-100/80 mb-1.5 leading-snug">
        {renderWithTerms(t('provenance.paperStatsIntro'))}
      </p>
      <ul className="space-y-0.5 text-[11px] font-mono text-amber-950 dark:text-amber-100">
        {tests.map((t2, i) => (
          <li key={i}>
            <span className="text-amber-700 dark:text-amber-300">{t2.label}：</span>{' '}
            {t2.statistic}
          </li>
        ))}
      </ul>
    </div>
  )
}
