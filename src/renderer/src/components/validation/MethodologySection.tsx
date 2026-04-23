import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { CITATIONS, citationShort, citationUrl } from '../../data/citations'
import { renderWithTerms } from '../results/TermTooltip'
import FormulaBox from './FormulaBox'

/**
 * v2.1 validation rigor upgrade — block A: methodology section.
 *
 * Collapsible card at the top of the Validation page that cites the
 * framework behind our χ² / KS / KL composite scoring. Structured as
 * three nested panels:
 *
 *  A.1 — Why multi-metric composite (Sargent 2013, Kleijnen 1995,
 *        Rubner 2000) and explicit alignment with Hirsch 2025's own
 *        χ² goodness-of-fit analysis
 *  A.2 — Indicator complementarity matrix (why each metric exists)
 *  A.3 — Threshold justification (80-point cutoff, soft-caps, critical
 *        values from Agresti 2013)
 *
 * The card is closed by default — students who just want the score
 * see it near the top; students who want to audit the method expand
 * it. Voice: mixed. Citations read formally ("Sargent 2013 recommends
 * …"); the surrounding first-person narration stays in Ruru's voice
 * ("I picked three complementary indicators because …").
 */
export default function MethodologySection() {
  const { t } = useTranslation('validation')
  const [open, setOpen] = useState(false)

  return (
    <section className="mb-4 rounded-xl ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60 bg-indigo-50/70 dark:bg-indigo-900/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
          🎓 {t('methodology.title')}
        </span>
        <span className="text-indigo-600 dark:text-indigo-400 text-xs">
          {open ? t('methodology.collapse') : t('methodology.expand')}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-5 text-xs text-gray-700 dark:text-bark-200 leading-relaxed">
          <FrameworkBlock />
          <ComplementarityBlock />
          <ThresholdBlock />
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────────────────── */

function FrameworkBlock() {
  const { t } = useTranslation('validation')
  return (
    <div>
      <h3 className="text-[13px] font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
        {t('methodology.framework.heading')}
      </h3>
      <p className="mb-2">{renderWithTerms(t('methodology.framework.intro'))}</p>
      <ul className="space-y-2 pl-4 list-disc">
        <li>
          <Trans
            t={t}
            i18nKey="methodology.framework.sargent"
            components={{
              cite: (
                <CitationLink citationKey="sargent2013vv" />
              ),
            }}
          />
        </li>
        <li>
          <Trans
            t={t}
            i18nKey="methodology.framework.kleijnen"
            components={{
              cite: (
                <CitationLink citationKey="kleijnen1995vv" />
              ),
            }}
          />
        </li>
        <li>
          <Trans
            t={t}
            i18nKey="methodology.framework.rubner"
            components={{
              cite: (
                <CitationLink citationKey="rubner2000emd" />
              ),
            }}
          />
        </li>
      </ul>

      <FormulaBox
        label={t('methodology.framework.compositeFormulaLabel')}
        tex="\text{score} = 0.4 \cdot \chi^2_{\text{norm}} + 0.3 \cdot \text{KS}_{\text{norm}} + 0.3 \cdot \text{KL}_{\text{norm}}"
        hint={t('methodology.framework.compositeFormulaHint')}
        parts={[
          { symbol: '\\text{score}', partKey: 'score' },
          { symbol: '\\chi^2_{\\text{norm}}', partKey: 'chiNorm' },
          { symbol: '\\text{KS}_{\\text{norm}}', partKey: 'ksNorm' },
          { symbol: '\\text{KL}_{\\text{norm}}', partKey: 'klNorm' },
          { symbol: '0.4', partKey: 'weightChi' },
          { symbol: '0.3', partKey: 'weightOthers' },
        ]}
      >
        <p>{renderWithTerms(t('methodology.framework.compositeFormulaLong'))}</p>
      </FormulaBox>

      <div className="mt-3 rounded-md bg-amber-100/70 dark:bg-amber-900/30 ring-1 ring-inset ring-amber-300/70 dark:ring-amber-700/50 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-100">
        <strong>{t('methodology.framework.alignmentLabel')}：</strong>{' '}
        {renderWithTerms(t('methodology.framework.alignmentBody'))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function ComplementarityBlock() {
  const { t } = useTranslation('validation')
  const rows: { metric: string; strength: string; weakness: string; paired: string }[] = [
    {
      metric: t('methodology.complementarity.rows.chi.metric'),
      strength: t('methodology.complementarity.rows.chi.strength'),
      weakness: t('methodology.complementarity.rows.chi.weakness'),
      paired: t('methodology.complementarity.rows.chi.paired'),
    },
    {
      metric: t('methodology.complementarity.rows.ks.metric'),
      strength: t('methodology.complementarity.rows.ks.strength'),
      weakness: t('methodology.complementarity.rows.ks.weakness'),
      paired: t('methodology.complementarity.rows.ks.paired'),
    },
    {
      metric: t('methodology.complementarity.rows.kl.metric'),
      strength: t('methodology.complementarity.rows.kl.strength'),
      weakness: t('methodology.complementarity.rows.kl.weakness'),
      paired: t('methodology.complementarity.rows.kl.paired'),
    },
  ]
  return (
    <div>
      <h3 className="text-[13px] font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
        {t('methodology.complementarity.heading')}
      </h3>
      <p className="mb-2">{renderWithTerms(t('methodology.complementarity.intro'))}</p>
      <div className="overflow-x-auto rounded-md ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60">
        <table className="w-full text-[11px]">
          <thead className="bg-indigo-100/60 dark:bg-indigo-800/30 text-indigo-800 dark:text-indigo-200">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">{t('methodology.complementarity.colMetric')}</th>
              <th className="px-2 py-1.5 text-left font-semibold">{t('methodology.complementarity.colStrength')}</th>
              <th className="px-2 py-1.5 text-left font-semibold">{t('methodology.complementarity.colWeakness')}</th>
              <th className="px-2 py-1.5 text-left font-semibold">{t('methodology.complementarity.colPaired')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.metric}
                className="border-t border-indigo-100 dark:border-indigo-800/40"
              >
                <td className="px-2 py-1.5 font-semibold text-gray-800 dark:text-bark-100">{r.metric}</td>
                <td className="px-2 py-1.5 text-gray-700 dark:text-bark-300">{r.strength}</td>
                <td className="px-2 py-1.5 text-gray-700 dark:text-bark-300">{r.weakness}</td>
                <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-bark-300">{r.paired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function ThresholdBlock() {
  const { t } = useTranslation('validation')
  return (
    <div>
      <h3 className="text-[13px] font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
        {t('methodology.thresholds.heading')}
      </h3>
      <p className="mb-2">{renderWithTerms(t('methodology.thresholds.intro'))}</p>

      <FormulaBox
        label={t('methodology.thresholds.softCapLabel')}
        tex="\text{score} = 100 \cdot \max(0,\; 1 - \text{stat} / \text{cap})"
        hint={t('methodology.thresholds.softCapHint')}
        parts={[
          { symbol: '\\text{stat}', partKey: 'stat' },
          { symbol: '\\text{cap}', partKey: 'cap' },
          { symbol: '\\max', partKey: 'maxFn' },
          { symbol: '100', partKey: 'hundredScale' },
        ]}
      />

      <ul className="space-y-1.5 pl-4 list-disc">
        <li>
          <Trans
            t={t}
            i18nKey="methodology.thresholds.chi"
            components={{
              cite: <CitationLink citationKey="agresti2013cda" />,
            }}
          />
        </li>
        <li>{renderWithTerms(t('methodology.thresholds.ks'))}</li>
        <li>{renderWithTerms(t('methodology.thresholds.kl'))}</li>
        <li>
          <Trans
            t={t}
            i18nKey="methodology.thresholds.composite"
            components={{
              cite: <CitationLink citationKey="sargent2013vv" />,
            }}
          />
        </li>
      </ul>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-bark-400 italic">
        {renderWithTerms(t('methodology.thresholds.caveat'))}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function CitationLink({
  citationKey,
  children,
}: {
  citationKey: keyof typeof CITATIONS
  children?: React.ReactNode
}) {
  const c = CITATIONS[citationKey]
  if (!c) return <span>{children}</span>
  return (
    <a
      href={citationUrl(c)}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-indigo-700 dark:text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-indigo-900 dark:hover:text-indigo-200"
    >
      {children ?? citationShort(c)}
    </a>
  )
}
