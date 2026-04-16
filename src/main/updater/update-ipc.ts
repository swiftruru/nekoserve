/**
 * Registers all update-related IPC handlers and orchestrates the
 * startup auto-check that silently notifies the renderer when an
 * update is available.
 */

import { ipcMain, shell, BrowserWindow } from 'electron'
import { checkForUpdate } from './update-service'
import { isVersionSkipped, skipVersion } from './update-store'
import { RELEASES_URL, AUTO_CHECK_DELAY_MS } from './update-config'
import type { UpdateCheckOutcome, UpdateInfo } from './update-service'

export function registerUpdateHandlers(): void {
  // Manual check triggered by the renderer (or menu item via IPC)
  ipcMain.handle('check-for-update', async (): Promise<UpdateCheckOutcome> => {
    return checkForUpdate()
  })

  // Persist "skip this version"
  ipcMain.handle('skip-update-version', (_event, version: string): void => {
    skipVersion(version)
  })

  // Open the GitHub Releases page in the system browser
  ipcMain.handle('open-releases-page', (): void => {
    shell.openExternal(RELEASES_URL)
  })
}

/**
 * Silently checks for updates after a short delay. If a newer, non-skipped
 * version is found, pushes an `update-available` event to every open window.
 */
export function scheduleAutoCheck(): void {
  setTimeout(async () => {
    const result = await checkForUpdate()
    if (!result.success) return // silent fail for auto-check
    if (!result.data.hasUpdate) return
    if (isVersionSkipped(result.data.latestVersion)) return

    const info: UpdateInfo = result.data
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('update-available', info)
    }
  }, AUTO_CHECK_DELAY_MS)
}
