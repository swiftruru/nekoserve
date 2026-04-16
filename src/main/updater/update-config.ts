/**
 * Update-related constants.
 * Centralises the GitHub coordinates and tunables so they are easy to change.
 */

export const GITHUB_OWNER = 'swiftruru'
export const GITHUB_REPO = 'nekoserve'

export const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
export const API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

/** Delay (ms) after app-ready before the first silent update check. */
export const AUTO_CHECK_DELAY_MS = 5_000

/** Timeout (ms) for the GitHub API request. */
export const FETCH_TIMEOUT_MS = 10_000
