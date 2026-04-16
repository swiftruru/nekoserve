import { Trans, useTranslation } from 'react-i18next'

// Reusable bold / italic inline elements for <Trans> markup components.
const inlineComponents = {
  strong: <strong className="font-semibold" />,
  em: <em className="italic" />,
}

// Small monospace code block for the execution-walkthrough sections.
// Plain Python-ish text; language-neutral so it is NOT translated.
function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="font-mono text-xs bg-gray-50 dark:bg-bark-700 border border-gray-200 dark:border-bark-600 rounded-lg px-3 py-2 leading-relaxed text-gray-700 dark:text-bark-200 whitespace-pre overflow-x-auto select-text">
      {children}
    </pre>
  )
}

export default function HowItWorksPage() {
  const { t } = useTranslation('howItWorks')

  return (
    <div className="page-container max-w-2xl">

      {/* ── Page header ────────────────────────────────── */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-orange-700 dark:text-orange-400">
          {t('howItWorks:pageTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-bark-300 mt-0.5">
          {t('howItWorks:pageSubtitle')}
        </p>
      </div>

      {/* ── Execution walkthrough card ─────────────────── */}
      <div className="card">
        <div className="card-title">{t('howItWorks:title')}</div>
        <div className="text-sm text-gray-700 dark:text-bark-200 space-y-6 leading-relaxed">
          <p className="text-gray-600 dark:text-bark-300">{t('howItWorks:intro')}</p>

          {/* Section 1: event-driven clock */}
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
              {t('howItWorks:section1Title')}
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section1Concept" components={inlineComponents} />
            </p>
            <p className="mb-2">{t('howItWorks:section1Model')}</p>
            <CodeBlock>{`env = simpy.Environment()
env.process(customer(env, cid=1))
env.run(until=240)   # advances by events, not ticks`}</CodeBlock>
            <p className="text-xs text-gray-500 dark:text-bark-400 mt-1">
              {t('howItWorks:section1CodeNote')}
            </p>
          </div>

          {/* Section 2: entity = process, resource = queue */}
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
              {t('howItWorks:section2Title')}
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section2Concept" components={inlineComponents} />
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section2Model" components={inlineComponents} />
            </p>
            <CodeBlock>{`seats = simpy.Resource(env, capacity=10)
with seats.request() as req:
    yield req          # blocks here until a seat is free
    yield env.timeout(dining_time)`}</CodeBlock>
            <p className="text-xs text-gray-500 dark:text-bark-400 mt-1">
              {t('howItWorks:section2CodeNote')}
            </p>
          </div>

          {/* Section 3: wait vs service, reneging race */}
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
              {t('howItWorks:section3Title')}
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section3Concept" components={inlineComponents} />
            </p>
            <p className="mb-2">{t('howItWorks:section3Model')}</p>
            <CodeBlock>{`seat_req   = seats.request()
abandon_ev = env.timeout(max_wait_time)
yield seat_req | abandon_ev      # whichever fires first wins
if not seat_req.triggered:
    seat_req.cancel()            # patience ran out → abandon`}</CodeBlock>
            <p className="text-xs text-gray-500 dark:text-bark-400 mt-1">
              {t('howItWorks:section3CodeNote')}
            </p>
          </div>

          {/* Section 4: sub-process & dynamic capacity */}
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
              {t('howItWorks:section4Title')}
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section4Concept" components={inlineComponents} />
            </p>
            <p className="mb-2">{t('howItWorks:section4Model')}</p>
            <CodeBlock>{`yield cats.get(1)                # take a cat out of the pool
# ... interaction happens ...
if rng.random() < rest_prob:
    env.process(cat_rest(cid))   # fire-and-forget sub-process
else:
    cats.put(1)                  # return the cat immediately`}</CodeBlock>
            <p className="text-xs text-gray-500 dark:text-bark-400 mt-1">
              {t('howItWorks:section4CodeNote')}
            </p>
          </div>

          {/* Section 5: end-of-run aggregation */}
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
              {t('howItWorks:section5Title')}
            </p>
            <p className="mb-2">
              <Trans i18nKey="howItWorks:section5Concept" components={inlineComponents} />
            </p>
            <p className="mb-2">{t('howItWorks:section5Model')}</p>
            <CodeBlock>{`env.run(until=sim_duration)      # the run ends here
seat_utilization = (
    total_seat_busy / (seat_count * sim_duration)
)`}</CodeBlock>
            <p className="text-xs text-gray-500 dark:text-bark-400 mt-1">
              {t('howItWorks:section5CodeNote')}
            </p>
          </div>

          <p className="text-gray-600 dark:text-bark-300 border-t border-orange-50 dark:border-bark-600 pt-4">
            {t('howItWorks:outro')}
          </p>
        </div>
      </div>

    </div>
  )
}
