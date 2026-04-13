import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Page } from '../types'
import { getLearnContent } from '../data/learnContent'

interface LearningPanelProps {
  page: Page
  onClose: () => void
}

export default function LearningPanel({ page, onClose }: LearningPanelProps) {
  const { t, i18n } = useTranslation(['learn', 'nav'])
  const learnContent = getLearnContent(i18n.resolvedLanguage ?? i18n.language)
  const sections = learnContent[page] ?? []

  // Which section is currently expanded. Starts as the first section's id
  // so the panel shows something useful the moment it opens. When the user
  // toggles a section off we allow openId to become '' (all collapsed).
  const [openId, setOpenId] = useState<string>(() => sections[0]?.id ?? '')

  // When the active app page changes, reset the expanded section back to
  // the new page's first section. Without this the sidebar would appear
  // empty when switching pages if the previous openId does not exist in
  // the new page's section list.
  useEffect(() => {
    setOpenId(learnContent[page]?.[0]?.id ?? '')
    // We intentionally only depend on `page`; `learnContent` is a stable
    // reference per locale and we don't want locale changes to re-open
    // a section the user already collapsed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? '' : id))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <span className="text-sm font-semibold text-orange-700">{t('learn:title')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg
                     text-orange-500 hover:bg-orange-100 hover:text-orange-700
                     active:bg-orange-200 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-orange-400"
          aria-label={t('learn:closeAria')}
          title={t('learn:closeAria')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* ── Page context label ───────────────────────── */}
      <div className="px-4 py-2 bg-orange-50/60 border-b border-orange-100 flex-shrink-0">
        <span className="text-xs text-orange-500 font-medium">
          {t('learn:contextLabel', { page: t(`nav:${page}` as const) })}
        </span>
      </div>

      {/* ── Accordion list ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto learn-panel-scroll">
        {sections.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{t('learn:empty')}</p>
        ) : (
          <div className="divide-y divide-orange-50">
            {sections.map((section) => {
              const isOpen = openId === section.id
              return (
                <div key={section.id}>
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggle(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 ${
                      isOpen
                        ? 'bg-orange-50 text-orange-700'
                        : 'hover:bg-orange-50/50 text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span>{section.icon}</span>
                      <span>{section.title}</span>
                    </span>
                    <span
                      className={`text-xs transition-transform duration-200 ${
                        isOpen ? 'rotate-90 text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-white">
                      {section.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-orange-100 bg-orange-50/40 flex-shrink-0">
        <p className="text-xs text-gray-400 leading-relaxed">
          {t('learn:footer')}
        </p>
      </div>
    </div>
  )
}
