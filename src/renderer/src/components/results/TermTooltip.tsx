import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { splitByTerms } from '../../utils/glossary'

interface TermTooltipProps {
  termKey: string
  children: ReactNode
}

interface PopoverPosition {
  /** Center x of the trigger, clamped to viewport bounds. */
  centerX: number
  /** Screen y coordinate of the anchor point. */
  anchorY: number
  /** Whether the popover renders above or below its trigger. */
  placement: 'above' | 'below'
}

const POPOVER_MAX_W = 300
const POPOVER_EST_H = 130
const VIEWPORT_MARGIN = 12
const GAP = 8

/**
 * Inline glossary span. The popover renders into a React portal at
 * document.body level using `position: fixed`, so it escapes any
 * scrollable / overflow-hidden parent container. When there isn't
 * enough room above the trigger the popover flips to appear below
 * instead, so terms near the top of the viewport stay fully visible.
 *
 * Open/close is driven by mouseenter/mouseleave on the trigger plus
 * focus/blur for keyboard users. The popover itself has
 * `pointer-events: none` so the mouse crossing into it doesn't
 * trigger a mouseleave on the trigger.
 */
export function TermTooltip({ termKey, children }: TermTooltipProps) {
  const { t } = useTranslation('results')
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPosition | null>(null)

  const label = t(`glossary.terms.${termKey}.label`, { defaultValue: '' })
  const def = t(`glossary.terms.${termKey}.def`, { defaultValue: '' })

  useLayoutEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const spaceAbove = rect.top
    const spaceBelow = vh - rect.bottom
    const placement: 'above' | 'below' =
      spaceAbove >= POPOVER_EST_H + GAP || spaceAbove >= spaceBelow
        ? 'above'
        : 'below'
    const rawCenter = rect.left + rect.width / 2
    const halfW = POPOVER_MAX_W / 2
    const centerX = Math.max(
      halfW + VIEWPORT_MARGIN,
      Math.min(vw - halfW - VIEWPORT_MARGIN, rawCenter),
    )
    const anchorY = placement === 'above' ? rect.top - GAP : rect.bottom + GAP
    setPos({ centerX, anchorY, placement })
  }, [open])

  if (!label && !def) {
    return <>{children}</>
  }

  const openIt = () => setOpen(true)
  const closeIt = () => setOpen(false)

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  return (
    <>
      <span
        ref={triggerRef}
        className="term-tooltip"
        tabIndex={0}
        role="button"
        aria-label={label}
        onMouseEnter={openIt}
        onMouseLeave={closeIt}
        onFocus={openIt}
        onBlur={closeIt}
        onKeyDown={(e) => {
          if (e.key === 'Escape') closeIt()
        }}
      >
        {children}
      </span>
      {open && pos && portalTarget
        ? createPortal(
            <div
              className="term-tooltip-popover-portal"
              data-placement={pos.placement}
              style={{
                left: pos.centerX,
                ...(pos.placement === 'above'
                  ? { bottom: window.innerHeight - pos.anchorY }
                  : { top: pos.anchorY }),
              }}
              role="tooltip"
            >
              <span className="term-tooltip-label">📚 {label}</span>
              <span className="term-tooltip-def">{def}</span>
            </div>,
            portalTarget,
          )
        : null}
    </>
  )
}

/**
 * Split a plain string into segments and wrap every known term with a
 * `TermTooltip`. Text segments pass through unchanged. Consumers use
 * this to make existing i18n'd prose teach its own terminology
 * without refactoring the translation strings to use `<Trans>`.
 */
export function renderWithTerms(text: string): ReactNode[] {
  if (!text) return []
  const segments = splitByTerms(text)
  return segments.map((seg, i) => {
    if (seg.type === 'text') return seg.text
    return (
      <TermTooltip key={i} termKey={seg.termKey}>
        {seg.keyword}
      </TermTooltip>
    )
  })
}
