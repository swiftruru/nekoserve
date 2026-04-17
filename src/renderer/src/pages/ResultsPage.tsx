import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult, EventType, BatchResult, SweepResult } from '../types'
import SweepChart from '../components/results/SweepChart'
import WhatIfExplorer from '../components/results/WhatIfExplorer'
import type { HistoryEntry } from '../hooks/useSimulation'
import KpiCard from '../components/KpiCard'
import UtilizationChart from '../components/charts/UtilizationChart'
import WaitTimeChart from '../components/charts/WaitTimeChart'
import CustomerPieChart from '../components/charts/CustomerPieChart'
import ComparisonTable from '../components/ComparisonTable'
import HeroVerdict from '../components/results/HeroVerdict'
import BottleneckCallout from '../components/results/BottleneckCallout'
import ResultsSection from '../components/results/ResultsSection'
import FlowDiagram from '../components/results/FlowDiagram'
import StayBreakdown from '../components/results/StayBreakdown'
import QueueTimeSeries from '../components/results/QueueTimeSeries'
import WaitHistogram from '../components/results/WaitHistogram'
import KeyMomentsTimeline from '../components/results/KeyMomentsTimeline'
import KingmanPrediction from '../components/results/KingmanPrediction'
import UtilizationTimeSeries from '../components/results/UtilizationTimeSeries'
import StayDistribution from '../components/results/StayDistribution'
import type { LearningLevel } from '../components/learning/types'
import { BlockMath } from '../components/Math'
import { renderWithTerms } from '../components/results/TermTooltip'
import { generateVerdict } from '../utils/verdict'
import { buildReplayContext } from '../utils/replay'
import { buildSnapshotSeries } from '../utils/snapshotSeries'
import { extractCustomerMetrics } from '../utils/customerMetrics'
import { extractKeyMoments } from '../utils/keyMoments'
import { exportResultJSON, exportMetricsCSV } from '../utils/export'
import { useToast } from '../hooks/useToast'

interface ResultsPageProps {
  result: SimulationResult
  history: HistoryEntry[]
  batchResult?: BatchResult | null
  sweepResult?: SweepResult | null
  onChartClick?: (eventTypes: EventType[]) => void
  onJumpToPlayback?: (simTime: number) => void
  onDeleteHistory?: (id: number) => void
  onClearHistory?: () => void
  onRenameHistory?: (id: number, label: string) => void
  onLoadHistory?: (entry: HistoryEntry) => void
}

export default function ResultsPage({
  result,
  history,
  onChartClick,
  onJumpToPlayback,
  onDeleteHistory,
  onClearHistory,
  onRenameHistory,
  onLoadHistory,
  batchResult,
  sweepResult,
}: ResultsPageProps) {
  const { t } = useTranslation(['results', 'common'])
  const { toast } = useToast()
  const { metrics, config, eventLog } = result
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')
  const [level, setLevel] = useState<LearningLevel>('expert')
  const [historyOpen, setHistoryOpen] = useState(false)

  const unitPeople = t('common:unit.people')
  const unitMin = t('common:unit.min')

  // Helper: get CI for a metric key from batchResult
  const batchSummary = batchResult?.summary ?? null
  function ciFor(key: string, scale = 1) {
    if (!batchSummary) return undefined
    const ci = (batchSummary as Record<string, { ci95Lower: number; ci95Upper: number; n: number }>)[key]
    if (!ci) return undefined
    return { lower: ci.ci95Lower * scale, upper: ci.ci95Upper * scale, n: ci.n }
  }

  const verdict = useMemo(() => generateVerdict(metrics), [metrics])

  // Build the replay context once per result so the snapshot series
  // and derived moment / customer utilities can share it. These are
  // memoised on eventLog identity so toggling level / viewMode doesn't
  // re-run the full replay.
  const ctx = useMemo(
    () => buildReplayContext(eventLog, config),
    [eventLog, config],
  )
  const snapshotSeries = useMemo(
    () => buildSnapshotSeries(ctx, config.simulationDuration, 1),
    [ctx, config.simulationDuration],
  )
  const customerMetrics = useMemo(
    () => extractCustomerMetrics(eventLog),
    [eventLog],
  )
  const keyMoments = useMemo(
    () => extractKeyMoments(eventLog, snapshotSeries),
    [eventLog, snapshotSeries],
  )

  return (
    <div className="page-container space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-orange-700 dark:text-orange-400">{t('results:title')}</h2>
        <span className="text-xs text-gray-500 dark:text-bark-300">
          {t('results:subtitle', {
            duration: config.simulationDuration,
            seed: config.randomSeed,
          })}
        </span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Level pill: Beginner / Pro */}
          <div className="flex items-center rounded-full border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-800 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setLevel('friendly')}
              className={
                'px-2.5 py-1 text-[11px] font-semibold transition-colors ' +
                (level === 'friendly'
                  ? 'bg-orange-500 text-white'
                  : 'text-orange-700 hover:bg-orange-50')
              }
              aria-pressed={level === 'friendly'}
            >
              🐣 {t('results:level.friendly')}
            </button>
            <button
              type="button"
              onClick={() => setLevel('expert')}
              className={
                'px-2.5 py-1 text-[11px] font-semibold transition-colors ' +
                (level === 'expert'
                  ? 'bg-orange-500 text-white'
                  : 'text-orange-700 hover:bg-orange-50')
              }
              aria-pressed={level === 'expert'}
            >
              🎓 {t('results:level.expert')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('results:print')}
          </button>
          <button
            type="button"
            onClick={() => { exportMetricsCSV(result); toast(t('common:toast.exportSuccess')) }}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('results:exportMetricsCsv')}
          </button>
          <button
            type="button"
            onClick={() => { exportResultJSON(result); toast(t('common:toast.exportSuccess')) }}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('results:exportJson')}
          </button>
          {history.length >= 2 && (
            <div className="flex rounded-lg border border-orange-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'single'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-orange-50'
                }`}
              >
                {t('results:viewMode.single')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compare')}
                className={`px-3 py-1.5 border-l border-orange-200 transition-colors ${
                  viewMode === 'compare'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-orange-50'
                }`}
              >
                {t('results:viewMode.compare', { count: history.length })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Batch info banner ─────────────────────────────────── */}
      {batchResult && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-900/20 px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <div className="text-xs text-purple-700 dark:text-purple-300">
            <span className="font-semibold">
              {t('results:batch.banner', { n: batchResult.replicationCount })}
            </span>
            <span className="ml-2 text-purple-500 dark:text-purple-400">
              {t('results:batch.ciHint')}
            </span>
          </div>
        </div>
      )}

      {/* ── Sweep chart ──────────────────────────────────────── */}
      {sweepResult && sweepResult.points.length > 0 && (
        <SweepChart
          paramLabel={t(`results:configSummary.${
            sweepResult.paramKey === 'customerArrivalInterval' ? 'arrivalInterval' :
            sweepResult.paramKey === 'maxWaitTime' ? 'maxWait' :
            sweepResult.paramKey === 'seatCount' ? 'seats' :
            sweepResult.paramKey === 'staffCount' ? 'staff' :
            sweepResult.paramKey === 'catCount' ? 'cats' :
            sweepResult.paramKey
          }` as const)}
          points={sweepResult.points}
        />
      )}

      {/* ── History panel ────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="card">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400"
          >
            <span>📂</span>
            {historyOpen
              ? t('results:history.collapse')
              : t('results:history.expand', { count: history.length })}
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-1.5">
              {history.map((entry) => {
                const isCurrent = entry.result === result
                const m = entry.result.metrics
                const c = entry.result.config
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? 'bg-orange-100 dark:bg-bark-700 ring-1 ring-orange-400'
                        : 'bg-gray-50 dark:bg-bark-800 hover:bg-orange-50 dark:hover:bg-bark-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 dark:text-bark-100 truncate">
                        {entry.label}
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] text-orange-500 font-bold">
                            {t('results:history.current')}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 dark:text-bark-400 mt-0.5">
                        {t('results:history.configBrief', {
                          seats: c.seatCount,
                          staff: c.staffCount,
                          cats: c.catCount,
                          seed: c.randomSeed,
                        })}
                        {' · '}
                        {t('results:history.servedBrief', { count: m.totalCustomersServed })}
                        {' · '}
                        {t('results:history.abandonRateBrief', { rate: (m.abandonRate * 100).toFixed(1) })}
                      </div>
                      <div className="text-gray-300 dark:text-bark-500 mt-0.5">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isCurrent && onLoadHistory && (
                        <button
                          type="button"
                          onClick={() => onLoadHistory(entry)}
                          className="px-2 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          {t('results:history.load')}
                        </button>
                      )}
                      {onRenameHistory && (
                        <button
                          type="button"
                          onClick={() => {
                            const newName = window.prompt(
                              t('results:history.renamePrompt'),
                              entry.label,
                            )
                            if (newName && newName.trim()) {
                              onRenameHistory(entry.id, newName.trim())
                            }
                          }}
                          className="px-2 py-1 rounded text-gray-500 dark:text-bark-300 hover:bg-gray-200 dark:hover:bg-bark-600 transition-colors"
                          title={t('results:history.rename')}
                        >
                          ✏️
                        </button>
                      )}
                      {onDeleteHistory && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t('results:history.deleteConfirm', { label: entry.label }))) {
                              onDeleteHistory(entry.id)
                            }
                          }}
                          className="px-2 py-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-bark-600 transition-colors"
                          title={t('common:button.delete')}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {onClearHistory && history.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('results:history.clearConfirm'))) {
                      onClearHistory()
                    }
                  }}
                  className="mt-2 text-xs text-red-400 hover:text-red-500 transition-colors"
                >
                  {t('results:history.clearAll')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Comparison view ────────────────────────────────── */}
      {viewMode === 'compare' && history.length >= 2 && (
        <ComparisonTable history={history} />
      )}

      {viewMode !== 'compare' && (
        <>
          {/* ── Hero Verdict ───────────────────────────────── */}
          <HeroVerdict metrics={metrics} level={level} />

          {/* ── Bottleneck callout (only renders when ρ ≥ 0.85) */}
          <BottleneckCallout metrics={metrics} level={level} />

          {/* ── Section 1: Flow / Arrivals → Outcomes ──────── */}
          <ResultsSection
            icon="📊"
            title={t('results:section.flow.title')}
            summary={t('results:section.flow.summary')}
            level={level}
            beginnerExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.flow.friendly'))}</p>
                <div className="rounded-md bg-white border border-orange-200 px-3 py-2 text-center text-xs font-semibold text-orange-700">
                  {t('results:sectionExpand.flow.friendlyFormula')}
                </div>
              </>
            }
            expertExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.flow.expert'))}</p>
                <BlockMath formula={t('results:sectionExpand.flow.expertFormula')} />
              </>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3">
              <div className="grid grid-cols-2 gap-2">
                <KpiCard
                  label={t('results:kpi.totalCustomersArrived.label')}
                  numeric={batchSummary ? batchSummary.totalCustomersArrived.mean : metrics.totalCustomersArrived}
                  unit={unitPeople}
                  icon="🚶"
                  ci={ciFor('totalCustomersArrived')}
                />
                <KpiCard
                  label={t('results:kpi.totalCustomersServed.label')}
                  numeric={batchSummary ? batchSummary.totalCustomersServed.mean : metrics.totalCustomersServed}
                  unit={unitPeople}
                  icon="✅"
                  highlight="good"
                  ci={ciFor('totalCustomersServed')}
                />
                <KpiCard
                  label={t('results:kpi.abandonRate.label')}
                  numeric={(batchSummary ? batchSummary.abandonRate.mean : metrics.abandonRate) * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="❌"
                  highlight={
                    (batchSummary ? batchSummary.abandonRate.mean : metrics.abandonRate) > 0.3
                      ? 'danger'
                      : (batchSummary ? batchSummary.abandonRate.mean : metrics.abandonRate) > 0.15
                      ? 'warning'
                      : 'normal'
                  }
                  ci={ciFor('abandonRate', 100)}
                />
                <KpiCard
                  label={t('results:kpi.avgTotalStayTime.label')}
                  numeric={batchSummary ? batchSummary.avgTotalStayTime.mean : metrics.avgTotalStayTime}
                  decimals={1}
                  unit={unitMin}
                  icon="⏱️"
                  ci={ciFor('avgTotalStayTime')}
                />
              </div>
              <FlowDiagram
                arrived={verdict.arrivedCount}
                served={verdict.servedCount}
                abandoned={verdict.abandonedCount}
                inFlight={verdict.inFlightCount}
              />
            </div>
            <div className="mt-3">
              <KeyMomentsTimeline
                moments={keyMoments}
                totalDuration={config.simulationDuration}
                onMomentClick={onJumpToPlayback}
              />
            </div>
          </ResultsSection>

          {/* ── Section 2: Wait time decomposition ─────────── */}
          <ResultsSection
            icon="⏱"
            title={t('results:section.wait.title')}
            summary={t('results:section.wait.summary')}
            level={level}
            beginnerExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.wait.friendly'))}</p>
                <div className="rounded-md bg-white border border-orange-200 px-3 py-2 text-center text-xs font-semibold text-orange-700">
                  {t('results:sectionExpand.wait.friendlyFormula')}
                </div>
              </>
            }
            expertExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.wait.expert'))}</p>
                <BlockMath formula={t('results:sectionExpand.wait.expertFormula')} />
              </>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3">
              <div className="grid grid-cols-2 gap-2">
                <KpiCard
                  label={t('results:kpi.avgWaitForSeat.label')}
                  numeric={batchSummary ? batchSummary.avgWaitForSeat.mean : metrics.avgWaitForSeat}
                  decimals={1}
                  unit={unitMin}
                  icon="🪑"
                  highlight={
                    (batchSummary ? batchSummary.avgWaitForSeat.mean : metrics.avgWaitForSeat) > config.maxWaitTime * 0.7
                      ? 'warning'
                      : 'normal'
                  }
                  ci={ciFor('avgWaitForSeat')}
                />
                <KpiCard
                  label={t('results:kpi.avgWaitForOrder.label')}
                  numeric={batchSummary ? batchSummary.avgWaitForOrder.mean : metrics.avgWaitForOrder}
                  decimals={1}
                  unit={unitMin}
                  icon="☕"
                  ci={ciFor('avgWaitForOrder')}
                />
              </div>
              <StayBreakdown
                avgWaitForSeat={metrics.avgWaitForSeat}
                avgWaitForOrder={metrics.avgWaitForOrder}
                diningTime={config.diningTime}
                avgTotalStayTime={metrics.avgTotalStayTime}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <QueueTimeSeries
                series={snapshotSeries}
                totalDuration={config.simulationDuration}
              />
              <WaitHistogram customers={customerMetrics} field="waitForSeat" />
            </div>
            <div className="mt-3">
              <WaitTimeChart
                avgWaitForSeat={metrics.avgWaitForSeat}
                avgWaitForOrder={metrics.avgWaitForOrder}
                avgTotalStayTime={metrics.avgTotalStayTime}
              />
            </div>
          </ResultsSection>

          {/* ── Section 3: Utilization & bottleneck ────────── */}
          <ResultsSection
            icon="🔥"
            title={t('results:section.utilization.title')}
            summary={t('results:section.utilization.summary')}
            level={level}
            beginnerExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.utilization.friendly'))}</p>
                <div className="rounded-md bg-white border border-orange-200 px-3 py-2 text-center text-xs font-semibold text-orange-700">
                  {t('results:sectionExpand.utilization.friendlyFormula')}
                </div>
              </>
            }
            expertExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.utilization.expert'))}</p>
                <BlockMath formula={t('results:sectionExpand.utilization.expertFormula')} />
              </>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3">
              <div className="grid grid-cols-3 gap-2">
                <KpiCard
                  label={t('results:kpi.seatUtilization.label')}
                  numeric={(batchSummary ? batchSummary.seatUtilization.mean : metrics.seatUtilization) * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="🏠"
                  highlight={(batchSummary ? batchSummary.seatUtilization.mean : metrics.seatUtilization) > 0.9 ? 'warning' : 'normal'}
                  ci={ciFor('seatUtilization', 100)}
                />
                <KpiCard
                  label={t('results:kpi.staffUtilization.label')}
                  numeric={(batchSummary ? batchSummary.staffUtilization.mean : metrics.staffUtilization) * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="👩‍💼"
                  highlight={(batchSummary ? batchSummary.staffUtilization.mean : metrics.staffUtilization) > 0.9 ? 'warning' : 'normal'}
                  ci={ciFor('staffUtilization', 100)}
                />
                <KpiCard
                  label={t('results:kpi.catUtilization.label')}
                  numeric={(batchSummary ? batchSummary.catUtilization.mean : metrics.catUtilization) * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="😺"
                  ci={ciFor('catUtilization', 100)}
                />
              </div>
              <UtilizationChart
                seatUtilization={metrics.seatUtilization}
                staffUtilization={metrics.staffUtilization}
                catUtilization={metrics.catUtilization}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <UtilizationTimeSeries
                series={snapshotSeries}
                config={config}
                totalDuration={config.simulationDuration}
              />
              <KingmanPrediction config={config} metrics={metrics} />
            </div>
          </ResultsSection>

          {/* ── Section 4: Cat interaction ─────────────────── */}
          <ResultsSection
            icon="🐱"
            title={t('results:section.cat.title')}
            summary={t('results:section.cat.summary')}
            level={level}
            beginnerExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.cat.friendly'))}</p>
                <div className="rounded-md bg-white border border-orange-200 px-3 py-2 text-center text-xs font-semibold text-orange-700">
                  {t('results:sectionExpand.cat.friendlyFormula')}
                </div>
              </>
            }
            expertExpand={
              <>
                <p>{renderWithTerms(t('results:sectionExpand.cat.expert'))}</p>
                <BlockMath formula={t('results:sectionExpand.cat.expertFormula')} />
              </>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3">
              <div className="grid grid-cols-2 gap-2">
                <KpiCard
                  label={t('results:kpi.catInteractionRate.label')}
                  numeric={(batchSummary ? batchSummary.catInteractionRate.mean : metrics.catInteractionRate) * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="🐱"
                  highlight={
                    (batchSummary ? batchSummary.catInteractionRate.mean : metrics.catInteractionRate) > 0.7
                      ? 'good'
                      : (batchSummary ? batchSummary.catInteractionRate.mean : metrics.catInteractionRate) < 0.3
                      ? 'warning'
                      : 'normal'
                  }
                  ci={ciFor('catInteractionRate', 100)}
                />
                <KpiCard
                  label={t('results:kpi.avgCatVisitsPerCustomer.label')}
                  numeric={batchSummary ? batchSummary.avgCatVisitsPerCustomer.mean : metrics.avgCatVisitsPerCustomer}
                  decimals={2}
                  icon="💖"
                  ci={ciFor('avgCatVisitsPerCustomer')}
                />
              </div>
              <CustomerPieChart
                totalCustomersServed={metrics.totalCustomersServed}
                totalCustomersArrived={metrics.totalCustomersArrived}
                catInteractionRate={metrics.catInteractionRate}
                abandonRate={metrics.abandonRate}
                onSegmentClick={onChartClick}
              />
            </div>
            <div className="mt-3">
              <StayDistribution customers={customerMetrics} />
            </div>
          </ResultsSection>

          {/* ── What-If explorer ──────────────────────────── */}
          <WhatIfExplorer baseConfig={config} baseMetrics={metrics} />

          {/* ── Config summary (unchanged, bottom of page) ─── */}
          <div className="card">
            <div className="card-title">{t('results:configSummary.title')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-bark-300">
              <div>{t('results:configSummary.seats')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.seatCount}</span></div>
              <div>{t('results:configSummary.staff')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.staffCount}</span></div>
              <div>{t('results:configSummary.cats')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.catCount}</span></div>
              <div>{t('results:configSummary.arrivalInterval')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.customerArrivalInterval}</span> {unitMin}</div>
              <div>{t('results:configSummary.orderTime')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.orderTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.preparationTime')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.preparationTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.diningTime')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.diningTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.interactionTime')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.catInteractionTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.restProbability')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.catRestProbability}</span></div>
              <div>{t('results:configSummary.restDuration')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.catRestDuration}</span> {unitMin}</div>
              <div>{t('results:configSummary.maxWait')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.maxWaitTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.seed')} <span className="font-semibold text-gray-800 dark:text-bark-100">{config.randomSeed}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
