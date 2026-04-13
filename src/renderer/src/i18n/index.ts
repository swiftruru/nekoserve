import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhTW_common from './locales/zh-TW/common.json'
import zhTW_nav from './locales/zh-TW/nav.json'
import zhTW_settings from './locales/zh-TW/settings.json'
import zhTW_eventLog from './locales/zh-TW/eventLog.json'
import zhTW_events from './locales/zh-TW/events.json'
import zhTW_errors from './locales/zh-TW/errors.json'
import zhTW_scenarios from './locales/zh-TW/scenarios.json'
import zhTW_results from './locales/zh-TW/results.json'
import zhTW_about from './locales/zh-TW/about.json'
import zhTW_learn from './locales/zh-TW/learn.json'

import en_common from './locales/en/common.json'
import en_nav from './locales/en/nav.json'
import en_settings from './locales/en/settings.json'
import en_eventLog from './locales/en/eventLog.json'
import en_events from './locales/en/events.json'
import en_errors from './locales/en/errors.json'
import en_scenarios from './locales/en/scenarios.json'
import en_results from './locales/en/results.json'
import en_about from './locales/en/about.json'
import en_learn from './locales/en/learn.json'

import { registerFormatters } from './formatters'

export type AppLocale = 'zh-TW' | 'en'

export const SUPPORTED_LOCALES: AppLocale[] = ['zh-TW', 'en']
export const STORAGE_KEY = 'nekoserve:locale'

export const defaultNS = 'common'
export const namespaces = [
  'common',
  'nav',
  'settings',
  'eventLog',
  'events',
  'errors',
  'scenarios',
  'results',
  'about',
  'learn',
] as const

export const resources = {
  'zh-TW': {
    common: zhTW_common,
    nav: zhTW_nav,
    settings: zhTW_settings,
    eventLog: zhTW_eventLog,
    events: zhTW_events,
    errors: zhTW_errors,
    scenarios: zhTW_scenarios,
    results: zhTW_results,
    about: zhTW_about,
    learn: zhTW_learn,
  },
  en: {
    common: en_common,
    nav: en_nav,
    settings: en_settings,
    eventLog: en_eventLog,
    events: en_events,
    errors: en_errors,
    scenarios: en_scenarios,
    results: en_results,
    about: en_about,
    learn: en_learn,
  },
} as const

function normalizeLocale(raw: string | null | undefined): AppLocale {
  if (!raw) return 'en'
  const lower = raw.toLowerCase().replace('_', '-')
  if (lower.startsWith('zh')) return 'zh-TW'
  return 'en'
}

function pickInitialLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-TW' || stored === 'en') return stored
  } catch {
    /* localStorage unavailable — fall through */
  }
  const fromMain =
    typeof window !== 'undefined'
      ? (window as Window & { electronAPI?: { initialLocale?: string } }).electronAPI?.initialLocale
      : undefined
  return normalizeLocale(fromMain)
}

const initialLocale = pickInitialLocale()

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: 'en',
  defaultNS,
  ns: namespaces as unknown as string[],
  resources,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
})

registerFormatters(i18n)

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocale
}

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
  // Keep the Electron main-process menu + About dialog in sync with the UI.
  try {
    ;(
      window as Window & {
        electronAPI?: { notifyLocaleChanged?: (locale: string) => void }
      }
    ).electronAPI?.notifyLocaleChanged?.(lng)
  } catch {
    /* ignore — preload may not yet expose the bridge in some tests */
  }
})

export default i18n
