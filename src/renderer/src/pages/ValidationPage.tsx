import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSimulationStore } from '../store/simulationStore'
import { HIRSCH_2025_BENCHMARK } from '../validation/benchmarks'
import { validateAgainst, type ValidationReport } from '../validation/validator'
import { citationShort, citationUrl } from '../data/citations'
import type { Page } from '../types'

/**
 * v2.0 Epic F: validation mode page.
 *
 * Compares the most recent simulation run's cat-behavior distribution
 * against Hirsch 2025 via chi-square / KS / KL, produces a composite
 * 0-100 score, lists significant deviations with parameter-tweak
 * suggestions, and lets the user download the report as JSON.
 */
export default function ValidationPage({
  onNavigate,
}: {
  onNavigate?: (page: Page) => void
} = {}) {
  const { t } = useTranslation(['validation', 'results'])
  const result = useSimulationStore((s) => s.result)
  const [report, setReport] = useState<ValidationReport | null>(null)

  const benchmark = HIRSCH_2025_BENCHMARK
  const orderedBehaviorKeys = useMemo(
    () => Object.keys(benchmark.catBehavior),
    [benchmark],
  )
  const orderedVerticalKeys = ['FLOOR', 'FURNITURE', 'SHELF']

  function runValidation() {
    if (!result) return
    setReport(validateAgainst(result.metrics, benchmark))
  }

  function downloadReport() {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nekoserve-validation-${report.benchmarkId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-orange-700 dark:text-orange-400">
          {t('pageTitle')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-bark-300 leading-relaxed">
          {t('intro')}
        </p>
      </header>

      {!result && (
        <div className="rounded-lg ring-1 ring-inset ring-amber-300 dark:ring-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {t('needsRun')}
        </div>
      )}

      {result && (
        <section className="rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400">
                {t('benchmark')}
              </div>
              <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                {benchmark.name}
              </div>
              <a
                href={citationUrl(benchmark.source)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 dark:text-amber-400 underline decoration-amber-300 decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {citationShort(benchmark.source)} · DOI: {benchmark.source.doi}
              </a>
              <div className="mt-1 text-[11px] text-gray-500 dark:text-bark-400">
                {t('method')}: {benchmark.method}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runValidation}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-semibold"
              >
                ▶ {t('runValidation')}
              </button>
              {report && (
                <button
                  type="button"
                  onClick={downloadReport}
                  className="rounded-lg ring-1 ring-inset ring-orange-300 text-orange-700 dark:text-orange-400 px-3 py-2 text-xs font-semibold hover:bg-orange-50 dark:hover:bg-bark-600"
                >
                  {t('downloadJson')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {report && (
        <>
          <ScoreCard report={report} />
          {result && <SmallSampleWarning config={result.config} />}
          <FitNoteCard />

          <section className="mt-4 rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
            <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-2">
              {t('rightColumnTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionCompare
                title={t('behaviorCompare')}
                keys={orderedBehaviorKeys}
                expected={benchmark.catBehavior}
                observed={result?.metrics.catBehaviorShare ?? {}}
              />
              <DistributionCompare
                title={t('verticalCompare')}
                keys={orderedVerticalKeys}
                expected={benchmark.catVerticalLevel}
                observed={renormalizeVertical(
                  result?.metrics.catVerticalLevelShare ?? {},
                )}
              />
            </div>
          </section>

          <IssuesCard report={report} onNavigate={onNavigate} />
          <WarningsCard report={report} />
        </>
      )}
    </div>
  )
}

function SmallSampleWarning({
  config,
}: {
  config: { catCount: number; simulationDuration: number }
}) {
  const { t } = useTranslation('validation')
  const catMinutes = config.catCount * config.simulationDuration
  // Hirsch 2025 had 27 cats x 227 hours = ~367,740 cat-minutes; anything under
  // 1000 cat-minutes carries enough sampling noise to swing the composite by
  // 30+ points across seeds.
  if (catMinutes >= 1000) return null
  return (
    <section className="mt-4 rounded-xl ring-1 ring-inset ring-amber-300 dark:ring-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4">
      <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
        ⚠ {t('smallSampleTitle')}
      </h2>
      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
        {t('smallSampleBody', { catMinutes: catMinutes.toLocaleString() })}
      </p>
    </section>
  )
}

function FitNoteCard() {
  const { t } = useTranslation('validation')
  return (
    <section className="mt-4 rounded-xl ring-1 ring-inset ring-amber-200 dark:ring-amber-700/40 bg-amber-50/60 dark:bg-amber-900/15 p-4">
      <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
        {t('fitNoteTitle')}
      </h2>
      <p className="text-xs text-gray-700 dark:text-bark-200 leading-relaxed mb-2">
        {t('fitNoteBody')}
      </p>
      <ul className="text-xs text-gray-700 dark:text-bark-200 leading-relaxed space-y-0.5 list-disc pl-5">
        <li>{t('fitNoteChi')}</li>
        <li>{t('fitNoteKs')}</li>
        <li>{t('fitNoteKl')}</li>
      </ul>
    </section>
  )
}

function ScoreCard({ report }: { report: ValidationReport }) {
  const { t } = useTranslation('validation')
  const { scores } = report
  const color =
    scores.total >= 80
      ? 'text-emerald-700 dark:text-emerald-400'
      : scores.total >= 60
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-red-700 dark:text-red-400'
  const badge =
    scores.passed ? t('passed') : t('failed')
  const badgeColor = scores.passed
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <section className="rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400">
            {t('compositeScore')}
          </div>
          <div className={`text-4xl font-bold tabular-nums ${color}`}>
            {scores.total}
            <span className="text-base text-gray-400 ml-1">/ 100</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
            {badge}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <SubScoreCell
          label={t('subScoreChi')}
          score={scores.subScores.chiSquare}
          raw={scores.chiSquare}
          rawLabel="χ²"
        />
        <SubScoreCell
          label={t('subScoreKs')}
          score={scores.subScores.ksGap}
          raw={scores.ksGap}
          rawLabel="D"
        />
        <SubScoreCell
          label={t('subScoreKl')}
          score={scores.subScores.klDivergence}
          raw={scores.klDivergence}
          rawLabel="D_KL"
        />
      </div>
    </section>
  )
}

function SubScoreCell({
  label,
  score,
  raw,
  rawLabel,
}: {
  label: string
  score: number
  raw: number
  rawLabel: string
}) {
  const { t } = useTranslation('validation')
  const pct = Math.max(0, Math.min(100, score))
  const barColor =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="rounded-md bg-cream-50 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-gray-600 dark:text-bark-300">
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-bark-100">
          {score}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-orange-100 dark:bg-bark-600 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%`, transition: 'width 300ms ease-out' }}
        />
      </div>
      <div className="mt-1 text-[10px] text-gray-500 dark:text-bark-400 tabular-nums">
        {t('rawStat')}: {rawLabel} = {raw}
      </div>
    </div>
  )
}

function DistributionCompare({
  title,
  keys,
  expected,
  observed,
}: {
  title: string
  keys: string[]
  expected: Record<string, number>
  observed: Record<string, number>
}) {
  const { t } = useTranslation('validation')
  const maxBar = Math.max(
    ...keys.map((k) => Math.max(expected[k] ?? 0, observed[k] ?? 0)),
    0.1,
  )
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400 mb-1">
        {title}
      </div>
      <div className="space-y-1.5">
        {keys.map((k) => {
          const e = expected[k] ?? 0
          const o = observed[k] ?? 0
          return (
            <div key={k} className="text-[11px]">
              <div className="flex justify-between">
                <span className="font-mono text-gray-700 dark:text-bark-200">{k}</span>
                <span className="tabular-nums text-gray-500 dark:text-bark-400">
                  {t('expected')} {(e * 100).toFixed(1)}% · {t('observed')} {(o * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-0.5 h-1 flex gap-0.5">
                <div
                  className="h-full bg-amber-300 rounded-l-sm"
                  style={{ width: `${(e / maxBar) * 100}%`, transition: 'width 300ms' }}
                  title={`${t('expected')} ${(e * 100).toFixed(1)}%`}
                />
              </div>
              <div className="mt-0.5 h-1 flex gap-0.5">
                <div
                  className="h-full bg-orange-600 rounded-l-sm"
                  style={{ width: `${(o / maxBar) * 100}%`, transition: 'width 300ms' }}
                  title={`${t('observed')} ${(o * 100).toFixed(1)}%`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IssuesCard({
  report,
  onNavigate,
}: {
  report: ValidationReport
  onNavigate?: (page: Page) => void
}) {
  const { t } = useTranslation('validation')
  if (report.issues.length === 0) {
    return (
      <section className="mt-4 rounded-xl ring-1 ring-inset ring-emerald-200 dark:ring-emerald-700/60 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-800 dark:text-emerald-200">
        {t('noIssues')}
      </section>
    )
  }
  return (
    <section className="mt-4 rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
      <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-2">
        {t('issues')}
      </h2>
      <ul className="space-y-2">
        {report.issues.map((issue, i) => {
          const direction =
            issue.observed > issue.expected ? '↑' : '↓'
          const delta = (issue.observed - issue.expected) * 100
          return (
            <li
              key={`${issue.key}-${i}`}
              className="rounded-md bg-cream-50 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 px-3 py-2 text-xs"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-gray-800 dark:text-bark-100">
                  {issue.key} {direction}
                </span>
                <span className="tabular-nums text-gray-500 dark:text-bark-400">
                  {t('expected')} {(issue.expected * 100).toFixed(1)}% · {t('observed')} {(issue.observed * 100).toFixed(1)}% ({delta > 0 ? '+' : ''}{delta.toFixed(1)}pp)
                </span>
              </div>
              <p className="mt-1 text-gray-600 dark:text-bark-300 leading-snug">
                💡 {t('suggestionHint')} {t(issue.suggestionKey)}
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="mt-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                >
                  {t('goToSettings')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function WarningsCard({ report }: { report: ValidationReport }) {
  const { t } = useTranslation('validation')
  if (report.warnings.length === 0) return null
  return (
    <section className="mt-4 rounded-xl ring-1 ring-inset ring-amber-200 dark:ring-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
      <h2 className="font-bold mb-1">⚠ {t('warnings')}</h2>
      <ul className="list-disc pl-5 space-y-1 text-xs leading-snug">
        {report.warnings.map((w, i) => (
          <li key={i}>{t(w.key, w.params)}</li>
        ))}
      </ul>
    </section>
  )
}

function renormalizeVertical(
  v: Record<string, number>,
): Record<string, number> {
  const keys = ['FLOOR', 'FURNITURE', 'SHELF']
  let total = 0
  const out: Record<string, number> = {}
  for (const k of keys) {
    out[k] = v[k] ?? 0
    total += out[k]
  }
  if (total <= 0) return out
  for (const k of keys) out[k] = out[k] / total
  return out
}
