import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig, MetricSummary } from '../../types'
import { predictWaitTime } from '../../utils/kingman'
import { renderWithTerms } from './TermTooltip'

interface Props {
  config: SimulationConfig
  metrics: MetricSummary
}

/**
 * Theory-vs-simulation callout for Section 3. Runs Kingman's
 * approximation against the config parameters (Poisson / exponential
 * assumptions, c = staffCount) and compares the predicted queue wait
 * against the simulator's actual avgWaitForOrder.
 *
 * The gap is the teaching moment: Kingman is a clean mathematical
 * model that ignores NekoServe's real-world complications (abandon
 * timeouts, cat visits, truncated normal service). A 30-60% gap is
 * expected — it proves why DES exists as a tool separate from pure
 * queueing theory.
 */
export default function KingmanPrediction({ config, metrics }: Props) {
  const { t } = useTranslation(['results', 'common'])
  const minUnit = t('common:unit.min')

  const { result, actual, delta, severity } = useMemo(() => {
    const lambda = 1 / Math.max(0.1, config.customerArrivalInterval)
    const meanService = config.orderTime + config.preparationTime
    const r = predictWaitTime({
      lambda,
      meanService,
      cServers: Math.max(1, config.staffCount),
    })
    const a = metrics.avgWaitForOrder
    let d = 0
    let sev: 'close' | 'diverge' | 'fail' = 'close'
    if (!r.stable) {
      sev = 'fail'
      d = 100
    } else if (r.wqApprox > 0) {
      d = Math.abs(a - r.wqApprox) / r.wqApprox * 100
      sev = d < 20 ? 'close' : d < 50 ? 'diverge' : 'fail'
    }
    return { result: r, actual: a, delta: d, severity: sev }
  }, [config, metrics])

  const toneByseverity: Record<typeof severity, string> = {
    close: 'bg-green-50 border-green-200 text-green-900',
    diverge: 'bg-amber-50 border-amber-200 text-amber-900',
    fail: 'bg-red-50 border-red-200 text-red-900',
  }

  return (
    <div
      className={
        'rounded-xl border p-3 ' + toneByseverity[severity]
      }
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm">🧪</span>
        <span className="text-xs font-semibold">
          {renderWithTerms(t('results:kingman.title'))}
        </span>
      </div>

      {!result.stable ? (
        <div className="text-xs leading-relaxed">
          <p className="font-semibold mb-1">
            {renderWithTerms(t('results:kingman.unstable'))}
          </p>
          <p className="text-[11px] opacity-80">
            {renderWithTerms(
              t('results:kingman.unstableHint', {
                rho: (result.rho * 100).toFixed(0),
              }),
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-center mb-2">
            <div>
              <div className="text-[10px] opacity-75 mb-0.5">
                {t('results:kingman.predictedLabel')}
              </div>
              <div className="text-base font-bold tabular-nums">
                {result.wqApprox.toFixed(1)}
              </div>
              <div className="text-[9px] opacity-70">{minUnit}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-75 mb-0.5">
                {t('results:kingman.actualLabel')}
              </div>
              <div className="text-base font-bold tabular-nums">
                {actual.toFixed(1)}
              </div>
              <div className="text-[9px] opacity-70">{minUnit}</div>
            </div>
          </div>
          <div className="text-[11px] text-center leading-snug">
            {renderWithTerms(
              t(`results:kingman.verdict.${severity}`, {
                delta: delta.toFixed(0),
              }),
            )}
          </div>
        </>
      )}
    </div>
  )
}
