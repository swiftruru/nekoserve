import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult, EventType } from '../types'
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

interface ResultsPageProps {
  result: SimulationResult
  history: HistoryEntry[]
  onChartClick?: (eventTypes: EventType[]) => void
  /**
   * Called when the user clicks a key-moment bubble in the Flow
   * section timeline. Parent (App.tsx) jumps the shared playback
   * cursor to that sim-time and switches to the Playback page.
   */
  onJumpToPlayback?: (simTime: number) => void
}

export default function ResultsPage({
  result,
  history,
  onChartClick,
  onJumpToPlayback,
}: ResultsPageProps) {
  const { t } = useTranslation(['results', 'common'])
  const { metrics, config, eventLog } = result
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')
  const [level, setLevel] = useState<LearningLevel>('expert')

  const unitPeople = t('common:unit.people')
  const unitMin = t('common:unit.min')

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
        <h2 className="text-lg font-bold text-orange-700">{t('results:title')}</h2>
        <span className="text-xs text-gray-500">
          {t('results:subtitle', {
            duration: config.simulationDuration,
            seed: config.randomSeed,
          })}
        </span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Level pill: Beginner / Pro */}
          <div className="flex items-center rounded-full border border-orange-200 bg-white overflow-hidden shrink-0">
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
            onClick={() => exportMetricsCSV(result)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('results:exportMetricsCsv')}
          </button>
          <button
            type="button"
            onClick={() => exportResultJSON(result)}
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

      {/* ── Comparison view (unchanged) ────────────────────── */}
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
                  numeric={metrics.totalCustomersArrived}
                  unit={unitPeople}
                  icon="🚶"
                />
                <KpiCard
                  label={t('results:kpi.totalCustomersServed.label')}
                  numeric={metrics.totalCustomersServed}
                  unit={unitPeople}
                  icon="✅"
                  highlight="good"
                />
                <KpiCard
                  label={t('results:kpi.abandonRate.label')}
                  numeric={metrics.abandonRate * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="❌"
                  highlight={
                    metrics.abandonRate > 0.3
                      ? 'danger'
                      : metrics.abandonRate > 0.15
                      ? 'warning'
                      : 'normal'
                  }
                />
                <KpiCard
                  label={t('results:kpi.avgTotalStayTime.label')}
                  numeric={metrics.avgTotalStayTime}
                  decimals={1}
                  unit={unitMin}
                  icon="⏱️"
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
                  numeric={metrics.avgWaitForSeat}
                  decimals={1}
                  unit={unitMin}
                  icon="🪑"
                  highlight={
                    metrics.avgWaitForSeat > config.maxWaitTime * 0.7
                      ? 'warning'
                      : 'normal'
                  }
                />
                <KpiCard
                  label={t('results:kpi.avgWaitForOrder.label')}
                  numeric={metrics.avgWaitForOrder}
                  decimals={1}
                  unit={unitMin}
                  icon="☕"
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
                  numeric={metrics.seatUtilization * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="🏠"
                  highlight={metrics.seatUtilization > 0.9 ? 'warning' : 'normal'}
                />
                <KpiCard
                  label={t('results:kpi.staffUtilization.label')}
                  numeric={metrics.staffUtilization * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="👩‍💼"
                  highlight={metrics.staffUtilization > 0.9 ? 'warning' : 'normal'}
                />
                <KpiCard
                  label={t('results:kpi.catUtilization.label')}
                  numeric={metrics.catUtilization * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="😺"
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
                  numeric={metrics.catInteractionRate * 100}
                  decimals={1}
                  numericSuffix="%"
                  icon="🐱"
                  highlight={
                    metrics.catInteractionRate > 0.7
                      ? 'good'
                      : metrics.catInteractionRate < 0.3
                      ? 'warning'
                      : 'normal'
                  }
                />
                <KpiCard
                  label={t('results:kpi.avgCatVisitsPerCustomer.label')}
                  numeric={metrics.avgCatVisitsPerCustomer}
                  decimals={2}
                  icon="💖"
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

          {/* ── Config summary (unchanged, bottom of page) ─── */}
          <div className="card">
            <div className="card-title">{t('results:configSummary.title')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-gray-600">
              <div>{t('results:configSummary.seats')} <span className="font-semibold text-gray-800">{config.seatCount}</span></div>
              <div>{t('results:configSummary.staff')} <span className="font-semibold text-gray-800">{config.staffCount}</span></div>
              <div>{t('results:configSummary.cats')} <span className="font-semibold text-gray-800">{config.catCount}</span></div>
              <div>{t('results:configSummary.arrivalInterval')} <span className="font-semibold text-gray-800">{config.customerArrivalInterval}</span> {unitMin}</div>
              <div>{t('results:configSummary.orderTime')} <span className="font-semibold text-gray-800">{config.orderTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.preparationTime')} <span className="font-semibold text-gray-800">{config.preparationTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.diningTime')} <span className="font-semibold text-gray-800">{config.diningTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.interactionTime')} <span className="font-semibold text-gray-800">{config.catInteractionTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.restProbability')} <span className="font-semibold text-gray-800">{config.catRestProbability}</span></div>
              <div>{t('results:configSummary.restDuration')} <span className="font-semibold text-gray-800">{config.catRestDuration}</span> {unitMin}</div>
              <div>{t('results:configSummary.maxWait')} <span className="font-semibold text-gray-800">{config.maxWaitTime}</span> {unitMin}</div>
              <div>{t('results:configSummary.seed')} <span className="font-semibold text-gray-800">{config.randomSeed}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
