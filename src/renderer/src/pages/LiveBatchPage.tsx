import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult } from '../types'
import {
  useLiveBatchStore,
  LIVE_METRIC_KEYS,
  type LiveMetricKey,
} from '../store/liveBatchStore'
import type { LiveRunnerControls } from '../hooks/useLiveRunner'
import CumulativeMeanChart from '../components/live/CumulativeMeanChart'
import LiveHistogram from '../components/live/LiveHistogram'
import LiveScenePanel from '../components/live/LiveScenePanel'
import RunThumbnailStrip from '../components/live/RunThumbnailStrip'
import ConfettiBurst from '../components/live/ConfettiBurst'
import MetricSmallMultiples from '../components/live/MetricSmallMultiples'
import MetricSelectionPanel from '../components/live/MetricSelectionPanel'
import OdometerCounter from '../components/live/OdometerCounter'
import GlobalThresholdBar from '../components/live/GlobalThresholdBar'
import { TermTooltip } from '../components/results/TermTooltip'
import {
  detectConvergedAt, CONVERGENCE_WINDOW, CONVERGENCE_THRESHOLD,
} from '../utils/convergence'
import { calcExceedProb, type ThresholdConfig } from '../utils/exceedance'
import { getThresholdStep, getThresholdBounds } from '../data/thresholdDefaults'

interface Props {
  /** Currently displayed run. Null while the first run is still being
   *  computed. */
  result: SimulationResult | null
  runner: LiveRunnerControls
  onSelectRun: (index: number) => void
  selectedRunIndex: number
  /** Allow the empty-state CTA to navigate the user back to settings. */
  onNavigateSettings?: () => void
  /** One-click batch start from the empty state — bypasses Settings.
   *  Uses the current configStore.config + replicationCount=20. */
  onQuickStartBatch?: () => void
}

const SCENE_COLLAPSED_KEY = 'nekoserve:live-scene-collapsed'
const SELECTED_METRICS_KEY = 'nekoserve:live-selected-metrics'

const DEFAULT_SELECTED_METRICS: LiveMetricKey[] = [
  'customerSatisfactionScore',
  'catWelfareScore',
  'avgWaitForSeat',
  'abandonRate',
  'seatUtilization',
  'catInteractionRate',
]

function loadSceneCollapsed(): boolean {
  try { return localStorage.getItem(SCENE_COLLAPSED_KEY) === 'true' }
  catch { return false }
}
function saveSceneCollapsed(v: boolean) {
  try { localStorage.setItem(SCENE_COLLAPSED_KEY, v ? 'true' : 'false') }
  catch { /* ok */ }
}

function loadSelectedMetrics(): LiveMetricKey[] {
  try {
    const raw = localStorage.getItem(SELECTED_METRICS_KEY)
    if (!raw) return DEFAULT_SELECTED_METRICS
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_SELECTED_METRICS
    const valid = parsed.filter((k): k is LiveMetricKey =>
      typeof k === 'string' && (LIVE_METRIC_KEYS as readonly string[]).includes(k),
    )
    return valid.length > 0 ? valid : DEFAULT_SELECTED_METRICS
  } catch {
    return DEFAULT_SELECTED_METRICS
  }
}
function saveSelectedMetrics(v: LiveMetricKey[]) {
  try { localStorage.setItem(SELECTED_METRICS_KEY, JSON.stringify(v)) }
  catch { /* ok */ }
}

export default function LiveBatchPage({
  result, runner, onSelectRun, selectedRunIndex, onNavigateSettings, onQuickStartBatch,
}: Props) {
  const { t } = useTranslation(['liveOverlay', 'playback'])

  const [sceneCollapsed, setSceneCollapsed] = useState<boolean>(loadSceneCollapsed)
  const toggleSceneCollapsed = () => {
    setSceneCollapsed((v) => {
      const next = !v
      saveSceneCollapsed(next)
      return next
    })
  }

  // User-selected list of metrics for the small-multiples grid.
  const [selectedMetrics, setSelectedMetricsState] = useState<LiveMetricKey[]>(loadSelectedMetrics)
  const updateSelectedMetrics = (next: LiveMetricKey[]) => {
    setSelectedMetricsState(next)
    saveSelectedMetrics(next)
  }
  const [showMetricPicker, setShowMetricPicker] = useState(false)

  // null = small multiples grid view; string = single-metric detail view
  const [focusedMetric, setFocusedMetric] = useState<LiveMetricKey | null>(null)

  // Curve replay: when set, every chart on the page renders only its
  // first N points. We step it from 1 to runs.length over a few
  // seconds via rAF so the curves visibly redraw from scratch — the
  // user re-experiences the live convergence even after status='done'.
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const replayRafRef = useRef<number | null>(null)
  const replayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isReplaying = replayIndex !== null

  const stopReplay = useCallback(() => {
    if (replayRafRef.current !== null) {
      cancelAnimationFrame(replayRafRef.current)
      replayRafRef.current = null
    }
    if (replayTimeoutRef.current !== null) {
      clearTimeout(replayTimeoutRef.current)
      replayTimeoutRef.current = null
    }
    setReplayIndex(null)
  }, [])

  const startReplay = useCallback(() => {
    const totalRuns = useLiveBatchStore.getState().runs.length
    if (totalRuns < 2) return
    // Cancel anything in flight, including a hold-at-end timeout.
    if (replayRafRef.current !== null) {
      cancelAnimationFrame(replayRafRef.current)
      replayRafRef.current = null
    }
    if (replayTimeoutRef.current !== null) {
      clearTimeout(replayTimeoutRef.current)
      replayTimeoutRef.current = null
    }
    // Total replay duration scales with totalRuns but is capped so
    // tiny batches (N=10) don't fly past in a blink and huge batches
    // (N=1000) don't crawl. ~120ms per run feels right.
    const durationMs = Math.max(2500, Math.min(8000, totalRuns * 120))
    const startTime = performance.now()
    setReplayIndex(1)

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      const idx = Math.max(1, Math.min(totalRuns, Math.ceil(t * totalRuns)))
      setReplayIndex(idx)
      if (t < 1) {
        replayRafRef.current = requestAnimationFrame(tick)
      } else {
        replayRafRef.current = null
        // Hold the full curve briefly so the eye lands on the final
        // state, then release replayIndex so the page returns to live
        // mode (which is identical to the held frame anyway, but the
        // null state lets future runs append normally).
        replayTimeoutRef.current = setTimeout(() => {
          setReplayIndex(null)
          replayTimeoutRef.current = null
        }, 700)
      }
    }
    replayRafRef.current = requestAnimationFrame(tick)
  }, [])

  // Cancel replay if the user navigates away or unmounts.
  useEffect(() => {
    return () => {
      if (replayRafRef.current !== null) cancelAnimationFrame(replayRafRef.current)
      if (replayTimeoutRef.current !== null) clearTimeout(replayTimeoutRef.current)
    }
  }, [])

  const status = useLiveBatchStore((s) => s.status)
  const total = useLiveBatchStore((s) => s.total)
  const currentIndex = useLiveBatchStore((s) => s.currentIndex)
  const runs = useLiveBatchStore((s) => s.runs)
  const stats = useLiveBatchStore((s) => s.stats)
  const series = useLiveBatchStore((s) => s.series)
  const storeMetric = useLiveBatchStore((s) => s.selectedMetric)
  const errorMessage = useLiveBatchStore((s) => s.errorMessage)

  // Empty state: never started a batch (idle + no runs). Single-run
  // users land here without realising this page expects multi-run
  // data. Render a clear explanation + CTA back to settings instead
  // of a blank charts grid.
  const isEmpty = status === 'idle' && runs.length === 0
  if (isEmpty) {
    return (
      <div className="page-container space-y-4 max-w-3xl" data-testid="live-batch-empty">
        <div className="card">
          <div className="card-title flex items-center gap-2">
            <span>⚡</span>
            <span>{t('liveOverlay:title')}</span>
          </div>
          <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 mt-3 mb-2">
            {t('liveOverlay:emptyState.title')}
          </h3>
          <p className="text-[14px] text-gray-700 dark:text-bark-200 leading-relaxed mb-2">
            {t('liveOverlay:emptyState.lead')}
          </p>
          <p className="text-[14px] text-gray-700 dark:text-bark-200 leading-relaxed mb-2">
            {t('liveOverlay:emptyState.needBatch')}
          </p>
          <p className="text-[13px] text-gray-600 dark:text-bark-300 leading-relaxed bg-orange-50/60 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 rounded-lg px-3 py-2 mt-3">
            {t('liveOverlay:emptyState.singleRunHint')}
          </p>
        </div>

        <div className="card">
          <h4 className="text-base font-bold text-orange-700 dark:text-orange-400 mb-3">
            {t('liveOverlay:emptyState.howToStart')}
          </h4>
          <ol className="space-y-2 text-[14px] text-gray-700 dark:text-bark-200 leading-relaxed">
            <li className="flex gap-2">
              <span className="font-bold text-orange-600 dark:text-orange-400">1.</span>
              <span>{t('liveOverlay:emptyState.step1')}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-orange-600 dark:text-orange-400">2.</span>
              <span>{t('liveOverlay:emptyState.step2')}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-orange-600 dark:text-orange-400">3.</span>
              <span>{t('liveOverlay:emptyState.step3')}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-orange-600 dark:text-orange-400">4.</span>
              <span>{t('liveOverlay:emptyState.step4')}</span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {onNavigateSettings && (
              <button
                type="button"
                onClick={onNavigateSettings}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
              >
                ⚙ {t('liveOverlay:emptyState.goSettings')}
              </button>
            )}
            {onQuickStartBatch && (
              <button
                type="button"
                onClick={onQuickStartBatch}
                data-testid="live-empty-quick-start"
                className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 shadow-md ring-1 ring-green-600/30"
              >
                {t('liveOverlay:emptyState.quickStartBatch')}
              </button>
            )}
          </div>
          {onQuickStartBatch && (
            <p className="mt-2 text-[12px] text-gray-500 dark:text-bark-400">
              {t('liveOverlay:emptyState.quickStartHint')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // The store's selectedMetric still drives the run-thumbnail strip's
  // value display (always shows _some_ metric per chip). We default it
  // to the focused metric when one is set, otherwise the first selected.
  const stripMetric = focusedMetric ?? storeMetric

  const batchProgress = total > 0 ? currentIndex / total : 0

  // Detail-view-only computations (skipped when in grid view to keep
  // re-render cost low). When a replay is in flight, slice every
  // detail-view dataset to the first replayIndex points so the chart,
  // histogram, and readouts all redraw as if we were at run #N.
  const detailFullSeries = focusedMetric ? series[focusedMetric] ?? [] : []
  const detailSeries = isReplaying
    ? detailFullSeries.slice(0, Math.max(1, replayIndex!))
    : detailFullSeries
  const detailFullStat = focusedMetric ? stats[focusedMetric] : undefined
  const detailLastPoint = detailSeries[detailSeries.length - 1]
  // While replaying, surface the snapshot stat from the latest visible
  // ConvergencePoint instead of the full-data Welford aggregate.
  const detailStat = isReplaying && detailLastPoint
    ? { n: detailLastPoint.n, mean: detailLastPoint.mean, m2: 0 }
    : detailFullStat
  const detailLabel = focusedMetric
    ? t(`liveOverlay:metric.${focusedMetric}`, { defaultValue: focusedMetric })
    : ''
  const detailSamples = useMemo(() => {
    if (!focusedMetric) return []
    const sliced = isReplaying
      ? runs.slice(0, Math.max(1, replayIndex!))
      : runs
    return sliced.map((r) => r.metrics[focusedMetric] as unknown as number)
  }, [runs, focusedMetric, isReplaying, replayIndex])
  const detailConvergedAt = useMemo(
    () => focusedMetric ? detectConvergedAt(detailSeries) : null,
    [focusedMetric, detailSeries],
  )

  // Threshold + exceedance probability for the focused metric. Reading
  // the whole thresholds map (not a per-key slice) is intentional: the
  // GlobalThresholdBar edits arbitrary keys and we want the detail view
  // to react to its own key changing without a stale-key closure.
  const thresholds = useLiveBatchStore((s) => s.thresholds)
  const focusedThreshold = focusedMetric ? thresholds[focusedMetric] : undefined
  const exceedance = useMemo(
    () => focusedThreshold
      ? calcExceedProb(detailSamples, focusedThreshold.value, focusedThreshold.direction)
      : null,
    [detailSamples, focusedThreshold],
  )

  const canReplay = runs.length >= 2

  return (
    <div className="page-container space-y-4 relative pb-24" data-testid="live-batch-page">
      <ConfettiBurst trigger={detailConvergedAt} />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="card-title flex items-center gap-2">
              <span>⚡</span>
              <span>{t('liveOverlay:title')}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-bark-300 mb-3">
              {t('liveOverlay:subtitle')}
            </p>
          </div>

          {/* Right header cluster: odometer + control buttons. The
              odometer carries the "real time" feel — it ticks every
              completed run. */}
          <div className="flex items-center gap-3">
            <OdometerCounter value={currentIndex} label={t('liveOverlay:counter.label')} width={4} />
            {status === 'running' && (
              <button
                type="button"
                onClick={runner.pause}
                className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600"
              >
                {t('liveOverlay:controls.pause')}
              </button>
            )}
            {status === 'paused' && (
              <button
                type="button"
                onClick={runner.resume}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
              >
                {t('liveOverlay:controls.resume')}
              </button>
            )}
            {(status === 'running' || status === 'paused') && (
              <button
                type="button"
                onClick={runner.stop}
                className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600"
              >
                {t('liveOverlay:controls.stop')}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-gray-700 dark:text-bark-200 tabular-nums">
            {t('liveOverlay:progress', { completed: currentIndex, total })}
          </span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-bark-700 rounded overflow-hidden min-w-[160px]">
            <div
              className="h-full bg-orange-400 transition-[width] duration-200"
              style={{ width: `${batchProgress * 100}%` }}
            />
          </div>

          {/* Curve replay button: visible in both grid and detail views
              once the batch has at least 2 runs. While replaying the
              same button doubles as a stop control. */}
          {canReplay && (
            <button
              type="button"
              onClick={isReplaying ? stopReplay : startReplay}
              data-testid="live-replay-curves"
              className={
                'px-3 py-1 rounded-lg border text-sm font-semibold transition-colors ' +
                (isReplaying
                  ? 'border-orange-500 bg-orange-500 text-white hover:bg-orange-600'
                  : 'border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600')
              }
              title={t('liveOverlay:replay.title')}
              aria-pressed={isReplaying}
            >
              {isReplaying
                ? `■ ${t('liveOverlay:replay.stopShort')}`
                : `↻ ${t('liveOverlay:replay.button')}`}
            </button>
          )}

          {/* Gear button + picker (grid view) OR back-to-grid (detail view) */}
          {focusedMetric === null ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMetricPicker((v) => !v)}
                data-testid="live-metric-picker-toggle"
                className="px-3 py-1 rounded-lg border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-bark-600"
                aria-expanded={showMetricPicker}
                title={t('liveOverlay:smallMultiples.configureTitle')}
              >
                ⚙ {t('liveOverlay:smallMultiples.configureButton')}
                <span className="ml-2 text-[10px] text-gray-500 dark:text-bark-300 font-normal">
                  {t('liveOverlay:smallMultiples.metricsCount', { count: selectedMetrics.length })}
                </span>
              </button>
              {showMetricPicker && (
                <MetricSelectionPanel
                  selected={selectedMetrics}
                  onChange={updateSelectedMetrics}
                  onClose={() => setShowMetricPicker(false)}
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFocusedMetric(null)}
              data-testid="live-back-to-grid"
              className="px-3 py-1 rounded-lg border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-bark-600"
            >
              {t('liveOverlay:smallMultiples.back')}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="card border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {t('liveOverlay:errorPrefix')}: {errorMessage}
        </div>
      )}

      {/* Global pass-bar editor: collapsed by default. Lets the user
          set thresholds for every visible metric without first
          drilling into each one. */}
      <GlobalThresholdBar metrics={selectedMetrics} />

      {/* ── Main: scene + chart area ─────────────────────────── */}
      <div className={
        sceneCollapsed
          ? 'space-y-4'
          : 'grid grid-cols-1 xl:grid-cols-2 gap-4 items-start'
      }>
        {/* Left column: scene panel + thumbnails (collapsible) */}
        {sceneCollapsed ? (
          <button
            type="button"
            onClick={toggleSceneCollapsed}
            data-testid="live-scene-expand"
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-orange-200 dark:border-bark-500 bg-orange-50/40 dark:bg-bark-700/30 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-100 dark:hover:bg-bark-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>🐱</span>
              <span>{t('liveOverlay:scenePanel.title')}</span>
              <span className="text-xs text-gray-500 dark:text-bark-300 font-normal">
                ({t('liveOverlay:scenePanel.runLabel', { index: selectedRunIndex + 1 })})
              </span>
            </span>
            <span className="text-xs">{t('liveOverlay:scenePanel.expand')}</span>
          </button>
        ) : (
          <div className="space-y-2">
            {result ? (
              <div className="relative">
                <LiveScenePanel
                  result={result}
                  runIndex={selectedRunIndex}
                  batchProgress={batchProgress}
                />
                <button
                  type="button"
                  onClick={toggleSceneCollapsed}
                  data-testid="live-scene-collapse"
                  className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded text-[11px] bg-white/90 dark:bg-bark-700/90 border border-orange-200 dark:border-bark-500 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600"
                  title={t('liveOverlay:scenePanel.collapse')}
                >
                  ▲ {t('liveOverlay:scenePanel.collapseShort')}
                </button>
              </div>
            ) : (
              <div className="card p-6 flex items-center justify-center min-h-[320px] relative">
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-pulse">🐱</div>
                  <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    {t('liveOverlay:bootstrap.runningFirst')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-bark-400 mt-1">
                    {t('liveOverlay:bootstrap.runningHint')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSceneCollapsed}
                  className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded text-[11px] bg-white/90 dark:bg-bark-700/90 border border-orange-200 dark:border-bark-500 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600"
                >
                  ▲ {t('liveOverlay:scenePanel.collapseShort')}
                </button>
              </div>
            )}
            <RunThumbnailStrip
              runs={runs}
              selectedIndex={selectedRunIndex}
              selectedMetric={stripMetric}
              onSelect={onSelectRun}
            />
          </div>
        )}

        {/* Right column: small multiples grid OR single-metric detail */}
        <div className="space-y-3">
          {focusedMetric === null ? (
            <>
              <div className="text-[11px] text-gray-500 dark:text-bark-300">
                {t('liveOverlay:smallMultiples.hint')}
              </div>
              <MetricSmallMultiples
                metrics={selectedMetrics}
                onFocus={(m) => setFocusedMetric(m)}
                displayLimit={replayIndex}
              />
            </>
          ) : (
            <>
              {/* Detail readouts. The 4th cell (P(X >= bar)) is the
                  threshold-exceedance feature: it answers "of N runs,
                  how many cleared the pass bar?" — something the mean
                  alone can't tell you. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Readout
                  label={t('liveOverlay:cumulativeMean')}
                  value={detailStat && detailStat.n > 0 ? formatNumber(detailStat.mean) : '—'}
                />
                <Readout
                  label={t('liveOverlay:ci95')}
                  value={detailLastPoint && detailLastPoint.halfWidth > 0
                    ? `± ${formatNumber(detailLastPoint.halfWidth)}` : '—'}
                  hint={
                    detailLastPoint && detailLastPoint.halfWidth > 0 && detailStat && detailStat.n > 1
                      ? t('liveOverlay:annotations.ciShrinkage')
                      : undefined
                  }
                />
                <Readout
                  label={
                    <TermTooltip termKey="lowerN">
                      {t('liveOverlay:sampleCount')}
                    </TermTooltip>
                  }
                  value={detailStat ? String(detailStat.n) : '0'}
                />
                <Readout
                  label={
                    focusedThreshold
                      ? t('liveOverlay:exceedanceProb', {
                          sign: focusedThreshold.direction === 'gte' ? '≥' : '≤',
                          value: formatNumber(focusedThreshold.value),
                        })
                      : t('liveOverlay:exceedanceProbEmpty')
                  }
                  value={focusedThreshold && exceedance && exceedance.total > 0
                    ? `${(exceedance.probability * 100).toFixed(1)}%`
                    : '—'}
                  hint={focusedThreshold && exceedance && exceedance.total > 0
                    ? t('liveOverlay:exceedanceCount', {
                        count: exceedance.count,
                        total: exceedance.total,
                      })
                    : undefined}
                />
              </div>

              {/* Pass-bar editor: live-updates the line on both charts
                  and the readout above without re-running the sim. */}
              {focusedMetric && (
                <ThresholdControl
                  metric={focusedMetric}
                  threshold={focusedThreshold}
                />
              )}

              {/* Convergence banner (per-metric, only in detail view) */}
              {detailSeries.length >= CONVERGENCE_WINDOW && (
                detailConvergedAt !== null ? (
                  <div className="px-3 py-2 rounded border border-green-300 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm">
                    ✨ {t('liveOverlay:convergenceHint', {
                      window: CONVERGENCE_WINDOW,
                      percent: (CONVERGENCE_THRESHOLD * 100).toFixed(0),
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm">
                    {t('liveOverlay:convergenceWaiting')}
                  </div>
                )
              )}

              <CumulativeMeanChart
                series={detailSeries}
                total={Math.max(total, currentIndex)}
                metricLabel={detailLabel}
                convergedAt={detailConvergedAt}
                convergenceWindow={CONVERGENCE_WINDOW}
                threshold={focusedThreshold}
                exceedanceProb={exceedance?.probability}
              />
              <LiveHistogram
                values={detailSamples}
                metricLabel={detailLabel}
                cumulativeMean={detailStat && detailStat.n > 0 ? detailStat.mean : null}
                threshold={focusedThreshold}
                exceedanceProb={exceedance?.probability}
              />
            </>
          )}
        </div>
      </div>

      {/* Floating replay button — fixed to the bottom-right of the
          viewport so the user can always trigger a curve replay even
          after scrolling far down to the histogram. Mirrors the
          header button's behaviour exactly. */}
      {canReplay && (
        <button
          type="button"
          onClick={isReplaying ? stopReplay : startReplay}
          data-testid="live-replay-curves-fab"
          className={
            'fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full shadow-lg border-2 text-sm font-bold transition-all hover:scale-105 ' +
            (isReplaying
              ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
              : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600')
          }
          title={t('liveOverlay:replay.title')}
          aria-pressed={isReplaying}
        >
          {isReplaying
            ? `■ ${t('liveOverlay:replay.stopShort')}`
            : `↻ ${t('liveOverlay:replay.button')}`}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('liveOverlay')
  const tone =
    status === 'running' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    : status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    : status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : status === 'stopped' ? 'bg-gray-200 text-gray-700 dark:bg-bark-700 dark:text-bark-200'
    : status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-gray-100 text-gray-600 dark:bg-bark-700 dark:text-bark-300'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tone}`}>
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}

function Readout({ label, value, hint }: { label: React.ReactNode; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-bark-600 px-3 py-2">
      <div className="text-xs text-gray-500 dark:text-bark-400 leading-tight">{label}</div>
      <div className="text-lg font-bold text-gray-800 dark:text-bark-100 tabular-nums leading-tight">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-orange-600 dark:text-orange-300 mt-0.5">↘ {hint}</div>
      )}
    </div>
  )
}

/**
 * Per-metric pass-bar editor. Lives directly above the charts in the
 * detail view. Edits a single key on liveBatchStore.thresholds; every
 * other consumer (histogram line, cumulative-mean line, P(X >= bar)
 * readout, small multiples chips) is reactive on the same key so
 * dragging the number updates the whole page in one frame.
 */
function ThresholdControl({
  metric,
  threshold,
}: {
  metric: LiveMetricKey
  threshold: ThresholdConfig | undefined
}) {
  const { t } = useTranslation('liveOverlay')
  const setThreshold = useLiveBatchStore((s) => s.setThreshold)
  const step = getThresholdStep(metric)
  const bounds = getThresholdBounds(metric)
  // When no threshold is set we still render the editor with sensible
  // placeholders so the user can opt in by typing a value.
  const value = threshold?.value ?? ''
  const direction = threshold?.direction ?? 'gte'

  const handleValueChange = (raw: string) => {
    if (raw === '') {
      setThreshold(metric, null)
      return
    }
    const num = Number(raw)
    if (!Number.isFinite(num)) return
    let clamped = num
    if (bounds.min !== undefined && clamped < bounds.min) clamped = bounds.min
    if (bounds.max !== undefined && clamped > bounds.max) clamped = bounds.max
    setThreshold(metric, { value: clamped, direction })
  }

  const handleDirection = (next: 'gte' | 'lte') => {
    if (!threshold) return
    setThreshold(metric, { value: threshold.value, direction: next })
  }

  return (
    <div className="rounded-lg border border-orange-200 dark:border-bark-600 bg-orange-50/60 dark:bg-bark-700/30 px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-orange-700 dark:text-orange-400">
        ⛳ {t('thresholdControl.title')}
      </span>
      <div className="flex items-center gap-1" role="group" aria-label={t('thresholdControl.directionLabel')}>
        <button
          type="button"
          onClick={() => handleDirection('gte')}
          disabled={!threshold}
          aria-pressed={direction === 'gte'}
          className={
            'px-2 py-1 rounded text-xs font-semibold border transition-colors ' +
            (direction === 'gte'
              ? 'bg-orange-500 text-white border-orange-600'
              : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600') +
            (!threshold ? ' opacity-50 cursor-not-allowed' : '')
          }
        >
          ≥ {t('thresholdControl.gteShort')}
        </button>
        <button
          type="button"
          onClick={() => handleDirection('lte')}
          disabled={!threshold}
          aria-pressed={direction === 'lte'}
          className={
            'px-2 py-1 rounded text-xs font-semibold border transition-colors ' +
            (direction === 'lte'
              ? 'bg-orange-500 text-white border-orange-600'
              : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600') +
            (!threshold ? ' opacity-50 cursor-not-allowed' : '')
          }
        >
          ≤ {t('thresholdControl.lteShort')}
        </button>
      </div>
      <input
        type="number"
        value={value}
        step={step}
        min={bounds.min}
        max={bounds.max}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={t('thresholdControl.placeholder')}
        className="w-24 px-2 py-1 rounded border border-orange-300 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-800 dark:text-bark-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-400"
        aria-label={t('thresholdControl.valueLabel')}
        data-testid="live-threshold-input"
      />
      {threshold && (
        <button
          type="button"
          onClick={() => setThreshold(metric, null)}
          className="text-xs text-gray-500 dark:text-bark-300 hover:text-orange-700 dark:hover:text-orange-400 underline"
        >
          {t('thresholdControl.clear')}
        </button>
      )}
      <span className="text-[11px] text-gray-500 dark:text-bark-300 ml-auto">
        {t('thresholdControl.hint')}
      </span>
    </div>
  )
}

function formatNumber(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const abs = Math.abs(x)
  if (abs >= 100) return x.toFixed(1)
  if (abs >= 1) return x.toFixed(3)
  return x.toFixed(4)
}
