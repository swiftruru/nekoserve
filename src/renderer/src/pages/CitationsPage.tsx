import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CITATIONS,
  citationToBibTeX,
  type Citation,
} from '../data/citations'
import { PARAMETER_META } from '../data/parameterMeta'
import CitationCard from '../components/citations/CitationCard'
import CitationLandscapeMap from '../components/citations/CitationLandscapeMap'
import CitationParameterRadial from '../components/citations/CitationParameterRadial'
import CitationBenchmarkBars from '../components/citations/CitationBenchmarkBars'
import StoryChapter from '../components/citations/StoryChapter'
import StoryNav, { type StoryNavItem } from '../components/citations/StoryNav'
import {
  LittlesLawAmbient,
  LittlesLawScripted,
} from '../components/citations/concepts/LittlesLawGauge'
import {
  BalkReneAmbient,
  BalkReneScripted,
} from '../components/citations/concepts/BalkReneQueue'
import {
  ArrivalDropperAmbient,
  ArrivalDropperScripted,
} from '../components/citations/concepts/ArrivalDropper'
import {
  RenegingFaderAmbient,
  RenegingFaderScripted,
} from '../components/citations/concepts/RenegingFader'
import {
  AttributeBarsAmbient,
  AttributeBarsScripted,
} from '../components/citations/concepts/AttributeBars'
import {
  EthogramAmbient,
  EthogramScripted,
} from '../components/citations/concepts/EthogramWheel'
import {
  VerticalLevelAmbient,
  VerticalLevelScripted,
} from '../components/citations/concepts/VerticalLevelBounce'
import {
  InteractionMatrixAmbient,
  InteractionMatrixScripted,
} from '../components/citations/concepts/InteractionMatrix'
import {
  WelfareBarsAmbient,
  WelfareBarsScripted,
} from '../components/citations/concepts/WelfareBars'
import CitationPipelineFlow from '../components/citations/CitationPipelineFlow'
import FormulaDetail from '../components/citations/FormulaDetail'
import { renderWithTerms } from '../components/results/TermTooltip'
import type { Page } from '../types'

/**
 * Citations story page.
 *
 * The "citations" page is structured as a scroll-driven narrative that
 * walks through every paper NekoServe depends on, chapter by chapter:
 *
 *   Intro    → 8-node landscape map (3 tiers × 1 capstone)
 *   Ch 1-5   → per-theme chapters, each with ambient + scripted
 *              diagrams (scripted diagrams landing in PR-2 / PR-3)
 *   Appendix → full academic reference list (APA + BibTeX + reverse
 *              parameter index), extracted into CitationCard.tsx
 *
 * The data layer (citations.ts, parameterMeta.ts) is untouched; this
 * page only reads from those. When a new citation is added there it
 * automatically shows up in the appendix and can be slotted into a
 * chapter by adding its key to the `citations={[...]}` prop.
 */
interface CitationsPageProps {
  /** Used by the finale pipeline so clicking a stage jumps into the
   *  matching app page (Playback / Results / Validation). */
  onNavigate?: (page: Page) => void
}

export default function CitationsPage({ onNavigate }: CitationsPageProps = {}) {
  const { t } = useTranslation('citations')

  const citations = useMemo(() => Object.values(CITATIONS), [])
  const methodologyCount = useMemo(
    () => citations.filter((c) => c.role?.startsWith('methodology')).length,
    [citations],
  )
  const storyCount = citations.length - methodologyCount
  const [landscapeTab, setLandscapeTab] = useState<'story' | 'methodology' | 'params' | 'benchmark'>('story')

  const paramsByCitation = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const [paramKey, meta] of Object.entries(PARAMETER_META)) {
      const citationKey = meta.source.key
      if (!map[citationKey]) map[citationKey] = []
      map[citationKey].push(paramKey)
    }
    return map
  }, [])

  const citedParamCount = useMemo(() => {
    const keys = new Set<string>()
    for (const list of Object.values(paramsByCitation)) {
      for (const k of list) keys.add(k)
    }
    return keys.size
  }, [paramsByCitation])

  const navItems: StoryNavItem[] = useMemo(
    () => [
      { id: 'ch-intro',    number: '序',    label: t('story.nav.ch0') },
      { id: 'ch-1a',       number: '1·a',  label: t('story.chapter.ch1a.title') },
      { id: 'ch-1b',       number: '1·b',  label: t('story.chapter.ch1b.title') },
      { id: 'ch-2a',       number: '2·a',  label: t('story.chapter.ch2a.title') },
      { id: 'ch-2b',       number: '2·b',  label: t('story.chapter.ch2b.title') },
      { id: 'ch-2c',       number: '2·c',  label: t('story.chapter.ch2c.title') },
      { id: 'ch-3a',       number: '3·a',  label: t('story.chapter.ch3a.title') },
      { id: 'ch-3b',       number: '3·b',  label: t('story.chapter.ch3b.title') },
      { id: 'ch-3c',       number: '3·c',  label: t('story.chapter.ch3c.title') },
      { id: 'ch-4',        number: 'Ch4',  label: t('story.nav.ch4') },
      { id: 'ch-5',        number: '終',    label: t('story.nav.ch5') },
      { id: 'ch-appendix', number: '附',    label: t('story.nav.appendix') },
    ],
    [t],
  )

  function downloadAllBibTeX() {
    const body = citations.map(citationToBibTeX).join('\n\n')
    const blob = new Blob([`% NekoServe references.bib\n\n${body}\n`], {
      type: 'text/x-bibtex;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'references.bib'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Each chapter declares which citation keys it leans on; we resolve
  // them here so the chapter component only sees fully-hydrated Citation
  // objects (and missing keys fail fast instead of silently empty).
  const byKey = (k: string): Citation => {
    const c = CITATIONS[k]
    if (!c) throw new Error(`Missing citation: ${k}`)
    return c
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
        {/* ── Sticky chapter nav (desktop only) ─────────────── */}
        <StoryNav items={navItems} />

        {/* ── Main story column ─────────────────────────────── */}
        <div>
          {/* Hero + intro */}
          <section
            id="ch-intro"
            className="scroll-mt-24 mb-8"
            data-testid="citations-chapter-intro"
          >
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-1">
                {t('story.hero.kicker')}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-400 leading-tight">
                {t('story.hero.title')}
              </h1>
              <p className="mt-3 text-sm text-gray-700 dark:text-bark-200 leading-relaxed">
                {t('story.hero.lede')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <div
                  role="tablist"
                  aria-label={t('story.stats.tablistLabel')}
                  className="flex flex-wrap gap-2"
                >
                  <LandscapeTab
                    id="landscape-tab-story"
                    panelId="landscape-panel"
                    active={landscapeTab === 'story'}
                    onClick={() => setLandscapeTab('story')}
                    text={t('story.stats.storyCitations', { count: storyCount })}
                  />
                  <LandscapeTab
                    id="landscape-tab-methodology"
                    panelId="landscape-panel"
                    active={landscapeTab === 'methodology'}
                    onClick={() => setLandscapeTab('methodology')}
                    text={t('story.stats.methodologyCitations', { count: methodologyCount })}
                  />
                  <LandscapeTab
                    id="landscape-tab-params"
                    panelId="landscape-panel"
                    active={landscapeTab === 'params'}
                    onClick={() => setLandscapeTab('params')}
                    text={t('story.stats.parameters', { count: citedParamCount })}
                  />
                  <LandscapeTab
                    id="landscape-tab-benchmark"
                    panelId="landscape-panel"
                    active={landscapeTab === 'benchmark'}
                    onClick={() => setLandscapeTab('benchmark')}
                    text={t('story.stats.validationTargets', { count: 1 })}
                  />
                </div>
              </div>
            </div>
            <div
              id="landscape-panel"
              role="tabpanel"
              aria-labelledby={`landscape-tab-${landscapeTab}`}
            >
              {(landscapeTab === 'story' || landscapeTab === 'methodology') && (
                <CitationLandscapeMap variant={landscapeTab} />
              )}
              {landscapeTab === 'params' && <CitationParameterRadial />}
              {landscapeTab === 'benchmark' && (
                <CitationBenchmarkBars onJumpToMethodology={() => setLandscapeTab('methodology')} />
              )}
            </div>
          </section>

          {/* Chapter 1a — Little's Law.
              Narrative goes through renderWithTerms so glossary keywords
              (λ, L(t), Little's Law, ...) become hover-tooltips. The
              FormulaDetail box lists each symbol's meaning so the reader
              can decode L = λ·W without leaving the chapter. */}
          <StoryChapter
            id="ch-1a"
            number="Ch. 1 · a"
            title={t('story.chapter.ch1a.title')}
            narrative={
              <>
                <p>{renderWithTerms(t('story.chapter.ch1a.narrative'))}</p>
                <FormulaDetail
                  formula={t('story.formula.ch1a.equation')}
                  symbols={
                    t('story.formula.ch1a.symbols', {
                      returnObjects: true,
                    }) as readonly { sym: string; meaning: string }[]
                  }
                />
              </>
            }
            diagram={<LittlesLawAmbient />}
            scripted={<LittlesLawScripted />}
            citations={[byKey('little1961proof')]}
          />

          {/* Chapter 1b — Balking / Reneging */}
          <StoryChapter
            id="ch-1b"
            number="Ch. 1 · b"
            title={t('story.chapter.ch1b.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch1b.narrative'))}</p>}
            diagram={<BalkReneAmbient />}
            scripted={<BalkReneScripted />}
            citations={[
              byKey('ancker1963balking1'),
              byKey('ancker1963balking2'),
            ]}
          />

          {/* Chapter 2a — Poisson arrivals */}
          <StoryChapter
            id="ch-2a"
            number="Ch. 2 · a"
            title={t('story.chapter.ch2a.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch2a.narrative'))}</p>}
            diagram={<ArrivalDropperAmbient />}
            scripted={<ArrivalDropperScripted />}
            citations={[byKey('hasugian2020analysis')]}
          />

          {/* Chapter 2b — Reneging distribution.
              Includes Dbeis 2024's ρ_R correction formula. */}
          <StoryChapter
            id="ch-2b"
            number="Ch. 2 · b"
            title={t('story.chapter.ch2b.title')}
            narrative={
              <>
                <p>{renderWithTerms(t('story.chapter.ch2b.narrative'))}</p>
                <FormulaDetail
                  formula={t('story.formula.ch2b.equation')}
                  symbols={
                    t('story.formula.ch2b.symbols', {
                      returnObjects: true,
                    }) as readonly { sym: string; meaning: string }[]
                  }
                />
              </>
            }
            diagram={<RenegingFaderAmbient />}
            scripted={<RenegingFaderScripted />}
            citations={[byKey('dbeis2024enhancing')]}
          />

          {/* Chapter 2c — Satisfaction attributes */}
          <StoryChapter
            id="ch-2c"
            number="Ch. 2 · c"
            title={t('story.chapter.ch2c.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch2c.narrative'))}</p>}
            diagram={<AttributeBarsAmbient />}
            scripted={<AttributeBarsScripted />}
            citations={[byKey('li2025attributes')]}
          />

          {/* Chapter 3a — Hirsch ethogram */}
          <StoryChapter
            id="ch-3a"
            number="Ch. 3 · a"
            title={t('story.chapter.ch3a.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch3a.narrative'))}</p>}
            diagram={<EthogramAmbient />}
            scripted={<EthogramScripted />}
            citations={[byKey('hirsch2025cats')]}
          />

          {/* Chapter 3b — Vertical level preference */}
          <StoryChapter
            id="ch-3b"
            number="Ch. 3 · b"
            title={t('story.chapter.ch3b.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch3b.narrative'))}</p>}
            diagram={<VerticalLevelAmbient />}
            scripted={<VerticalLevelScripted />}
            citations={[byKey('hirsch2025cats')]}
          />

          {/* Chapter 3c — Customer × interaction matrix */}
          <StoryChapter
            id="ch-3c"
            number="Ch. 3 · c"
            title={t('story.chapter.ch3c.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch3c.narrative'))}</p>}
            diagram={<InteractionMatrixAmbient />}
            scripted={<InteractionMatrixScripted />}
            citations={[byKey('hirsch2025cats')]}
          />

          {/* Chapter 4 — Animal welfare */}
          <StoryChapter
            id="ch-4"
            number="Ch. 4"
            title={t('story.chapter.ch4.title')}
            narrative={<p>{renderWithTerms(t('story.chapter.ch4.narrative'))}</p>}
            diagram={<WelfareBarsAmbient />}
            scripted={<WelfareBarsScripted />}
            citations={[
              byKey('ropski2023analysis'),
              byKey('hirsch2025cats'),
            ]}
          />

          {/* Chapter 5 — Finale pipeline with click-to-jump nodes */}
          <section
            id="ch-5"
            className="scroll-mt-24 rounded-2xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/60 dark:bg-bark-800/40 p-5 md:p-6 mb-6"
            data-testid="citations-chapter-ch-5"
          >
            <div className="mb-3">
              <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">
                終章
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl" aria-hidden>🔗</span>
                <h2 className="text-lg md:text-xl font-bold text-orange-700 dark:text-orange-400">
                  {t('story.chapter.ch5.title')}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-bark-200 leading-relaxed">
                {renderWithTerms(t('story.chapter.ch5.narrative'))}
              </p>
            </div>
            <CitationPipelineFlow onNavigate={onNavigate} />
          </section>

          {/* Appendix — existing academic reference list */}
          <section
            id="ch-appendix"
            className="scroll-mt-24 mt-10"
            data-testid="citations-chapter-appendix"
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold text-orange-700 dark:text-orange-400">
                {t('story.appendix.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-bark-300 leading-relaxed">
                {t('story.appendix.intro')}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={downloadAllBibTeX}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  {t('downloadAllBibtex')}
                </button>
                <p className="mt-1 text-xs text-gray-500 dark:text-bark-400 leading-snug">
                  {t('downloadAllBibtexHint')}
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {citations.map((c) => (
                <CitationCard
                  key={c.key}
                  citation={c}
                  usedByParams={paramsByCitation[c.key] ?? []}
                />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatPill({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 font-semibold">
      {text}
    </span>
  )
}

function LandscapeTab({
  id,
  panelId,
  active,
  onClick,
  text,
}: {
  id: string
  panelId: string
  active: boolean
  onClick: () => void
  text: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className={
        'rounded-full px-3 py-1 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ' +
        (active
          ? 'bg-orange-500 text-white ring-2 ring-orange-600 dark:bg-orange-500 dark:text-white'
          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60')
      }
    >
      {text}
    </button>
  )
}

/**
 * Temporary stand-in for chapter diagrams that PR-2 / PR-3 will fill in.
 * Keeps the chapter frame consistent so reviewers can see the story
 * structure before every concept animation is implemented.
 */
function ChapterPlaceholder() {
  const { t } = useTranslation('citations')
  return (
    <div className="text-center py-8 px-3">
      <div className="text-3xl mb-2" aria-hidden>
        🚧
      </div>
      <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
        {t('story.placeholder.title')}
      </div>
      <p className="text-[11px] text-gray-500 dark:text-bark-400 leading-snug">
        {t('story.placeholder.body')}
      </p>
    </div>
  )
}
