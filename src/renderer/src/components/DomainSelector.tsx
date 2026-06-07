import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DOMAINS,
  ROLE_BINDINGS,
  ACTIVE_DOMAIN_ID,
  getDomain,
  type ServiceDomain,
  type ServiceRole,
} from '../data/domains'
import { useDomainStore } from '../store/domainStore'
import { useToast } from '../hooks/useToast'

interface DomainSelectorProps {
  /** `badge`: compact pill + popover for the title bar. `panel`: full card for the settings page. */
  variant?: 'badge' | 'panel'
}

// Static accent class map so Tailwind keeps the literal class names at build
// time (dynamic `bg-${accent}-100` would be purged).
const ACCENT_DOT: Record<string, string> = {
  orange: 'bg-orange-400',
  rose: 'bg-rose-400',
  teal: 'bg-teal-400',
  sky: 'bg-sky-400',
  violet: 'bg-violet-400',
}

export default function DomainSelector({ variant = 'badge' }: DomainSelectorProps) {
  const { t } = useTranslation(['domains', 'common'])
  const { toast } = useToast()
  const activeDomainId = useDomainStore((s) => s.activeDomainId)
  const setActiveDomain = useDomainStore((s) => s.setActiveDomain)
  const activeDomain = getDomain(activeDomainId) ?? getDomain(ACTIVE_DOMAIN_ID)!

  function handlePick(domain: ServiceDomain) {
    if (domain.status === 'active') {
      setActiveDomain(domain.id)
    } else {
      toast(t('domains:lockedToast', { name: t(`domains:${domain.id}.name`) }), 'info')
    }
  }

  // ── Role mapping table for the active domain (the architecture seam) ──
  function roleConfigKey(role: ServiceRole): string | undefined {
    const binding = ROLE_BINDINGS[activeDomain.id]?.[role]
    return binding?.countKey ?? binding?.arrivalKey
  }

  function RoleMap() {
    return (
      <div className="mt-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-bark-300 uppercase tracking-wide">
          {t('domains:roleMapTitle')}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-bark-400 mt-0.5">
          {t('domains:roleMapHint')}
        </p>
        <div className={`mt-2 grid grid-cols-1 gap-1.5 ${variant === 'panel' ? 'sm:grid-cols-2' : ''}`}>
          {activeDomain.roles.map((role) => {
            const cfgKey = roleConfigKey(role)
            return (
              <div
                key={role}
                className="flex items-center gap-2 rounded-lg bg-cream-100 dark:bg-bark-700 px-2.5 py-1.5"
              >
                <span className="shrink-0 text-[11px] text-gray-400 dark:text-bark-400 min-w-[5rem]">
                  {t(`domains:archetype.${role}`)}
                </span>
                <span className="shrink-0 text-gray-300 dark:text-bark-500">→</span>
                <span className="shrink-0 text-[12px] font-medium text-orange-700 dark:text-orange-400">
                  {t(`domains:${activeDomain.id}.roles.${role}`)}
                </span>
                {cfgKey && (
                  <code className="ml-auto truncate text-[10px] font-mono text-gray-400 dark:text-bark-400">
                    {cfgKey}
                  </code>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function DomainRow({ domain }: { domain: ServiceDomain }) {
    const isActive = domain.id === activeDomain.id
    const isPreview = domain.status === 'preview'
    return (
      <button
        type="button"
        onClick={() => handlePick(domain)}
        aria-current={isActive}
        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
          isActive
            ? 'bg-orange-50 dark:bg-orange-900/20 ring-1 ring-inset ring-orange-300 dark:ring-orange-700'
            : 'hover:bg-cream-100 dark:hover:bg-bark-700'
        } ${isPreview ? 'opacity-70' : ''}`}
      >
        <span className="text-lg leading-none" role="img" aria-hidden="true">
          {domain.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-800 dark:text-bark-100 truncate">
              {t(`domains:${domain.id}.name`)}
            </span>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${ACCENT_DOT[domain.accent] ?? 'bg-gray-300'}`} />
          </span>
          <span className="block text-[11px] text-gray-500 dark:text-bark-300 truncate">
            {t(`domains:${domain.id}.tagline`)}
          </span>
        </span>
        {domain.status === 'active' ? (
          <span className="shrink-0 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-full px-2 py-0.5">
            {t('domains:activeTag')}
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-gray-400 dark:text-bark-400 bg-gray-100 dark:bg-bark-700 rounded-full px-2 py-0.5">
            <span aria-hidden="true">🔒</span>
            {t('domains:comingSoon')}
          </span>
        )}
      </button>
    )
  }

  function DomainList() {
    return (
      <div className="flex flex-col gap-1">
        {DOMAINS.map((d) => (
          <DomainRow key={d.id} domain={d} />
        ))}
      </div>
    )
  }

  // ── Panel variant (settings page) ───────────────────────────
  if (variant === 'panel') {
    return (
      <div className="card">
        <div className="flex items-baseline justify-between gap-2">
          <div className="card-title">{t('domains:sectionLabel')}</div>
        </div>
        <p className="text-xs text-gray-500 dark:text-bark-300 mb-3">{t('domains:sectionHint')}</p>
        <DomainList />
        <RoleMap />
        <p className="mt-3 text-[11px] text-gray-400 dark:text-bark-400 leading-relaxed">
          {t('domains:roadmapNote')}
        </p>
      </div>
    )
  }

  // ── Badge variant (title bar) ───────────────────────────────
  return <DomainBadge activeDomain={activeDomain}>{() => (
    <div className="p-2">
      <p className="px-1 pb-2 text-[11px] text-gray-500 dark:text-bark-300">{t('domains:sectionHint')}</p>
      <DomainList />
      <RoleMap />
    </div>
  )}</DomainBadge>
}

// Compact pill + popover. Kept separate so the badge's open/close + click-outside
// state doesn't re-run the panel rendering path.
function DomainBadge({
  activeDomain,
  children,
}: {
  activeDomain: ServiceDomain
  children: () => React.ReactNode
}) {
  const { t } = useTranslation(['domains'])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative no-drag" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('domains:badgeHint')}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-orange-200 dark:border-bark-600 bg-cream-50 dark:bg-bark-700 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:border-orange-300 dark:hover:border-bark-500 transition-colors"
      >
        <span role="img" aria-hidden="true">{activeDomain.emoji}</span>
        <span className="max-w-[9rem] truncate">{t(`domains:${activeDomain.id}.name`)}</span>
        <span className="text-[9px] opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-white dark:bg-bark-800 shadow-xl ring-1 ring-black/5 dark:ring-bark-600">
          {children()}
        </div>
      )}
    </div>
  )
}
