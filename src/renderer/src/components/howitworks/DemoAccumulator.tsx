import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'
import { BlockMath } from '../Math'

interface CustomerData {
  id: number
  waitTime: number
  busyTime: number
}

// Pre-scripted 5-customer mini-run
const CUSTOMERS: CustomerData[] = [
  { id: 1, waitTime: 0.3, busyTime: 12.4 },
  { id: 2, waitTime: 2.1, busyTime: 14.7 },
  { id: 3, waitTime: 0.0, busyTime: 11.2 },
  { id: 4, waitTime: 5.8, busyTime: 13.9 },
  { id: 5, waitTime: 1.4, busyTime: 15.1 },
]

const CAPACITY = 3
const SIM_DURATION = 60

interface Props {
  level: LearningLevel
}

export default function DemoAccumulator({ level }: Props) {
  const { t } = useTranslation('howItWorks')
  const [step, setStep] = useState(0) // 0 = none, 1-5 = customer, 6 = aggregated
  const revealed = CUSTOMERS.slice(0, Math.min(step, CUSTOMERS.length))
  const isAggregated = step > CUSTOMERS.length

  const avgWait = useMemo(() => {
    if (revealed.length === 0) return 0
    return revealed.reduce((s, c) => s + c.waitTime, 0) / revealed.length
  }, [revealed])

  const totalBusy = useMemo(
    () => revealed.reduce((s, c) => s + c.busyTime, 0),
    [revealed],
  )

  const utilization = SIM_DURATION > 0 ? totalBusy / (CAPACITY * SIM_DURATION) : 0

  const nextStep = () => setStep((s) => Math.min(s + 1, CUSTOMERS.length + 1))
  const reset = () => setStep(0)

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="text-xs text-gray-500 dark:text-bark-400 font-medium">
        {step <= CUSTOMERS.length
          ? t('demo.accumulator.step', { n: Math.min(step, CUSTOMERS.length), total: CUSTOMERS.length })
          : ''}
      </div>

      {/* Accumulator table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-[10px] text-gray-500 dark:text-bark-400 uppercase tracking-wide">
              <th className="text-left py-1 pr-2"></th>
              <th className="text-right py-1 px-2">{t('demo.accumulator.waitCol')}</th>
              <th className="text-right py-1 px-2">{t('demo.accumulator.busyCol')}</th>
            </tr>
          </thead>
          <tbody>
            {revealed.map((c, i) => {
              const isNew = i === revealed.length - 1 && !isAggregated
              return (
                <tr
                  key={c.id}
                  className={isNew ? 'bg-orange-50 dark:bg-orange-900/20' : ''}
                >
                  <td className="py-1 pr-2 font-medium text-gray-600 dark:text-bark-300">
                    {t('demo.accumulator.customerLabel', { id: c.id })}
                  </td>
                  <td className={`py-1 px-2 text-right font-mono tabular-nums ${isNew ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-gray-700 dark:text-bark-200'}`}>
                    {c.waitTime.toFixed(1)}
                  </td>
                  <td className={`py-1 px-2 text-right font-mono tabular-nums ${isNew ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-gray-700 dark:text-bark-200'}`}>
                    {c.busyTime.toFixed(1)}
                  </td>
                </tr>
              )
            })}
            {revealed.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-gray-400 dark:text-bark-500 italic">
                  ...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Running totals */}
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-gray-500 dark:text-bark-400">{t('demo.accumulator.totalBusy')}: </span>
          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums">
            {totalBusy.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Aggregation result */}
      {isAggregated && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 text-center">
            <div className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5">
              {t('demo.accumulator.avgWait')}
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300 tabular-nums">
              {avgWait.toFixed(1)} <span className="text-xs font-normal">min</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 text-center">
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-0.5">
              {t('demo.accumulator.utilization')}
            </div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              {(utilization * 100).toFixed(1)}%
            </div>
            {/* Friendly: visual progress bar */}
            {level === 'friendly' && (
              <div className="mt-1 h-2 rounded-full bg-blue-100 dark:bg-blue-900/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-700"
                  style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expert: formula */}
      {level === 'expert' && isAggregated && (
        <BlockMath formula={String.raw`\rho = \frac{\text{total\_busy}}{c \times T} = \frac{${totalBusy.toFixed(1)}}{${CAPACITY} \times ${SIM_DURATION}} = ${(utilization * 100).toFixed(1)}\%`} />
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {step <= CUSTOMERS.length ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            {step < CUSTOMERS.length
              ? t('demo.accumulator.nextBtn')
              : t('demo.accumulator.aggregateBtn')}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 transition-colors"
          >
            {t('demo.accumulator.resetBtn')}
          </button>
        )}
      </div>
    </div>
  )
}
