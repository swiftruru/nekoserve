import { useTranslation } from 'react-i18next'
import type { SimulationResult } from '../../types'
import KpiCard from '../KpiCard'
import HeroVerdict from '../results/HeroVerdict'
import UtilizationChart from '../charts/UtilizationChart'
import WaitTimeChart from '../charts/WaitTimeChart'
import FlowDiagram from '../results/FlowDiagram'
import KingmanPrediction from '../results/KingmanPrediction'
import RhoCorrectionPanel from '../results/RhoCorrectionPanel'

interface ReportViewProps {
  result: SimulationResult
  domainLabel: string
  scenarioLabel: string
  generatedAt: string
}

/**
 * Presentation-ready, domain-aware research report. Reuses the live Results
 * components (KPI cards, charts, verdict, queueing-theory panels) so the
 * report stays in sync with the app. Rendered offscreen and serialized by
 * utils/report.ts for HTML / PDF export, so it must be self-contained and
 * must not depend on app stores (everything comes in via props).
 */
export default function ReportView({
  result,
  domainLabel,
  scenarioLabel,
  generatedAt,
}: ReportViewProps) {
  const { t } = useTranslation(['report', 'results', 'common'])
  const { metrics, config } = result
  const hasCats = config.catCount > 0

  const unitMin = t('common:unit.min')
  const inFlight = Math.max(
    0,
    metrics.totalCustomersArrived - metrics.totalCustomersServed - Math.round(metrics.abandonRate * metrics.totalCustomersArrived),
  )
  const abandonedCount = Math.round(metrics.abandonRate * metrics.totalCustomersArrived)

  return (
    <div className="bg-white text-gray-800" style={{ width: 900, padding: 32 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mb-5 pb-3 border-b-2 border-orange-300">
        <h1 className="text-2xl font-bold text-orange-700">{t('report:title')}</h1>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
          <div>{t('report:meta.domain')}: <span className="font-semibold text-gray-900">{domainLabel}</span></div>
          <div>{t('report:meta.scenario')}: <span className="font-semibold text-gray-900">{scenarioLabel}</span></div>
          <div>{t('report:meta.duration')}: <span className="font-semibold text-gray-900">{config.simulationDuration}</span> {unitMin}</div>
          <div>{t('report:meta.seed')}: <span className="font-semibold text-gray-900">{config.randomSeed}</span></div>
          <div>{t('report:meta.generatedAt')}: <span className="font-semibold text-gray-900">{generatedAt}</span></div>
        </div>
      </header>

      {/* ── Verdict ────────────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.verdict')}</h2>
        <HeroVerdict metrics={metrics} level="expert" />
      </section>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.kpis')}</h2>
        <div className="grid grid-cols-4 gap-2">
          <KpiCard label={t('results:kpi.totalCustomersArrived.label')} numeric={metrics.totalCustomersArrived} icon="🚶" />
          <KpiCard label={t('results:kpi.totalCustomersServed.label')} numeric={metrics.totalCustomersServed} icon="✅" />
          <KpiCard label={t('results:kpi.abandonRate.label')} numeric={metrics.abandonRate * 100} decimals={1} numericSuffix="%" icon="❌" />
          <KpiCard label={t('results:kpi.avgTotalStayTime.label')} numeric={metrics.avgTotalStayTime} decimals={1} numericSuffix={` ${unitMin}`} icon="⏱️" />
          <KpiCard label={t('results:kpi.avgWaitForSeat.label')} numeric={metrics.avgWaitForSeat} decimals={1} numericSuffix={` ${unitMin}`} icon="🪑" />
          <KpiCard label={t('results:kpi.avgWaitForOrder.label')} numeric={metrics.avgWaitForOrder} decimals={1} numericSuffix={` ${unitMin}`} icon="☕" />
          <KpiCard label={t('results:kpi.seatUtilization.label')} numeric={metrics.seatUtilization * 100} decimals={1} numericSuffix="%" icon="🏠" />
          <KpiCard label={t('results:kpi.staffUtilization.label')} numeric={metrics.staffUtilization * 100} decimals={1} numericSuffix="%" icon="👩‍💼" />
          {hasCats && (
            <>
              <KpiCard label={t('results:kpi.catUtilization.label')} numeric={metrics.catUtilization * 100} decimals={1} numericSuffix="%" icon="😺" />
              <KpiCard label={t('results:kpi.catInteractionRate.label')} numeric={metrics.catInteractionRate * 100} decimals={1} numericSuffix="%" icon="🐱" />
            </>
          )}
        </div>
      </section>

      {/* ── Charts ─────────────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.charts')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <FlowDiagram
            arrived={metrics.totalCustomersArrived}
            served={metrics.totalCustomersServed}
            abandoned={abandonedCount}
            inFlight={inFlight}
          />
          <UtilizationChart
            seatUtilization={metrics.seatUtilization}
            staffUtilization={metrics.staffUtilization}
            catUtilization={hasCats ? metrics.catUtilization : undefined}
          />
          <WaitTimeChart
            avgWaitForSeat={metrics.avgWaitForSeat}
            avgWaitForOrder={metrics.avgWaitForOrder}
            avgTotalStayTime={metrics.avgTotalStayTime}
          />
        </div>
      </section>

      {/* ── Queueing theory ────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.theory')}</h2>
        <div className="grid grid-cols-1 gap-3">
          <KingmanPrediction config={config} metrics={metrics} />
          <RhoCorrectionPanel metrics={metrics} level="expert" />
        </div>
      </section>

      {/* ── Config summary ─────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.config')}</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600">
          <div>{t('results:configSummary.seats')} <span className="font-semibold text-gray-900">{config.seatCount}</span></div>
          <div>{t('results:configSummary.staff')} <span className="font-semibold text-gray-900">{config.staffCount}</span></div>
          {hasCats && <div>{t('results:configSummary.cats')} <span className="font-semibold text-gray-900">{config.catCount}</span></div>}
          <div>{t('results:configSummary.arrivalInterval')} <span className="font-semibold text-gray-900">{config.customerArrivalInterval}</span> {unitMin}</div>
          <div>{t('results:configSummary.orderTime')} <span className="font-semibold text-gray-900">{config.orderTime}</span> {unitMin}</div>
          <div>{t('results:configSummary.preparationTime')} <span className="font-semibold text-gray-900">{config.preparationTime}</span> {unitMin}</div>
          <div>{t('results:configSummary.diningTime')} <span className="font-semibold text-gray-900">{config.diningTime}</span> {unitMin}</div>
          <div>{t('results:configSummary.maxWait')} <span className="font-semibold text-gray-900">{config.maxWaitTime}</span> {unitMin}</div>
        </div>
      </section>

      {/* ── Methodology ────────────────────────────────────── */}
      <section className="mb-2">
        <h2 className="text-base font-bold text-gray-700 mb-2">{t('report:section.methodology')}</h2>
        <p className="text-xs leading-relaxed text-gray-600">{t('report:methodologyBody')}</p>
      </section>

      <footer className="mt-4 pt-2 border-t border-gray-200 text-[11px] text-gray-400">
        {t('report:footer')}
      </footer>
    </div>
  )
}
