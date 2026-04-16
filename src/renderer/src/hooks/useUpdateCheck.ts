import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error'

export interface UpdateState {
  status: UpdateStatus
  info: UpdateInfo | null
  errorMessage: string | null
  /** True when the check was triggered manually (menu / button). */
  manual: boolean
}

// ── Hook ───────────────────────────────────────────────────────

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    info: null,
    errorMessage: null,
    manual: false,
  })

  // Track whether modal is visible (separate from status so "dismiss" can
  // hide the modal while preserving the underlying status for logic).
  const [visible, setVisible] = useState(false)

  // Guard against double-registering listeners in StrictMode
  const listenersRegistered = useRef(false)

  // ── Listen for auto-check push from main process ─────────────
  useEffect(() => {
    if (listenersRegistered.current) return
    listenersRegistered.current = true

    window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setState({ status: 'available', info, errorMessage: null, manual: false })
      setVisible(true)
    })

    window.electronAPI.onMenuCheckForUpdate(() => {
      performCheck(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Manual check ─────────────────────────────────────────────

  const performCheck = useCallback(async (manual: boolean) => {
    setState({ status: 'checking', info: null, errorMessage: null, manual })
    setVisible(true)

    const result = await window.electronAPI.checkForUpdate()

    if (!result.success) {
      setState({ status: 'error', info: null, errorMessage: result.error ?? 'Unknown error', manual })
      return
    }

    if (result.data!.hasUpdate) {
      setState({ status: 'available', info: result.data!, errorMessage: null, manual })
    } else {
      setState({ status: 'up-to-date', info: result.data!, errorMessage: null, manual })
    }
  }, [])

  const checkManually = useCallback(() => performCheck(true), [performCheck])

  // ── User actions ─────────────────────────────────────────────

  /** "Go to Download" — open Releases page. */
  const goToDownload = useCallback(() => {
    window.electronAPI.openReleasesPage()
    setVisible(false)
  }, [])

  /** "Skip This Version" — persist and hide. */
  const skipVersion = useCallback(() => {
    if (state.info) {
      window.electronAPI.skipUpdateVersion(state.info.latestVersion)
    }
    setVisible(false)
  }, [state.info])

  /** "Remind Me Later" — just close the modal; next launch will check again. */
  const remindLater = useCallback(() => {
    setVisible(false)
  }, [])

  /** Close modal for up-to-date / error states. */
  const dismiss = useCallback(() => {
    setVisible(false)
  }, [])

  return {
    ...state,
    visible,
    checkManually,
    goToDownload,
    skipVersion,
    remindLater,
    dismiss,
  }
}
