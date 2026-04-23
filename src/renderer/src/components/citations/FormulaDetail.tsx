import { useTranslation } from 'react-i18next'

interface Symbol {
  sym: string
  meaning: string
}

interface Props {
  /** Formula as a plain string, e.g. "L = λ · W". */
  formula: string
  /** Ordered list of symbols and their plain-language meanings. */
  symbols: readonly Symbol[]
}

/**
 * Formula breakdown box. Sits under a chapter narrative when that
 * chapter introduces a math identity (Little's Law, ρ_R, etc.). The
 * formula itself is rendered large and monospaced; each symbol gets a
 * one-line definition in a compact grid so the reader can map glyph
 * back to meaning without leaving the chapter.
 *
 * Not a full LaTeX renderer on purpose: the citations story page reads
 * at a higher altitude than the How-It-Works page's KaTeX blocks, and
 * keeping the formula as a string lets us sit it inline in a colored
 * panel that reads as "definition card" rather than "equation".
 */
export default function FormulaDetail({ formula, symbols }: Props) {
  const { t } = useTranslation('citations')
  return (
    <div className="mt-3 rounded-lg ring-1 ring-inset ring-amber-200 dark:ring-amber-800/60 bg-amber-50/80 dark:bg-amber-900/20 p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          {t('story.formula.label')}
        </span>
        <span
          className="text-base md:text-lg font-mono text-amber-900 dark:text-amber-100 select-text"
          data-testid="formula-detail-equation"
        >
          {formula}
        </span>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        {symbols.map((s) => (
          <div key={s.sym} className="contents">
            <dt className="font-mono font-bold text-amber-800 dark:text-amber-200 text-right">
              {s.sym}
            </dt>
            <dd className="text-gray-700 dark:text-bark-200 leading-snug">
              {s.meaning}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
