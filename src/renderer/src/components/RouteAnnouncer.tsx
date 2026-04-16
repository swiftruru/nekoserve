import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Page } from '../types'

interface RouteAnnouncerProps {
  page: Page
}

/**
 * Visually-hidden live region that announces page changes to screen readers.
 */
export default function RouteAnnouncer({ page }: RouteAnnouncerProps) {
  const { t } = useTranslation(['common', 'nav'])
  const [announcement, setAnnouncement] = useState('')
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Don't announce on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      const pageName = t(`nav:${page}` as const)
      setAnnouncement(t('common:a11y.navigatedTo', { page: pageName }))
    }, 100)

    return () => clearTimeout(timer)
  }, [page, t])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
