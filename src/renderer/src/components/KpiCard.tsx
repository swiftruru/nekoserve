import AnimatedNumber from './results/AnimatedNumber'

interface KpiCardProps {
  label: string
  /**
   * Static display value. Used when the number is already a formatted
   * string (e.g. percentages pre-formatted by the caller). Ignored
   * when `numeric` is provided.
   */
  value?: string | number
  /**
   * Optional raw number that will be animated via AnimatedNumber.
   * When provided, this takes precedence over `value` and drives the
   * count-up display. Use for KPIs whose value is a plain scalar.
   */
  numeric?: number
  /** Decimal places for the animated numeric display. Defaults to 0. */
  decimals?: number
  /** Suffix appended after the animated number (e.g. "%"). */
  numericSuffix?: string
  unit?: string
  icon?: string
  highlight?: 'normal' | 'warning' | 'danger' | 'good'
  description?: string
}

const HIGHLIGHT_STYLES = {
  normal:  'bg-white border-orange-100',
  good:    'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  danger:  'bg-red-50 border-red-200',
} as const

const HIGHLIGHT_VALUE_STYLES = {
  normal:  'text-orange-600',
  good:    'text-green-600',
  warning: 'text-yellow-600',
  danger:  'text-red-600',
} as const

export default function KpiCard({
  label,
  value,
  numeric,
  decimals = 0,
  numericSuffix,
  unit,
  icon,
  highlight = 'normal',
  description,
}: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm flex flex-col gap-1 ${HIGHLIGHT_STYLES[highlight]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums ${HIGHLIGHT_VALUE_STYLES[highlight]}`}>
          {numeric !== undefined ? (
            <AnimatedNumber
              value={numeric}
              decimals={decimals}
              suffix={numericSuffix}
            />
          ) : (
            value
          )}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}
