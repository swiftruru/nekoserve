import { useState } from 'react'
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
  // Track which section is open; default to first
  const [openId, setOpenId] = useState<string>(() => sections[0]?.id ?? '')

  const firstId = sections[0]?.id ?? ''

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
          className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          aria-label={t('learn:closeAria')}
        >
          ×
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
              const isOpen = openId === section.id || (openId === '' && section.id === firstId)
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
