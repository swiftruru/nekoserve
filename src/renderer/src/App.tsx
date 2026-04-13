import { useState } from 'react'
import type { Page, SimulationConfig, EventType } from './types'
import { useSimulation } from './hooks/useSimulation'
import { SCENARIOS, DEFAULT_CONFIG } from './data/scenarios'
import SettingsPage from './pages/SettingsPage'
import ResultsPage from './pages/ResultsPage'
import EventLogPage from './pages/EventLogPage'
import AboutPage from './pages/AboutPage'
import LearningPanel from './components/LearningPanel'

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
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'settings',  label: '模擬設定', icon: '⚙️' },
  { id: 'results',   label: '統計結果', icon: '📊' },
  { id: 'eventlog',  label: '事件紀錄', icon: '📋' },
  { id: 'about',     label: '關於',     icon: 'ℹ️' },
]

// ──────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('settings')
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [pendingEventFilter, setPendingEventFilter] = useState<EventType[] | null>(null)
  const [panelOpen, setPanelOpen] = useState<boolean>(() => loadPanelState())
  const { status, result, error, elapsed, history, run, reset } = useSimulation()

  function togglePanel() {
    setPanelOpen((v) => {
      savePanelState(!v)
      return !v
    })
  }

  function handleRunSimulation(cfg: SimulationConfig, label: string) {
    setConfig(cfg)
    run(cfg, label).then(() => {
      setPage('results')
    })
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

  const resultsAvailable = status === 'success' && result !== null

  return (
    <div className="flex flex-col h-screen bg-cream-100">
      {/* ── Title bar area ──────────────────────────────── */}
      {/* drag-region: entire header is draggable on macOS (no interactive elements here) */}
      <header className={`bg-white border-b border-orange-200 py-3 flex items-center gap-3 shadow-sm drag-region ${isMac ? 'pl-20 pr-5' : 'px-5'}`}>
        <span className="text-2xl" role="img" aria-label="cat">🐱</span>
        <div>
          <h1 className="text-base font-bold text-orange-700 leading-tight">NekoServe</h1>
          <p className="text-xs text-gray-500">貓咪咖啡廳座位與服務模擬系統</p>
        </div>

        {/* Status badge */}
        {status === 'running' && (
          <span className="ml-auto flex items-center gap-2 text-sm text-orange-600 font-medium">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
            模擬進行中…
          </span>
        )}
        {status === 'success' && (
          <span className="ml-auto flex items-center gap-2 text-sm text-green-600 font-medium">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
            模擬完成
          </span>
        )}
        {status === 'error' && (
          <span className="ml-auto flex items-center gap-2 text-sm text-red-500 font-medium">
            <span className="inline-block w-3 h-3 rounded-full bg-red-400" />
            模擬失敗
          </span>
        )}
      </header>

      {/* ── Top navigation ──────────────────────────────── */}
      <nav className="bg-white border-b border-orange-100 px-4 flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isResults = item.id === 'results' || item.id === 'eventlog'
          const disabled = isResults && !resultsAvailable
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
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-300',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              {item.label}
              {isResults && !resultsAvailable && (
                <span className="text-xs text-gray-300 ml-1">（需先執行模擬）</span>
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
          📚 學習筆記
        </button>
      </nav>

      {/* ── Main area: content + sidebar ────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto">
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
            />
          )}
          {page === 'about' && <AboutPage />}
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
