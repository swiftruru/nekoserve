import type { Page } from '../../types'

// ── Small style components shared across locale variants ──

export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border-l-2 border-amber-400 px-3 py-2 rounded-r-lg my-2 font-mono text-sm text-amber-800 select-text">
      {children}
    </div>
  )
}

export function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border-l-2 border-blue-300 px-3 py-2 rounded-r-lg my-2 text-sm text-blue-700 select-text">
      {children}
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-50 border-l-2 border-orange-300 px-3 py-2 rounded-r-lg my-2 text-sm text-orange-700 select-text">
      {children}
    </div>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed my-1.5 select-text">{children}</p>
}

export function B({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-orange-700">{children}</span>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="text-sm text-gray-600 leading-relaxed my-1.5 space-y-1 pl-4 select-text">{children}</ul>
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li className="list-disc">{children}</li>
}

// ── Types ──

export interface LearnSection {
  id: string
  icon: string
  title: string
  content: React.ReactNode
}

export type LearnContent = Record<Page, LearnSection[]>
