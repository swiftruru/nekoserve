import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScenarioPreset, SimulationConfig } from '../types'
import { isBuiltInScenarioId } from '../data/scenarios'

interface ScenarioButtonsProps {
  scenarios: ScenarioPreset[]
  customScenarios: ScenarioPreset[]
  activeScenarioId: string | null
  onSelect: (config: SimulationConfig, id: string) => void
  onSaveCustom?: (name: string) => void
  onDeleteCustom?: (id: string) => void
  disabled?: boolean
}

export default function ScenarioButtons({
  scenarios,
  customScenarios,
  activeScenarioId,
  onSelect,
  onSaveCustom,
  onDeleteCustom,
  disabled = false,
}: ScenarioButtonsProps) {
  const { t } = useTranslation(['settings', 'scenarios', 'common'])
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')

  function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = saveName.trim()
    if (!name) return
    onSaveCustom?.(name)
    setSaving(false)
    setSaveName('')
  }

  function handleDeleteCustom(id: string) {
    if (window.confirm(t('settings:scenario.deleteConfirm'))) {
      onDeleteCustom?.(id)
    }
  }

  function builtInName(preset: ScenarioPreset): string {
    if (isBuiltInScenarioId(preset.id)) {
      return t(`scenarios:${preset.id}.name` as const)
    }
    return preset.name
  }

  function builtInDescription(preset: ScenarioPreset): string {
    if (isBuiltInScenarioId(preset.id)) {
      return t(`scenarios:${preset.id}.description` as const)
    }
    return preset.description
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {t('settings:scenario.label')}
        </p>
        {!saving && onSaveCustom && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setSaving(true); setSaveName('') }}
            className="text-xs text-orange-500 hover:text-orange-700 disabled:opacity-40 flex items-center gap-1"
          >
            <span>＋</span> {t('settings:scenario.saveCurrent')}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Built-in scenarios */}
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            data-testid={`scenario-button-${s.id}`}
            onClick={() => onSelect(s.config, s.id)}
            title={builtInDescription(s)}
            className={`btn-scenario ${
              activeScenarioId === s.id ? 'btn-scenario-active' : 'btn-scenario-inactive'
            } disabled:opacity-40`}
          >
            {builtInName(s)}
          </button>
        ))}

        {/* Custom scenarios (user-typed names, not translated) */}
        {customScenarios.map((s) => (
          <div key={s.id} className="relative flex items-center group">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s.config, s.id)}
              title={s.description || s.name}
              className={`btn-scenario pr-6 ${
                activeScenarioId === s.id ? 'btn-scenario-active' : 'btn-scenario-inactive'
              } disabled:opacity-40`}
            >
              {s.name}
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleDeleteCustom(s.id)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 leading-none text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('settings:scenario.delete')}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Inline save input */}
      {saving && (
        <form onSubmit={handleSaveSubmit} className="flex items-center gap-2 mt-1">
          <input
            type="text"
            placeholder={t('settings:scenario.nameInputPlaceholder')}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            autoFocus
            maxLength={24}
            className="input-field text-sm flex-1 max-w-48"
          />
          <button
            type="submit"
            disabled={!saveName.trim()}
            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
          >
            {t('common:button.save')}
          </button>
          <button
            type="button"
            onClick={() => setSaving(false)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {t('common:button.cancel')}
          </button>
        </form>
      )}
    </div>
  )
}
