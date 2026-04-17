import { useState, useRef, useEffect } from 'react'

interface ThemedSelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  accent?: 'orange' | 'purple'
}

export default function ThemedSelect({ value, options, onChange, disabled, accent = 'orange' }: ThemedSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const isPurple = accent === 'purple'
  const borderCls = isPurple
    ? 'border-purple-200 dark:border-bark-500 hover:border-purple-400'
    : 'border-orange-200 dark:border-bark-500 hover:border-orange-400'
  const selectedCls = isPurple
    ? 'text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/20'
    : 'text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/20'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((v) => !v) }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border ${borderCls} bg-white dark:bg-bark-700 dark:hover:border-bark-400 px-2.5 py-1.5 text-xs text-gray-700 dark:text-bark-200 transition-colors`}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-orange-200 dark:border-bark-600 bg-white dark:bg-bark-800 shadow-xl shadow-orange-500/10 dark:shadow-black/30 overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? selectedCls
                    : 'text-gray-600 dark:text-bark-200 hover:bg-orange-50 dark:hover:bg-bark-700'
                }`}
              >
                {isSelected && <span className="mr-1.5">✓</span>}
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
