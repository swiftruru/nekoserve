import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'

type CatState = 'idle' | 'resting'

interface Cat {
  id: number
  state: CatState
  restCountdown: number // seconds remaining (only when resting)
}

interface Props {
  level: LearningLevel
}

const REST_DURATION = 5 // seconds

export default function DemoCatPool({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [restProb, setRestProb] = useState(30)
  const [cats, setCats] = useState<Cat[]>([
    { id: 1, state: 'idle', restCountdown: 0 },
    { id: 2, state: 'idle', restCountdown: 0 },
    { id: 3, state: 'idle', restCountdown: 0 },
  ])
  const [lastResult, setLastResult] = useState<'rest' | 'return' | 'spinning' | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer for resting cats
  useEffect(() => {
    const hasResting = cats.some((c) => c.state === 'resting')
    if (!hasResting) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    if (intervalRef.current) return // already running
    intervalRef.current = setInterval(() => {
      setCats((prev) =>
        prev.map((c) => {
          if (c.state !== 'resting') return c
          const next = c.restCountdown - 1
          if (next <= 0) return { ...c, state: 'idle' as const, restCountdown: 0 }
          return { ...c, restCountdown: next }
        }),
      )
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [cats])

  const flipCoin = useCallback(() => {
    // Find an idle cat
    const idleIdx = cats.findIndex((c) => c.state === 'idle')
    if (idleIdx === -1) return

    // Spin animation
    setLastResult('spinning')
    setTimeout(() => {
      const hit = Math.random() * 100 < restProb
      if (hit) {
        setLastResult('rest')
        setCats((prev) => prev.map((c, i) =>
          i === idleIdx ? { ...c, state: 'resting' as const, restCountdown: REST_DURATION } : c
        ))
      } else {
        setLastResult('return')
        // Brief flash, then clear
        setTimeout(() => setLastResult(null), 1500)
      }
    }, 600)
  }, [cats, restProb])

  const idleCount = cats.filter((c) => c.state === 'idle').length
  const restingCats = cats.filter((c) => c.state === 'resting')

  return (
    <div className="space-y-3">
      {/* Probability slider */}
      <div className="flex items-center gap-3 text-xs">
        <label className="text-gray-600 dark:text-bark-300 font-medium">
          {t('demo.catPool.restProb')}:
        </label>
        <input
          type="range" min={0} max={100} value={restProb}
          onChange={(e) => setRestProb(Number(e.target.value))}
          className="w-24 accent-orange-500"
        />
        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{restProb}%</span>
      </div>

      {/* Cat pool */}
      <div className="flex gap-6">
        {/* Available pool */}
        <div className="flex-1">
          <div className="text-[10px] font-semibold text-gray-500 dark:text-bark-400 mb-1.5">
            {t('demo.catPool.poolLabel')}
            {level === 'expert' && (
              <span className="ml-1 font-mono text-orange-600 dark:text-orange-400">
                level={idleCount}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {cats.map((c) => (
              <div
                key={c.id}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-500 ${
                  c.state === 'idle'
                    ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700'
                    : 'bg-gray-100 dark:bg-bark-600 border border-gray-200 dark:border-bark-500 opacity-30 scale-90'
                }`}
              >
                {c.state === 'idle' ? '🐱' : '💤'}
              </div>
            ))}
          </div>
        </div>

        {/* Resting zone */}
        {restingCats.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-500 dark:text-bark-400 mb-1.5">
              {t('demo.catPool.restingLabel')}
            </div>
            <div className="flex gap-1.5">
              {restingCats.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-lg">
                    😴
                  </div>
                  <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 tabular-nums">
                    {c.restCountdown}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coin flip result */}
      {lastResult && lastResult !== 'spinning' && (
        <div className={`font-semibold text-center py-1 rounded-lg ${
          level === 'friendly' ? 'text-sm' : 'text-xs'
        } ${
          lastResult === 'rest'
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
        }`}>
          {lastResult === 'rest'
            ? (level === 'friendly' ? t('demo.catPool.friendlyResultRest') : '🎲 ' + t('demo.catPool.resultRest'))
            : (level === 'friendly' ? t('demo.catPool.friendlyResultReturn') : '🎲 ' + t('demo.catPool.resultReturn'))}
        </div>
      )}
      {lastResult === 'spinning' && (
        <div className="text-center text-lg animate-spin inline-block w-full">🎲</div>
      )}

      {/* Expert: sub-process annotation */}
      {level === 'expert' && restingCats.length > 0 && (
        <div className="text-[10px] font-mono text-gray-400 dark:text-bark-500 text-center">
          env.process(cat_rest(cat_id)) → fire-and-forget
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={flipCoin}
          disabled={idleCount === 0 || lastResult === 'spinning'}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('demo.catPool.flipBtn')}
        </button>
      </div>
    </div>
  )
}
