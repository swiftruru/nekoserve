import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { LearningLevel } from '../components/learning/types'
import HowItWorksSection from '../components/howitworks/HowItWorksSection'
import CodeToggle from '../components/howitworks/CodeToggle'
import DemoFelStepper from '../components/howitworks/DemoFelStepper'
import DemoResourceQueue from '../components/howitworks/DemoResourceQueue'
import DemoPatienceRace from '../components/howitworks/DemoPatienceRace'
import DemoCatPool from '../components/howitworks/DemoCatPool'
import DemoAccumulator from '../components/howitworks/DemoAccumulator'
import DemoReplication from '../components/howitworks/DemoReplication'
import DemoCiExplorer from '../components/howitworks/DemoCiExplorer'

const ic = { strong: <strong className="font-semibold" />, em: <em className="italic" /> }

export default function HowItWorksPage() {
  const { t } = useTranslation('howItWorks')
  const [level, setLevel] = useState<LearningLevel>('expert')
  const isFriendly = level === 'friendly'

  return (
    <div className="page-container max-w-3xl" data-testid="howitworks-page">

      {/* ── Page header ────────────────────────────────── */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-orange-700 dark:text-orange-400">
          {t('pageTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-bark-300 mt-0.5">
          {t('pageSubtitle')}
        </p>
      </div>

      {/* Floating level switcher (sticky bottom-right) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center rounded-full border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setLevel('friendly')}
          data-testid="howitworks-level-friendly"
          className={
            'px-3 py-1.5 text-xs font-semibold transition-colors ' +
            (isFriendly
              ? 'bg-orange-500 text-white'
              : 'text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600')
          }
          aria-pressed={isFriendly}
        >
          🐣 {t('levelFriendly')}
        </button>
        <button
          type="button"
          onClick={() => setLevel('expert')}
          data-testid="howitworks-level-expert"
          className={
            'px-3 py-1.5 text-xs font-semibold transition-colors ' +
            (!isFriendly
              ? 'bg-orange-500 text-white'
              : 'text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600')
          }
          aria-pressed={!isFriendly}
        >
          🎓 {t('levelExpert')}
        </button>
      </div>

      {/* Intro */}
      <p className="text-sm text-gray-600 dark:text-bark-300 leading-relaxed mb-5">
        {isFriendly ? t('friendlyIntro') : t('intro')}
      </p>

      {/* ── Section 1: Event-driven clock ──────────────── */}
      <HowItWorksSection
        icon="🕐"
        title={t('section1Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection1Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section1Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection1Model')}</p>}
        expertModel={<p>{t('section1Model')}</p>}
        demo={<DemoFelStepper level={level} />}
        friendlyTakeaway={t('friendlyTakeaway1')}
        expertTakeaway={t('takeaway1')}
        codeToggle={
          <CodeToggle
            code={`env = simpy.Environment()
env.process(customer(env, cid=1))
env.run(until=240)   # advances by events, not ticks`}
            note={t('section1CodeNote')}
            testIdPrefix="howitworks-section1-code"
          />
        }
      />

      {/* ── Section 2 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="🚶"
        title={t('section2Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection2Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section2Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection2Model')}</p>}
        expertModel={<p><Trans i18nKey="howItWorks:section2Model" components={ic} /></p>}
        demo={<DemoResourceQueue level={level} />}
        friendlyTakeaway={t('friendlyTakeaway2')}
        expertTakeaway={t('takeaway2')}
        codeToggle={
          <CodeToggle
            code={`seats = simpy.Resource(env, capacity=10)
with seats.request() as req:
    yield req          # blocks here until a seat is free
    yield env.timeout(dining_time)`}
            note={t('section2CodeNote')}
          />
        }
      />

      {/* ── Section 3 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="⏱️"
        title={t('section3Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection3Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section3Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection3Model')}</p>}
        expertModel={<p>{t('section3Model')}</p>}
        demo={<DemoPatienceRace level={level} />}
        friendlyTakeaway={t('friendlyTakeaway3')}
        expertTakeaway={t('takeaway3')}
        codeToggle={
          <CodeToggle
            code={`seat_req   = seats.request()
abandon_ev = env.timeout(max_wait_time)
yield seat_req | abandon_ev      # whichever fires first wins
if not seat_req.triggered:
    seat_req.cancel()            # patience ran out → abandon`}
            note={t('section3CodeNote')}
          />
        }
      />

      {/* ── Section 4 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="🐱"
        title={t('section4Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection4Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section4Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection4Model')}</p>}
        expertModel={<p>{t('section4Model')}</p>}
        demo={<DemoCatPool level={level} />}
        friendlyTakeaway={t('friendlyTakeaway4')}
        expertTakeaway={t('takeaway4')}
        codeToggle={
          <CodeToggle
            code={`yield cats.get(1)                # take a cat out of the pool
# ... interaction happens ...
if rng.random() < rest_prob:
    env.process(cat_rest(cid))   # fire-and-forget sub-process
else:
    cats.put(1)                  # return the cat immediately`}
            note={t('section4CodeNote')}
          />
        }
      />

      {/* ── Section 5 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="📊"
        title={t('section5Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection5Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section5Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection5Model')}</p>}
        expertModel={<p>{t('section5Model')}</p>}
        demo={<DemoAccumulator level={level} />}
        friendlyTakeaway={t('friendlyTakeaway5')}
        expertTakeaway={t('takeaway5')}
        codeToggle={
          <CodeToggle
            code={`env.run(until=sim_duration)      # the run ends here
seat_utilization = (
    total_seat_busy / (seat_count * sim_duration)
)`}
            note={t('section5CodeNote')}
          />
        }
      />

      {/* ── Section 6 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="🎲"
        title={t('section6Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection6Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section6Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection6Model')}</p>}
        expertModel={<p>{t('section6Model')}</p>}
        demo={<DemoReplication level={level} />}
        friendlyTakeaway={t('friendlyTakeaway6')}
        expertTakeaway={t('takeaway6')}
        codeToggle={
          <CodeToggle
            code={`results = []
for i in range(num_replications):
    env = simpy.Environment()
    setup(env, config, seed=base_seed + i)
    env.run(until=sim_duration)
    results.append(collect_metrics())
mean_kpis = average(results)`}
            note={t('section6CodeNote')}
          />
        }
      />

      {/* ── Section 7 ──────────────────────────────────── */}
      <HowItWorksSection
        icon="📏"
        title={t('section7Title')}
        level={level}
        friendlyConcept={<p><Trans i18nKey="howItWorks:friendlySection7Concept" components={ic} /></p>}
        expertConcept={<p><Trans i18nKey="howItWorks:section7Concept" components={ic} /></p>}
        friendlyModel={<p>{t('friendlySection7Model')}</p>}
        expertModel={<p>{t('section7Model')}</p>}
        demo={<DemoCiExplorer level={level} />}
        friendlyTakeaway={t('friendlyTakeaway7')}
        expertTakeaway={t('takeaway7')}
        codeToggle={
          <CodeToggle
            code={`mean = sum(values) / n
std  = sqrt(sum((x - mean)**2 for x in values) / (n - 1))
t_crit = t_table[n - 1]       # e.g. 2.262 for n=10
half_width = t_crit * std / sqrt(n)
ci_95 = (mean - half_width, mean + half_width)`}
            note={t('section7CodeNote')}
          />
        }
      />

      {/* ── Outro ──────────────────────────────────────── */}
      <div className="card">
        <p className="text-sm text-gray-600 dark:text-bark-300 leading-relaxed">
          {isFriendly ? t('friendlyOutro') : t('outro')}
        </p>
      </div>
    </div>
  )
}
