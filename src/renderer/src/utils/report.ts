import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import ReportView from '../components/report/ReportView'
import type { SimulationResult } from '../types'

export interface ReportMeta {
  domainLabel: string
  scenarioLabel: string
  generatedAt: string
}

/** Serialize every same-origin stylesheet so the report HTML is self-contained. */
function collectCss(): string {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n'
    } catch {
      // Cross-origin sheet, cannot read rules. Skip.
    }
  }
  return css
}

function wrapHtml(inner: string, css: string, title: string): string {
  // No <meta CSP>: a content-security policy would block the inline <style>
  // and the recharts inline SVG styles when the offscreen PDF window loads it.
  return `<!doctype html>
<html lang="${i18n.language}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${css}</style>
<style>
  html, body { margin: 0; background: #ffffff; }
  body { display: flex; justify-content: center; padding: 16px 0; }
</style>
</head>
<body>${inner}</body>
</html>`
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Render ReportView offscreen, wait for charts + fonts, return full HTML doc. */
async function renderReportHTML(result: SimulationResult, meta: ReportMeta): Promise<string> {
  const container = document.createElement('div')
  // Must sit INSIDE the viewport (not parked offscreen): KPI/flow numbers use
  // an IntersectionObserver-driven count-up that only animates when visible, so
  // an offscreen element would freeze every number at 0. We keep it in-viewport
  // but fully invisible and non-interactive.
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.opacity = '0'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '-1'
  container.style.background = '#ffffff'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(ReportView, { result, ...meta }),
    ),
  )

  // Two frames for React commit + recharts ResponsiveContainer measurement,
  // then wait out the count-up + chart animations (≈600ms) so the serialized
  // DOM captures final numbers, then fonts so glyphs are embedded.
  await nextFrame()
  await nextFrame()
  await sleep(900)
  try {
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      await document.fonts.ready
    }
  } catch {
    // fonts API unavailable, proceed
  }

  const inner = container.innerHTML
  const css = collectCss()

  root.unmount()
  document.body.removeChild(container)

  return wrapHtml(inner, css, i18n.t('report:title'))
}

function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportReportHTML(result: SimulationResult, meta: ReportMeta): Promise<void> {
  const html = await renderReportHTML(result, meta)
  downloadHtml(html, `nekoserve-report-${Date.now()}.html`)
}

/** Returns true if the PDF was saved, false if cancelled / failed. */
export async function exportReportPDF(result: SimulationResult, meta: ReportMeta): Promise<boolean> {
  const html = await renderReportHTML(result, meta)
  return window.electronAPI.exportReportPDF(html)
}
