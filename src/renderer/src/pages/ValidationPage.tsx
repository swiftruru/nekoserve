import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSimulationStore } from '../store/simulationStore'
import {
  HIRSCH_2025_BENCHMARK,
  type CategoryBenchmark,
} from '../validation/benchmarks'
import { validateAgainst, type ValidationReport } from '../validation/validator'
import { generateValidationNarrative } from '../validation/narrative'
import { citationShort, citationUrl } from '../data/citations'
import MethodologySection from '../components/validation/MethodologySection'
import BenchmarkProvenance from '../components/validation/BenchmarkProvenance'
import ChiSquareBreakdown from '../components/validation/ChiSquareBreakdown'
import KSCumulativePlot from '../components/validation/KSCumulativePlot'
import KLContributionBars from '../components/validation/KLContributionBars'
import { isBuiltInScenarioId } from '../data/scenarios'
import type { Page } from '../types'

/**
 * Convert a benchmark's {category -> CategoryBenchmark} record into
 * the {category -> proportion} shape the distribution compare bars
 * and the bare-number visualisations expect.
 */
function toProportionMap(
  record: Record<string, CategoryBenchmark>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of Object.keys(record)) out[key] = record[key].proportion
  return out
}

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
  const { t } = useTranslation(['validation', 'results', 'scenarios'])
  const result = useSimulationStore((s) => s.result)
  const lastRunScenarioId = useSimulationStore((s) => s.lastRunScenarioId)
  const [report, setReport] = useState<ValidationReport | null>(null)
  /** v2.2: briefly force all collapsed sections open during a print window. */
  const [printMode, setPrintMode] = useState(false)

  const benchmark = HIRSCH_2025_BENCHMARK
  const orderedBehaviorKeys = useMemo(
    () => Object.keys(benchmark.catBehavior),
    [benchmark],
  )
  const orderedVerticalKeys = ['FLOOR', 'FURNITURE', 'SHELF']

  function runValidation() {
    if (!result) return
    const scenarioId = lastRunScenarioId ?? 'custom'
    setReport(
      validateAgainst(result.metrics, benchmark, {
        scenarioId,
        config: result.config,
      }),
    )
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

  function printReport() {
    setPrintMode(true)
    // Two rAFs so the force-opened sections commit to the DOM before
    // we sample the font list. Then await document.fonts.ready so the
    // print snapshot picks up every KaTeX subset — otherwise large
    // operators like Σ (KaTeX_Size2) can race and render as empty.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          if (document.fonts && typeof document.fonts.ready?.then === 'function') {
            await document.fonts.ready
          }
        } catch {
          // fonts API unavailable — proceed anyway
        }
        window.print()
        // Small tail timeout so the print dialog gets a chance to finish
        // rendering before we collapse back. The user can always re-print.
        setTimeout(() => setPrintMode(false), 500)
      })
    })
  }

  /** Turn a scenarioId into its translated display name. */
  function scenarioLabel(id: string): string {
    if (id === 'custom') return t('validation:runContext.customScenario')
    if (isBuiltInScenarioId(id)) return t(`scenarios:${id}.name` as const)
    return id
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

      {/* v2.2: printed-page header, only visible in print output. */}
      {report?.runContext && (
        <div className="hidden print:block mb-3 pb-2 border-b border-gray-300 text-xs text-gray-600">
          NekoServe Validation Report · {scenarioLabel(report.runContext.scenarioId)} · {new Date(report.ranAt).toLocaleString()}
        </div>
      )}

      {report?.runContext && (
        <RunContextCard
          ctx={report.runContext}
          ranAt={report.ranAt}
          scenarioLabel={scenarioLabel(report.runContext.scenarioId)}
        />
      )}

      <MethodologySection forceOpen={printMode} />

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
                <>
                  <button
                    type="button"
                    onClick={downloadReport}
                    className="rounded-lg ring-1 ring-inset ring-orange-300 text-orange-700 dark:text-orange-400 px-3 py-2 text-xs font-semibold hover:bg-orange-50 dark:hover:bg-bark-600 print:hidden"
                  >
                    {t('downloadJson')}
                  </button>
                  <button
                    type="button"
                    onClick={printReport}
                    className="rounded-lg ring-1 ring-inset ring-orange-300 text-orange-700 dark:text-orange-400 px-3 py-2 text-xs font-semibold hover:bg-orange-50 dark:hover:bg-bark-600 print:hidden"
                  >
                    🖨️ {t('printButton')}
                  </button>
                </>
              )}
            </div>
          </div>

          <BenchmarkProvenance
            benchmark={benchmark}
            observedBehavior={result.metrics.catBehaviorShare ?? {}}
            observedVertical={renormalizeVertical(
              result.metrics.catVerticalLevelShare ?? {},
            )}
            observedArea={result.metrics.catAreaShare}
            forceOpen={printMode}
          />
        </section>
      )}

      {report && (
        <>
          <ScoreCard
            report={report}
            observedBehavior={result?.metrics.catBehaviorShare ?? {}}
            expectedBehavior={toProportionMap(benchmark.catBehavior)}
            orderedBehaviorKeys={orderedBehaviorKeys}
            sampleN={benchmark.catBehaviorTotalN}
            forceOpenAll={printMode}
          />
          <NarrativeCard report={report} />
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
                expected={toProportionMap(benchmark.catBehavior)}
                observed={result?.metrics.catBehaviorShare ?? {}}
              />
              <DistributionCompare
                title={t('verticalCompare')}
                keys={orderedVerticalKeys}
                expected={toProportionMap(benchmark.catVerticalLevel)}
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

type MetricKey = 'chi' | 'ks' | 'kl'

function ScoreCard({
  report,
  observedBehavior,
  expectedBehavior,
  orderedBehaviorKeys,
  sampleN,
  forceOpenAll = false,
}: {
  report: ValidationReport
  observedBehavior: Record<string, number>
  expectedBehavior: Record<string, number>
  orderedBehaviorKeys: string[]
  sampleN: number
  /** v2.2: when true, render all three drilldowns at once (for print). */
  forceOpenAll?: boolean
}) {
  const { t } = useTranslation('validation')
  const { scores } = report
  const [expanded, setExpanded] = useState<MetricKey | null>(null)
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

  function toggle(metric: MetricKey) {
    setExpanded((cur) => (cur === metric ? null : metric))
  }

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
          expanded={expanded === 'chi'}
          onToggle={() => toggle('chi')}
        />
        <SubScoreCell
          label={t('subScoreKs')}
          score={scores.subScores.ksGap}
          raw={scores.ksGap}
          rawLabel="D"
          expanded={expanded === 'ks'}
          onToggle={() => toggle('ks')}
        />
        <SubScoreCell
          label={t('subScoreKl')}
          score={scores.subScores.klDivergence}
          raw={scores.klDivergence}
          rawLabel="D_KL"
          expanded={expanded === 'kl'}
          onToggle={() => toggle('kl')}
        />
      </div>

      {forceOpenAll ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50/70 dark:bg-bark-800/60 p-3">
            <ChiSquareBreakdown
              observed={observedBehavior}
              expected={expectedBehavior}
              orderedKeys={orderedBehaviorKeys}
              chiSquare={scores.chiSquare}
            />
          </div>
          <div className="rounded-lg ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50/70 dark:bg-bark-800/60 p-3">
            <KSCumulativePlot
              observed={observedBehavior}
              expected={expectedBehavior}
              orderedKeys={orderedBehaviorKeys}
              ksGap={scores.ksGap}
              sampleN={sampleN}
            />
          </div>
          <div className="rounded-lg ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50/70 dark:bg-bark-800/60 p-3">
            <KLContributionBars
              observed={observedBehavior}
              expected={expectedBehavior}
              orderedKeys={orderedBehaviorKeys}
              klDivergence={scores.klDivergence}
            />
          </div>
        </div>
      ) : (
        expanded && (
          <div className="mt-3 rounded-lg ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-cream-50/70 dark:bg-bark-800/60 p-3">
            {expanded === 'chi' && (
              <ChiSquareBreakdown
                observed={observedBehavior}
                expected={expectedBehavior}
                orderedKeys={orderedBehaviorKeys}
                chiSquare={scores.chiSquare}
              />
            )}
            {expanded === 'ks' && (
              <KSCumulativePlot
                observed={observedBehavior}
                expected={expectedBehavior}
                orderedKeys={orderedBehaviorKeys}
                ksGap={scores.ksGap}
                sampleN={sampleN}
              />
            )}
            {expanded === 'kl' && (
              <KLContributionBars
                observed={observedBehavior}
                expected={expectedBehavior}
                orderedKeys={orderedBehaviorKeys}
                klDivergence={scores.klDivergence}
              />
            )}
          </div>
        )
      )}
    </section>
  )
}

function RunContextCard({
  ctx,
  ranAt,
  scenarioLabel,
}: {
  ctx: NonNullable<ValidationReport['runContext']>
  ranAt: string
  scenarioLabel: string
}) {
  const { t } = useTranslation('validation')
  const catMinutes = ctx.catCount * ctx.simulationDuration
  const rows: { label: string; value: string }[] = [
    { label: t('runContext.scenario'), value: scenarioLabel },
    { label: t('runContext.seed'), value: String(ctx.seed) },
    {
      label: t('runContext.duration'),
      value:
        ctx.warmUpDuration > 0
          ? t('runContext.durationWithWarmUp', {
              main: ctx.simulationDuration,
              warmUp: ctx.warmUpDuration,
            })
          : t('runContext.durationMinutes', { main: ctx.simulationDuration }),
    },
    {
      label: t('runContext.effectiveSample'),
      value: t('runContext.effectiveSampleValue', {
        catCount: ctx.catCount,
        duration: ctx.simulationDuration,
        total: catMinutes.toLocaleString(),
      }),
    },
    {
      label: t('runContext.ranAt'),
      value: new Date(ranAt).toLocaleString(),
    },
  ]
  return (
    <section
      aria-label={t('runContext.title')}
      className="mb-4 rounded-xl ring-1 ring-inset ring-slate-200 dark:ring-bark-600 bg-slate-50/70 dark:bg-bark-700/50 px-4 py-3"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-bark-400 mb-2">
        {t('runContext.title')}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-2">
            <dt className="text-slate-500 dark:text-bark-400 shrink-0">
              {r.label}
            </dt>
            <dd className="font-semibold text-slate-800 dark:text-bark-100 tabular-nums truncate">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function NarrativeCard({ report }: { report: ValidationReport }) {
  const { t } = useTranslation('validation')
  const narrative = useMemo(() => generateValidationNarrative(report), [report])
  const tone =
    narrative.tier === 'pass'
      ? {
          ring: 'ring-emerald-200 dark:ring-emerald-700/60',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          text: 'text-emerald-900 dark:text-emerald-100',
          label: 'text-emerald-700 dark:text-emerald-300',
        }
      : narrative.tier === 'marginal'
      ? {
          ring: 'ring-amber-200 dark:ring-amber-700/60',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          text: 'text-amber-900 dark:text-amber-100',
          label: 'text-amber-700 dark:text-amber-300',
        }
      : {
          ring: 'ring-red-200 dark:ring-red-700/60',
          bg: 'bg-red-50 dark:bg-red-900/20',
          text: 'text-red-900 dark:text-red-100',
          label: 'text-red-700 dark:text-red-300',
        }

  const { scores } = report
  const lead = t(`narrative.${narrative.tier}.lead`, {
    total: scores.total,
    chi: scores.chiSquare,
    ks: scores.ksGap,
    kl: scores.klDivergence,
  })
  const weakestDimLabel = t(`narrative.dim.${narrative.weakestDim}`)
  const weakestDimScore = scores.subScores[narrative.weakestDim]
  const weakestLine = t(`narrative.${narrative.tier}.weakest`, {
    dim: weakestDimLabel,
    score: weakestDimScore,
  })
  const suggestion = narrative.weakestCategory
    ? t('narrative.suggestionWithCategory', {
        category: narrative.weakestCategory.key,
        delta:
          ((narrative.weakestCategory.observed -
            narrative.weakestCategory.expected) *
            100).toFixed(1),
        advice: t(narrative.weakestCategory.suggestionKey),
      })
    : t(`narrative.${narrative.tier}.suggestionFallback`)

  return (
    <section
      className={`mt-4 rounded-xl ring-1 ring-inset ${tone.ring} ${tone.bg} p-4`}
      aria-label={t('narrative.ariaLabel')}
    >
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${tone.label} mb-1.5`}>
        {t('narrative.heading')}
      </div>
      <p className={`text-sm leading-relaxed ${tone.text}`}>
        {lead}
      </p>
      <p className={`mt-1.5 text-sm leading-relaxed ${tone.text}`}>
        {weakestLine}
      </p>
      <p className={`mt-1.5 text-sm leading-relaxed ${tone.text}`}>
        {suggestion}
      </p>
    </section>
  )
}

function SubScoreCell({
  label,
  score,
  raw,
  rawLabel,
  expanded,
  onToggle,
}: {
  label: string
  score: number
  raw: number
  rawLabel: string
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('validation')
  const pct = Math.max(0, Math.min(100, score))
  const barColor =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`text-left rounded-md px-3 py-2 ring-1 ring-inset transition-colors ${
        expanded
          ? 'bg-orange-50 dark:bg-bark-700 ring-orange-300 dark:ring-orange-500'
          : 'bg-cream-50 dark:bg-bark-800/60 ring-orange-100 dark:ring-bark-600 hover:bg-orange-50/60 dark:hover:bg-bark-700/60'
      }`}
    >
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
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 dark:text-bark-400 tabular-nums">
          {t('rawStat')}: {rawLabel} = {raw}
        </span>
        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
          {expanded ? t('breakdown.collapse') : t('breakdown.expand')}
        </span>
      </div>
    </button>
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
