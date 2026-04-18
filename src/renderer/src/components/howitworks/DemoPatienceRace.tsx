import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'
import { InlineMath } from '../Math'

type RaceState = 'idle' | 'racing' | 'seatWon' | 'patienceWon'

interface Props {
  level: LearningLevel
}

export default function DemoPatienceRace({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [seatSpeed, setSeatSpeed] = useState(50) // 0-100, higher = faster seat release
  const [patience, setPatience] = useState(50) // 0-100, higher = more patient
  const [state, setState] = useState<RaceState>('idle')
  const [seatProgress, setSeatProgress] = useState(0)
  const [patienceProgress, setPatienceProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef(0)

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRace = () => {
    cleanup()
    setState('racing')
    setSeatProgress(0)
    setPatienceProgress(0)
    startRef.current = performance.now()

    // seat duration: 1s (fast) to 4s (slow)
    const seatDur = 4000 - (seatSpeed / 100) * 3000
    // patience duration: 1s (low) to 4s (high)
    const patienceDur = 1000 + (patience / 100) * 3000

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const sp = Math.min(1, elapsed / seatDur)
      const pp = Math.min(1, elapsed / patienceDur)
      setSeatProgress(sp)
      setPatienceProgress(pp)

      if (sp >= 1 && pp < 1) {
        setState('seatWon')
        return
      }
      if (pp >= 1 && sp < 1) {
        setState('patienceWon')
        return
      }
      if (sp >= 1 && pp >= 1) {
        // Tie: seat wins (request triggered first)
        setState('seatWon')
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const reset = () => {
    cleanup()
    setState('idle')
    setSeatProgress(0)
    setPatienceProgress(0)
  }

  const isFinished = state === 'seatWon' || state === 'patienceWon'

  return (
    <div className="space-y-3" data-testid="howitworks-patience-demo">
      {/* Sliders */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-600 dark:text-bark-300 font-medium">{t('demo.patienceRace.seatSpeed')}</span>
            <span className="text-[10px] text-gray-400 dark:text-bark-500">
              {seatSpeed < 33 ? t('demo.patienceRace.slow') : seatSpeed > 66 ? t('demo.patienceRace.fast') : ''}
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={seatSpeed}
            onChange={(e) => setSeatSpeed(Number(e.target.value))}
            disabled={state === 'racing'}
            data-testid="howitworks-patience-seat-speed"
            className="w-full accent-green-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-600 dark:text-bark-300 font-medium">{t('demo.patienceRace.patience')}</span>
            <span className="text-[10px] text-gray-400 dark:text-bark-500">
              {patience < 33 ? t('demo.patienceRace.low') : patience > 66 ? t('demo.patienceRace.high') : ''}
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={patience}
            onChange={(e) => setPatience(Number(e.target.value))}
            disabled={state === 'racing'}
            data-testid="howitworks-patience-value"
            className="w-full accent-red-500"
          />
        </div>
      </div>

      {/* Race bars */}
      <div className="space-y-2">
        {/* yield req | timeout fork visual */}
        {level === 'expert' && (
          <div className="text-center text-[10px] font-mono text-gray-500 dark:text-bark-400 mb-1">
            yield seat_req <span className="text-orange-500 font-bold mx-0.5">|</span> abandon_ev
          </div>
        )}

        {/* Seat bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="text-green-600 dark:text-green-400 font-medium">{t('demo.patienceRace.seatBar')}</span>
            {level === 'expert' && <span className="font-mono text-gray-400 dark:text-bark-500">Wq</span>}
          </div>
          <div className="h-5 rounded-full bg-gray-100 dark:bg-bark-600 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                state === 'seatWon' ? 'bg-green-500' : 'bg-green-400 dark:bg-green-600'
              }`}
              style={{ width: `${seatProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Patience bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="text-red-500 dark:text-red-400 font-medium">{t('demo.patienceRace.patienceBar')}</span>
            {level === 'expert' && <span className="font-mono text-gray-400 dark:text-bark-500">maxWaitTime</span>}
          </div>
          <div className="h-5 rounded-full bg-gray-100 dark:bg-bark-600 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                state === 'patienceWon' ? 'bg-red-500' : 'bg-red-300 dark:bg-red-700'
              }`}
              style={{ width: `${patienceProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Result */}
      {isFinished && (
        <div
          data-testid="howitworks-patience-result"
          data-state={state}
          className={`text-center font-bold py-1.5 rounded-lg ${
          level === 'friendly' ? 'text-base' : 'text-sm'
        } ${
          state === 'seatWon'
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
            : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
        }`}
        >
          {state === 'seatWon'
            ? (level === 'friendly' ? '😊🪑 ' : '✅ ') + t('demo.patienceRace.seated')
            : (level === 'friendly' ? '😤💨 ' : '❌ ') + t('demo.patienceRace.abandoned')}
        </div>
      )}
      {state === 'racing' && (
        <div className="text-center text-xs text-gray-400 dark:text-bark-500 animate-pulse" data-testid="howitworks-patience-racing">
          {t('demo.patienceRace.racing')}
        </div>
      )}

      {/* Expert: formula */}
      {level === 'expert' && isFinished && (
        <div className="text-center">
          <InlineMath formula="W = \sum(W_q + W_s)" />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={startRace}
          disabled={state === 'racing'}
          data-testid="howitworks-patience-start"
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('demo.patienceRace.startBtn')}
        </button>
        <button
          type="button"
          onClick={reset}
          data-testid="howitworks-patience-reset"
          className="px-3 py-1 text-xs font-semibold rounded-lg border border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 transition-colors"
        >
          {t('demo.patienceRace.resetBtn')}
        </button>
      </div>
    </div>
  )
}
