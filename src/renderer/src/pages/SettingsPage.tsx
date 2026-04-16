import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig, ScenarioPreset, SimulatorError } from '../types'
import ParamInput from '../components/ParamInput'
import ParamRationale from '../components/ParamRationale'
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
  const { t } = useTranslation(['settings', 'common', 'errors', 'scenarios'])
  const { toast } = useToast()
  const [config, setConfig] = useState<SimulationConfig>(initialConfig)
  const [activeScenario, setActiveScenario] = useState<string | null>('weekday')
  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [customScenarios, setCustomScenarios] = useState<ScenarioPreset[]>(
    () => loadCustomScenarios()
  )

  // Centralized lookups for parameter labels/help so JSX stays flat
  type ParamKey =
    | 'seatCount' | 'staffCount' | 'catCount'
    | 'customerArrivalInterval' | 'maxWaitTime'
    | 'orderTime' | 'preparationTime' | 'diningTime'
    | 'catInteractionTime' | 'catRestProbability' | 'catRestDuration'
    | 'simulationDuration' | 'randomSeed'
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

  function handleRun() {
    const fallback = t('settings:scenario.defaultRunLabel')
    let label = fallback
    if (activeScenario) {
      if (isBuiltInScenarioId(activeScenario)) {
        label = t(`scenarios:${activeScenario}.name` as const)
      } else {
        label = customScenarios.find((s) => s.id === activeScenario)?.name ?? fallback
      }
    }
    onRun(config, label)
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
          </div>
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
            <span>{t('settings:actions.runningHint')}</span>
            <span>{elapsed.toFixed(1)} {t('common:unit.sec')}</span>
          </div>
          <div className="h-2.5 bg-orange-100 dark:bg-bark-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
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
          {t('settings:actions.reset')}
        </button>
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
          ) : (
            <>{t('settings:actions.start')}</>
          )}
        </button>
      </div>
    </div>
  )
}
