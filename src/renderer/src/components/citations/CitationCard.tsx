import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  citationShort,
  citationToBibTeX,
  citationUrl,
  type Citation,
} from '../../data/citations'

interface Props {
  citation: Citation
  usedByParams: string[]
}

/**
 * Academic-form citation card. Used in the citations page's appendix
 * section. Shows short APA + DOI + open-access badge + role tag +
 * reverse parameter index, with details-expandable APA / BibTeX blocks
 * and copy-to-clipboard buttons.
 *
 * Extracted from the original CitationsPage so the story redesign can
 * compose this card under an <Appendix> section without duplicating the
 * reference-list UX that the thesis writer still needs.
 */
export default function CitationCard({ citation: c, usedByParams }: Props) {
  const { t } = useTranslation('citations')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const apaText = formatAPA(c)
  const bibtex = citationToBibTeX(c)
  const apaKey = `${c.key}:apa`
  const bibKey = `${c.key}:bib`

  function copy(text: string, markerKey: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(markerKey)
      window.setTimeout(
        () => setCopiedKey((prev) => (prev === markerKey ? null : prev)),
        1500,
      )
    })
  }

  return (
    <li className="rounded-xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/70 dark:bg-bark-700/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            {citationShort(c)}
          </div>
          <a
            href={citationUrl(c)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-mono text-amber-700 dark:text-amber-400 underline decoration-amber-300 decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            DOI: {c.doi}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {c.openAccess && (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {t('openAccess')}
            </span>
          )}
          {c.role && (
            <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              {t(`role.${c.role}`)}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-bark-200 select-text">
        {apaText}
      </p>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-400">
          {usedByParams.length > 0 ? t('usedByParams') : t('noParamLink')}
        </div>
        {usedByParams.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {usedByParams.map((p) => (
              <code
                key={p}
                className="rounded bg-cream-100 dark:bg-bark-800 px-1.5 py-0.5 text-[11px] text-gray-700 dark:text-bark-200"
              >
                {p}
              </code>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <details className="rounded-md bg-cream-50 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 open:ring-orange-200">
          <summary className="cursor-pointer list-none px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 [&::-webkit-details-marker]:hidden">
            {t('apa')}
          </summary>
          <pre className="whitespace-pre-wrap break-words px-3 pb-2 text-[11px] leading-relaxed text-gray-700 dark:text-bark-200 select-text">
            {apaText}
          </pre>
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => copy(apaText, apaKey)}
              className="rounded bg-white dark:bg-bark-700 ring-1 ring-inset ring-orange-200 dark:ring-bark-500 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600"
            >
              {copiedKey === apaKey ? t('copiedToast') : t('copyApa')}
            </button>
          </div>
        </details>
        <details className="rounded-md bg-cream-50 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 open:ring-orange-200">
          <summary className="cursor-pointer list-none px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 [&::-webkit-details-marker]:hidden">
            {t('bibtex')}
          </summary>
          <pre className="whitespace-pre font-mono overflow-x-auto px-3 pb-2 text-[11px] text-gray-700 dark:text-bark-200 select-text">
            {bibtex}
          </pre>
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => copy(bibtex, bibKey)}
              className="rounded bg-white dark:bg-bark-700 ring-1 ring-inset ring-orange-200 dark:ring-bark-500 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600"
            >
              {copiedKey === bibKey ? t('copiedToast') : t('copyBibtex')}
            </button>
          </div>
        </details>
      </div>
    </li>
  )
}

/**
 * APA 7 formatting. Journal should be italicized in the final doc; we
 * render plain text here since <pre> can't italicize inline, and users
 * paste into Word / LaTeX to finalize styling.
 */
function formatAPA(c: Citation): string {
  const authors = formatAuthorList(c.authors)
  const year = `(${c.year}).`
  const title = c.title.endsWith('.') ? c.title : `${c.title}.`
  const journal = c.journal ? ` ${c.journal}` : ''
  const volIssue = c.volume
    ? c.issue
      ? `, ${c.volume}(${c.issue})`
      : `, ${c.volume}`
    : ''
  const pages = c.pages ? `, ${c.pages}` : ''
  const doi = `https://doi.org/${c.doi}`
  return `${authors} ${year} ${title}${journal}${volIssue}${pages}. ${doi}`
}

function formatAuthorList(authors: string[]): string {
  if (authors.length === 0) return ''
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]}, & ${authors[1]}`
  return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`
}
