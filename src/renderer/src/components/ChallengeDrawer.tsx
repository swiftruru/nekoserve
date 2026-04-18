import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetricSummary } from '../types'
import { CHALLENGES } from '../data/challenges'
import type { Difficulty } from '../data/challenges'
import ConfirmDialog from './ConfirmDialog'

const STORAGE_KEY = 'nekoserve:challenges-completed'

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function saveCompleted(completed: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed])) } catch { /* ok */ }
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ── Challenge Drawer ──────────────────────────────────────

interface ChallengeDrawerProps {
  visible: boolean
  onClose: () => void
  metrics: MetricSummary | null
}

export default function ChallengeDrawer({ visible, onClose, metrics }: ChallengeDrawerProps) {
  const { t } = useTranslation(['challenges', 'common'])
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState<Record<string, number>>({})
  const [justVerified, setJustVerified] = useState<string | null>(null)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  useEffect(() => { saveCompleted(completed) }, [completed])

  if (!visible) return null

  function handleVerify(id: string) {
    if (!metrics) return
    const challenge = CHALLENGES.find((c) => c.id === id)
    if (!challenge) return

    const passed = challenge.condition(metrics)
    if (passed) {
      setCompleted((prev) => { const next = new Set(prev); next.add(id); return next })
    } else {
      setHintLevel((prev) => ({
        ...prev,
        [id]: Math.min((prev[id] ?? 0) + 1, 3),
      }))
    }
    setJustVerified(id)
    setTimeout(() => setJustVerified(null), 2000)
  }

  function handleResetConfirm() {
    setCompleted(new Set())
    setHintLevel({})
    setConfirmResetOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose} data-testid="challenge-drawer">
      <div className="absolute inset-0 bg-black/30" data-testid="challenge-drawer-backdrop" />
      <div
        className="relative w-96 max-w-full h-full bg-white dark:bg-bark-900 border-l border-orange-200 dark:border-bark-600 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-bark-900 border-b border-orange-100 dark:border-bark-600 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400">
            {t('challenges:title')}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-bark-400">
              <span data-testid="challenge-progress-count">
              {completed.size}/{CHALLENGES.length}
              </span>
            </span>
            {completed.size > 0 && (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                data-testid="challenge-reset-button"
                className="flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-bark-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-0.5 rounded-md border border-transparent hover:border-red-200 dark:hover:border-red-800/50 transition-all duration-150"
              >
                <span className="text-xs">↺</span>
                {t('challenges:reset')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              data-testid="challenge-drawer-close"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-bark-200 text-lg leading-none"
              aria-label={t('common:button.close')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {CHALLENGES.map((challenge) => {
            const isExpanded = expandedId === challenge.id
            const isDone = completed.has(challenge.id)
            const hints = (hintLevel[challenge.id] ?? 0)
            const isJustVerified = justVerified === challenge.id
            const passed = isJustVerified && metrics ? challenge.condition(metrics) : null

            return (
              <div
                key={challenge.id}
                data-testid={`challenge-item-${challenge.id}`}
                data-completed={isDone ? 'true' : 'false'}
                className={`rounded-xl border p-3 transition-colors ${
                  isDone
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                    : 'border-orange-100 dark:border-bark-600 bg-white dark:bg-bark-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                  data-testid={`challenge-toggle-${challenge.id}`}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span className="text-lg">{isDone ? '✅' : '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 dark:text-bark-100 truncate">
                      {t(`challenges:items.${challenge.id}.prompt` as const)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${DIFFICULTY_STYLES[challenge.difficulty]}`}>
                    {t(`challenges:difficulty.${challenge.difficulty}` as const)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {/* No results hint */}
                    {!metrics && !isDone && (
                      <div
                        className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2"
                        data-testid={`challenge-no-results-${challenge.id}`}
                      >
                        <span className="text-base shrink-0">⚠️</span>
                        <span>{t('challenges:noResults')}</span>
                      </div>
                    )}

                    {/* Hints */}
                    {hints > 0 && (
                      <div className="space-y-1">
                        {Array.from({ length: Math.min(hints, 3) }, (_, i) => (
                          <div key={i} className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
                            {t(`challenges:items.${challenge.id}.hint${i + 1}` as const, { defaultValue: '' })}
                          </div>
                        )).filter((el) => {
                          const props = el.props as { children?: { props?: { children?: string } } }
                          return props.children?.props?.children !== ''
                        })}
                      </div>
                    )}

                    {/* Verify button */}
                    {!isDone && metrics && (
                      <button
                        type="button"
                        onClick={() => handleVerify(challenge.id)}
                        data-testid={`challenge-verify-${challenge.id}`}
                        className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                          isJustVerified && passed === true
                            ? 'bg-green-500 text-white'
                            : isJustVerified && passed === false
                            ? 'bg-red-400 text-white'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                        {isJustVerified && passed === true
                          ? t('challenges:passed')
                          : isJustVerified && passed === false
                          ? t('challenges:failed')
                          : t('challenges:verify')}
                      </button>
                    )}

                    {/* Done explanation */}
                    {isDone && (
                      <div
                        className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1.5"
                        data-testid={`challenge-explanation-${challenge.id}`}
                      >
                        {t(`challenges:items.${challenge.id}.explanation` as const, { defaultValue: '' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Themed confirm dialog for reset */}
      <ConfirmDialog
        visible={confirmResetOpen}
        message={t('challenges:resetConfirm')}
        onConfirm={handleResetConfirm}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  )
}
