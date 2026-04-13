import { useState } from 'react'
import type { ScenarioPreset, SimulationConfig } from '../types'

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
    if (window.confirm('確定要刪除這個自訂情境嗎？')) {
      onDeleteCustom?.(id)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">預設情境</p>
        {!saving && onSaveCustom && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setSaving(true); setSaveName('') }}
            className="text-xs text-orange-500 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <span>＋</span> 儲存目前設定
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
            onClick={() => onSelect(s.config, s.id)}
            title={s.description}
            className={`btn-scenario ${
              activeScenarioId === s.id ? 'btn-scenario-active' : 'btn-scenario-inactive'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {s.name}
          </button>
        ))}

        {/* Custom scenarios */}
        {customScenarios.map((s) => (
          <div key={s.id} className="relative flex items-center group">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s.config, s.id)}
              title={s.description || s.name}
              className={`btn-scenario pr-6 ${
                activeScenarioId === s.id ? 'btn-scenario-active' : 'btn-scenario-inactive'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {s.name}
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleDeleteCustom(s.id)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 leading-none text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="刪除情境"
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
            placeholder="輸入情境名稱…"
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
            儲存
          </button>
          <button
            type="button"
            onClick={() => setSaving(false)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            取消
          </button>
        </form>
      )}
    </div>
  )
}
