import { useEffect, useRef } from 'react'

/**
 * Document-level keyboard shortcuts with input-focus protection.
 *
 * Takes a map of `KeyboardEvent.key` to handler. Listeners are installed on
 * `document` so they fire regardless of which scene element is focused, but
 * the dispatch short-circuits whenever the current `document.activeElement`
 * is a text input, a textarea, a <select>, or a contenteditable surface —
 * otherwise typing a space in the Event Log search box would pause Playback.
 *
 * Chord combinations (Cmd / Ctrl / Alt) are ignored so the shortcuts never
 * collide with OS-level window controls (Cmd+W, Ctrl+F, etc.). Shift is
 * allowed through, but the map keys are case-sensitive so shortcuts that
 * want Shift should use the uppercase letter.
 *
 * The hook uses refs for both the map and the `enabled` flag so re-renders
 * that change handlers don't tear down the listener.
 */

export type ShortcutHandler = (e: KeyboardEvent) => void
export type ShortcutMap = Record<string, ShortcutHandler>

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((target as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(
  map: ShortcutMap,
  enabled: boolean = true,
): void {
  const mapRef = useRef(map)
  const enabledRef = useRef(enabled)
  mapRef.current = map
  enabledRef.current = enabled

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) {
        return
      }
      const handler = mapRef.current[e.key]
      if (handler) handler(e)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
