import { useTranslation } from 'react-i18next'
import type { AppLocale } from '@i18n/index'
import { SUPPORTED_LOCALES } from '@i18n/index'

const LABELS: Record<AppLocale, string> = {
  'zh-TW': '繁中',
  en: 'EN',
}

function resolveLocale(raw: string | undefined): AppLocale {
  if (raw === 'zh-TW' || raw === 'en') return raw
  return 'en'
}

function nextLocale(current: AppLocale): AppLocale {
  const idx = SUPPORTED_LOCALES.indexOf(current)
  return SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length]
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = resolveLocale(i18n.resolvedLanguage ?? i18n.language)
  const next = nextLocale(current)

  function handleToggle() {
    void i18n.changeLanguage(next)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`${LABELS[current]} → ${LABELS[next]}`}
      aria-label={`Switch language to ${LABELS[next]}`}
      className="no-drag inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 active:bg-orange-100 dark:active:bg-bark-500 transition-colors"
    >
      <span className="text-[13px] leading-none">🌐</span>
      <span>{LABELS[current]}</span>
    </button>
  )
}
