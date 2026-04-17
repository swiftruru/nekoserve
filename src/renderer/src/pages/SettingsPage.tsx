import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig, ScenarioPreset, SimulatorError } from '../types'
import ParamInput from '../components/ParamInput'
import ParamRationale from '../components/ParamRationale'
import ThemedSelect from '../components/ThemedSelect'
import ScenarioButtons from '../components/ScenarioButtons'
import { useToast } from '../hooks/useToast'
import {
  loadCustomScenarios,
  saveCustomScenario,
  deleteCustomScenario,
  isBuiltInScenarioId,
} from '../data/scenarios'

interface SettingsPageProps {
  initialConfig: SimulationConfig
  scenarios: ScenarioPreset[]
  onRun: (config: SimulationConfig, label: string) => void
  onRunBatch?: (config: SimulationConfig, replicationCount: number, label: string) => void
  onRunSweep?: (config: SimulationConfig, paramKey: keyof SimulationConfig, from: number, to: number, step: number, replications: number) => void
  onReset: () => void
  onCancel?: () => void
  isRunning: boolean
  elapsed: number
  error: SimulatorError | null
  batchProgress?: { completed: number; total: number } | null
}

export default function SettingsPage({
  initialConfig,
  scenarios,
  onRun,
  onRunBatch,
  onRunSweep,
  onReset,
  onCancel,
  isRunning,
  elapsed,
  error,
  batchProgress,
}: SettingsPageProps) {
  const { t } = useTranslation(['settings', 'common', 'errors', 'scenarios'])
  const { toast } = useToast()
  const [config, setConfig] = useState<SimulationConfig>(initialConfig)
  const [activeScenario, setActiveScenario] = useState<string | null>('weekday')
  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [replicationCount, setReplicationCount] = useState(10)
  const [sweepMode, setSweepMode] = useState(false)

  type SweepableParam = 'seatCount' | 'staffCount' | 'catCount' | 'customerArrivalInterval' | 'maxWaitTime'
  const SWEEPABLE_PARAMS: SweepableParam[] = ['seatCount', 'staffCount', 'catCount', 'customerArrivalInterval', 'maxWaitTime']
  const [sweepParam, setSweepParam] = useState<SweepableParam>('staffCount')
  const [sweepFrom, setSweepFrom] = useState(1)
  const [sweepTo, setSweepTo] = useState(5)
  const [sweepStep, setSweepStep] = useState(1)
  const [sweepReplications, setSweepReplications] = useState(5)
  const [csvConfigs, setCsvConfigs] = useState<SimulationConfig[] | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const [customScenarios, setCustomScenarios] = useState<ScenarioPreset[]>(
    () => loadCustomScenarios()
  )

  // Centralized lookups for parameter labels/help so JSX stays flat
  type ParamKey =
    | 'seatCount' | 'staffCount' | 'catCount'
    | 'customerArrivalInterval' | 'maxWaitTime'
    | 'orderTime' | 'preparationTime' | 'diningTime'
    | 'catInteractionTime' | 'catRestProbability' | 'catRestDuration'
    | 'simulationDuration' | 'randomSeed' | 'warmUpDuration'
  const paramLabel = (k: ParamKey) => t(`settings:parameters.${k}.label` as const)
  const paramHelp = (k: ParamKey) => t(`settings:parameters.${k}.help` as const)
  const unitMin = t('common:unit.min')
  const unitPeople = t('common:unit.people')
  const unitSeat = t('common:unit.seat')
  const unitCat = t('common:unit.cat')

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

  function validateConfig() {
    if (config.customerArrivalInterval > config.simulationDuration) {
      toast(t('settings:validation.lowArrival'), 'info')
    }
    if (config.simulationDuration < 30) {
      toast(t('settings:validation.shortDuration'), 'info')
    }
    if (config.seatCount * config.staffCount * config.catCount > 1000) {
      toast(t('settings:validation.extremeResources'), 'info')
    }
  }

  function handleRun() {
    validateConfig()
    const fallback = t('settings:scenario.defaultRunLabel')
    let label = fallback
    if (activeScenario) {
      if (isBuiltInScenarioId(activeScenario)) {
        label = t(`scenarios:${activeScenario}.name` as const)
      } else {
        label = customScenarios.find((s) => s.id === activeScenario)?.name ?? fallback
      }
    }
    if (sweepMode && onRunSweep) {
      onRunSweep(config, sweepParam, sweepFrom, sweepTo, sweepStep, sweepReplications)
    } else if (batchMode && onRunBatch) {
      const batchLabel = `${label} (${replicationCount}x)`
      onRunBatch(config, replicationCount, batchLabel)
    } else {
      onRun(config, label)
    }
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) { toast(t('settings:csvImport.invalidFile'), 'error'); return }
        const headers = lines[0].split(',').map((h) => h.trim())
        // Map CSV headers (snake_case) to config keys (camelCase)
        const headerMap: Record<string, keyof SimulationConfig> = {
          seat_count: 'seatCount', staff_count: 'staffCount', cat_count: 'catCount',
          customer_arrival_interval: 'customerArrivalInterval', customer_arrival_interval_min: 'customerArrivalInterval',
          order_time: 'orderTime', order_time_min: 'orderTime',
          preparation_time: 'preparationTime', preparation_time_min: 'preparationTime',
          dining_time: 'diningTime', dining_time_min: 'diningTime',
          cat_interaction_time: 'catInteractionTime', cat_interaction_time_min: 'catInteractionTime',
          cat_idle_interval: 'catIdleInterval', cat_idle_interval_min: 'catIdleInterval',
          cat_rest_probability: 'catRestProbability',
          cat_rest_duration: 'catRestDuration', cat_rest_duration_min: 'catRestDuration',
          max_wait_time: 'maxWaitTime', max_wait_time_min: 'maxWaitTime',
          simulation_duration: 'simulationDuration', simulation_duration_min: 'simulationDuration',
          random_seed: 'randomSeed',
          // Also accept camelCase headers directly
          seatCount: 'seatCount', staffCount: 'staffCount', catCount: 'catCount',
          customerArrivalInterval: 'customerArrivalInterval', orderTime: 'orderTime',
          preparationTime: 'preparationTime', diningTime: 'diningTime',
          catInteractionTime: 'catInteractionTime', catIdleInterval: 'catIdleInterval',
          catRestProbability: 'catRestProbability', catRestDuration: 'catRestDuration',
          maxWaitTime: 'maxWaitTime', simulationDuration: 'simulationDuration', randomSeed: 'randomSeed',
        }
        const colMap = headers.map((h) => headerMap[h] ?? null)
        const missing = REQUIRED_KEYS.filter((k) => !colMap.includes(k))
        if (missing.length > 0) {
          toast(t('settings:csvImport.missingColumns', { columns: missing.join(', ') }), 'error')
          return
        }
        const configs: SimulationConfig[] = []
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map((v) => v.trim())
          const cfg = { ...config } as Record<string, number>
          let valid = true
          for (let j = 0; j < colMap.length; j++) {
            const key = colMap[j]
            if (!key) continue
            const num = parseFloat(vals[j])
            if (isNaN(num)) { valid = false; break }
            cfg[key] = num
          }
          if (valid) configs.push(cfg as unknown as SimulationConfig)
        }
        if (configs.length === 0) { toast(t('settings:csvImport.invalidFile'), 'error'); return }
        setCsvConfigs(configs)
      } catch {
        toast(t('settings:csvImport.invalidFile'), 'error')
      }
    }
    reader.readAsText(file)
  }

  async function handleCsvRunAll() {
    if (!csvConfigs || csvConfigs.length === 0) return
    const start = Date.now()
    for (let i = 0; i < csvConfigs.length; i++) {
      const cfg = csvConfigs[i]
      const label = `CSV #${i + 1}`
      onRun(cfg, label)
      // Small delay to let the UI update
      await new Promise((r) => setTimeout(r, 100))
    }
    const secs = ((Date.now() - start) / 1000).toFixed(1)
    toast(t('settings:csvImport.complete', { count: csvConfigs.length, seconds: secs }))
    setCsvConfigs(null)
  }

  function handleSaveCustom(name: string) {
    const id = `custom-${Date.now()}`
    const preset: ScenarioPreset = {
      id,
      name,
      description: t('scenarios:customDefaultDescription'),
      config,
    }
    saveCustomScenario(preset)
    setCustomScenarios(loadCustomScenarios())
    setActiveScenario(id)
    toast(t('common:toast.scenarioSaved'))
  }

  function handleDeleteCustom(id: string) {
    deleteCustomScenario(id)
    setCustomScenarios(loadCustomScenarios())
    if (activeScenario === id) setActiveScenario(null)
    toast(t('common:toast.scenarioDeleted'))
  }

  // Fake progress: exponential curve 0 → 95%, then snaps to 100% when done
  const progressPct = isRunning
    ? Math.min(95, (1 - Math.exp(-elapsed / 4)) * 100)
    : 0

  const [isDragOver, setIsDragOver] = useState(false)

  const REQUIRED_KEYS: (keyof SimulationConfig)[] = [
    'seatCount', 'staffCount', 'catCount', 'customerArrivalInterval',
    'orderTime', 'preparationTime', 'diningTime', 'catInteractionTime',
    'catRestProbability', 'catRestDuration', 'maxWaitTime',
    'simulationDuration', 'randomSeed',
  ]

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.name.endsWith('.json')) {
      toast(t('common:toast.importFailed'), 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        // Accept both raw config and { config: ... } wrapper
        const cfg = parsed.config ?? parsed
        const valid = REQUIRED_KEYS.every(
          (k) => typeof cfg[k] === 'number'
        )
        if (!valid) {
          toast(t('common:toast.importFailed'), 'error')
          return
        }
        const imported: SimulationConfig = {} as SimulationConfig
        for (const k of REQUIRED_KEYS) {
          ;(imported as Record<string, number>)[k] = cfg[k]
        }
        // Also pick optional catIdleInterval if present
        if (typeof cfg.catIdleInterval === 'number') {
          imported.catIdleInterval = cfg.catIdleInterval
        } else {
          imported.catIdleInterval = config.catIdleInterval
        }
        setConfig(imported)
        setActiveScenario(null)
        toast(t('common:toast.importSuccess'))
      } catch {
        toast(t('common:toast.importFailed'), 'error')
      }
    }
    reader.readAsText(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast, config.catIdleInterval])

  return (
    <div
      className={`page-container ${isDragOver ? 'ring-2 ring-orange-400 ring-inset bg-orange-50/50 dark:bg-orange-900/20' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-5" data-onboarding="scenario-bar">
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

      {/* ── Academic disclaimer banner ───────────────── */}
      <div className="mb-4 rounded-xl bg-cream-100 dark:bg-bark-800 ring-1 ring-inset ring-orange-200 dark:ring-bark-600 px-4 py-3">
        <p className="text-[12px] font-semibold text-orange-700 dark:text-orange-400">
          {t('settings:academicDisclaimer.title')}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-orange-800/90 dark:text-bark-200 select-text">
          {t('settings:academicDisclaimer.body')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Café resources ─────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('settings:sections.cafeResources')}</div>
          <ParamRationale params={['seatCount', 'staffCount', 'catCount']} />
          <div className="grid grid-cols-3 gap-3">
            <ParamInput
              label={paramLabel('seatCount')}
              value={config.seatCount}
              onChange={(v) => set('seatCount', Math.max(1, Math.round(v)))}
              min={1} max={50} step={1}
              unit={unitSeat}
              tooltip={paramHelp('seatCount')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('staffCount')}
              value={config.staffCount}
              onChange={(v) => set('staffCount', Math.max(1, Math.round(v)))}
              min={1} max={20} step={1}
              unit={unitPeople}
              tooltip={paramHelp('staffCount')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('catCount')}
              value={config.catCount}
              onChange={(v) => set('catCount', Math.max(1, Math.round(v)))}
              min={1} max={20} step={1}
              unit={unitCat}
              tooltip={paramHelp('catCount')}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── Customer behavior ──────────────────────── */}
        <div className="card">
          <div className="card-title">{t('settings:sections.customerBehavior')}</div>
          <ParamRationale params={['customerArrivalInterval', 'maxWaitTime']} />
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label={paramLabel('customerArrivalInterval')}
              value={config.customerArrivalInterval}
              onChange={(v) => set('customerArrivalInterval', Math.max(0.1, v))}
              min={0.5} max={60} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('customerArrivalInterval')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('maxWaitTime')}
              value={config.maxWaitTime}
              onChange={(v) => set('maxWaitTime', Math.max(1, v))}
              min={1} max={120} step={1}
              unit={unitMin}
              tooltip={paramHelp('maxWaitTime')}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── Service time ───────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('settings:sections.serviceTime')}</div>
          <ParamRationale params={['orderTime', 'preparationTime', 'diningTime']} />
          <div className="grid grid-cols-3 gap-3">
            <ParamInput
              label={paramLabel('orderTime')}
              value={config.orderTime}
              onChange={(v) => set('orderTime', Math.max(0.5, v))}
              min={0.5} max={30} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('orderTime')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('preparationTime')}
              value={config.preparationTime}
              onChange={(v) => set('preparationTime', Math.max(0.5, v))}
              min={0.5} max={60} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('preparationTime')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('diningTime')}
              value={config.diningTime}
              onChange={(v) => set('diningTime', Math.max(0.5, v))}
              min={0.5} max={120} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('diningTime')}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── Cat interaction ────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('settings:sections.catInteraction')}</div>
          <ParamRationale
            params={['catIdleInterval', 'catInteractionTime', 'catRestProbability', 'catRestDuration']}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ParamInput
              label={paramLabel('catIdleInterval')}
              value={config.catIdleInterval}
              onChange={(v) => set('catIdleInterval', Math.max(0.5, v))}
              min={0.5} max={60} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('catIdleInterval')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('catInteractionTime')}
              value={config.catInteractionTime}
              onChange={(v) => set('catInteractionTime', Math.max(0.5, v))}
              min={0.5} max={60} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('catInteractionTime')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('catRestProbability')}
              value={config.catRestProbability}
              onChange={(v) => set('catRestProbability', Math.min(1, Math.max(0, v)))}
              min={0} max={1} step={0.05}
              tooltip={paramHelp('catRestProbability')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('catRestDuration')}
              value={config.catRestDuration}
              onChange={(v) => set('catRestDuration', Math.max(0.5, v))}
              min={0.5} max={120} step={0.5}
              unit={unitMin}
              tooltip={paramHelp('catRestDuration')}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* ── Simulation parameters ──────────────────── */}
        <div className="card lg:col-span-2">
          <div className="card-title">{t('settings:sections.simulationParams')}</div>
          <ParamRationale params={['simulationDuration', 'randomSeed']} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput
              label={paramLabel('simulationDuration')}
              value={config.simulationDuration}
              onChange={(v) => set('simulationDuration', Math.max(10, v))}
              min={10} max={1440} step={10}
              unit={unitMin}
              tooltip={paramHelp('simulationDuration')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('randomSeed')}
              value={config.randomSeed}
              onChange={(v) => set('randomSeed', Math.round(v))}
              min={0} max={99999} step={1}
              tooltip={paramHelp('randomSeed')}
              disabled={isRunning}
            />
            <ParamInput
              label={paramLabel('warmUpDuration')}
              value={config.warmUpDuration}
              onChange={(v) => set('warmUpDuration', Math.max(0, v))}
              min={0} max={480} step={5}
              unit={unitMin}
              tooltip={paramHelp('warmUpDuration')}
              disabled={isRunning}
            />
          </div>

          {/* ── Advanced run modes ─────────────────────── */}
          {onRunBatch && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Batch card */}
              <button
                type="button"
                onClick={() => { setBatchMode(!batchMode); if (!batchMode) setSweepMode(false) }}
                disabled={isRunning}
                className={[
                  'rounded-xl border-2 p-3 text-left transition-all duration-150',
                  batchMode
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-500 shadow-md shadow-orange-500/10'
                    : 'border-orange-100 dark:border-bark-600 bg-white dark:bg-bark-800 hover:border-orange-300 dark:hover:border-bark-500',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🔬</span>
                  <span className={`text-xs font-bold ${batchMode ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-bark-200'}`}>
                    {t('settings:batch.toggle')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-bark-400 leading-relaxed">
                  {t('settings:batch.description')}
                </p>
              </button>

              {/* Sweep card */}
              {onRunSweep && (
                <button
                  type="button"
                  onClick={() => { setSweepMode(!sweepMode); if (!sweepMode) setBatchMode(false) }}
                  disabled={isRunning}
                  className={[
                    'rounded-xl border-2 p-3 text-left transition-all duration-150',
                    sweepMode
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500 shadow-md shadow-purple-500/10'
                      : 'border-orange-100 dark:border-bark-600 bg-white dark:bg-bark-800 hover:border-purple-300 dark:hover:border-bark-500',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">📈</span>
                    <span className={`text-xs font-bold ${sweepMode ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-bark-200'}`}>
                      {t('settings:sweep.toggle')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-bark-400 leading-relaxed">
                    {t('settings:sweep.description')}
                  </p>
                </button>
              )}

              {/* Batch options (slides open below) */}
              {batchMode && (
                <div className="md:col-span-2 rounded-xl border border-orange-200 dark:border-bark-600 bg-orange-50/50 dark:bg-bark-800 px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    {t('settings:batch.replications')}
                  </span>
                  <input
                    type="range"
                    min={2} max={50} step={1}
                    value={replicationCount}
                    onChange={(e) => setReplicationCount(Number(e.target.value))}
                    disabled={isRunning}
                    className="flex-1 accent-orange-500 h-1.5"
                  />
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums w-8 text-center">
                    {replicationCount}
                  </span>
                </div>
              )}

              {/* Sweep options (slides open below) */}
              {sweepMode && (
                <div className="md:col-span-2 rounded-xl border border-purple-200 dark:border-bark-600 bg-purple-50/50 dark:bg-bark-800 px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400 shrink-0">
                      {t('settings:sweep.paramLabel')}
                    </span>
                    <ThemedSelect
                      value={sweepParam}
                      options={SWEEPABLE_PARAMS.map((p) => ({ value: p, label: paramLabel(p) }))}
                      onChange={(v) => setSweepParam(v as SweepableParam)}
                      disabled={isRunning}
                      accent="purple"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { label: t('settings:sweep.from'), value: sweepFrom, set: setSweepFrom, min: 0, step: 1 },
                      { label: t('settings:sweep.to'), value: sweepTo, set: setSweepTo, min: 0, step: 1 },
                      { label: t('settings:sweep.step'), value: sweepStep, set: (v: number) => setSweepStep(Math.max(0.1, v)), min: 0.1, step: 0.1 },
                      { label: t('settings:sweep.repsEach'), value: sweepReplications, set: (v: number) => setSweepReplications(Math.max(1, Math.min(20, v))), min: 1, step: 1 },
                    ] as const).map((field) => (
                      <div key={field.label}>
                        <label className="text-[10px] font-medium text-purple-500 dark:text-purple-400 block mb-0.5">
                          {field.label}
                        </label>
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.set(Number(e.target.value) || field.min)}
                          min={field.min}
                          step={field.step}
                          disabled={isRunning}
                          className="w-full px-2 py-1 text-xs text-center rounded-lg border border-purple-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-700 dark:text-bark-200 tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Error display ────────────────────────────── */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {t('settings:errorPanel.title')}
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  {t(`errors:${error.type}` as const, {
                    defaultValue: t('errors:unknown'),
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorDetail((v) => !v)}
              className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap"
            >
              {showErrorDetail
                ? t('settings:errorPanel.hideDetail')
                : t('settings:errorPanel.showDetail')}
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
        <div className="mt-4 rounded-xl border border-orange-200 dark:border-bark-600 bg-orange-50 dark:bg-bark-800 px-4 py-3">
          <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400 mb-2">
            <span>
              {batchProgress
                ? t('settings:batch.progress', {
                    completed: batchProgress.completed,
                    total: batchProgress.total,
                  })
                : t('settings:actions.runningHint')}
            </span>
            <span>{elapsed.toFixed(1)} {t('common:unit.sec')}</span>
          </div>
          <div
            className="h-2.5 bg-orange-100 dark:bg-bark-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(batchProgress ? (batchProgress.completed / batchProgress.total) * 100 : progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('settings:actions.running')}
          >
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-300"
              style={{
                width: `${(batchProgress
                  ? (batchProgress.completed / batchProgress.total) * 100
                  : progressPct
                ).toFixed(1)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── CSV import preview ─────────────────────── */}
      {csvConfigs && (
        <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50/60 dark:bg-green-900/20 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
              {t('settings:csvImport.preview', { count: csvConfigs.length })}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCsvConfigs(null)} className="btn-secondary text-xs px-3 py-1">
                {t('settings:csvImport.cancel')}
              </button>
              <button type="button" onClick={handleCsvRunAll} disabled={isRunning} className="btn-primary text-xs px-3 py-1">
                {t('settings:csvImport.runAll')}
              </button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto text-[10px] font-mono text-green-800 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 rounded-lg px-2 py-1">
            {csvConfigs.map((cfg, i) => (
              <div key={i}>#{i + 1}: seats={cfg.seatCount} staff={cfg.staffCount} cats={cfg.catCount} interval={cfg.customerArrivalInterval} seed={cfg.randomSeed}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────── */}
      <div className="mt-4 flex gap-3 justify-end">
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={() => csvInputRef.current?.click()}
          disabled={isRunning}
          className="btn-secondary text-xs"
        >
          {t('settings:csvImport.button')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isRunning}
          className="btn-secondary"
        >
          {t('settings:actions.reset')}
        </button>
        {isRunning && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-500 hover:to-red-700 text-white font-semibold rounded-xl px-6 py-2.5 shadow-lg shadow-red-500/25 transition-all duration-150 flex items-center gap-2"
          >
            {t('settings:actions.cancel')}
          </button>
        ) : (
          <button
            type="button"
            data-onboarding="run-button"
            onClick={handleRun}
            disabled={isRunning}
            className="btn-primary flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('settings:actions.running')}
              </>
            ) : sweepMode ? (
              <>{t('settings:sweep.runButton')}</>
            ) : batchMode ? (
              <>{t('settings:batch.runButton', { count: replicationCount })}</>
            ) : (
              <>{t('settings:actions.start')}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
