import { app, BrowserWindow, Menu, MenuItem, ipcMain, shell, nativeImage, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerSimulationHandler } from './simulator-bridge'
import { setMainLocale, mainStrings, getMainLocale } from './i18n'

// ──────────────────────────────────────────────────────────────
// Window state persistence
// ──────────────────────────────────────────────────────────────

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): Partial<WindowBounds> {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as WindowBounds
    // Verify position is on a visible display
    const displays = screen.getAllDisplays()
    const onScreen = displays.some((d) => {
      const b = d.bounds
      return (
        data.x >= b.x &&
        data.y >= b.y &&
        data.x + 100 <= b.x + b.width &&
        data.y + 50 <= b.y + b.height
      )
    })
    if (!onScreen) return {}
    return { x: data.x, y: data.y, width: data.width, height: data.height }
  } catch {
    return {}
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const b = win.getBounds()
    fs.writeFileSync(STATE_FILE, JSON.stringify(b), 'utf8')
  } catch {
    // best-effort; ignore errors
  }
}

// ──────────────────────────────────────────────────────────────
// App identity — must be set before app is ready
// ──────────────────────────────────────────────────────────────

app.setName('NekoServe')

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  // dev mode: app.getAppPath() is the project root (more reliable than __dirname)
  return path.join(app.getAppPath(), 'build-resources/icon.png')
}

// ──────────────────────────────────────────────────────────────
// Application menu (overrides default "Electron" title in macOS menubar)
// ──────────────────────────────────────────────────────────────

function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const appName = app.getName()
  const s = mainStrings()

  const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [
    // macOS: first menu is always the "App" menu shown in the menubar
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              {
                label: s.menu.about(appName),
                click: () => showAboutWindow(),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: s.menu.hide(appName) },
              { role: 'hideOthers', label: s.menu.hideOthers },
              { role: 'unhide', label: s.menu.unhide },
              { type: 'separator' },
              { role: 'quit', label: s.menu.quit(appName) },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    // Edit
    {
      label: s.menu.edit,
      submenu: [
        { role: 'undo', label: s.menu.undo },
        { role: 'redo', label: s.menu.redo },
        { type: 'separator' },
        { role: 'cut', label: s.menu.cut },
        { role: 'copy', label: s.menu.copy },
        { role: 'paste', label: s.menu.paste },
        { role: 'selectAll', label: s.menu.selectAll },
      ],
    },
    // Window
    {
      label: s.menu.window,
      submenu: [
        { role: 'minimize', label: s.menu.minimize },
        { role: 'zoom', label: s.menu.zoom },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: s.menu.front },
            ]
          : [{ role: 'close' as const, label: s.menu.close }]),
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ──────────────────────────────────────────────────────────────
// Custom About window
// ──────────────────────────────────────────────────────────────

function showAboutWindow(): void {
  const iconBase64 = `data:image/png;base64,${nativeImage
    .createFromPath(getIconPath())
    .resize({ width: 88, height: 88 })
    .toPNG()
    .toString('base64')}`
  const appName = app.getName()
  const version = app.getVersion()
  const s = mainStrings()
  const htmlLang = getMainLocale()

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fef9f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
    padding: 28px;
    user-select: none;
    -webkit-user-select: none;
    color: #1a1a1a;
    -webkit-app-region: drag;
  }
  img {
    width: 88px;
    height: 88px;
    border-radius: 22px;
    margin-bottom: 14px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .version { font-size: 12px; color: #999; margin-bottom: 14px; }
  .copyright { font-size: 11px; color: #aaa; line-height: 1.7; }
  button {
    -webkit-app-region: no-drag;
    margin-top: 22px;
    padding: 7px 36px;
    border-radius: 10px;
    border: none;
    background: #f97316;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.1s;
  }
  button:hover { opacity: 0.88; }
  button:active { opacity: 0.7; }
</style>
</head>
<body>
  <img src="${iconBase64}" alt="icon">
  <h1>${appName}</h1>
  <p class="version">${s.about.version} ${version}</p>
  <p class="copyright">${s.about.copyright}<br>${s.about.tagline}</p>
  <button onclick="window.close()">${s.about.ok}</button>
</body>
</html>`

  const win = new BrowserWindow({
    width: 320,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: s.about.windowTitle(appName),
    icon: getIconPath(),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  win.once('ready-to-show', () => win.show())
}

// ──────────────────────────────────────────────────────────────
// Window factory
// ──────────────────────────────────────────────────────────────

function createWindow(): void {
  const savedState = loadWindowState()

  const isMac = process.platform === 'darwin'
  const s = mainStrings()

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    ...savedState,
    title: s.window.title,
    icon: getIconPath(),
    backgroundColor: '#fef9f0',
    // macOS: hide native title bar, keep traffic lights inset into the header area
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    // Vertically center traffic lights within the 48px header (py-3 + content)
    trafficLightPosition: isMac ? { x: 12, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.on('close', () => saveWindowState(win))

  // Open external links in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ──────────────────────────────────────────────────────────────
// App lifecycle
// ──────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Set Dock icon on macOS (dev mode — packaged app uses the bundle icon)
  if (process.platform === 'darwin' && !app.isPackaged) {
    const icon = nativeImage.createFromPath(getIconPath())
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon)
    }
  }

  // Initialize main-process locale from the system before building the menu
  // so the first menu/About window already uses the right language.
  setMainLocale(app.getLocale())

  // Expose system locale (normalized to a BCP-47 tag like 'zh-TW') to renderer
  // via a synchronous IPC call used by the preload script.
  ipcMain.on('get-initial-locale', (event) => {
    event.returnValue = app.getLocale()
  })

  // Renderer notifies main when the user toggles language so the menu and
  // About dialog stay in sync with the UI.
  ipcMain.on('locale-changed', (_event, locale: string) => {
    setMainLocale(locale)
    buildAppMenu()
  })

  buildAppMenu()
  registerSimulationHandler()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
