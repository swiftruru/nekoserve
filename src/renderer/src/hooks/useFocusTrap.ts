import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface FocusTrapOptions {
  initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Traps keyboard focus inside a container while `active` is true.
 * - Saves the previously-focused element on activation
 * - Moves focus to `initialFocusRef` (or the first focusable child)
 * - Wraps Tab / Shift+Tab within the container
 * - Restores focus to the saved element on deactivation
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options?: FocusTrapOptions,
): void {
  const previousFocusRef = useRef<Element | null>(null)

  // Save / restore focus on activation / deactivation
  useEffect(() => {
    if (!active) return

    previousFocusRef.current = document.activeElement

    // Small delay so the DOM has rendered the container contents
    const timer = setTimeout(() => {
      const container = containerRef.current
      if (!container) return

      if (options?.initialFocusRef?.current) {
        options.initialFocusRef.current.focus()
      } else {
        const first = container.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      }
    }, 16)

    return () => {
      clearTimeout(timer)
      // Restore focus when deactivating
      const prev = previousFocusRef.current
      if (prev && prev instanceof HTMLElement) {
        prev.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Tab wrapping
  useEffect(() => {
    if (!active) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
