import { LEARN_CONTENT_ZH_TW } from './zh-TW'
import { LEARN_CONTENT_EN } from './en'
import type { LearnContent } from './shared'

export type { LearnContent, LearnSection } from './shared'

/**
 * Pick the learn-sidebar content tree for the given UI language.
 * Unknown locales fall back to English.
 */
export function getLearnContent(locale: string | undefined): LearnContent {
  if (locale && locale.toLowerCase().startsWith('zh')) {
    return LEARN_CONTENT_ZH_TW
  }
  return LEARN_CONTENT_EN
}
