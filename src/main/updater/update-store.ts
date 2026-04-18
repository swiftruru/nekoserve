/**
 * Persists the user's "skip this version" preference to a JSON file
 * in the Electron userData directory.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'

interface UpdatePrefs {
  skippedVersion?: string
}

function getPrefsFile(): string {
  return path.join(app.getPath('userData'), 'update-prefs.json')
}

function readPrefs(): UpdatePrefs {
  try {
    return JSON.parse(fs.readFileSync(getPrefsFile(), 'utf8')) as UpdatePrefs
  } catch {
    return {}
  }
}

function writePrefs(prefs: UpdatePrefs): void {
  try {
    fs.writeFileSync(getPrefsFile(), JSON.stringify(prefs), 'utf8')
  } catch {
    // best-effort
  }
}

export function isVersionSkipped(version: string): boolean {
  return readPrefs().skippedVersion === version
}

export function skipVersion(version: string): void {
  writePrefs({ skippedVersion: version })
}

export function clearSkipped(): void {
  writePrefs({})
}
