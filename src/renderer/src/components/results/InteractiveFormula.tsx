import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockMath, InlineMath } from '../Math'

export interface FormulaPart {
  /** LaTeX for the symbol button (e.g. "\\lambda"). */
  symbol: string
  /** i18n key suffix under `results:formulaParts.<key>.*` */
  partKey: string
}

interface InteractiveFormulaProps {
  /** Full LaTeX formula string (rendered by BlockMath). */
  formula: string
  /** Clickable symbol parts with explanations. */
  parts: FormulaPart[]
}

/**
 * A KaTeX formula with clickable symbol chips below it.
 * Tapping a chip expands an explanation card with the symbol's
 * name, plain-language description, and unit. Designed to make
 * formulas approachable for students who are afraid of math.
 */
export default function InteractiveFormula({ formula, parts }: InteractiveFormulaProps) {
  const { t } = useTranslation('results')
  const [openKey, setOpenKey] = useState<string | null>(null)

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key))

  const activePart = openKey ? parts.find((p) => p.partKey === openKey) : null
  const activeLabel = activePart ? t(`formulaParts.${activePart.partKey}.label`, { defaultValue: '' }) : ''
  const activeDesc = activePart ? t(`formulaParts.${activePart.partKey}.desc`, { defaultValue: '' }) : ''
  const activeUnit = activePart ? t(`formulaParts.${activePart.partKey}.unit`, { defaultValue: '' }) : ''
  const activeExample = activePart ? t(`formulaParts.${activePart.partKey}.example`, { defaultValue: '' }) : ''

  return (
    <div className="space-y-2">
      {/* Full formula */}
      <BlockMath formula={formula} />

      {/* Symbol chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-400 dark:text-bark-500 mr-0.5">
          🔍
        </span>
        {parts.map((part) => {
          const isActive = openKey === part.partKey
          const label = t(`formulaParts.${part.partKey}.label`, { defaultValue: part.partKey })
          return (
            <button
              key={part.partKey}
              type="button"
              onClick={() => toggle(part.partKey)}
              className={
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-150 ' +
                (isActive
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-bark-500 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-bark-600')
              }
              aria-expanded={isActive}
              aria-label={label}
            >
              <span className="inline-flex items-center">
                <InlineMath formula={part.symbol} className="text-[11px]" />
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Explanation card */}
      {activePart && activeLabel && (
        <div className="rounded-lg border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 p-3 space-y-1.5 shadow-sm">
          {/* Header: symbol + name */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              <InlineMath formula={activePart.symbol} />
            </span>
            <span className="text-sm font-bold text-gray-800 dark:text-bark-100">
              {activeLabel}
            </span>
            {activeUnit && (
              <span className="text-[10px] text-gray-400 dark:text-bark-500 font-mono">
                ({activeUnit})
              </span>
            )}
          </div>

          {/* Description */}
          {activeDesc && (
            <p className="text-xs text-gray-600 dark:text-bark-300 leading-relaxed">
              {activeDesc}
            </p>
          )}

          {/* Example */}
          {activeExample && (
            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1.5 leading-relaxed">
              {activeExample}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
