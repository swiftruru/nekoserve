import { useTranslation } from 'react-i18next'
import { InlineMath } from './Math'

export type RationaleParamKey =
  | 'seatCount'
  | 'staffCount'
  | 'catCount'
  | 'customerArrivalInterval'
  | 'maxWaitTime'
  | 'orderTime'
  | 'preparationTime'
  | 'diningTime'
  | 'catInteractionTime'
  | 'catIdleInterval'
  | 'catRestProbability'
  | 'catRestDuration'
  | 'simulationDuration'
  | 'randomSeed'

interface ParamRationaleProps {
  params: RationaleParamKey[]
}

/**
 * Collapsible <details> block that lists the design rationale for a set
 * of simulation parameters. One block per SettingsPage section; expands
 * on click to show meaning / why / theoretical basis / default-value basis
 * for every listed parameter.
 */
export default function ParamRationale({ params }: ParamRationaleProps) {
  const { t } = useTranslation(['settings'])

  const fieldLabel = {
    meaning: t('settings:rationaleSection.labels.meaning'),
    why: t('settings:rationaleSection.labels.why'),
    theory: t('settings:rationaleSection.labels.theory'),
    defaultBasis: t('settings:rationaleSection.labels.defaultBasis'),
    references: t('settings:rationaleSection.labels.references'),
  }

  return (
    <details className="mt-2 mb-3 rounded-xl bg-cream-50 dark:bg-bark-800/60 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 open:bg-cream-100/60 dark:open:bg-bark-700/60 open:ring-orange-200 dark:open:ring-bark-500 transition-colors">
      <summary
        className="cursor-pointer list-none select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-500 dark:text-orange-400 hover:text-orange-600 marker:hidden [&::-webkit-details-marker]:hidden"
      >
        {t('settings:rationaleSection.toggle')}
      </summary>
      <div className="space-y-3 px-3 pb-3 pt-1">
        {params.map((key) => {
          const label = t(`settings:parameters.${key}.label` as const)
          const meaning = t(`settings:parameters.${key}.rationale.meaning` as const)
          const why = t(`settings:parameters.${key}.rationale.why` as const)
          const theory = t(`settings:parameters.${key}.rationale.theory` as const)
          const defaultBasis = t(`settings:parameters.${key}.rationale.defaultBasis` as const)
          const formula = t(`settings:parameters.${key}.rationale.formula` as const)
          const refsRaw = t(`settings:parameters.${key}.rationale.references` as const, {
            returnObjects: true,
            defaultValue: [],
          }) as unknown
          type Ref = { text: string; url: string }
          const references: Ref[] = Array.isArray(refsRaw)
            ? (refsRaw as unknown[]).filter(
                (r): r is Ref =>
                  typeof r === 'object' &&
                  r !== null &&
                  typeof (r as { text?: unknown }).text === 'string' &&
                  typeof (r as { url?: unknown }).url === 'string' &&
                  (r as Ref).text.length > 0,
              )
            : []

          return (
            <div
              key={key}
              className="rounded-lg bg-white/70 dark:bg-bark-800/70 px-3 py-2 ring-1 ring-inset ring-orange-100/70 dark:ring-bark-600/70"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-300">
                  {label}
                </span>
                {formula && (
                  <span className="text-xs">
                    <InlineMath formula={formula} />
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[12px] leading-relaxed text-gray-700 dark:text-bark-200">
                <dt className="font-semibold text-orange-600 dark:text-orange-400">{fieldLabel.meaning}</dt>
                <dd className="select-text">{meaning}</dd>
                <dt className="font-semibold text-orange-600 dark:text-orange-400">{fieldLabel.why}</dt>
                <dd className="select-text">{why}</dd>
                <dt className="font-semibold text-orange-600 dark:text-orange-400">{fieldLabel.theory}</dt>
                <dd className="select-text">{theory}</dd>
                <dt className="font-semibold text-orange-600 dark:text-orange-400">{fieldLabel.defaultBasis}</dt>
                <dd className="select-text">{defaultBasis}</dd>
                {references.length > 0 && (
                  <>
                    <dt className="font-semibold text-amber-700 dark:text-amber-500">{fieldLabel.references}</dt>
                    <dd className="select-text">
                      <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-bark-300">
                        {references.map((r) => (
                          <li key={r.url} className="list-disc ml-4">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-700 dark:text-amber-400 underline decoration-amber-300 dark:decoration-amber-600 decoration-dotted underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 hover:decoration-solid"
                            >
                              {r.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )
        })}
      </div>
    </details>
  )
}
