import type { EventLogItem, EventType } from '../types'
import EventLogTable from '../components/EventLogTable'

interface EventLogPageProps {
  eventLog: EventLogItem[]
  initialFilter?: EventType[]
}

export default function EventLogPage({ eventLog, initialFilter }: EventLogPageProps) {
  return (
    <div className="page-container">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-orange-700">事件紀錄</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          完整的模擬事件時間序列，依模擬時間排序。可依類型篩選或關鍵字搜尋。
        </p>
      </div>
      <EventLogTable events={eventLog} initialFilter={initialFilter} />
    </div>
  )
}
