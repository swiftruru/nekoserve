import { useTranslation } from 'react-i18next'
import type { CafeState, CustomerRuntime } from '../../utils/replay'
import type { FocusTarget } from './CafeScene'

/**
 * Floating card that shows details about the seat or cat the user clicked
 * on. Positioned absolute inside the scene `.card`; click the backdrop or
 * the ✕ button to close.
 */

interface InspectPopoverProps {
  focus: FocusTarget
  state: CafeState
  onClose: () => void
}

export default function InspectPopover({
  focus,
  state,
  onClose,
}: InspectPopoverProps) {
  const { t } = useTranslation('playback')

  const content =
    focus.kind === 'seat'
      ? renderSeat(focus.slotIdx, state, t)
      : renderCat(focus.slotIdx, state, t)

  return (
    <div
      className="absolute bottom-4 right-4 z-10 w-64 rounded-xl
                 bg-white/95 backdrop-blur-sm border border-orange-200
                 shadow-[0_8px_24px_-8px_rgba(251,146,60,0.35)]
                 px-4 py-3"
      role="dialog"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
          {focus.kind === 'seat'
            ? t('playback:inspect.seatTitle', { n: focus.slotIdx + 1 })
            : t('playback:inspect.catTitle', { n: focus.slotIdx + 1 })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md
                     text-gray-400 hover:text-orange-600 hover:bg-orange-50
                     transition-colors"
          aria-label={t('playback:inspect.close')}
        >
          ✕
        </button>
      </div>
      {content}
    </div>
  )
}

type TFn = (key: string, values?: Record<string, unknown>) => string

function renderSeat(slotIdx: number, state: CafeState, t: TFn) {
  const seat = state.seats[slotIdx]
  if (!seat) return null
  if (seat.customerId === null) {
    return <p className="text-sm text-gray-500">{t('playback:inspect.seatEmpty')}</p>
  }
  const customer = state.customers[seat.customerId]
  return <CustomerDetails customer={customer} state={state} t={t} />
}

function renderCat(slotIdx: number, state: CafeState, t: TFn) {
  const cat = state.cats[slotIdx]
  if (!cat) return null
  if (cat.state === 'idle') {
    return <p className="text-sm text-gray-500">{t('playback:inspect.catIdle')}</p>
  }
  if (cat.state === 'resting') {
    return (
      <p className="text-sm text-indigo-600">
        💤 {t('playback:inspect.catResting')}
      </p>
    )
  }
  const customer =
    cat.customerId !== null ? state.customers[cat.customerId] : undefined
  return (
    <div className="space-y-2">
      <p className="text-sm text-green-700">
        💖 {t('playback:inspect.catBusy')}
      </p>
      {customer && <CustomerDetails customer={customer} state={state} t={t} />}
    </div>
  )
}

function CustomerDetails({
  customer,
  state,
  t,
}: {
  customer: CustomerRuntime | undefined
  state: CafeState
  t: TFn
}) {
  if (!customer) {
    return <p className="text-sm text-gray-500">–</p>
  }
  const stayMin = Math.max(0, state.time - customer.enteredAt)
  return (
    <dl className="space-y-1 text-sm">
      <Row
        label={t('playback:inspect.customerId')}
        value={`#${customer.id}`}
      />
      <Row
        label={t('playback:inspect.stage')}
        value={t(`playback:stages.${customer.stage}` as const)}
      />
      <Row
        label={t('playback:inspect.stayTime')}
        value={`${stayMin.toFixed(1)} ${t('playback:simMinutesUnit')}`}
      />
    </dl>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-800 tabular-nums">{value}</dd>
    </div>
  )
}
