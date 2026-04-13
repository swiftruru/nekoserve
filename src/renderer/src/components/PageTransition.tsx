import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PAGE_ORDER, type Page } from '../types'
import catUrl from '@assets/mascot-cat.png'

/**
 * PageTransition wraps the conditional page-render chain in App.tsx and plays
 * a short "mascot cat dashing across the screen" overlay animation whenever
 * the active page changes. The actual page content swap happens mid-animation
 * (around ~200ms in) while a cream veil fully covers the viewport, hiding the
 * React unmount/mount flash.
 *
 * Design notes:
 * - CSS-only animation (keyframes live in index.css) to avoid a framer-motion
 *   dependency; we just need two elements moving in a coordinated way.
 * - Direction-aware: the cat sweeps left->right for a "forward" nav (tab index
 *   increasing) and right->left for a "back" nav, based on PAGE_ORDER.
 * - Respects `prefers-reduced-motion`: the whole animation is bypassed and the
 *   new page swaps in immediately, matching the OS accessibility setting.
 * - Same-page re-renders (e.g. simulation state updates on Settings) pass
 *   through without triggering the transition.
 */

interface PageTransitionProps {
  pageKey: Page
  children: ReactNode
}

const DURATION_MS = 900
const SWAP_AT_MS = 360

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function directionBetween(from: Page, to: Page): 'ltr' | 'rtl' {
  const fromIdx = PAGE_ORDER.indexOf(from)
  const toIdx = PAGE_ORDER.indexOf(to)
  return toIdx >= fromIdx ? 'ltr' : 'rtl'
}

export default function PageTransition({ pageKey, children }: PageTransitionProps) {
  const [transitioning, setTransitioning] = useState(false)
  const [displayedChildren, setDisplayedChildren] = useState<ReactNode>(() => children)
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
  const prevKey = useRef(pageKey)

  // Same-page re-renders (page state unchanged) pass through instantly so
  // simulation state changes, config edits, etc. do not trigger the animation.
  if (pageKey === prevKey.current && !transitioning && displayedChildren !== children) {
    setDisplayedChildren(children)
  }

  useEffect(() => {
    if (pageKey === prevKey.current) return

    const fromKey = prevKey.current
    prevKey.current = pageKey

    if (prefersReducedMotion()) {
      setDisplayedChildren(children)
      return
    }

    setDirection(directionBetween(fromKey, pageKey))
    setTransitioning(true)

    const swapTimer = window.setTimeout(() => {
      setDisplayedChildren(children)
    }, SWAP_AT_MS)

    const endTimer = window.setTimeout(() => {
      setTransitioning(false)
    }, DURATION_MS)

    return () => {
      window.clearTimeout(swapTimer)
      window.clearTimeout(endTimer)
    }
    // `children` is intentionally not in deps: same-page re-renders are
    // handled by the synchronous check above. We only want the transition
    // to fire when `pageKey` actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  return (
    <>
      {displayedChildren}
      {transitioning && <CatSweepOverlay direction={direction} />}
    </>
  )
}

interface CatSweepOverlayProps {
  direction: 'ltr' | 'rtl'
}

function CatSweepOverlay({ direction }: CatSweepOverlayProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {/* Cream veil: full-screen radial gradient fade that hides the moment
          React swaps the page content underneath. */}
      <div className="page-veil absolute inset-0" />

      {/* Mascot: dashes horizontally across the viewport. Absolute positioning
          with top-1/2 + the translate anchored in the keyframes. */}
      <img
        src={catUrl}
        alt=""
        className={[
          'absolute left-0 top-1/2',
          'h-[160px] w-auto select-none',
          'drop-shadow-[0_8px_16px_rgba(251,146,60,0.25)]',
          direction === 'ltr' ? 'cat-sweep-ltr' : 'cat-sweep-rtl',
        ].join(' ')}
      />
    </div>
  )
}
