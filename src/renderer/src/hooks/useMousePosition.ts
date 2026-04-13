import { useEffect, useRef, type MutableRefObject } from 'react'

/**
 * High-frequency mouse position tracker.
 *
 * Returns a `ref` (not React state) pointing at the latest `{ x, y }` in
 * viewport coordinates. Using a ref is deliberate: `mousemove` fires 60-120
 * times per second and a `useState` update on every fire would flood React's
 * reconciler and drop frames. Consumers should read `positionRef.current`
 * inside their own `requestAnimationFrame` loop.
 *
 * Also exposes an `insideWindowRef` boolean ref that flips to `false` when
 * the pointer leaves the viewport (via `mouseleave` on `<html>`) and back to
 * `true` on `mouseenter`. Consumers that need to hide / show the custom
 * cursor can read this each frame without re-rendering.
 *
 * @example
 * ```tsx
 * function CustomCursor() {
 *   const position = useMousePosition()
 *   useEffect(() => {
 *     let id = 0
 *     const loop = () => {
 *       const { x, y } = position.current
 *       // ... write to DOM ...
 *       id = requestAnimationFrame(loop)
 *     }
 *     id = requestAnimationFrame(loop)
 *     return () => cancelAnimationFrame(id)
 *   }, [position])
 *   // ...
 * }
 * ```
 */
export interface MousePosition {
  x: number
  y: number
}

export interface UseMousePositionResult {
  positionRef: MutableRefObject<MousePosition>
  insideWindowRef: MutableRefObject<boolean>
}

export function useMousePosition(): UseMousePositionResult {
  const positionRef = useRef<MousePosition>({ x: -9999, y: -9999 })
  const insideWindowRef = useRef<boolean>(true)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      positionRef.current.x = e.clientX
      positionRef.current.y = e.clientY
    }
    const onLeave = () => {
      insideWindowRef.current = false
    }
    const onEnter = () => {
      insideWindowRef.current = true
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    // `mouseleave` on the root element fires only when the pointer crosses
    // the window boundary, not when it moves between children.
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  return { positionRef, insideWindowRef }
}
