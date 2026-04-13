/**
 * NekoServe main-process i18n
 *
 * A tiny synchronous string table for the Electron main process (application
 * menu + About dialog). Kept intentionally separate from the renderer's
 * react-i18next setup to avoid bundling the full i18next runtime into main.
 *
 * Locale selection happens once at startup via `app.getLocale()`; the
 * application menu is rebuilt when the renderer notifies main of a language
 * change via the `locale-changed` IPC message.
 */

export type MainLocale = 'zh-TW' | 'en'

export function normalizeMainLocale(raw: string | undefined | null): MainLocale {
  if (!raw) return 'en'
  const lower = raw.toLowerCase().replace('_', '-')
  if (lower.startsWith('zh')) return 'zh-TW'
  return 'en'
}

interface MainStrings {
  menu: {
    edit: string
    undo: string
    redo: string
    cut: string
    copy: string
    paste: string
    selectAll: string
    window: string
    minimize: string
    zoom: string
    front: string
    close: string
    about: (app: string) => string
    hide: (app: string) => string
    hideOthers: string
    unhide: string
    quit: (app: string) => string
  }
  about: {
    windowTitle: (app: string) => string
    version: string
    copyright: string
    tagline: string
    ok: string
  }
  window: {
    title: string
  }
}

const ZH_TW: MainStrings = {
  menu: {
    edit: '編輯',
    undo: '還原',
    redo: '重做',
    cut: '剪下',
    copy: '複製',
    paste: '貼上',
    selectAll: '全選',
    window: '視窗',
    minimize: '縮到最小',
    zoom: '縮放',
    front: '全部移到最前面',
    close: '關閉',
    about: (app) => `關於 ${app}`,
    hide: (app) => `隱藏 ${app}`,
    hideOthers: '隱藏其他',
    unhide: '全部顯示',
    quit: (app) => `結束 ${app}`,
  },
  about: {
    windowTitle: (app) => `關於 ${app}`,
    version: '版本',
    copyright: '© 2024 NekoServe',
    tagline: '貓咪咖啡廳離散事件模擬系統',
    ok: '確定',
  },
  window: {
    title: 'NekoServe｜貓咪咖啡廳模擬系統',
  },
}

const EN: MainStrings = {
  menu: {
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    close: 'Close',
    about: (app) => `About ${app}`,
    hide: (app) => `Hide ${app}`,
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: (app) => `Quit ${app}`,
  },
  about: {
    windowTitle: (app) => `About ${app}`,
    version: 'Version',
    copyright: '© 2024 NekoServe',
    tagline: 'Cat café discrete-event simulation',
    ok: 'OK',
  },
  window: {
    title: 'NekoServe | Cat café simulation',
  },
}

const TABLES: Record<MainLocale, MainStrings> = {
  'zh-TW': ZH_TW,
  en: EN,
}

let currentLocale: MainLocale = 'en'

export function setMainLocale(raw: string | undefined | null): void {
  currentLocale = normalizeMainLocale(raw)
}

export function getMainLocale(): MainLocale {
  return currentLocale
}

export function mainStrings(): MainStrings {
  return TABLES[currentLocale]
}
