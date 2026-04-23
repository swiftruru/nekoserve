import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockMath, InlineMath } from '../Math'
import InteractiveFormula, {
  type FormulaPart,
} from '../results/InteractiveFormula'

/**
 * v2.1 validation rigor upgrade — shared formula display widget.
 *
 * Wraps InteractiveFormula (the chip-driven teaching layer already used
 * on the Results page and settings rationale panels) and adds:
 *
 *   - A small "FORMULA" kicker label above the chips
 *   - The orange-bar callout wrapper matching Results / Playback style
 *   - A 🔍 plain-language one-liner ALWAYS visible below the chips
 *   - An optional "更多說明 ▼" expander for deep-dive prose
 *
 * When `parts` is omitted, renders a plain BlockMath / InlineMath
 * (no chips) — useful for trivial formulas that don't need teaching.
 *
 * All clickable-chip entries read their {label, desc, unit, example}
 * from the validation i18n namespace by default:
 *   validation:formulaParts.<partKey>.{label,desc,unit,example}
 */
export default function FormulaBox({
  label,
  tex,
  hint,
  parts,
  children,
  display = 'block',
}: {
  label?: string
  tex: string
  hint: string
  parts?: FormulaPart[]
  children?: ReactNode
  display?: 'block' | 'inline'
}) {
  const { t } = useTranslation('validation')
  const [open, setOpen] = useState(false)

  return (
    <div className="my-2 rounded-lg bg-white/80 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-200 dark:ring-bark-600 border-l-4 border-orange-400 dark:border-orange-500 px-3 py-2.5">
      {label && (
        <div className="text-[10px] uppercase tracking-wide font-semibold text-orange-600 dark:text-orange-400 mb-1">
          {label}
        </div>
      )}

      {parts && parts.length > 0 ? (
        <InteractiveFormula
          formula={tex}
          parts={parts}
          i18nNs="validation"
          i18nBasePath="formulaParts"
        />
      ) : (
        <div className="overflow-x-auto">
          {display === 'block' ? (
            <BlockMath formula={tex} />
          ) : (
            <InlineMath formula={tex} />
          )}
        </div>
      )}

      <div className="mt-2 flex items-start gap-1 text-[11px] text-gray-700 dark:text-bark-200 leading-snug">
        <span aria-hidden="true" className="select-none text-orange-500">🔍</span>
        <span className="flex-1">{hint}</span>
      </div>

      {children && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
          >
            {open ? t('formula.collapse') : t('formula.expand')}
          </button>
          {open && (
            <div className="mt-2 text-[11px] text-gray-700 dark:text-bark-200 leading-relaxed border-t border-orange-100 dark:border-bark-600 pt-2">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  )
}
