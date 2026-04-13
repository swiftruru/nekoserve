import { useEffect, useRef, useState } from 'react'
import { useMousePosition } from '../hooks/useMousePosition'
import nekoPawArrow from '@assets/cursors/neko-paw-arrow.png'
import nekoPawArrowHover from '@assets/cursors/neko-paw-arrow-hover.png'

/**
 * In-window custom cursor system.
 *
 * Design contract:
 * - Document-wide `mousemove` updates a `ref` (never React state), and a
 *   `requestAnimationFrame` loop writes the position into the cursor DOM
 *   node via `transform: translate3d(...)`. Zero React re-renders per
 *   mouse movement.
 * - The OS native cursor is hidden through CSS (`html, body { cursor: none }`
 *   in index.css). Inputs, selectable text, and disabled elements keep
 *   their native cursors via CSS exceptions, and this component also hides
 *   itself whenever the pointer is over an input / selectable / drag-region
 *   element so the native cursor can shine through without overlap.
 * - `pointer-events: none` on the root guarantees the overlay never
 *   intercepts clicks.
 * - The hotspot (where the OS click actually lands) is defined per sprite
 *   in the `THEMES` config below. The sprite is translated by
 *   `(cursor_x - hotspot.x, cursor_y - hotspot.y)` so that the visual tip
 *   aligns with the click coordinate.
 */

interface CursorTheme {
  name: string
  /** Default sprite shown while moving over inert content. */
  defaultSprite: string
  /** Sprite swapped in when hovering an interactive element. Optional. */
  hoverSprite?: string
  /** Display size in CSS pixels for the default sprite. */
  defaultSize: number
  /** Display size in CSS pixels for the hover sprite (may differ). */
  hoverSize: number
  /** Hotspot (display-pixel offset from sprite top-left) for default sprite. */
  defaultHotspot: { x: number; y: number }
  /** Hotspot for hover sprite. Must align with defaultHotspot visually. */
  hoverHotspot: { x: number; y: number }
}

const THEMES: Record<string, CursorTheme> = {
  'neko-paw': {
    name: 'Neko Paw',
    defaultSprite: nekoPawArrow,
    hoverSprite: nekoPawArrowHover,
    defaultSize: 48,
    hoverSize: 64,
    // Source image was crop-trimmed via PIL's getbbox(), which places the
    // topmost-leftmost opaque pixel at coordinate (0, 0) by construction.
    // For the pixel-art arrow that opaque pixel IS the cursor tip, and for
    // the cat sprite it is the left-ear tip. Keeping both at (0, 0) means
    // the click point does not jump when we swap sprites on hover.
    defaultHotspot: { x: 0, y: 0 },
    hoverHotspot: { x: 0, y: 0 },
  },
}

const ACTIVE_THEME: keyof typeof THEMES = 'neko-paw'

/**
 * CSS selectors for elements where the custom cursor should hide and let
 * the native cursor take over. Kept as a single source of truth so future
 * additions (new form fields, etc.) only touch this list.
 *
 * - inputs / textareas / selects / contenteditable: text cursor
 * - [data-selectable]: copy-paste regions (event log cells, etc.)
 * - .drag-region: macOS title-bar drag zone
 */
const NATIVE_CURSOR_SELECTORS = [
  'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-selectable]',
  '.drag-region',
].join(', ')

/**
 * CSS selectors for interactive elements that should trigger the "hover"
 * cursor state (scale + sprite swap + subtle glow).
 */
const INTERACTIVE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]:not([disabled])',
  '[data-cursor="pointer"]',
].join(', ')

export default function CustomCursor() {
  const theme = THEMES[ACTIVE_THEME]
  const { positionRef, insideWindowRef } = useMousePosition()
  const rootRef = useRef<HTMLDivElement>(null)
  const defaultSpriteRef = useRef<HTMLImageElement>(null)
  const hoverSpriteRef = useRef<HTMLImageElement>(null)

  // Low-frequency UI state (swapped via pointerover, not mousemove)
  const [hovering, setHovering] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [overNative, setOverNative] = useState(false)
  const [visible, setVisible] = useState(true)

  // ── rAF render loop: write position to the DOM every frame ──
  useEffect(() => {
    let frameId = 0
    const render = () => {
      const el = rootRef.current
      if (el) {
        // Hide outside the window
        if (!insideWindowRef.current) {
          el.style.opacity = '0'
        } else if (visible && !overNative) {
          el.style.opacity = '1'
        } else {
          el.style.opacity = '0'
        }
        const { x, y } = positionRef.current
        // translate3d forces a GPU compositing layer, avoiding paint /
        // layout work on every frame.
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [positionRef, insideWindowRef, visible, overNative])

  // ── pointerover: decide whether the element under the pointer is
  //    interactive / a native-cursor region / something else. pointerover
  //    fires only when the target changes, so this is cheap. ──
  useEffect(() => {
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) {
        setHovering(false)
        setOverNative(false)
        return
      }
      const isNative = target.closest(NATIVE_CURSOR_SELECTORS) !== null
      setOverNative(isNative)
      if (isNative) {
        setHovering(false)
        return
      }
      setHovering(target.closest(INTERACTIVE_SELECTORS) !== null)
    }
    document.addEventListener('pointerover', onPointerOver)
    return () => document.removeEventListener('pointerover', onPointerOver)
  }, [])

  // ── Click feedback: short press state on mousedown/mouseup ──
  useEffect(() => {
    const onDown = () => setPressing(true)
    const onUp = () => setPressing(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    window.addEventListener('blur', onUp) // release if window loses focus
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      window.removeEventListener('blur', onUp)
    }
  }, [])

  // ── Show / hide when the pointer crosses the window boundary ──
  useEffect(() => {
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)
    return () => {
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  // ── Layer selection: default vs hover sprite. ──
  // Both sprites are rendered but only one is opaque at a time; CSS
  // transitions handle the fade. This avoids image-load flicker on hover.
  const useHoverSprite = hovering && Boolean(theme.hoverSprite)

  // Compound transform for the inner wrapper: hotspot offset + scale.
  // - Default: translate by -hotspot to align the sprite's hotspot with the
  //   parent's (0, 0), which is at the mouse position.
  // - Hover: scale up slightly (feedback).
  // - Pressing: scale down slightly (click feedback).
  const baseScale = pressing ? 0.88 : hovering ? 1.12 : 1

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      style={{
        transition: 'opacity 80ms ease-out',
        opacity: 0, // rAF loop takes over immediately
      }}
    >
      {/* Wrapper holds the hotspot offset and the scale transform */}
      <div
        className="relative"
        style={{
          transform: `translate(${-theme.defaultHotspot.x}px, ${-theme.defaultHotspot.y}px) scale(${baseScale})`,
          transformOrigin: `${theme.defaultHotspot.x}px ${theme.defaultHotspot.y}px`,
          transition: 'transform 120ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {/* Default sprite */}
        <img
          ref={defaultSpriteRef}
          src={theme.defaultSprite}
          alt=""
          width={theme.defaultSize}
          height={theme.defaultSize}
          draggable={false}
          className="block select-none"
          style={{
            imageRendering: 'pixelated',
            opacity: useHoverSprite ? 0 : 1,
            transition: 'opacity 120ms ease-out',
            filter: hovering
              ? 'drop-shadow(0 2px 6px rgba(251, 146, 60, 0.35))'
              : 'drop-shadow(0 1px 2px rgba(124, 45, 18, 0.25))',
          }}
        />
        {/* Hover sprite stacked on top, fades in when hovering */}
        {theme.hoverSprite && (
          <img
            ref={hoverSpriteRef}
            src={theme.hoverSprite}
            alt=""
            width={theme.hoverSize}
            height={theme.hoverSize}
            draggable={false}
            className="absolute left-0 top-0 block select-none"
            style={{
              // The hover sprite uses its OWN hotspot. Shift it so its
              // hotspot coincides with the parent wrapper's (0, 0), which
              // is the default-sprite hotspot after the outer translate.
              transform: `translate(${theme.defaultHotspot.x - theme.hoverHotspot.x}px, ${theme.defaultHotspot.y - theme.hoverHotspot.y}px)`,
              imageRendering: 'pixelated',
              opacity: useHoverSprite ? 1 : 0,
              transition: 'opacity 140ms ease-out',
              filter: 'drop-shadow(0 3px 8px rgba(251, 146, 60, 0.45))',
            }}
          />
        )}
      </div>
    </div>
  )
}
