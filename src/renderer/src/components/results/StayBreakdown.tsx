import { useTranslation } from 'react-i18next'

interface Props {
  avgWaitForSeat: number
  avgWaitForOrder: number
  /** Service time for the eating phase (pulled from config, fixed). */
  diningTime: number
  avgTotalStayTime: number
}

/**
 * Horizontal stacked bar decomposition of `avgTotalStayTime` into the
 * phases a customer experiences: waiting for a seat → waiting for
 * food → eating → "other" delays (cat visits etc). The "other"
 * segment is the residual; it's clamped to 0 to avoid negative widths
 * when the simulator's numbers don't sum cleanly.
 *
 * This answers "where does my time go when I visit this café?" in
 * one visual, which raw avgTotalStayTime never could.
 */
export default function StayBreakdown({
  avgWaitForSeat,
  avgWaitForOrder,
  diningTime,
  avgTotalStayTime,
}: Props) {
  const { t } = useTranslation(['results', 'common'])

  const waitSeat = Math.max(0, avgWaitForSeat)
  const waitOrder = Math.max(0, avgWaitForOrder)
  const dining = Math.max(0, diningTime)
  const other = Math.max(0, avgTotalStayTime - waitSeat - waitOrder - dining)
  const total = Math.max(0.001, waitSeat + waitOrder + dining + other)

  const segments: Array<{
    key: 'waitSeat' | 'waitOrder' | 'dining' | 'other'
    label: string
    value: number
    color: string
  }> = [
    {
      key: 'waitSeat',
      label: t('stayBreakdown.waitSeat'),
      value: waitSeat,
      color: '#fb923c',
    },
    {
      key: 'waitOrder',
      label: t('stayBreakdown.waitOrder'),
      value: waitOrder,
      color: '#a78bfa',
    },
    {
      key: 'dining',
      label: t('stayBreakdown.dining'),
      value: dining,
      color: '#34d399',
    },
    {
      key: 'other',
      label: t('stayBreakdown.other'),
      value: other,
      color: '#f472b6',
    },
  ]

  const minUnit = t('common:unit.min')

  return (
    <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-bark-300">
          {t('stayBreakdown.title')}
        </span>
        <span className="text-sm font-bold tabular-nums text-orange-700 dark:text-orange-400">
          {avgTotalStayTime.toFixed(1)}
          <span className="text-xs text-gray-500 dark:text-bark-300 ml-1">{minUnit}</span>
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden border border-orange-100 dark:border-bark-600 bg-white dark:bg-bark-700">
        {segments.map((s) =>
          s.value <= 0 ? null : (
            <div
              key={s.key}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.color,
                transition: 'width 800ms ease-out',
              }}
              title={`${s.label} ${s.value.toFixed(1)} ${minUnit}`}
            />
          ),
        )}
      </div>

      {/* Legend rows */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        {segments.map((s) => {
          if (s.value <= 0) return null
          const pct = (s.value / total) * 100
          return (
            <div key={s.key} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-gray-600 dark:text-bark-300 truncate">{s.label}</span>
              <span className="text-gray-500 dark:text-bark-300 tabular-nums ml-auto shrink-0">
                {s.value.toFixed(1)} ({pct.toFixed(0)}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
