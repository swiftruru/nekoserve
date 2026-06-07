import { useRpaCursorStore } from '../store/rpaCursorStore'

/**
 * Floating "robot cursor" that slides between targets during an RPA
 * sweep demo. Driven entirely by the rpaCursorStore: the sweep runner
 * pushes (x, y, label) updates, this component re-renders with a CSS
 * transition for the position.
 *
 * Mount once at App.tsx root so it lives above every page AND every
 * modal (z-index 99999). pointer-events: none, so it never steals
 * clicks from anything underneath.
 *
 * The SVG mimics the macOS pointer arrow with a soft drop-shadow so
 * it reads on both light and dark sections.
 */

const TRANSITION = 'left 650ms cubic-bezier(0.4, 0, 0.2, 1), top 650ms cubic-bezier(0.4, 0, 0.2, 1)'

export default function RpaFakeCursor() {
  const { x, y, visible, label } = useRpaCursorStore()

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 99999,
        pointerEvents: 'none',
        transition: TRANSITION,
        // Anchor the arrow tip at (x, y) by shifting the SVG so its
        // tip pixel is at top-left of the host div.
        transform: 'translate(-2px, -2px)',
      }}
      data-testid="rpa-fake-cursor"
    >
      <svg width="22" height="28" viewBox="0 0 22 28" style={{ filter: 'drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.45))' }}>
        {/* Classic macOS-style pointer arrow */}
        <path
          d="M 2 2 L 2 22 L 7 17 L 11 26 L 14 25 L 10 16 L 18 16 Z"
          fill="#FFFFFF"
          stroke="#1F2937"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            top: 32,
            left: 8,
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#FFEDD5',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(251, 146, 60, 0.4)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
