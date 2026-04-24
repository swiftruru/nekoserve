import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Page, SimulationConfig, EventType } from './types'
import { useSimulation } from './hooks/useSimulation'
import { SCENARIOS } from './data/scenarios'
import { useConfigStore } from './store/configStore'
import SettingsPage from './pages/SettingsPage'
import ResultsPage from './pages/ResultsPage'
import EventLogPage from './pages/EventLogPage'
import PlaybackPage, { PlaybackPageEmpty } from './pages/PlaybackPage'
import HowItWorksPage from './pages/HowItWorksPage'
import CitationsPage from './pages/CitationsPage'
import ValidationPage from './pages/ValidationPage'
import AboutPage from './pages/AboutPage'
import { useSimulationStore } from './store/simulationStore'
import LearningPanel from './components/LearningPanel'
import LanguageSwitcher from './components/LanguageSwitcher'
import PageTransition from './components/PageTransition'
import GlobalRunIndicator from './components/GlobalRunIndicator'
import CustomCursor from './components/CustomCursor'
import UpdateModal from './components/UpdateModal'
import { useUpdateCheck } from './hooks/useUpdateCheck'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useToast } from './hooks/useToast'
import { useTheme } from './hooks/useTheme'
import ShortcutHelp from './components/ShortcutHelp'
import OnboardingOverlay from './components/OnboardingOverlay'

import RouteAnnouncer from './components/RouteAnnouncer'
import ErrorBoundary from './components/ErrorBoundary'
import ChallengeDrawer from './components/ChallengeDrawer'

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
  { id: 'playback',   icon: '🎞️' },
  { id: 'results',    icon: '📊' },
  { id: 'eventlog',   icon: '📋' },
  { id: 'howitworks', icon: '🎬' },
  { id: 'citations',  icon: '📚' },
  { id: 'validation', icon: '✅' },
  { id: 'about',      icon: 'ℹ️' },
]

// ──────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation(['common', 'nav'])
  const [page, setPage] = useState<Page>('settings')
  const config = useConfigStore((s) => s.config)
  const setConfig = useConfigStore((s) => s.setConfig)
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
  const { toast } = useToast()
  const {
    status, result, error, elapsed, history,
    batchResult, batchProgress, simProgress, sweepResult,
    run, runBatch, runSweep, cancel, reset, clearSimProgress, clearHistory, deleteHistoryEntry, renameHistoryEntry, togglePinHistoryEntry, loadHistoryResult,
  } = useSimulation()
  const update = useUpdateCheck()

  // v2.0 Sprint 1 follow-up: mirror simulation status/result/error into
  // the Zustand simulationStore so pages that weren't passed the result
  // as a prop (ValidationPage, future research tools) can read it.
  const setStoreStatus = useSimulationStore((s) => s.setStatus)
  const setStoreResult = useSimulationStore((s) => s.setResult)
  const setStoreError = useSimulationStore((s) => s.setError)
  useEffect(() => {
    setStoreStatus(status)
  }, [status, setStoreStatus])
  useEffect(() => {
    setStoreResult(result)
  }, [result, setStoreResult])
  useEffect(() => {
    setStoreError(error)
  }, [error, setStoreError])
  const { theme, toggle: toggleTheme } = useTheme()

  const [shortcutHelpVisible, setShortcutHelpVisible] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [challengeDrawerOpen, setChallengeDrawerOpen] = useState(false)

  useKeyboardShortcuts({
    '?': () => setOnboardingOpen((v) => !v),
    f: () => { if (page === 'playback' && resultsAvailable) setFullscreen((v) => !v) },
  })

  // ⌘K / Ctrl+K → shortcut help (needs its own listener because
  // useKeyboardShortcuts intentionally ignores meta/ctrl combos)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShortcutHelpVisible((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Exit fullscreen whenever the user leaves the Playback page
  useEffect(() => {
    if (page !== 'playback') setFullscreen(false)
  }, [page])

  // Dynamic window title
  useEffect(() => {
    const pageName = t(`nav:${page}` as const)
    if (status === 'running') {
      document.title = `NekoServe - ${t('common:status.running')}`
    } else if (page === 'results' && result) {
      document.title = `NekoServe - ${pageName} (seed ${result.config.randomSeed})`
    } else {
      document.title = `NekoServe - ${pageName}`
    }
  }, [page, status, result, t])

  // Persist panel open/closed whenever it changes. Keeping the side effect
  // out of the state updater is required for React 18 StrictMode purity.
  useEffect(() => {
    savePanelState(panelOpen)
  }, [panelOpen])

  function togglePanel() {
    setPanelOpen((prev) => !prev)
  }

  // After navigating to a result page following a run, the heavy
  // mount cascade (PlaybackPage / CafeScene) freezes the renderer for
  // a few seconds. We keep the global run indicator visible across
  // that freeze, then dismiss it on the next idle window — by then
  // the destination page has finished its initial paint.
  function dismissIndicatorAfterPageSettle() {
    const ric =
      (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
        .requestIdleCallback
    if (ric) ric(() => clearSimProgress(), { timeout: 5000 })
    else setTimeout(() => clearSimProgress(), 1500)
  }

  function handleRunSimulation(cfg: SimulationConfig, label: string) {
    setConfig(cfg)
    run(cfg, label).then((succeeded) => {
      if (!succeeded) {
        clearSimProgress()
        return
      }
      setPlaybackTime(0)
      setPlaybackAutoStartPending(true)
      setPage('playback')
      dismissIndicatorAfterPageSettle()
    })
  }

  function handleRunBatch(cfg: SimulationConfig, replicationCount: number, label: string) {
    const start = Date.now()
    setConfig(cfg)
    runBatch(cfg, replicationCount, label).then((succeeded) => {
      if (!succeeded) {
        clearSimProgress()
        return
      }
      const secs = ((Date.now() - start) / 1000).toFixed(1)
      toast(t('settings:batch.complete', { count: replicationCount, seconds: secs }))
      setPlaybackTime(0)
      setPlaybackAutoStartPending(true)
      setPage('playback')
      dismissIndicatorAfterPageSettle()
    })
  }

  function handleRunSweep(cfg: SimulationConfig, paramKey: keyof SimulationConfig, from: number, to: number, step: number, replications: number) {
    const start = Date.now()
    setConfig(cfg)
    runSweep(cfg, paramKey, from, to, step, replications).then((succeeded) => {
      if (!succeeded) {
        clearSimProgress()
        return
      }
      const secs = ((Date.now() - start) / 1000).toFixed(1)
      toast(t('settings:sweep.complete', { seconds: secs }))
      setPage('results')
      dismissIndicatorAfterPageSettle()
    })
  }

  function handleSkipToResults() {
    // Clear any lingering chart-click filter so the Results page is clean.
    setPendingEventFilter(null)
    setPage('results')
  }

  function handleChartClick(eventTypes: EventType[]) {
    setPendingEventFilter(eventTypes)
    setPage('eventlog')
  }

  function handleNavigate(id: Page) {
    if (id !== 'eventlog') {
      setPendingEventFilter(null)
    }
    setPage(id)
  }

  /**
   * Called from EventLogTable when the user clicks a row. Jumps the shared
   * playback cursor to that event and switches to the Playback page.
   */
  function handleEventLogRowClick(timestamp: number) {
    // Row click is an explicit navigation; drop any lingering chart-click
    // filter so returning to the Event Log later shows the full log again.
    setPendingEventFilter(null)
    setPlaybackTime(timestamp)
    setPage('playback')
  }

  /**
   * Called from ResultsPage when the user clicks a key-moment bubble
   * in the Flow section timeline. Same semantics as an event log row
   * click: seek shared cursor to the target sim-time then switch to
   * Playback. The target page auto-pauses at that time instead of
   * playing — see PlaybackPage's `autoStartPending` gate.
   */
  function handleJumpToPlayback(simTime: number) {
    setPendingEventFilter(null)
    setPlaybackTime(simTime)
    setPage('playback')
  }

  const resultsAvailable = status === 'success' && result !== null

  return (
    <div className="flex flex-col h-screen bg-cream-100 dark:bg-bark-950">
      {/* ── Skip to main content (a11y) ───────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {t('common:a11y.skipToContent')}
      </a>
      <RouteAnnouncer page={page} />

      {/* ── In-window custom cursor overlay ───────────────
           Mounted at the outermost level so its `position: fixed`
           overlay is never clipped by `overflow-hidden` ancestors
           on the main/aside flex container. Renders behind nothing
           (z-index 9999) and has `pointer-events: none`. */}
      <CustomCursor />
      <ShortcutHelp
        visible={shortcutHelpVisible}
        onClose={() => setShortcutHelpVisible(false)}
      />
      <OnboardingOverlay externalOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />

      <ChallengeDrawer
        visible={challengeDrawerOpen}
        onClose={() => setChallengeDrawerOpen(false)}
        metrics={result?.metrics ?? null}
      />
      <UpdateModal
        visible={update.visible}
        status={update.status}
        manual={update.manual}
        currentVersion={update.info?.currentVersion}
        latestVersion={update.info?.latestVersion}
        releaseNotes={update.info?.releaseNotes}
        errorMessage={update.errorMessage}
        onGoToDownload={update.goToDownload}
        onSkipVersion={update.skipVersion}
        onRemindLater={update.remindLater}
        onRetry={update.checkManually}
        onDismiss={update.dismiss}
      />

      {/* ── Title bar area ──────────────────────────────── */}
      {/* drag-region: entire header is draggable on macOS (no interactive elements here) */}
      {!fullscreen && (
      <header className={`bg-white dark:bg-bark-800 border-b border-orange-200 dark:border-bark-600 py-3 flex items-center gap-3 shadow-sm drag-region ${isMac ? 'pl-20 pr-5' : 'px-5'}`}>
        <span className="text-2xl" role="img" aria-label="cat">🐱</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-orange-700 dark:text-orange-400 leading-tight">{t('common:appName')}</h1>
          <p className="text-xs text-gray-500 dark:text-bark-300 truncate">{t('common:appSubtitle')}</p>
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

          <button
            type="button"
            onClick={toggleTheme}
            className="no-drag text-gray-400 hover:text-orange-500 dark:text-bark-400 dark:hover:text-orange-400 transition-colors leading-none"
            title={theme === 'light' ? t('common:a11y.darkMode') : t('common:a11y.lightMode')}
            aria-label={theme === 'light' ? t('common:a11y.darkMode') : t('common:a11y.lightMode')}
          >
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShortcutHelpVisible(true)}
            className="no-drag text-gray-400 hover:text-orange-500 dark:text-bark-400 dark:hover:text-orange-400 transition-colors text-sm"
            title={t('common:shortcutHelp.title')}
            aria-label={t('common:shortcutHelp.title')}
          >
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-bark-500 bg-gray-50 dark:bg-bark-700 text-[11px] font-mono">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="no-drag text-gray-400 hover:text-orange-500 dark:text-bark-400 dark:hover:text-orange-400 transition-colors text-sm"
            title={t('common:a11y.openTour')}
            aria-label={t('common:a11y.openTour')}
          >
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-bark-500 bg-gray-50 dark:bg-bark-700 text-xs font-mono">?</kbd>
          </button>
          <LanguageSwitcher />
        </div>
      </header>
      )}

      {/* ── Top navigation ──────────────────────────────── */}
      {!fullscreen && (
      <nav className="bg-white dark:bg-bark-800 border-b border-orange-100 dark:border-bark-600 px-4 flex items-center gap-1" role="tablist" aria-label="Navigation">
        {NAV_ITEMS.map((item) => {
          const needsResult =
            item.id === 'results' ||
            item.id === 'eventlog' ||
            item.id === 'playback'
          const disabled = needsResult && !resultsAvailable
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={page === item.id}
              aria-disabled={disabled}
              data-testid={`nav-tab-${item.id}`}
              data-onboarding={item.id === 'playback' ? 'nav-playback' : item.id === 'results' ? 'nav-results' : undefined}
              onClick={() => {
                if (disabled) {
                  toast(t('nav:needsRunHint'), 'info')
                } else {
                  handleNavigate(item.id)
                }
              }}
              title={disabled ? t('nav:needsRunHint') : undefined}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150',
                page === item.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : disabled
                  ? 'border-transparent text-gray-300 dark:text-bark-500'
                  : 'border-transparent text-gray-500 dark:text-bark-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              {t(`nav:${item.id}` as const)}
            </button>
          )
        })}

        {/* Challenge & Learning panel toggles */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChallengeDrawerOpen(true)}
            data-testid="challenge-drawer-toggle"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white dark:bg-bark-700 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-bark-500 hover:bg-purple-50 dark:hover:bg-bark-600 transition-colors duration-150"
          >
            🏆 {t('common:challenges')}
          </button>
          <button
            type="button"
            onClick={togglePanel}
            data-testid="learning-panel-toggle"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
              panelOpen
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white dark:bg-bark-700 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600'
            }`}
          >
            📚 {t('common:learningPanel')}
          </button>
        </div>
      </nav>
      )}

      {/* ── Main area: content + sidebar ────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <main id="main-content" className="flex-1 overflow-y-auto">
          <ErrorBoundary>
          <PageTransition pageKey={page}>
            {page === 'settings' && (
              <SettingsPage
                initialConfig={config}
                scenarios={SCENARIOS}
                onRun={handleRunSimulation}
                onRunBatch={handleRunBatch}
                onRunSweep={handleRunSweep}
                onReset={reset}
                onCancel={cancel}
                isRunning={status === 'running'}
                elapsed={elapsed}
                error={status === 'error' ? error : null}
                batchProgress={batchProgress}
              />
            )}
            {page === 'results' && result && (
              <ResultsPage
                result={result}
                history={history}
                batchResult={batchResult}
                sweepResult={sweepResult}
                onChartClick={handleChartClick}
                onJumpToPlayback={handleJumpToPlayback}
                onDeleteHistory={deleteHistoryEntry}
                onClearHistory={clearHistory}
                onRenameHistory={renameHistoryEntry}
                onTogglePinHistory={togglePinHistoryEntry}
                onLoadHistory={loadHistoryResult}
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
                  fullscreen={fullscreen}
                  onToggleFullscreen={() => setFullscreen((v) => !v)}
                />
              ) : (
                <PlaybackPageEmpty />
              ))}
            {page === 'howitworks' && <HowItWorksPage />}
            {page === 'citations' && <CitationsPage onNavigate={setPage} />}
            {page === 'validation' && <ValidationPage onNavigate={setPage} />}
            {page === 'about' && <AboutPage onCheckForUpdate={update.checkManually} updateChecking={update.status === 'checking'} />}
          </PageTransition>
          </ErrorBoundary>
        </main>

        {/* ── Learning sidebar ──────────────────────────── */}
        {!fullscreen && (
        <aside
          aria-label={t('common:learningPanel')}
          className={`flex-shrink-0 border-l border-orange-100 dark:border-bark-600 overflow-hidden transition-all duration-200 ${
            panelOpen ? 'w-72' : 'w-0'
          }`}
        >
          {panelOpen && (
            <LearningPanel page={page} onClose={togglePanel} />
          )}
        </aside>
        )}
      </div>

      <GlobalRunIndicator
        isRunning={status === 'running'}
        elapsed={elapsed}
        batchProgress={batchProgress}
        simProgress={simProgress}
      />
    </div>
  )
}
