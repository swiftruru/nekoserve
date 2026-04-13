import { useState } from 'react'

interface ParamInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  tooltip?: string
  unit?: string
  disabled?: boolean
}

export default function ParamInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  tooltip,
  unit,
  disabled = false,
}: ParamInputProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value)
    if (!isNaN(raw)) {
      onChange(raw)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
        {tooltip && (
          <div className="relative ml-auto">
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center
                         hover:bg-orange-200 hover:text-orange-600 transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              aria-label={`說明：${label}`}
            >
              ?
            </button>
            {showTooltip && (
              <div className="absolute right-0 bottom-6 z-10 w-52 bg-gray-800 text-white text-xs rounded-lg p-2.5 shadow-lg leading-relaxed">
                {tooltip}
                <div className="absolute bottom-[-5px] right-1.5 w-2.5 h-2.5 bg-gray-800 rotate-45" />
              </div>
            )}
          </div>
        )}
      </div>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="input-field"
      />
    </div>
  )
}
