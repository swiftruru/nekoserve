import { useTranslation } from 'react-i18next'
import type { EventLogItem, EventType } from '../types'
import EventLogTable from '../components/EventLogTable'

interface EventLogPageProps {
  eventLog: EventLogItem[]
  initialFilter?: EventType[]
  /** Shared playback cursor — drives row highlight + auto-scroll. */
  highlightTime?: number
  /** Click handler for a row: seeks Playback to the row's timestamp. */
  onRowClick?: (timestamp: number) => void
}

export default function EventLogPage({
  eventLog,
  initialFilter,
  highlightTime,
  onRowClick,
}: EventLogPageProps) {
  const { t } = useTranslation('results')
  return (
    <div className="page-container">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-orange-700 dark:text-orange-400">{t('results:eventLog.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-bark-300 mt-0.5">
          {t('results:eventLog.description')}
        </p>
      </div>
      <EventLogTable
        events={eventLog}
        initialFilter={initialFilter}
        highlightTime={highlightTime}
        onRowClick={onRowClick}
      />
    </div>
  )
}
