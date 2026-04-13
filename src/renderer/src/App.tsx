import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Page, SimulationConfig, EventType } from './types'
import { useSimulation } from './hooks/useSimulation'
import { SCENARIOS, DEFAULT_CONFIG } from './data/scenarios'
import SettingsPage from './pages/SettingsPage'
import ResultsPage from './pages/ResultsPage'
import EventLogPage from './pages/EventLogPage'
import PlaybackPage, { PlaybackPageEmpty } from './pages/PlaybackPage'
import HowItWorksPage from './pages/HowItWorksPage'
import AboutPage from './pages/AboutPage'
import LearningPanel from './components/LearningPanel'
import LanguageSwitcher from './components/LanguageSwitcher'
import PageTransition from './components/PageTransition'
import CustomCursor from './components/CustomCursor'

const PANEL_KEY = 'nekoserve:learn-panel'

// Detect macOS for traffic-light safe area (navigator.userAgent is reliable in Electron)
const isMac = navigator.userAgent.includes('Macintosh')

function loadPanelState(): boolean {
  try { return localStorage.getItem(PANEL_KEY) === 'open' } catch { return false }
}
function savePanelState(open: boolean): void {
  try { localStorage.setItem(PANEL_KEY, open ? 'open' : 'closed') } catch { /* ok */ }
}

// ──────────────────────────────────────────────────────────────
// Nav items
// ──────────────────────────────────────────────────────────────

interface NavItem {
  id: Page
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'settings',   icon: '⚙️' },
  { id: 'results',    icon: '📊' },
  { id: 'eventlog',   icon: '📋' },
  { id: 'playback',   icon: '🎞️' },
  { id: 'howitworks', icon: '🎬' },
  { id: 'about',      icon: 'ℹ️' },
]

// ──────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation(['common', 'nav'])
  const [page, setPage] = useState<Page>('settings')
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [pendingEventFilter, setPendingEventFilter] = useState<EventType[] | null>(null)
  const [panelOpen, setPanelOpen] = useState<boolean>(() => loadPanelState())
  /**
   * Shared sim-time cursor for the Playback page and the Event Log row
   * highlight. Lifted to App so both pages see the same value: Playback
   * advances it via its rAF clock, Event Log reads it to highlight a row,
   * and clicking a row writes it (seeking Playback).
   */
  const [playbackTime, setPlaybackTime] = useState(0)
  /**
   * One-shot auto-play trigger: flipped to true when a simulation run
   * finishes and consumed by PlaybackPage once it mounts. Lives in App
   * (not inside PlaybackPage) so nav-away + nav-back does not re-autoplay.
   */
  const [playbackAutoStartPending, setPlaybackAutoStartPending] = useState(false)
  const { status, result, error, elapsed, history, run, reset } = useSimulation()

  // Persist panel open/closed whenever it changes. Keeping the side effect
  // out of the state updater is required for React 18 StrictMode purity.
  useEffect(() => {
    savePanelState(panelOpen)
  }, [panelOpen])

  function togglePanel() {
    setPanelOpen((prev) => !prev)
  }

  function handleRunSimulation(cfg: SimulationConfig, label: string) {
    setConfig(cfg)
    run(cfg, label).then(() => {
      // Every fresh run resets the shared sim-time cursor so Playback does
      // not start mid-way through the new event log.
      setPlaybackTime(0)
      // Arm the auto-play trigger and land the user on Playback: the run's
      // outcome is more memorable as an animation than as a KPI card, and
      // the "Skip to results" button on Playback gives a one-click escape
      // hatch for users who only want the numbers.
      setPlaybackAutoStartPending(true)
      setPage('playback')
    })
  }

  function handleSkipToResults() {
    setPage('results')
  }

  function handleChartClick(eventTypes: EventType[]) {
    setPendingEventFilter(eventTypes)
    setPage('eventlog')
  }

  function handleNavigate(id: Page) {
    if (id !== 'eventlog') {
      // Clear pending filter when navigating away from eventlog path
      setPendingEventFilter(null)
    }
    setPage(id)
  }

  /**
   * Called from EventLogTable when the user clicks a row. Jumps the shared
   * playback cursor to that event and switches to the Playback page.
   */
  function handleEventLogRowClick(timestamp: number) {
    setPlaybackTime(timestamp)
    setPage('playback')
  }

  const resultsAvailable = status === 'success' && result !== null

  return (
    <div className="flex flex-col h-screen bg-cream-100">
      {/* ── In-window custom cursor overlay ───────────────
           Mounted at the outermost level so its `position: fixed`
           overlay is never clipped by `overflow-hidden` ancestors
           on the main/aside flex container. Renders behind nothing
           (z-index 9999) and has `pointer-events: none`. */}
      <CustomCursor />

      {/* ── Title bar area ──────────────────────────────── */}
      {/* drag-region: entire header is draggable on macOS (no interactive elements here) */}
      <header className={`bg-white border-b border-orange-200 py-3 flex items-center gap-3 shadow-sm drag-region ${isMac ? 'pl-20 pr-5' : 'px-5'}`}>
        <span className="text-2xl" role="img" aria-label="cat">🐱</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-orange-700 leading-tight">{t('common:appName')}</h1>
          <p className="text-xs text-gray-500 truncate">{t('common:appSubtitle')}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Status badge */}
          {status === 'running' && (
            <span className="flex items-center gap-2 text-sm text-orange-600 font-medium">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
              {t('common:status.running')}
            </span>
          )}
          {status === 'success' && (
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
              {t('common:status.success')}
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-2 text-sm text-red-500 font-medium">
              <span className="inline-block w-3 h-3 rounded-full bg-red-400" />
              {t('common:status.error')}
            </span>
          )}

          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Top navigation ──────────────────────────────── */}
      <nav className="bg-white border-b border-orange-100 px-4 flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const needsResult =
            item.id === 'results' ||
            item.id === 'eventlog' ||
            item.id === 'playback'
          const disabled = needsResult && !resultsAvailable
          return (
            <button
              key={item.id}
              onClick={() => !disabled && handleNavigate(item.id)}
              disabled={disabled}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150',
                page === item.id
                  ? 'border-orange-500 text-orange-600'
                  : disabled
                  ? 'border-transparent text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-300',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              {t(`nav:${item.id}` as const)}
              {needsResult && !resultsAvailable && (
                <span className="text-xs text-gray-300 ml-1">{t('nav:needsRunHint')}</span>
              )}
            </button>
          )
        })}

        {/* Learning panel toggle */}
        <button
          type="button"
          onClick={togglePanel}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
            panelOpen
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
          }`}
        >
          📚 {t('common:learningPanel')}
        </button>
      </nav>

      {/* ── Main area: content + sidebar ────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <PageTransition pageKey={page}>
            {page === 'settings' && (
              <SettingsPage
                initialConfig={config}
                scenarios={SCENARIOS}
                onRun={handleRunSimulation}
                onReset={reset}
                isRunning={status === 'running'}
                elapsed={elapsed}
                error={status === 'error' ? error : null}
              />
            )}
            {page === 'results' && result && (
              <ResultsPage
                result={result}
                history={history}
                onChartClick={handleChartClick}
              />
            )}
            {page === 'eventlog' && result && (
              <EventLogPage
                eventLog={result.eventLog}
                initialFilter={pendingEventFilter ?? undefined}
                highlightTime={playbackTime}
                onRowClick={handleEventLogRowClick}
              />
            )}
            {page === 'playback' &&
              (result ? (
                <PlaybackPage
                  result={result}
                  simTime={playbackTime}
                  setSimTime={setPlaybackTime}
                  autoStartPending={playbackAutoStartPending}
                  onAutoStartConsumed={() => setPlaybackAutoStartPending(false)}
                  onSkipToResults={handleSkipToResults}
                />
              ) : (
                <PlaybackPageEmpty />
              ))}
            {page === 'howitworks' && <HowItWorksPage />}
            {page === 'about' && <AboutPage />}
          </PageTransition>
        </main>

        {/* ── Learning sidebar ──────────────────────────── */}
        <aside
          className={`flex-shrink-0 border-l border-orange-100 overflow-hidden transition-all duration-200 ${
            panelOpen ? 'w-72' : 'w-0'
          }`}
        >
          {panelOpen && (
            <LearningPanel page={page} onClose={togglePanel} />
          )}
        </aside>
      </div>
    </div>
  )
}
