import type { i18n as I18nInstance } from 'i18next'

export function registerFormatters(i18n: I18nInstance): void {
  const formatter = i18n.services.formatter
  if (!formatter) return

  formatter.add('percent', (value, lng) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
    return new Intl.NumberFormat(lng ?? 'en', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value)
  })

  formatter.add('integer', (value, lng) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
    return new Intl.NumberFormat(lng ?? 'en', { maximumFractionDigits: 0 }).format(value)
  })

  formatter.add('decimal2', (value, lng) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
    return new Intl.NumberFormat(lng ?? 'en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  })
}
