import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult, EventType } from '../types'
import type { HistoryEntry } from '../hooks/useSimulation'
import KpiCard from '../components/KpiCard'
import UtilizationChart from '../components/charts/UtilizationChart'
import WaitTimeChart from '../components/charts/WaitTimeChart'
import CustomerPieChart from '../components/charts/CustomerPieChart'
import ComparisonTable from '../components/ComparisonTable'
import { exportResultJSON, exportMetricsCSV } from '../utils/export'

interface ResultsPageProps {
  result: SimulationResult
  history: HistoryEntry[]
  onChartClick?: (eventTypes: EventType[]) => void
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function minutes(value: number) {
  return value.toFixed(1)
}

export default function ResultsPage({ result, history, onChartClick }: ResultsPageProps) {
  const { t } = useTranslation(['results', 'common'])
  const { metrics, config } = result
  const abandonPct = metrics.abandonRate
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')

  const unitPeople = t('common:unit.people')
  const unitMin = t('common:unit.min')

  return (
    <div className="page-container">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold text-orange-700">{t('results:title')}</h2>
        <span className="text-xs text-gray-500">
          {t('results:subtitle', { duration: config.simulationDuration, seed: config.randomSeed })}
        </span>
        <div className="ml-auto flex items-center gap-2">
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

      {/* ── Comparison view ──────────────────────────── */}
      {viewMode === 'compare' && history.length >= 2 && (
        <ComparisonTable history={history} />
      )}

      {viewMode !== 'compare' && (<>

      {/* ── KPI Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label={t('results:kpi.totalCustomersArrived.label')}
          value={metrics.totalCustomersArrived}
          unit={unitPeople}
          icon="🚶"
          description={t('results:kpi.totalCustomersArrived.description')}
        />
        <KpiCard
          label={t('results:kpi.totalCustomersServed.label')}
          value={metrics.totalCustomersServed}
          unit={unitPeople}
          icon="✅"
          highlight="good"
          description={t('results:kpi.totalCustomersServed.description')}
        />
        <KpiCard
          label={t('results:kpi.abandonRate.label')}
          value={pct(metrics.abandonRate)}
          icon="❌"
          highlight={abandonPct > 0.3 ? 'danger' : abandonPct > 0.15 ? 'warning' : 'normal'}
          description={t('results:kpi.abandonRate.description')}
        />
        <KpiCard
          label={t('results:kpi.catInteractionRate.label')}
          value={pct(metrics.catInteractionRate)}
          icon="🐱"
          highlight={metrics.catInteractionRate > 0.7 ? 'good' : metrics.catInteractionRate < 0.3 ? 'warning' : 'normal'}
          description={t('results:kpi.catInteractionRate.description')}
        />
        <KpiCard
          label={t('results:kpi.avgTotalStayTime.label')}
          value={minutes(metrics.avgTotalStayTime)}
          unit={unitMin}
          icon="⏱️"
          description={t('results:kpi.avgTotalStayTime.description')}
        />
      </div>

      {/* ── Second row KPIs ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard
          label={t('results:kpi.avgWaitForSeat.label')}
          value={minutes(metrics.avgWaitForSeat)}
          unit={unitMin}
          icon="🪑"
          highlight={metrics.avgWaitForSeat > config.maxWaitTime * 0.7 ? 'warning' : 'normal'}
          description={t('results:kpi.avgWaitForSeat.description')}
        />
        <KpiCard
          label={t('results:kpi.avgWaitForOrder.label')}
          value={minutes(metrics.avgWaitForOrder)}
          unit={unitMin}
          icon="☕"
          description={t('results:kpi.avgWaitForOrder.description')}
        />
        <KpiCard
          label={t('results:kpi.seatUtilization.label')}
          value={pct(metrics.seatUtilization)}
          icon="🏠"
          highlight={metrics.seatUtilization > 0.9 ? 'warning' : 'normal'}
          description={t('results:kpi.seatUtilization.description')}
        />
        <KpiCard
          label={t('results:kpi.staffUtilization.label')}
          value={pct(metrics.staffUtilization)}
          icon="👩‍💼"
          highlight={metrics.staffUtilization > 0.9 ? 'warning' : 'normal'}
          description={t('results:kpi.staffUtilization.description')}
        />
        <KpiCard
          label={t('results:kpi.catUtilization.label')}
          value={pct(metrics.catUtilization)}
          icon="😺"
          description={t('results:kpi.catUtilization.description')}
        />
      </div>

      {/* ── Charts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UtilizationChart
          seatUtilization={metrics.seatUtilization}
          staffUtilization={metrics.staffUtilization}
          catUtilization={metrics.catUtilization}
        />
        <WaitTimeChart
          avgWaitForSeat={metrics.avgWaitForSeat}
          avgWaitForOrder={metrics.avgWaitForOrder}
          avgTotalStayTime={metrics.avgTotalStayTime}
        />
        <CustomerPieChart
          totalCustomersServed={metrics.totalCustomersServed}
          totalCustomersArrived={metrics.totalCustomersArrived}
          catInteractionRate={metrics.catInteractionRate}
          abandonRate={metrics.abandonRate}
          onSegmentClick={onChartClick}
        />
      </div>

      {/* ── Config summary ───────────────────────────── */}
      <div className="card mt-4">
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
      </>)}
    </div>
  )
}
