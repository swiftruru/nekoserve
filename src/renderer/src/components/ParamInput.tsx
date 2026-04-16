import { useState, useEffect, useId } from 'react'

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
  error?: string
}

/**
 * Small circular "info" help button with a tooltip that appears on hover.
 * Kept as a local sub-component so the main ParamInput body stays flat.
 */
function HelpButton({ label, tooltip }: { label: string; tooltip: string }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full
                   bg-orange-50 dark:bg-bark-600 text-[10px] font-semibold text-orange-400
                   ring-1 ring-inset ring-orange-100 dark:ring-bark-500
                   transition-colors duration-150
                   hover:bg-orange-100 hover:text-orange-600 hover:ring-orange-200
                   focus:outline-none focus:ring-2 focus:ring-orange-400"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
      >
        i
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-6 right-0 z-20 w-56
                     rounded-xl bg-gray-900/95 px-3 py-2.5 text-xs font-normal
                     leading-relaxed text-white shadow-xl backdrop-blur-sm
                     tooltip-pop"
        >
          {tooltip}
          <div className="absolute -bottom-1 right-2 h-2.5 w-2.5 rotate-45 bg-gray-900/95" />
        </div>
      )}
    </div>
  )
}

/**
 * Value progress bar: a thin gradient fill that shows where `value`
 * currently sits within [min, max]. Clamped to 0–100 %. Only rendered
 * when both min and max are known.
 */
function ValueBar({
  value,
  min,
  max,
  disabled,
}: {
  value: number
  min: number
  max: number
  disabled: boolean
}) {
  const range = max - min
  const pct = range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 0
  return (
    <div
      className="h-1 overflow-hidden rounded-full bg-orange-50 dark:bg-bark-700"
      aria-hidden
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500
                    transition-all duration-200 ease-out
                    ${disabled ? 'opacity-40' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
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
  error,
}: ParamInputProps) {
  const inputId = useId()
  const errorId = useId()

  // Local string mirror of the numeric value so the user can freely
  // clear the field (e.g. select-all → delete) without the controlled
  // value snapping back immediately. On blur we either commit the
  // parsed number or revert to the last good value.
  const [draft, setDraft] = useState(() => String(value))
  const [focused, setFocused] = useState(false)

  // Sync draft when the parent value changes externally (scenario
  // preset switch, reset button, drag-drop import, etc.) — but only
  // while the field is NOT focused, so we never fight the user's
  // in-progress edits.
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
    const raw = parseFloat(e.target.value)
    if (!Number.isNaN(raw)) {
      onChange(raw)
    }
  }

  function handleBlur() {
    setFocused(false)
    const raw = parseFloat(draft)
    if (Number.isNaN(raw) || draft.trim() === '') {
      // Revert to parent value
      setDraft(String(value))
    } else {
      onChange(raw)
      setDraft(String(raw))
    }
  }

  const hasRange = typeof min === 'number' && typeof max === 'number'

  return (
    <div className="flex flex-col gap-1.5">
      {/* ── Label row ──────────────────────────────────
           min-h-[2.4em] reserves space for two lines of the uppercase label
           so single-line and two-line labels all align horizontally, keeping
           sibling inputs on the same baseline regardless of language or
           label length. */}
      <div className="flex items-start gap-1.5 min-h-[2.4em]">
        <label
          htmlFor={inputId}
          className="flex-1 text-[11px] font-semibold uppercase tracking-wide
                     text-gray-500 dark:text-bark-300 leading-[1.2]"
        >
          {label}
        </label>
        {tooltip && (
          <div className="flex-shrink-0 pt-[1px]">
            <HelpButton label={label} tooltip={tooltip} />
          </div>
        )}
      </div>

      {/* ── Input row ────────────────────────────────── */}
      <div className="relative group">
        <input
          id={inputId}
          type="number"
          value={draft}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            param-number-input
            w-full rounded-xl border border-orange-100 bg-cream-50
            px-3 py-2 pr-10
            text-base font-semibold tabular-nums text-gray-800
            transition-all duration-150 ease-out
            hover:border-orange-200 hover:bg-white
            focus:border-orange-300 focus:bg-white
            focus:outline-none focus:ring-4 focus:ring-orange-200/50
            disabled:bg-gray-50
            disabled:text-gray-400 disabled:opacity-70
            dark:bg-bark-700 dark:border-bark-500 dark:text-bark-100
            dark:hover:border-bark-400 dark:hover:bg-bark-600
            dark:focus:border-orange-500 dark:focus:bg-bark-600
            dark:focus:ring-orange-500/30
            dark:disabled:bg-bark-800 dark:disabled:text-bark-400
          `}
        />
        {unit && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
                       text-[11px] font-medium uppercase tracking-wide
                       text-gray-400 group-hover:text-orange-400 transition-colors"
            aria-hidden
          >
            {unit}
          </span>
        )}
      </div>

      {/* ── Validation error ────────────────────────── */}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      )}

      {/* ── Value range fill bar ─────────────────────── */}
      {hasRange && (
        <ValueBar value={value} min={min} max={max} disabled={disabled} />
      )}
    </div>
  )
}
