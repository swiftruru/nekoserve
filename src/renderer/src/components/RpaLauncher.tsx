import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { runSweep, type SweepProgress } from '../lib/rpaSweepRunner'

/**
 * Phase 2 RPA launcher card.
 *
 * The Phase 1 pyautogui pipeline (template capture + locateOnScreen +
 * external bot.py) is gone. This launcher fires the in-renderer
 * orchestrator (rpaSweepRunner) which drives NekoServe via DOM events,
 * direct state updates, and the existing runSimulation IPC, with a
 * fake cursor + smooth-scroll animation for the visual "RPA" show.
 *
 * The parent modal hides itself during a run so the cursor + scroll
 * animation play against the clean app surface.
 */

const TAIL_LINES = 12

interface RpaLauncherProps {
  /** Parent passes a setter so the launcher can hide the modal while
   *  the sweep runs (so the cursor and scroll animations are visible). */
  onHide?: (hidden: boolean) => void
  /** Short status string for the parent's floating chip. */
  onHideStatus?: (msg: string) => void
}

export default function RpaLauncher({ onHide, onHideStatus }: RpaLauncherProps = {}) {
  const { t } = useTranslation('about')
  const [running, setRunning] = useState(false)
  const [scope, setScope] = useState<'all' | 'cats3_staff2'>('all')
  const [progress, setProgress] = useState<SweepProgress | null>(null)
  const [logTail, setLogTail] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const tailRef = useRef<HTMLPreElement>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  // Hide the parent modal whenever a sweep is running so the cursor +
  // scroll animations are unobstructed.
  useEffect(() => {
    onHide?.(running)
    if (running && progress) {
      const phaseLabel = formatPhase(progress)
      onHideStatus?.(phaseLabel)
    } else if (!running) {
      onHideStatus?.('')
    }
  }, [running, progress, onHide, onHideStatus])

  // Auto-scroll the log tail.
  useEffect(() => {
    if (tailRef.current) tailRef.current.scrollTop = tailRef.current.scrollHeight
  }, [logTail])

  function appendLog(line: string) {
    setLogTail((tail) => {
      const next = [...tail, line]
      return next.length > TAIL_LINES ? next.slice(next.length - TAIL_LINES) : next
    })
  }

  async function handleStart() {
    setShowConfirm(false)
    cancelRef.current = false
    setLogTail([])
    setProgress(null)
    setRunning(true)
    try {
      const result = await runSweep({
        scope,
        onProgress: (p) => setProgress(p),
        onLog: (line) => appendLog(line),
        shouldCancel: () => cancelRef.current,
      })
      appendLog(`\n=== Done. ${result.okCount} ok, ${result.failCount} failed${result.cancelled ? ' (cancelled)' : ''}. ===`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      appendLog(`! sweep aborted: ${msg}`)
    } finally {
      setRunning(false)
    }
  }

  function handleCancel() {
    cancelRef.current = true
    appendLog('cancel requested -- will stop after the current scenario')
  }

  async function handleCopyLog() {
    const header = `RPA Sweep log\nScope: ${scope}\n\n`
    const text = header + logTail.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Fallback: select the <pre> so user can Cmd+C manually.
      if (tailRef.current) {
        const range = document.createRange()
        range.selectNodeContents(tailRef.current)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  return (
    <div className="card border-orange-200 dark:border-bark-500">
      <div className="card-title">{t('rpa.title')}</div>

      <p className="text-sm text-gray-700 dark:text-bark-200 leading-relaxed mb-3">
        {t('rpa.description')}
      </p>

      <div className="rounded-lg bg-orange-50 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 px-3 py-2.5 mb-3">
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1.5">
          {t('rpa.warningTitle')}
        </div>
        <ul className="text-xs text-gray-700 dark:text-bark-200 space-y-1 leading-relaxed">
          <li>• {t('rpa.warning1')}</li>
          <li>• {t('rpa.warning2')}</li>
          <li>• {t('rpa.warning3')}</li>
        </ul>
      </div>

      {/* Scope picker */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="rpa-scope"
            value="all"
            checked={scope === 'all'}
            disabled={running}
            onChange={() => setScope('all')}
            className="accent-orange-500"
          />
          <span className="text-gray-700 dark:text-bark-200">{t('rpa.scopeAll')}</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="rpa-scope"
            value="cats3_staff2"
            checked={scope === 'cats3_staff2'}
            disabled={running}
            onChange={() => setScope('cats3_staff2')}
            className="accent-orange-500"
          />
          <span className="text-gray-700 dark:text-bark-200">{t('rpa.scopeOne')}</span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          disabled={running}
          onClick={() => setShowConfirm(true)}
          data-testid="rpa-start-button"
          className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-500 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-bark-600 dark:disabled:to-bark-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2 text-sm shadow-lg shadow-orange-500/25 transition-all duration-150"
        >
          🤖 {t('rpa.startButton')}
        </button>
        {running && (
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary text-sm px-4 py-2"
          >
            {t('rpa.cancelButton')}
          </button>
        )}
      </div>

      {/* Status line (when not running, render last result; when running,
          the floating chip outside this card carries the live status). */}
      {progress && (
        <div className="text-sm font-medium text-gray-700 dark:text-bark-200 mb-2">
          {progress.phase === 'done'
            ? <span className="text-emerald-600 dark:text-emerald-400">✓ {t('rpa.statusDone')}</span>
            : progress.phase === 'failed'
            ? <span className="text-red-600 dark:text-red-400">✗ {progress.message}</span>
            : <span className="text-orange-600 dark:text-orange-400">{formatPhase(progress)}</span>
          }
        </div>
      )}

      {/* Log tail */}
      {logTail.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-bark-400">
              {t('rpa.logHeader')}
            </span>
            <button
              type="button"
              onClick={handleCopyLog}
              data-testid="rpa-copy-log"
              className="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-bark-500 text-gray-600 dark:text-bark-300 bg-white dark:bg-bark-700 hover:bg-gray-50 dark:hover:bg-bark-600 transition-colors"
            >
              {copied ? '✓ ' + t('rpa.copied') : '📋 ' + t('rpa.copy')}
            </button>
          </div>
          <pre
            ref={tailRef}
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            className="text-[11px] bg-gray-900 text-gray-100 dark:bg-bark-900 rounded p-2 overflow-x-auto max-h-48 leading-relaxed font-mono cursor-text"
          >
            {logTail.join('\n')}
          </pre>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-bark-800 rounded-2xl shadow-2xl border border-orange-100 dark:border-bark-600 w-[420px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🤖</span>
              <h3 className="text-base font-semibold text-gray-800 dark:text-bark-50">
                {t('rpa.confirmModalTitle')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-bark-200 leading-relaxed">
                {t('rpa.confirmModalBody')}
              </p>
            </div>
            <div className="px-5 py-3 border-t border-orange-100 dark:border-bark-600 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                {t('rpa.confirmModalCancel')}
              </button>
              <button
                type="button"
                onClick={handleStart}
                data-testid="rpa-confirm-button"
                className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-semibold rounded-xl px-4 py-1.5 text-xs shadow-lg shadow-orange-500/25"
              >
                {t('rpa.confirmModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPhase(p: SweepProgress): string {
  const prefix = `${p.scenarioIndex + 1}/${p.scenarioTotal} · ${p.currentScenarioId} · `
  return prefix + p.message
}
