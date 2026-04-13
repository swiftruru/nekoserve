interface KpiCardProps {
  label: string
  value: string | number
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
        <span className={`text-2xl font-bold ${HIGHLIGHT_VALUE_STYLES[highlight]}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}
