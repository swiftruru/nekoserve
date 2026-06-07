/**
 * Active service-domain store (v2.5 generalization prototype).
 *
 * Holds which service domain the app is currently running. For now only the
 * cat-café domain is `active`, so this value is effectively constant — but it
 * gives the domain selector something real to read/write and seeds the
 * architecture for a future multi-domain build. The choice is persisted so a
 * later release can honour it without changing the call sites here.
 */

import { create } from 'zustand'
import { ACTIVE_DOMAIN_ID, isActiveDomain } from '../data/domains'
import { getDomainDefaultConfig } from '../data/scenarios'
import { useConfigStore } from './configStore'

const STORAGE_KEY = 'nekoserve:active-domain'

function loadInitial(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Only restore domains that are actually wired to the engine. Anything
    // else (a stale preview id) falls back to the cat café.
    if (stored && isActiveDomain(stored)) return stored
  } catch {
    /* localStorage unavailable, fall through */
  }
  return ACTIVE_DOMAIN_ID
}

interface DomainState {
  activeDomainId: string
  /** Switch the active domain. No-ops for non-active (preview) domains. */
  setActiveDomain: (id: string) => void
}

export const useDomainStore = create<DomainState>((set) => ({
  activeDomainId: loadInitial(),
  setActiveDomain: (id) => {
    if (!isActiveDomain(id)) return
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
    set({ activeDomainId: id })
    // Seed the editable config with this domain's default preset so the
    // Settings page reflects the new domain (e.g. clinic forces catCount=0).
    useConfigStore.getState().setConfig(getDomainDefaultConfig(id))
  },
}))
