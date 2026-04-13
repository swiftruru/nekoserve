import { useState } from 'react'
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
  const { metrics, config } = result
  const abandonPct = metrics.abandonRate
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')

  return (
    <div className="page-container">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold text-orange-700">模擬統計結果</h2>
        <span className="text-xs text-gray-500">
          模擬時長 {config.simulationDuration} 分鐘 ・ 種子 {config.randomSeed}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportMetricsCSV(result)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            ⬇ 指標 CSV
          </button>
          <button
            type="button"
            onClick={() => exportResultJSON(result)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            ⬇ JSON
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
              單次結果
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
              對比 ({history.length})
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
          label="總到達人數"
          value={metrics.totalCustomersArrived}
          unit="人"
          icon="🚶"
          description="模擬期間到達咖啡廳的顧客數"
        />
        <KpiCard
          label="完成服務人數"
          value={metrics.totalCustomersServed}
          unit="人"
          icon="✅"
          highlight="good"
          description="完整走完所有流程的顧客數"
        />
        <KpiCard
          label="放棄等待比例"
          value={pct(metrics.abandonRate)}
          icon="❌"
          highlight={abandonPct > 0.3 ? 'danger' : abandonPct > 0.15 ? 'warning' : 'normal'}
          description="等待座位超時後放棄離開的比例"
        />
        <KpiCard
          label="貓咪互動率"
          value={pct(metrics.catInteractionRate)}
          icon="🐱"
          highlight={metrics.catInteractionRate > 0.7 ? 'good' : metrics.catInteractionRate < 0.3 ? 'warning' : 'normal'}
          description="成功與貓咪互動的顧客比例"
        />
        <KpiCard
          label="平均總停留時間"
          value={minutes(metrics.avgTotalStayTime)}
          unit="分鐘"
          icon="⏱️"
          description="從到達到離開的平均時間"
        />
      </div>

      {/* ── Second row KPIs ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard
          label="平均等待座位"
          value={minutes(metrics.avgWaitForSeat)}
          unit="分鐘"
          icon="🪑"
          highlight={metrics.avgWaitForSeat > config.maxWaitTime * 0.7 ? 'warning' : 'normal'}
          description="從到達到入座的平均等待時間"
        />
        <KpiCard
          label="平均等待點餐完成"
          value={minutes(metrics.avgWaitForOrder)}
          unit="分鐘"
          icon="☕"
          description="從點餐到餐點送達的平均等待時間"
        />
        <KpiCard
          label="座位利用率"
          value={pct(metrics.seatUtilization)}
          icon="🏠"
          highlight={metrics.seatUtilization > 0.9 ? 'warning' : 'normal'}
          description="座位被佔用時間的比例"
        />
        <KpiCard
          label="店員利用率"
          value={pct(metrics.staffUtilization)}
          icon="👩‍💼"
          highlight={metrics.staffUtilization > 0.9 ? 'warning' : 'normal'}
          description="店員忙碌時間的比例"
        />
        <KpiCard
          label="貓咪利用率"
          value={pct(metrics.catUtilization)}
          icon="😺"
          description="貓咪忙碌（互動+休息）時間的比例"
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
        <div className="card-title">📄 本次模擬參數摘要</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-gray-600">
          <div>座位 <span className="font-semibold text-gray-800">{config.seatCount}</span> 個</div>
          <div>店員 <span className="font-semibold text-gray-800">{config.staffCount}</span> 人</div>
          <div>貓咪 <span className="font-semibold text-gray-800">{config.catCount}</span> 隻</div>
          <div>到達間隔 <span className="font-semibold text-gray-800">{config.customerArrivalInterval}</span> 分鐘</div>
          <div>點餐時間 <span className="font-semibold text-gray-800">{config.orderTime}</span> 分鐘</div>
          <div>製作時間 <span className="font-semibold text-gray-800">{config.preparationTime}</span> 分鐘</div>
          <div>用餐時間 <span className="font-semibold text-gray-800">{config.diningTime}</span> 分鐘</div>
          <div>互動時間 <span className="font-semibold text-gray-800">{config.catInteractionTime}</span> 分鐘</div>
          <div>休息機率 <span className="font-semibold text-gray-800">{config.catRestProbability}</span></div>
          <div>休息時間 <span className="font-semibold text-gray-800">{config.catRestDuration}</span> 分鐘</div>
          <div>最大等待 <span className="font-semibold text-gray-800">{config.maxWaitTime}</span> 分鐘</div>
          <div>Seed <span className="font-semibold text-gray-800">{config.randomSeed}</span></div>
        </div>
      </div>
      </>)}
    </div>
  )
}
