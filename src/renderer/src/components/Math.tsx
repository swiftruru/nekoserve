import { useMemo } from 'react'
import katex from 'katex'

interface MathProps {
  /** LaTeX source, e.g. `N = \\lambda \\times W` */
  formula: string
  /**
   * Extra Tailwind classes for the wrapper.
   * Inline math is rendered inside a span; block math inside a div.
   */
  className?: string
}

/**
 * Compile LaTeX once per render with KaTeX and inject the resulting HTML.
 * Handles bad input gracefully: on parse error, falls back to the raw
 * formula string wrapped in a tooltip showing the error, so a typo in
 * classroom content cannot blank out the whole page.
 */
function compile(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: 'ignore',
      trust: false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `<span class="text-red-500 font-mono text-xs" title="${msg.replace(/"/g, '&quot;')}">${formula}</span>`
  }
}

/**
 * Inline LaTeX math, rendered with KaTeX. Usage:
 *   <InlineMath formula="\\lambda = 1 / \\bar T" />
 *
 * Flows with surrounding text at the current font size.
 */
export function InlineMath({ formula, className }: MathProps) {
  const html = useMemo(() => compile(formula, false), [formula])
  return (
    <span
      className={className}
      // The HTML comes from KaTeX itself (trusted; we set trust: false above
      // to reject any user-provided \href etc.), so dangerouslySetInnerHTML is safe.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Display-mode LaTeX math, rendered as a centered block. Usage:
 *   <BlockMath formula="\\rho = \\frac{\\lambda}{\\mu \\, c}" />
 *
 * Ideal for standalone formulas in learning content.
 */
export function BlockMath({ formula, className }: MathProps) {
  const html = useMemo(() => compile(formula, true), [formula])
  return (
    <div
      className={[
        'my-2 bg-amber-50 border-l-2 border-amber-400 rounded-r-lg px-3 py-2 overflow-x-auto select-text',
        className ?? '',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
