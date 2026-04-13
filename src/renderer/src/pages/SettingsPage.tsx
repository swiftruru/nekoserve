import { useState } from 'react'
import type { SimulationConfig, ScenarioPreset, SimulatorError } from '../types'
import ParamInput from '../components/ParamInput'
import ScenarioButtons from '../components/ScenarioButtons'
import {
  loadCustomScenarios,
  saveCustomScenario,
  deleteCustomScenario,
} from '../data/scenarios'

interface SettingsPageProps {
  initialConfig: SimulationConfig
  scenarios: ScenarioPreset[]
  onRun: (config: SimulationConfig, label: string) => void
  onReset: () => void
  isRunning: boolean
  elapsed: number
  error: SimulatorError | null
}

export default function SettingsPage({
  initialConfig,
  scenarios,
  onRun,
  onReset,
  isRunning,
  elapsed,
  error,
}: SettingsPageProps) {
  const [config, setConfig] = useState<SimulationConfig>(initialConfig)
  const [activeScenario, setActiveScenario] = useState<string | null>('weekday')
  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [customScenarios, setCustomScenarios] = useState<ScenarioPreset[]>(
    () => loadCustomScenarios()
  )

  function set<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) {
    setConfig((prev: SimulationConfig) => ({ ...prev, [key]: value }))
    setActiveScenario(null)  // user changed a value, deselect preset
  }

  function handleSelectScenario(scenarioConfig: SimulationConfig, id: string) {
    setConfig(scenarioConfig)
    setActiveScenario(id)
  }

  function handleReset() {
    setConfig(initialConfig)
    setActiveScenario('weekday')
    onReset()
  }

  function handleRun() {
    const label =
      activeScenario
        ? (scenarios.find((s) => s.id === activeScenario)?.name
            ?? customScenarios.find((s) => s.id === activeScenario)?.name
            ?? '自訂設定')
        : '自訂設定'
    onRun(config, label)
  }

  function handleSaveCustom(name: string) {
    const id = `custom-${Date.now()}`
    const preset: ScenarioPreset = { id, name, description: '自訂情境', config }
    saveCustomScenario(preset)
    setCustomScenarios(loadCustomScenarios())
    setActiveScenario(id)
  }

  function handleDeleteCustom(id: string) {
    deleteCustomScenario(id)
    setCustomScenarios(loadCustomScenarios())
    if (activeScenario === id) setActiveScenario(null)
  }

  // Fake progress: exponential curve 0 → 95%, then snaps to 100% when done
  const progressPct = isRunning
    ? Math.min(95, (1 - Math.exp(-elapsed / 4)) * 100)
    : 0

  return (
    <div className="page-container">
      <div className="mb-5">
        <ScenarioButtons
          scenarios={scenarios}
          customScenarios={customScenarios}
          activeScenarioId={activeScenario}
          onSelect={handleSelectScenario}
          onSaveCustom={handleSaveCustom}
          onDeleteCustom={handleDeleteCustom}
          disabled={isRunning}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 咖啡廳資源設定 ────────────────────────── */}
        <div className="card">
          <div className="card-title">🏠 咖啡廳資源設定</div>
          <div className="grid grid-cols-3 gap-3">
            <ParamInput
              label="座位數量"
              value={config.seatCount}
              onChange={(v) => set('seatCount', Math.max(1, Math.round(v)))}
              min={1} max={50} step={1}
              unit="個"
              tooltip="咖啡廳可供顧客入座的座位總數。座位越少，等待隊伍越長。"
              disabled={isRunning}
            />
            <ParamInput
              label="店員數量"
              value={config.staffCount}
              onChange={(v) => set('staffCount', Math.max(1, Math.round(v)))}
              min={1} max={20} step={1}
              unit="人"
              tooltip="負責點餐與製作餐點的店員人數。店員越少，餐點等待時間越長。"
              disabled={isRunning}
            />
            <ParamInput
              label="貓咪數量"
              value={config.catCount}
              onChange={(v) => set('catCount', Math.max(1, Math.round(v)))}
              min={1} max={20} step={1}
              unit="隻"
              tooltip="咖啡廳內可供顧客互動的貓咪總數（扣除正在休息的貓咪）。"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── 顧客行為設定 ──────────────────────────── */}
        <div className="card">
          <div className="card-title">👥 顧客行為設定</div>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="顧客平均到達間隔"
              value={config.customerArrivalInterval}
              onChange={(v) => set('customerArrivalInterval', Math.max(0.1, v))}
              min={0.5} max={60} step={0.5}
              unit="分鐘"
              tooltip="使用 Exponential 分佈。值越小表示顧客越頻繁到達。例如平均 5 分鐘到一位。"
              disabled={isRunning}
            />
            <ParamInput
              label="最大可接受等待時間"
              value={config.maxWaitTime}
              onChange={(v) => set('maxWaitTime', Math.max(1, v))}
              min={1} max={120} step={1}
              unit="分鐘"
              tooltip="顧客等待座位的最大耐心時間。超過後顧客放棄離開，計入放棄率。"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── 服務時間設定 ──────────────────────────── */}
        <div className="card">
          <div className="card-title">☕ 服務時間設定</div>
          <div className="grid grid-cols-3 gap-3">
            <ParamInput
              label="點餐平均時間"
              value={config.orderTime}
              onChange={(v) => set('orderTime', Math.max(0.5, v))}
              min={0.5} max={30} step={0.5}
              unit="分鐘"
              tooltip="Normal 分佈，std = mean × 0.2，最小值為 1 分鐘。店員協助點餐所需時間。"
              disabled={isRunning}
            />
            <ParamInput
              label="餐點製作平均時間"
              value={config.preparationTime}
              onChange={(v) => set('preparationTime', Math.max(0.5, v))}
              min={0.5} max={60} step={0.5}
              unit="分鐘"
              tooltip="Normal 分佈，std = mean × 0.2，最小值為 1 分鐘。餐點從下單到完成的時間。"
              disabled={isRunning}
            />
            <ParamInput
              label="用餐平均時間"
              value={config.diningTime}
              onChange={(v) => set('diningTime', Math.max(0.5, v))}
              min={0.5} max={120} step={0.5}
              unit="分鐘"
              tooltip="Normal 分佈，std = mean × 0.2，最小值為 1 分鐘。顧客用餐完畢所需時間。"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── 貓咪互動設定 ──────────────────────────── */}
        <div className="card">
          <div className="card-title">🐱 貓咪互動設定</div>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="互動平均時間"
              value={config.catInteractionTime}
              onChange={(v) => set('catInteractionTime', Math.max(0.5, v))}
              min={0.5} max={60} step={0.5}
              unit="分鐘"
              tooltip="Normal 分佈，std = mean × 0.2。顧客與貓咪互動（玩耍）的時間。"
              disabled={isRunning}
            />
            <ParamInput
              label="休息觸發機率"
              value={config.catRestProbability}
              onChange={(v) => set('catRestProbability', Math.min(1, Math.max(0, v)))}
              min={0} max={1} step={0.05}
              tooltip="每次互動結束後，貓咪進入休息狀態的機率（0–1）。休息中的貓咪不可互動。"
              disabled={isRunning}
            />
            <ParamInput
              label="休息平均時間"
              value={config.catRestDuration}
              onChange={(v) => set('catRestDuration', Math.max(0.5, v))}
              min={0.5} max={120} step={0.5}
              unit="分鐘"
              tooltip="Normal 分佈，std = mean × 0.2，最小值為 1 分鐘。貓咪每次休息的持續時間。"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── 模擬參數設定 ──────────────────────────── */}
        <div className="card lg:col-span-2">
          <div className="card-title">🎲 模擬參數設定</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput
              label="模擬總時長"
              value={config.simulationDuration}
              onChange={(v) => set('simulationDuration', Math.max(10, v))}
              min={10} max={1440} step={10}
              unit="分鐘"
              tooltip="模擬的總營業時間（分鐘）。240 分鐘 = 4 小時。超過此時間後不再產生新顧客。"
              disabled={isRunning}
            />
            <ParamInput
              label="Random Seed"
              value={config.randomSeed}
              onChange={(v) => set('randomSeed', Math.round(v))}
              min={0} max={99999} step={1}
              tooltip="固定隨機種子可重現完全相同的模擬結果，方便教學示範對比。"
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      {/* ── Error display ────────────────────────────── */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">模擬執行失敗</p>
                <p className="text-sm text-red-600 mt-0.5">{error.error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorDetail((v) => !v)}
              className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap"
            >
              {showErrorDetail ? '收合詳情' : '查看詳情'}
            </button>
          </div>
          {showErrorDetail && (
            <pre className="mt-3 text-xs text-red-500 bg-red-100 rounded-lg p-3 overflow-x-auto select-text cursor-text">
              {JSON.stringify(error, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────── */}
      {isRunning && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex justify-between text-xs text-orange-600 mb-2">
            <span>模擬進行中，請稍候…</span>
            <span>{elapsed.toFixed(1)} 秒</span>
          </div>
          <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct.toFixed(1)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────── */}
      <div className="mt-4 flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={isRunning}
          className="btn-secondary"
        >
          重設設定
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="btn-primary flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              模擬進行中…
            </>
          ) : (
            <>▶ 開始模擬</>
          )}
        </button>
      </div>
    </div>
  )
}
