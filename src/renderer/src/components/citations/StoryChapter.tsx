import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Citation } from '../../data/citations'
import { citationShort, citationUrl } from '../../data/citations'

interface Props {
  /** Anchor id, must match StoryNav entry. */
  id: string
  /** Display number like "Ch. 1" / "1" / "序" / "終". */
  number: string
  title: string
  /** Either a string or a rich node tree (first-person narrative). */
  narrative: ReactNode
  /** The ambient (always-on, CSS-driven) diagram. */
  diagram: ReactNode
  /** Optional scripted scene; when provided a ▶ button appears. */
  scripted?: ReactNode
  /** Citations backing this chapter (shown as pills under title). */
  citations: Citation[]
}

/**
 * Shared shell for each story chapter. Desktop = two columns (text left,
 * diagram right); mobile = stacked. The scripted scene is cold-mounted:
 * the child is only rendered after the user presses ▶, so idle chapters
 * cost zero animation.
 */
export default function StoryChapter({
  id,
  number,
  title,
  narrative,
  diagram,
  scripted,
  citations,
}: Props) {
  const { t } = useTranslation('citations')
  const [playing, setPlaying] = useState(false)
  // Remount key so pressing the button while already playing restarts.
  const [runId, setRunId] = useState(0)
  const sectionRef = useRef<HTMLElement | null>(null)

  // Stop the scripted animation when the chapter scrolls out of view,
  // so a looping or heavy scripted scene doesn't keep burning frames
  // while the reader is two chapters away.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || !playing) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) setPlaying(false)
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [playing])

  return (
    <section
      ref={sectionRef}
      id={id}
      data-testid={`citations-chapter-${id}`}
      className="scroll-mt-24 rounded-2xl ring-1 ring-inset ring-orange-100 dark:ring-bark-600 bg-white/60 dark:bg-bark-800/40 p-5 md:p-6 mb-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8 items-start">
        {/* Narrative column */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">
              {number}
            </span>
            <h2 className="text-lg md:text-xl font-bold text-orange-700 dark:text-orange-400">
              {title}
            </h2>
          </div>
          {citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {citations.map((c) => (
                <a
                  key={c.key}
                  href={citationUrl(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold tracking-wide rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  title={c.title}
                >
                  {citationShort(c)}
                </a>
              ))}
            </div>
          )}
          <div className="text-sm text-gray-700 dark:text-bark-200 leading-relaxed space-y-2">
            {narrative}
          </div>
          {scripted && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setPlaying(true)
                  setRunId((n) => n + 1)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                data-testid={`citations-chapter-${id}-play`}
              >
                <span>▶</span>
                {playing ? t('story.replayScripted') : t('story.playScripted')}
              </button>
            </div>
          )}
        </div>

        {/* Diagram column */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="rounded-xl bg-cream-50 dark:bg-bark-900/40 ring-1 ring-inset ring-orange-100 dark:ring-bark-600 p-3 min-h-[180px] flex items-center justify-center">
            {playing && scripted ? (
              // Fresh mount each play so ScriptedAnim restarts cleanly.
              <div key={runId} className="w-full">
                {scripted}
              </div>
            ) : (
              <div className="w-full">{diagram}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
