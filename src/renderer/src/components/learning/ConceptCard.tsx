import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from './types'

/**
 * Shared shell for a Learning Mode concept card. Exposes a beginner
 * layer (always visible) and an expert layer that stays collapsed until
 * the reader taps "Details". Each concept card supplies its own
 * beginner and expert slot content.
 *
 * `compact` shrinks padding, fonts, and chart heights for the narrow
 * side-column layout (2x2 grid next to the scene). Non-compact mode
 * is used when the overlay renders below the scene at full width.
 */
interface ConceptCardProps {
  icon: string
  title: string
  summary: string
  beginner: ReactNode
  expert: ReactNode
  compact?: boolean
  level?: LearningLevel
}

export default function ConceptCard({
  icon,
  title,
  summary,
  beginner,
  expert,
  compact = false,
  level = 'expert',
}: ConceptCardProps) {
  const { t } = useTranslation('learnMode')
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={
        'border border-orange-100 dark:border-bark-600 rounded-lg bg-orange-50/40 dark:bg-bark-700/40 ' +
        (compact ? 'p-2' : 'p-3')
      }
    >
      <div className={'flex items-start gap-1.5 ' + (compact ? 'mb-1' : 'mb-2')}>
        <span
          className={
            (compact ? 'text-sm' : 'text-base') + ' leading-none mt-0.5'
          }
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={
              (compact ? 'text-[10px]' : 'text-xs') +
              ' font-bold uppercase tracking-wide text-orange-700 dark:text-orange-400 leading-tight'
            }
          >
            {title}
          </div>
          {!compact && (
            <div className="text-xs text-gray-600 dark:text-bark-300 leading-snug mt-0.5">
              {summary}
            </div>
          )}
        </div>
      </div>

      <div className={compact ? 'min-h-[64px]' : 'min-h-[84px]'}>
        {beginner}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={
          (compact ? 'mt-1 text-[10px]' : 'mt-2 text-xs') +
          ' text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-semibold'
        }
      >
        {expanded
          ? level === 'friendly'
            ? t('friendlyCollapse')
            : t('collapse')
          : level === 'friendly'
          ? t('friendlyExpand')
          : t('expand')}
      </button>

      {expanded && (
        <div
          className={
            (compact ? 'mt-1 pt-1 text-[10px]' : 'mt-2 pt-2 text-xs') +
            ' border-t border-orange-100 dark:border-bark-600 text-gray-700 dark:text-bark-200 space-y-1.5'
          }
        >
          {compact && (
            <div className="text-gray-600 dark:text-bark-300 leading-snug">{summary}</div>
          )}
          {expert}
        </div>
      )}
    </div>
  )
}
