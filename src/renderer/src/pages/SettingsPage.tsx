import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig, ScenarioPreset, SimulatorError } from '../types'
import ParamInput from '../components/ParamInput'
import ParamRationale from '../components/ParamRationale'
import ScenarioButtons from '../components/ScenarioButtons'
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

      {/* ── Academic disclaimer banner ───────────────── */}
      <div className="mb-4 rounded-xl bg-cream-100 ring-1 ring-inset ring-orange-200 px-4 py-3">
        <p className="text-[12px] font-semibold text-orange-700">
          {t('settings:academicDisclaimer.title')}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-orange-800/90 select-text">
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
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
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
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex justify-between text-xs text-orange-600 mb-2">
            <span>{t('settings:actions.runningHint')}</span>
            <span>{elapsed.toFixed(1)} {t('common:unit.sec')}</span>
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
          {t('settings:actions.reset')}
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
