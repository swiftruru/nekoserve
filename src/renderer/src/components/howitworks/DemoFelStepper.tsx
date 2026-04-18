import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'

interface FelEvent {
  time: number
  key: string
}

// A single customer's journey through the café.
// Some events share a timestamp (arrive+waitSeat at 0, prepDone+startDine at 9.8).
const EVENTS: FelEvent[] = [
  { time: 0.0, key: 'arrive' },
  { time: 0.0, key: 'waitSeat' },
  { time: 0.3, key: 'seated' },
  { time: 1.2, key: 'order' },
  { time: 9.8, key: 'prepDone' },
  { time: 9.8, key: 'startDine' },
  { time: 24.1, key: 'finishDine' },
  { time: 24.5, key: 'leave' },
]

const TIMELINE_W = 560
const TIMELINE_H = 120 // taller to fit staggered labels
const RAIL_Y = 58 // centre rail
const PAD_X = 36
const DOT_R = 6
const MAX_T = 28
const MIN_PX_GAP = 30 // minimum pixels between two dot centres

function tToXRaw(t: number): number {
  return PAD_X + ((TIMELINE_W - 2 * PAD_X) * t) / MAX_T
}

/**
 * Pre-compute layout positions: if dots are too close, nudge them apart
 * so labels don't overlap. Also decide whether the label goes above or below.
 */
function layoutEvents(events: FelEvent[]) {
  const positions: number[] = []
  for (let i = 0; i < events.length; i++) {
    let x = tToXRaw(events[i].time)
    // Push right if overlapping previous positioned dot
    if (i > 0 && x - positions[i - 1] < MIN_PX_GAP) {
      x = positions[i - 1] + MIN_PX_GAP
    }
    positions.push(x)
  }

  // Alternate labels above/below when dots are close together
  const labelAbove: boolean[] = []
  for (let i = 0; i < events.length; i++) {
    if (i === 0) {
      labelAbove.push(true)
    } else if (positions[i] - positions[i - 1] < MIN_PX_GAP + 8) {
      // Too close to previous: alternate side
      labelAbove.push(!labelAbove[i - 1])
    } else {
      labelAbove.push(true)
    }
  }

  // Deduplicate time labels: only show on first occurrence of each time
  const showTime: boolean[] = []
  const seenTimes = new Set<string>()
  for (const ev of events) {
    const key = ev.time.toFixed(1)
    showTime.push(!seenTimes.has(key))
    seenTimes.add(key)
  }

  return { positions, labelAbove, showTime }
}

interface Props {
  level: LearningLevel
}

export default function DemoFelStepper({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [step, setStep] = useState(-1) // -1 = not started

  const layout = useMemo(() => layoutEvents(EVENTS), [])

  const currentEvent = step >= 0 && step < EVENTS.length ? EVENTS[step] : null
  const prevEvent = step > 0 ? EVENTS[step - 1] : null
  const jump = currentEvent && prevEvent ? currentEvent.time - prevEvent.time : null

  const remaining = EVENTS.slice(step + 1)

  // Emoji flow for each event step (friendly mode)
  const EVENT_EMOJIS = ['🚶', '⏳', '🪑', '📝', '🍽️', '🍴', '😋', '👋']

  return (
    <div className="space-y-3" data-testid="howitworks-fel-demo">
      {/* Friendly: emoji step flow */}
      {level === 'friendly' && (
        <div className="flex items-center gap-1 text-lg">
          {EVENT_EMOJIS.map((emoji, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span className={`transition-all duration-300 ${i <= step ? 'opacity-100 scale-110' : 'opacity-30 scale-90'} ${i === step ? 'animate-bounce' : ''}`}>
                {emoji}
              </span>
              {i < EVENT_EMOJIS.length - 1 && (
                <span className={`text-xs ${i < step ? 'text-orange-400' : 'text-gray-300 dark:text-bark-600'}`}>→</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Friendly: hint */}
      {level === 'friendly' && step === -1 && (
        <div className="text-xs text-orange-500 dark:text-orange-400 font-medium">
          {t('demo.felStepper.friendlyHint')}
        </div>
      )}

      {/* Clock readout */}
      <div className="flex items-center gap-4 text-xs" data-testid="howitworks-fel-clock">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 dark:text-bark-400">{t('demo.felStepper.clockLabel')}:</span>
          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm tabular-nums">
            t = {currentEvent ? currentEvent.time.toFixed(1) : '0.0'}
          </span>
          <span className="text-gray-400 dark:text-bark-500 text-[10px]">min</span>
        </div>
        {jump !== null && jump > 0 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold animate-pulse">
            <span>{t('demo.felStepper.jumpLabel')}:</span>
            <span className="font-mono">+{jump.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* SVG timeline */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${TIMELINE_W} ${TIMELINE_H}`}
          className="w-full max-w-[560px]"
          role="img"
          aria-label="Event timeline"
        >
          {/* Base line */}
          <line
            x1={PAD_X} y1={RAIL_Y}
            x2={TIMELINE_W - PAD_X} y2={RAIL_Y}
            stroke="currentColor" className="text-gray-300 dark:text-bark-500" strokeWidth={1.5}
          />

          {/* Grey gaps (nothing happens) between distinct time jumps */}
          {step >= 0 && EVENTS.slice(0, step + 1).map((ev, i) => {
            if (i === 0) return null
            const prev = EVENTS[i - 1]
            const gap = ev.time - prev.time
            if (gap <= 0.2) return null
            const x1 = layout.positions[i - 1] + DOT_R
            const x2 = layout.positions[i] - DOT_R
            if (x2 - x1 < 4) return null
            return (
              <rect
                key={`gap-${i}`}
                x={x1}
                y={RAIL_Y - 6}
                width={x2 - x1}
                height={12}
                rx={3}
                className="fill-gray-100 dark:fill-bark-600/50"
              />
            )
          })}

          {/* Event dots + labels */}
          {EVENTS.map((ev, i) => {
            const x = layout.positions[i]
            const y = RAIL_Y
            const isPast = i <= step
            const isCurrent = i === step
            const above = layout.labelAbove[i]

            // Label y positions (spread further for larger text)
            const eventLabelY = above ? y - 18 : y + 26
            const timeLabelY = above ? y + 16 : y - 10

            return (
              <g key={i}>
                {/* Connector line from dot to staggered label */}
                {isPast && (
                  <line
                    x1={x} y1={above ? y - DOT_R - 1 : y + DOT_R + 1}
                    x2={x} y2={above ? eventLabelY + 5 : eventLabelY - 10}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-bark-600"
                    strokeWidth={0.5}
                  />
                )}

                {/* Dot */}
                <circle
                  cx={x} cy={y} r={isCurrent ? DOT_R + 2 : DOT_R}
                  className={
                    isCurrent
                      ? 'fill-orange-500 dark:fill-orange-400'
                      : isPast
                        ? 'fill-orange-300 dark:fill-orange-600'
                        : 'fill-gray-300 dark:fill-bark-500'
                  }
                  style={isCurrent ? { filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' } : undefined}
                />

                {/* Time label (only first occurrence of each timestamp) */}
                {layout.showTime[i] && (
                  <text
                    x={x} y={timeLabelY}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${isPast ? 'fill-gray-500 dark:fill-bark-300' : 'fill-gray-400 dark:fill-bark-500'}`}
                  >
                    {ev.time.toFixed(1)}
                  </text>
                )}

                {/* Event label (only for revealed events) */}
                {isPast && (
                  <text
                    x={x} y={eventLabelY}
                    textAnchor="middle"
                    className={`text-[10px] font-medium ${isCurrent ? 'fill-orange-600 dark:fill-orange-400' : 'fill-gray-500 dark:fill-bark-400'}`}
                  >
                    {t(`demo.felStepper.events.${ev.key}`)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Cursor triangle */}
          {step >= 0 && step < EVENTS.length && (
            <polygon
              points={`${layout.positions[step]},${RAIL_Y - DOT_R - 3} ${layout.positions[step] - 4},${RAIL_Y - DOT_R - 9} ${layout.positions[step] + 4},${RAIL_Y - DOT_R - 9}`}
              className="fill-orange-500 dark:fill-orange-400"
            />
          )}
        </svg>
      </div>

      {/* Expert mode: FEL list */}
      {level === 'expert' && (
        <div className="text-[10px] text-gray-500 dark:text-bark-400" data-testid="howitworks-fel-list">
          <div className="font-semibold mb-1">{t('demo.felStepper.felLabel')}</div>
          {remaining.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {remaining.map((ev, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-bark-600 font-mono"
                >
                  <span className="text-orange-600 dark:text-orange-400">{ev.time.toFixed(1)}</span>
                  <span className="text-gray-400 dark:text-bark-500">|</span>
                  <span>{t(`demo.felStepper.events.${ev.key}`)}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="italic">{t('demo.felStepper.emptyFel')}</span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(s + 1, EVENTS.length - 1))}
          disabled={step >= EVENTS.length - 1}
          data-testid="howitworks-fel-next"
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('demo.felStepper.nextBtn')}
        </button>
        <button
          type="button"
          onClick={() => setStep(-1)}
          data-testid="howitworks-fel-reset"
          className="px-3 py-1 text-xs font-semibold rounded-lg border border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 transition-colors"
        >
          {t('demo.felStepper.resetBtn')}
        </button>
      </div>
    </div>
  )
}
