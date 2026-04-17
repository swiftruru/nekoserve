import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'

interface Customer {
  id: number
  status: 'queued' | 'seated' | 'done'
}

const FACES = ['😊', '😄', '🙂', '😁', '😎', '🤗', '🥰', '😋', '🤓', '😃']

interface Props {
  level: LearningLevel
}

export default function DemoResourceQueue({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [capacity, setCapacity] = useState(3)
  const [customers, setCustomers] = useState<Customer[]>([])
  const nextId = useRef(1)
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const tid of timers.current) clearTimeout(tid)
    }
  }, [])

  const seated = customers.filter((c) => c.status === 'seated')
  const queued = customers.filter((c) => c.status === 'queued')

  const tryAdmit = useCallback((list: Customer[], cap: number): Customer[] => {
    const s = list.filter((c) => c.status === 'seated').length
    if (s >= cap) return list
    // Admit front-of-queue
    const firstQueued = list.findIndex((c) => c.status === 'queued')
    if (firstQueued === -1) return list
    const next = [...list]
    next[firstQueued] = { ...next[firstQueued], status: 'seated' }
    // Auto-release after 3s
    const cid = next[firstQueued].id
    const tid = setTimeout(() => {
      setCustomers((prev) => {
        const updated = prev.filter((c) => !(c.id === cid && c.status === 'seated'))
        // Try admit next queued
        return tryAdmitFromState(updated, cap)
      })
      timers.current.delete(tid)
    }, 3000)
    timers.current.add(tid)
    return next
  }, [])

  const tryAdmitFromState = (list: Customer[], cap: number): Customer[] => {
    let result = [...list]
    while (true) {
      const s = result.filter((c) => c.status === 'seated').length
      if (s >= cap) break
      const idx = result.findIndex((c) => c.status === 'queued')
      if (idx === -1) break
      result[idx] = { ...result[idx], status: 'seated' }
      const cid = result[idx].id
      const tid = setTimeout(() => {
        setCustomers((prev) => {
          const updated = prev.filter((c) => !(c.id === cid && c.status === 'seated'))
          return tryAdmitFromState(updated, cap)
        })
        timers.current.delete(tid)
      }, 3000)
      timers.current.add(tid)
    }
    return result
  }

  const addCustomer = () => {
    const id = nextId.current++
    setCustomers((prev) => {
      const next = [...prev, { id, status: 'queued' as const }]
      return tryAdmitFromState(next, capacity)
    })
  }

  const releaseFirst = () => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.status === 'seated')
      if (idx === -1) return prev
      const updated = prev.filter((_, i) => i !== idx)
      return tryAdmitFromState(updated, capacity)
    })
  }

  return (
    <div className="space-y-3">
      {/* Friendly: status bubble */}
      {level === 'friendly' && customers.length > 0 && (
        <div className={`text-xs font-semibold text-center py-1 rounded-lg ${
          seated.length >= capacity && queued.length > 0
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
            : seated.length < capacity
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-500 dark:text-bark-400'
        }`}>
          {seated.length >= capacity && queued.length > 0
            ? t('demo.resourceQueue.friendlyFull')
            : seated.length < capacity
              ? t('demo.resourceQueue.friendlyAvailable')
              : null}
        </div>
      )}

      {/* Capacity slider */}
      <div className="flex items-center gap-3 text-xs">
        <label className="text-gray-600 dark:text-bark-300 font-medium">
          {t('demo.resourceQueue.capacityLabel')}:
        </label>
        <input
          type="range" min={1} max={5} value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="w-24 accent-orange-500"
        />
        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{capacity}</span>
      </div>

      {/* Visual: seats */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 dark:text-bark-400 mb-1">
          {t('demo.resourceQueue.seatedLabel')}
          {level === 'expert' && (
            <span className="ml-1 font-mono text-orange-600 dark:text-orange-400">
              ({seated.length}/{capacity})
            </span>
          )}
        </div>
        <div className="flex gap-1.5 min-h-[36px] items-center">
          {Array.from({ length: capacity }, (_, i) => {
            const occupant = seated[i]
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm transition-all duration-300 ${
                  occupant
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
                    : 'border-dashed border-gray-300 dark:border-bark-500 bg-white dark:bg-bark-800'
                }`}
              >
                {occupant ? FACES[(occupant.id - 1) % FACES.length] : ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* Visual: queue */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 dark:text-bark-400 mb-1">
          {t('demo.resourceQueue.queueLabel')}
          {level === 'expert' && (
            <span className="ml-1 font-mono text-orange-600 dark:text-orange-400">
              ({queued.length})
            </span>
          )}
        </div>
        <div className="flex gap-1 min-h-[28px] items-center flex-wrap">
          {queued.length > 0 ? (
            queued.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-sm transition-all duration-300"
              >
                {FACES[(c.id - 1) % FACES.length]}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-bark-500 italic">
              {t('demo.resourceQueue.emptyQueue')}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addCustomer}
          disabled={queued.length >= 12}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('demo.resourceQueue.addBtn')}
        </button>
        <button
          type="button"
          onClick={releaseFirst}
          disabled={seated.length === 0}
          className="px-3 py-1 text-xs font-semibold rounded-lg border border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('demo.resourceQueue.releaseBtn')}
        </button>
      </div>
    </div>
  )
}
