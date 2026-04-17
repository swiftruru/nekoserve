import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LearningLevel } from '../learning/types'

interface HowItWorksSectionProps {
  /** Emoji icon for the section header. */
  icon: string
  /** Translated section title. */
  title: string
  /** Current learning level. */
  level: LearningLevel
  /** Concept explanation for friendly mode. */
  friendlyConcept: ReactNode
  /** Concept explanation for expert mode. */
  expertConcept: ReactNode
  /** NekoServe model description for friendly mode. */
  friendlyModel: ReactNode
  /** NekoServe model description for expert mode. */
  expertModel: ReactNode
  /** Interactive demo element. */
  demo: ReactNode
  /** Collapsible code block (CodeToggle). Hidden in friendly mode. */
  codeToggle: ReactNode
  /** Takeaway note for friendly mode. */
  friendlyTakeaway?: ReactNode
  /** Takeaway note for expert mode. */
  expertTakeaway?: ReactNode
}

/**
 * Section card for the "How It Works" page. Renders different
 * concept text and model descriptions depending on the active
 * LearningLevel. In friendly mode, CodeToggle is hidden so
 * beginners see only the interactive demo and plain-language text.
 */
export default function HowItWorksSection({
  icon,
  title,
  level,
  friendlyConcept,
  expertConcept,
  friendlyModel,
  expertModel,
  demo,
  codeToggle,
  friendlyTakeaway,
  expertTakeaway,
}: HowItWorksSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

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
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isFriendly = level === 'friendly'
  const takeaway = isFriendly ? friendlyTakeaway : expertTakeaway

  return (
    <section
      ref={sectionRef}
      className={'card ' + (visible ? 'section-slide-in' : 'opacity-0')}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400 leading-tight">
          {title}
        </h3>
      </div>

      {/* Concept + model description */}
      <div className="text-sm text-gray-700 dark:text-bark-200 leading-relaxed space-y-2 mb-4">
        {isFriendly ? friendlyConcept : expertConcept}
        {isFriendly ? friendlyModel : expertModel}
      </div>

      {/* Interactive demo */}
      <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/40 p-3">
        {demo}
      </div>

      {/* Takeaway note */}
      {takeaway && (
        <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-300 dark:border-orange-600 px-3 py-2 rounded-r-lg text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
          {takeaway}
        </div>
      )}

      {/* Collapsible code (expert only) */}
      {!isFriendly && codeToggle}
    </section>
  )
}
