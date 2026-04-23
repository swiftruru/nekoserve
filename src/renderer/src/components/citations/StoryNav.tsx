import { useEffect, useState } from 'react'

export interface StoryNavItem {
  id: string
  number: string
  label: string
}

interface Props {
  items: readonly StoryNavItem[]
}

/**
 * Sticky left-rail table-of-contents for the citations story page.
 * Uses IntersectionObserver to highlight the chapter whose top edge is
 * closest to the top of the viewport. Hidden on mobile (< lg) to keep
 * the narrative room unobstructed.
 */
export default function StoryNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const targets = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        // Track which entries are intersecting and pick the top-most.
        // rootMargin pulls the detection line down ~30% so the chapter
        // "becomes active" once its top crosses roughly 30% of the
        // viewport, rather than only when it reaches the very top.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [items])

  return (
    <nav
      aria-label="Story table of contents"
      className="hidden lg:block sticky top-6 self-start pr-2"
      data-testid="citations-story-nav"
    >
      <ol className="space-y-1 text-xs">
        {items.map((it) => {
          const active = it.id === activeId
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className={
                  'flex items-baseline gap-2 rounded-md px-2 py-1.5 transition-colors ' +
                  (active
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold'
                    : 'text-gray-500 dark:text-bark-300 hover:bg-orange-50 dark:hover:bg-bark-700/50')
                }
                data-active={active ? 'true' : 'false'}
              >
                <span className="text-[10px] font-semibold w-8 shrink-0 tabular-nums text-right text-orange-500 dark:text-orange-400">
                  {it.number}
                </span>
                <span className="leading-snug">{it.label}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
