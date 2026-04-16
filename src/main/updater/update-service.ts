/**
 * Core update-checking logic.
 *
 * Uses Electron's built-in `net.fetch` to query the GitHub Releases API,
 * compares versions, and returns a typed result the caller can act on.
 */

import { app, net } from 'electron'
import { API_LATEST_RELEASE, RELEASES_URL, FETCH_TIMEOUT_MS } from './update-config'

// ── Types ──────────────────────────────────────────────────────

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
}

export interface UpdateCheckResult {
  success: true
  data: UpdateInfo
}

export interface UpdateCheckError {
  success: false
  error: string
}

export type UpdateCheckOutcome = UpdateCheckResult | UpdateCheckError

// ── Semver helpers ─────────────────────────────────────────────

/** Parse "x.y.z" (with optional leading "v") into [major, minor, patch]. */
function parseSemver(raw: string): [number, number, number] | null {
  const m = raw.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/**
 * Returns true when `latest` is strictly newer than `current`.
 * Both must be valid "x.y.z" strings.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const a = parseSemver(current)
  const b = parseSemver(latest)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true
    if (b[i] < a[i]) return false
  }
  return false
}

// ── GitHub API call ────────────────────────────────────────────

interface GitHubRelease {
  tag_name: string
  html_url: string
  body?: string
}

export async function checkForUpdate(): Promise<UpdateCheckOutcome> {
  const currentVersion = app.getVersion()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await net.fetch(API_LATEST_RELEASE, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': `NekoServe/${currentVersion}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      return { success: false, error: `GitHub API returned ${response.status}` }
    }

    const release: GitHubRelease = await response.json()
    const latestVersion = release.tag_name.replace(/^v/, '')

    return {
      success: true,
      data: {
        hasUpdate: isNewerVersion(currentVersion, latestVersion),
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url || `${RELEASES_URL}/tag/${release.tag_name}`,
        releaseNotes: release.body ?? '',
      },
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Request timed out'
          : err.message
        : 'Unknown error'
    return { success: false, error: message }
  }
}
