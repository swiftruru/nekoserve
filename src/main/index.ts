import { app, BrowserWindow, Menu, MenuItem, shell, nativeImage, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerSimulationHandler } from './simulator-bridge'

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

  const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [
    // macOS: first menu is always the "App" menu shown in the menubar
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              {
                label: `關於 ${appName}`,
                click: () => showAboutWindow(),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: `隱藏 ${appName}` },
              { role: 'hideOthers', label: '隱藏其他' },
              { role: 'unhide', label: '全部顯示' },
              { type: 'separator' },
              { role: 'quit', label: `結束 ${appName}` },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    // Edit
    {
      label: '編輯',
      submenu: [
        { role: 'undo', label: '還原' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪下' },
        { role: 'copy', label: '複製' },
        { role: 'paste', label: '貼上' },
        { role: 'selectAll', label: '全選' },
      ],
    },
    // Window
    {
      label: '視窗',
      submenu: [
        { role: 'minimize', label: '縮到最小' },
        { role: 'zoom', label: '縮放' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: '全部移到最前面' },
            ]
          : [{ role: 'close' as const, label: '關閉' }]),
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

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
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
  <p class="version">版本 ${version}</p>
  <p class="copyright">© 2024 NekoServe<br>貓咪咖啡廳離散事件模擬系統</p>
  <button onclick="window.close()">確定</button>
</body>
</html>`

  const win = new BrowserWindow({
    width: 320,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `關於 ${appName}`,
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

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    ...savedState,
    title: 'NekoServe — 貓咪咖啡廳模擬系統',
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
