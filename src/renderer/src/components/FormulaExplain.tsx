import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockMath } from './Math'

interface FormulaExplainProps {
  /** KaTeX LaTeX source rendered via BlockMath. */
  formula: string
  /** Short always-visible plain-language caption (1 sentence). */
  hint: ReactNode
  /** Optional longer deep-dive shown when the reader clicks "更多說明". */
  more?: ReactNode
}

export default function FormulaExplain({ formula, hint, more }: FormulaExplainProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)

  return (
    <div className="my-2">
      <BlockMath formula={formula} />
      <div className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-gray-500 dark:text-bark-300">
        <span aria-hidden="true" className="select-none">🔍</span>
        <div className="flex-1 select-text">
          <span>{hint}</span>
          {more && (
            <>
              {' '}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-semibold"
                aria-expanded={open}
              >
                {open ? t('formulaExplain.collapse') : t('formulaExplain.more')}
              </button>
              {open && (
                <div className="mt-1 rounded-md bg-white/60 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 px-2 py-1.5 text-gray-600 dark:text-bark-200 leading-relaxed">
                  {more}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
