import { useTranslation } from 'react-i18next'

interface Props {
  /** Fires when user accepts the promo and wants to start a batch. */
  onQuickStartBatch: () => void
  /** Fires when user dismisses the banner. Parent should also persist
   *  a "don't show again" flag so it stays gone next session. */
  onDismiss: () => void
}

/**
 * Soft promotion shown on the playback page after a single simulation
 * completes. The user just watched the cats run once; this nudges them
 * to discover that running 20+ simulations reveals stability and shape
 * information they're missing from a single run.
 *
 * Visibility (parent's responsibility):
 *  - has a single-run result to look at (so the page is mounted)
 *  - has never run a batch yet (liveBatchStore.runs.length === 0)
 *  - hasn't dismissed the banner before (localStorage flag)
 */
export default function BatchPromoBanner({ onQuickStartBatch, onDismiss }: Props) {
  const { t } = useTranslation('playback')

  return (
    <div
      role="region"
      aria-label={t('batchPromo.title')}
      data-testid="batch-promo-banner"
      className="card border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="text-base font-bold text-orange-800 dark:text-orange-300 mb-1">
            {t('batchPromo.title')}
          </div>
          <p className="text-[13px] text-gray-700 dark:text-bark-200 leading-relaxed">
            {t('batchPromo.body')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onQuickStartBatch}
            data-testid="batch-promo-cta"
            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 shadow-md ring-1 ring-green-600/30"
          >
            {t('batchPromo.cta')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            data-testid="batch-promo-dismiss"
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-bark-300 hover:bg-gray-100 dark:hover:bg-bark-700 transition-colors"
            aria-label={t('batchPromo.dismiss')}
          >
            ✕ {t('batchPromo.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
