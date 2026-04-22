import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../../types'
import { BlockMath } from '../Math'
import type { LearningLevel } from '../learning/types'
import { CITATIONS, citationUrl } from '../../data/citations'

interface Props {
  metrics: MetricSummary
  level?: LearningLevel
}

// Single source of truth: read the canonical URL from the citations
// registry so any future URL switch (e.g. publisher change, new
// preprint location) only needs to update citations.ts.
const DBEIS_DOI = citationUrl(CITATIONS.dbeis2024enhancing)

/**
 * Guard against older simulator binaries that return metrics without
 * the Dbeis-2024 utilization fields (added alongside the ρ_R feature).
 * If the packaged Python bundle hasn't been rebuilt yet, we render
 * placeholders instead of crashing on undefined.toFixed().
 */
function fmt(value: number | undefined, decimals: number): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(decimals)
    : '—'
}

export default function RhoCorrectionPanel({ metrics, level = 'expert' }: Props) {
  const { t } = useTranslation('results')
  const {
    arrivalRate,
    renegingRate,
    meanServiceTime,
    rhoClassical,
    rhoCorrected,
  } = metrics as Partial<MetricSummary>
  const hasRhoFields =
    typeof rhoClassical === 'number' && typeof rhoCorrected === 'number'
  const apparentCollapse =
    hasRhoFields && (rhoClassical as number) >= 1 && (rhoCorrected as number) < 1
  const friendly = level === 'friendly'

  return (
    <div className="rounded-lg border border-orange-200 dark:border-bark-500 bg-white/70 dark:bg-bark-700/70 p-3">
      <div className="mb-2">
        {/* No uppercase here: the title contains a literal Greek ρ, and
            text-transform:uppercase would mis-case it to Latin "P". */}
        <div className="text-xs font-bold tracking-wide text-orange-700 dark:text-orange-400">
          {t('rhoCorrection.title')}
        </div>
        <p className="mt-1 text-xs text-gray-600 dark:text-bark-300 leading-snug">
          {t('rhoCorrection.summary')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md bg-cream-50 dark:bg-bark-800/60 p-2 ring-1 ring-inset ring-orange-100 dark:ring-bark-600">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-300">
            {t('rhoCorrection.classicalLabel')}
          </div>
          <div className="mt-1">
            <BlockMath formula="\rho = \frac{\lambda}{c\,\mu}" />
          </div>
          <div className="mt-1 text-center text-lg font-bold tabular-nums text-gray-800 dark:text-bark-100">
            {fmt(rhoClassical, 3)}
          </div>
          <div className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-gray-500 dark:text-bark-400">
            <span aria-hidden="true">🔍</span>
            <span className="flex-1">{t('rhoCorrection.classicalHint')}</span>
          </div>
        </div>
        <div className="rounded-md bg-cream-50 dark:bg-bark-800/60 p-2 ring-1 ring-inset ring-amber-200 dark:ring-amber-700/60">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {t('rhoCorrection.correctedLabel')}
          </div>
          <div className="mt-1">
            <BlockMath formula="\rho_R = \frac{\lambda - RR}{c\,\mu}" />
          </div>
          <div className="mt-1 text-center text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {fmt(rhoCorrected, 3)}
          </div>
          <div className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-amber-800/80 dark:text-amber-400/80">
            <span aria-hidden="true">🔍</span>
            <span className="flex-1">{t('rhoCorrection.correctedHint')}</span>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px] text-gray-600 dark:text-bark-300">
        <div>
          <dt className="font-semibold">{t('rhoCorrection.lambda')}</dt>
          <dd className="tabular-nums">{fmt(arrivalRate, 4)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('rhoCorrection.renegingRate')}</dt>
          <dd className="tabular-nums">{fmt(renegingRate, 4)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('rhoCorrection.meanService')}</dt>
          <dd className="tabular-nums">{fmt(meanServiceTime, 2)}</dd>
        </div>
        <div>
          <dt className="font-semibold">μ (= 1/E[S])</dt>
          <dd className="tabular-nums">
            {typeof meanServiceTime === 'number' && meanServiceTime > 0
              ? (1 / meanServiceTime).toFixed(4)
              : '—'}
          </dd>
        </div>
      </dl>

      {!hasRhoFields && (
        <p className="mt-2 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          ⚠ 模擬引擎是舊版本，缺少 ρ_R 需要的欄位。請重新建置 simulator-python binary（見 simulator-python/requirements.txt + PyInstaller）。
        </p>
      )}

      {friendly && (
        <p className="mt-2 text-[11px] leading-snug text-gray-600 dark:text-bark-300">
          {t('rhoCorrection.friendlyExplain')}
        </p>
      )}

      {apparentCollapse && (
        <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-3 py-2">
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
            {t('rhoCorrection.warningTitle')}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-900 dark:text-amber-200">
            {t('rhoCorrection.warningText')}
          </p>
        </div>
      )}

      <p className="mt-2 text-[10px] leading-snug text-gray-500 dark:text-bark-400">
        <a
          href={DBEIS_DOI}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-700 dark:text-amber-400 underline decoration-amber-300 decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {t('rhoCorrection.citationText')}
        </a>
      </p>
    </div>
  )
}
