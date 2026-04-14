import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LearningLevel } from '../learning/types'

interface Props {
  /** Emoji icon rendered in the section header. */
  icon: string
  /** Section title, already translated. */
  title: string
  /** One-line summary shown under the title. */
  summary: string
  /** Main section body: KPI rows + visualizations. */
  children: ReactNode
  /** Expandable "更多說明" content that differs by learning level. */
  beginnerExpand: ReactNode
  expertExpand: ReactNode
  /** Current learning level from the page-wide toggle. */
  level: LearningLevel
}

/**
 * Wrapper around a Results-page topic (flow, wait, utilization, cat
 * interaction). Provides the header (icon + title + summary), a body
 * slot for KPIs and visualizations, and an expandable "更多說明"
 * section whose content depends on the active LearningLevel.
 *
 * Expanded state is local and persists across level-toggle flips so
 * the user's open sections don't close when they switch between 小白
 * and 專業.
 */
export default function ResultsSection({
  icon,
  title,
  summary,
  children,
  beginnerExpand,
  expertExpand,
  level,
}: Props) {
  const { t } = useTranslation('results')
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            return
          }
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={'card ' + (visible ? 'section-slide-in' : 'opacity-0')}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-orange-700 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            {summary}
          </p>
        </div>
      </div>

      <div>{children}</div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-800"
      >
        {expanded
          ? t('section.collapse')
          : level === 'friendly'
          ? t('section.expandFriendly')
          : t('section.expandExpert')}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-orange-100 text-sm text-gray-700 leading-relaxed space-y-2">
          {level === 'friendly' ? beginnerExpand : expertExpand}
        </div>
      )}
    </section>
  )
}
