import type { SimulationConfig } from '../types'

// ─────────────────────────────────────────────────────────────
// Service Domain abstraction (v2.5 generalization prototype)
//
// NekoServe started life as a cat-café simulator, but the underlying
// engine is really a generic service-flow / queueing model. This layer
// names that generality: a "service domain" is one concrete instantiation
// of the model, and the cat café is just the first (and currently only)
// fully implemented one.
//
// IMPORTANT: this is a presentation/architecture seam only. It does NOT
// touch the Python engine, the SimulationConfig keys, or the validator.
// Preview domains here are roadmap placeholders — selecting one is a no-op.
// ─────────────────────────────────────────────────────────────

/**
 * The four generic role archetypes every service flow can be described
 * with. Any future domain maps its own vocabulary onto these.
 *
 *  - resource:     the limited capacity customers occupy (seats, tables, beds)
 *  - server:       the active workers who serve them (staff, nurses, tellers)
 *  - ambientAgent: an optional experience agent unique to some domains.
 *                  This is the cat café's differentiator — the reason the
 *                  engine is richer than a textbook M/M/c queue.
 *  - customer:     the arrivals flowing through the system
 */
export type ServiceRole = 'resource' | 'server' | 'ambientAgent' | 'customer'

export const ROLE_ARCHETYPES: readonly ServiceRole[] = [
  'resource',
  'server',
  'ambientAgent',
  'customer',
] as const

export type DomainStatus = 'active' | 'preview'

export interface ServiceDomain {
  id: string
  status: DomainStatus
  emoji: string
  /** Tailwind accent token used for the badge/pill tint. */
  accent: string
  /** Which role archetypes this domain models (preview domains may omit ambientAgent). */
  roles: ServiceRole[]
}

/**
 * Domain registry. Only `cat-cafe` is `active` (wired to the engine).
 * The rest are `preview` — they advertise where the tool is heading and
 * carry no simulation logic. Display text (name/tagline/role labels) is
 * resolved via the `domains` i18n namespace, keyed by id, exactly the way
 * ScenarioButtons resolves the `scenarios` namespace.
 */
export const DOMAINS: ServiceDomain[] = [
  {
    id: 'cat-cafe',
    status: 'active',
    emoji: '🐱',
    accent: 'orange',
    roles: ['resource', 'server', 'ambientAgent', 'customer'],
  },
  {
    id: 'restaurant',
    status: 'preview',
    emoji: '🍜',
    accent: 'rose',
    roles: ['resource', 'server', 'customer'],
  },
  {
    id: 'clinic',
    status: 'active',
    emoji: '🏥',
    accent: 'teal',
    roles: ['resource', 'server', 'customer'],
  },
  {
    id: 'bank',
    status: 'preview',
    emoji: '🏦',
    accent: 'sky',
    roles: ['resource', 'server', 'customer'],
  },
  {
    id: 'salon',
    status: 'preview',
    emoji: '💇',
    accent: 'violet',
    roles: ['resource', 'server', 'customer'],
  },
]

export const ACTIVE_DOMAIN_ID = 'cat-cafe'

/**
 * The core architectural seam: how the cat-café domain's generic roles map
 * onto the existing SimulationConfig keys. Future active domains fill in the
 * same shape. We deliberately do NOT rename the config keys themselves — the
 * cat-café vocabulary stays intact for the course demo; this binding just
 * documents that `seatCount` IS the generic "resource", and so on.
 */
export interface RoleBinding {
  /** Config key holding the count of this role (resource/server/ambientAgent). */
  countKey?: keyof SimulationConfig
  /** Config key holding the arrival cadence (customer role). */
  arrivalKey?: keyof SimulationConfig
}

/**
 * Per-domain role bindings, keyed by domain id. Each active domain maps its
 * generic roles onto existing SimulationConfig keys. We never rename the keys
 * themselves: the clinic just leaves out `ambientAgent` (no cats) and reuses
 * the same seat/staff/arrival fields.
 */
export const ROLE_BINDINGS: Record<string, Partial<Record<ServiceRole, RoleBinding>>> = {
  'cat-cafe': {
    resource: { countKey: 'seatCount' },
    server: { countKey: 'staffCount' },
    ambientAgent: { countKey: 'catCount' },
    customer: { arrivalKey: 'customerArrivalInterval' },
  },
  clinic: {
    resource: { countKey: 'seatCount' },
    server: { countKey: 'staffCount' },
    customer: { arrivalKey: 'customerArrivalInterval' },
  },
}

/** Back-compat alias for the cat café binding. */
export const CAT_CAFE_ROLE_BINDING = ROLE_BINDINGS['cat-cafe']

// ── Helpers ───────────────────────────────────────────────────

export function getDomain(id: string): ServiceDomain | undefined {
  return DOMAINS.find((d) => d.id === id)
}

export function isActiveDomain(id: string): boolean {
  return getDomain(id)?.status === 'active'
}

/**
 * Whether a domain models an ambient experience agent (the cat café's cats).
 * Single source of truth for hiding all cat-specific UI in non-cat domains.
 */
export function domainHasAmbientAgent(id: string): boolean {
  return getDomain(id)?.roles.includes('ambientAgent') ?? false
}
