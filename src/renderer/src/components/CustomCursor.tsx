import { useEffect, useRef, useState } from 'react'
import { useMousePosition } from '../hooks/useMousePosition'
import nekoPawArrowHover from '@assets/cursors/neko-paw-arrow-hover.png'

/**
 * Hover-only cat companion sprite.
 *
 * The full custom-cursor replacement turned out to be unreliable across
 * platforms (sync drift on Windows, focus/leave edge cases), so the native
 * OS cursor stays on for normal use. This component keeps just the
 * delightful part: a small cat sprite that appears alongside the native
 * pointer when it hovers an interactive element.
 *
 * - Position is written via `requestAnimationFrame` into a `translate3d`
 *   transform — no React re-renders on mouse move.
 * - `pointer-events: none` ensures the overlay never intercepts clicks.
 * - Offset from the pointer so the native arrow remains visible.
 */

const SPRITE_SIZE = 40
// Pixel offset so the cat sits below-right of the native arrow tip instead
// of overlapping it.
const OFFSET_X = 14
const OFFSET_Y = 14

const INTERACTIVE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]:not([disabled])',
  '[data-cursor="pointer"]',
].join(', ')

export default function CustomCursor() {
  const { positionRef, insideWindowRef } = useMousePosition()
  const rootRef = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)
  const [pressing, setPressing] = useState(false)

  useEffect(() => {
    let frameId = 0
    const render = () => {
      const el = rootRef.current
      if (el) {
        const show = hovering && insideWindowRef.current
        el.style.opacity = show ? '1' : '0'
        const { x, y } = positionRef.current
        el.style.transform = `translate3d(${x + OFFSET_X}px, ${y + OFFSET_Y}px, 0)`
      }
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [positionRef, insideWindowRef, hovering])

  useEffect(() => {
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) {
        setHovering(false)
        return
      }
      setHovering(target.closest(INTERACTIVE_SELECTORS) !== null)
    }
    document.addEventListener('pointerover', onPointerOver)
    return () => document.removeEventListener('pointerover', onPointerOver)
  }, [])

  useEffect(() => {
    const onDown = () => setPressing(true)
    const onUp = () => setPressing(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    window.addEventListener('blur', onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      window.removeEventListener('blur', onUp)
    }
  }, [])

  const scale = pressing ? 0.88 : 1.05

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      style={{ transition: 'opacity 120ms ease-out', opacity: 0 }}
    >
      <img
        src={nekoPawArrowHover}
        alt=""
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        draggable={false}
        className="block select-none"
        style={{
          imageRendering: 'pixelated',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          transition: 'transform 120ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          filter: 'drop-shadow(0 2px 6px rgba(251, 146, 60, 0.45))',
        }}
      />
    </div>
  )
}
