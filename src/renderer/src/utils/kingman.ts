/**
 * Kingman's single-station approximation for waiting time in a queue
 * with c servers. For M/M/c with Poisson arrivals and exponential
 * service, set `caSquared = csSquared = 1`; Kingman then agrees with
 * the exact Erlang-C wait to within a few percent at moderate rho.
 *
 * The whole point of exposing this on the Results page is to let
 * students see the gap between "what queueing theory says" and
 * "what actually happened in the simulator". The NekoServe simulator
 * bakes in several features Kingman doesn't model:
 *
 *   - maxWaitTime abandonment reduces effective λ
 *   - cat visits extend the dining phase (irrelevant to order queue,
 *     but they pin customers in seats so the effective service rate
 *     at the seat station is lower)
 *   - service time is a truncated normal, not a pure exponential
 *
 * So a 30–60 % gap is expected. The discrepancy itself is the lesson.
 */

export interface KingmanInputs {
  /** Arrivals per minute (λ). */
  lambda: number
  /** Mean service time per customer, in minutes (1/μ). */
  meanService: number
  /** Number of parallel servers at the station (c). */
  cServers: number
  /** Squared coefficient of variation of inter-arrival times. 1 for Poisson. */
  caSquared?: number
  /** Squared coefficient of variation of service times. 1 for exponential. */
  csSquared?: number
}

export interface KingmanResult {
  /** Utilization rho = λ · meanService / c. */
  rho: number
  /** Approximate mean wait time in queue (W_q) in minutes. */
  wqApprox: number
  /** False when rho >= 1 (no steady-state, queue grows without bound). */
  stable: boolean
}

export function predictWaitTime(inputs: KingmanInputs): KingmanResult {
  const {
    lambda,
    meanService,
    cServers,
    caSquared = 1,
    csSquared = 1,
  } = inputs

  if (cServers <= 0 || meanService <= 0 || lambda <= 0) {
    return { rho: 0, wqApprox: 0, stable: true }
  }

  const rho = (lambda * meanService) / cServers
  if (rho >= 1) {
    return { rho, wqApprox: Number.POSITIVE_INFINITY, stable: false }
  }

  // Kingman's approximation: W_q ≈ (ρ / (1 − ρ)) · ((Ca² + Cs²) / 2) · E[S]
  const wqApprox =
    (rho / (1 - rho)) * ((caSquared + csSquared) / 2) * meanService
  return { rho, wqApprox, stable: true }
}
