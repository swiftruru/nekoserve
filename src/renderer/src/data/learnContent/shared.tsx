import type { Page } from '../../types'

// ── Small style components shared across locale variants ──

export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-l-2 border-amber-400 dark:border-amber-600 px-3 py-2 rounded-r-lg my-2 font-mono text-sm text-amber-800 dark:text-amber-200 select-text">
      {children}
    </div>
  )
}

export function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-300 dark:border-blue-600 px-3 py-2 rounded-r-lg my-2 text-sm text-blue-700 dark:text-blue-200 select-text">
      {children}
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/30 border-l-2 border-orange-300 dark:border-orange-600 px-3 py-2 rounded-r-lg my-2 text-sm text-orange-700 dark:text-orange-200 select-text">
      {children}
    </div>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 dark:text-bark-200 leading-relaxed my-1.5 select-text">{children}</p>
}

export function B({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-orange-700 dark:text-orange-400">{children}</span>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="text-sm text-gray-600 dark:text-bark-200 leading-relaxed my-1.5 space-y-1 pl-4 select-text">{children}</ul>
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li className="list-disc">{children}</li>
}

/**
 * Citation link styled like the ParamRationale reference list: dotted amber
 * underline, opens in the default browser via Electron's window-open handler.
 */
export function Ref({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-amber-700 dark:text-amber-400 underline decoration-amber-300 dark:decoration-amber-600 decoration-dotted underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 hover:decoration-solid"
    >
      {children}
    </a>
  )
}

// ── Types ──

export interface LearnSection {
  id: string
  icon: string
  title: string
  content: React.ReactNode
}

export type LearnContent = Record<Page, LearnSection[]>
