import 'react-i18next'
import type common from './locales/zh-TW/common.json'
import type nav from './locales/zh-TW/nav.json'
import type settings from './locales/zh-TW/settings.json'
import type eventLog from './locales/zh-TW/eventLog.json'
import type events from './locales/zh-TW/events.json'
import type errors from './locales/zh-TW/errors.json'
import type scenarios from './locales/zh-TW/scenarios.json'
import type results from './locales/zh-TW/results.json'
import type about from './locales/zh-TW/about.json'
import type learn from './locales/zh-TW/learn.json'
import type howItWorks from './locales/zh-TW/howItWorks.json'
import type playback from './locales/zh-TW/playback.json'
import type learnMode from './locales/zh-TW/learnMode.json'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      nav: typeof nav
      settings: typeof settings
      eventLog: typeof eventLog
      events: typeof events
      errors: typeof errors
      scenarios: typeof scenarios
      results: typeof results
      about: typeof about
      learn: typeof learn
      howItWorks: typeof howItWorks
      playback: typeof playback
      learnMode: typeof learnMode
    }
  }
}
