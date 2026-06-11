import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

/**
 * Shared drag behaviour for the threshold line, used by both LiveHistogram
 * and CdfChart so the line drags identically in every panel.
 *
 * The handlers attach to a (usually transparent, widened) hit-area element
 * inside the SVG. On pointer-down we capture the pointer so move/up keep
 * firing even if the cursor slides off the thin line. Each chart supplies
 * its own `pxToValue` (the inverse of its x-scale) because the histogram
 * and CDF can have different x-domains; both then clamp to the same metric
 * `bounds` and write through the same `onChange` so the store stays the
 * single source of truth.
 *
 * When `enabled` is false the handlers no-op, so a chart can opt out and
 * stay read-only (e.g. small-multiples) without branching at the call site.
 */
export interface ThresholdBounds {
  min?: number
  max?: number
}

interface UseThresholdDragParams {
  svgRef: RefObject<SVGSVGElement | null>
  /** viewBox width of the SVG (e.g. CHART_W). */
  chartWidth: number
  /** Convert a viewBox x-coordinate into a metric value (inverse x-scale). */
  pxToValue: (userX: number) => number
  bounds: ThresholdBounds
  onChange: (value: number) => void
  enabled: boolean
}

export interface ThresholdDragHandlers {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
}

export function useThresholdDrag({
  svgRef,
  chartWidth,
  pxToValue,
  bounds,
  onChange,
  enabled,
}: UseThresholdDragParams): { dragging: boolean; handlers: ThresholdDragHandlers } {
  const [dragging, setDragging] = useState(false)

  const clamp = (v: number): number => {
    let out = v
    if (bounds.min !== undefined && out < bounds.min) out = bounds.min
    if (bounds.max !== undefined && out > bounds.max) out = bounds.max
    return out
  }

  const valueFromClientX = (clientX: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return null
    const userX = ((clientX - rect.left) / rect.width) * chartWidth
    return clamp(pxToValue(userX))
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!enabled) return
    e.stopPropagation()
    e.preventDefault()
    try {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } catch {
      /* setPointerCapture can throw if the pointer is already gone; ignore. */
    }
    setDragging(true)
    const v = valueFromClientX(e.clientX)
    if (v !== null) onChange(v)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!enabled || !dragging) return
    const v = valueFromClientX(e.clientX)
    if (v !== null) onChange(v)
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!dragging) return
    try {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    setDragging(false)
  }

  return { dragging, handlers: { onPointerDown, onPointerMove, onPointerUp } }
}
