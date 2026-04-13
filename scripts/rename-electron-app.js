'use strict'
/**
 * Rename the dev Electron.app bundle so the macOS dock & menubar show
 * "NekoServe" instead of "Electron" during development.
 *
 * Patches:
 *   node_modules/electron/dist/Electron.app  → NekoServe.app
 *   Contents/Info.plist: CFBundleName / CFBundleDisplayName / CFBundleIdentifier
 *   node_modules/electron/path.txt (points to the executable)
 *
 * Safe to run multiple times — no-op when already patched.
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const APP_NAME = 'NekoServe'
const APP_ID   = 'com.nekoserve.app'

if (os.platform() !== 'darwin') {
  process.exit(0) // Only needed on macOS
}

const electronDir = path.join(__dirname, '../node_modules/electron')
const distDir     = path.join(electronDir, 'dist')
const pathTxtFile = path.join(electronDir, 'path.txt')

const oldBundle = path.join(distDir, 'Electron.app')
const newBundle = path.join(distDir, `${APP_NAME}.app`)

// ── Step 1: Rename bundle directory ──────────────────────────
if (fs.existsSync(oldBundle)) {
  fs.renameSync(oldBundle, newBundle)
  console.log(`[rename-electron-app] Renamed Electron.app → ${APP_NAME}.app`)
} else if (!fs.existsSync(newBundle)) {
  console.warn('[rename-electron-app] Electron.app not found — skipping')
  process.exit(0)
} else {
  // Already renamed on a previous run
}

// ── Step 2: Patch Info.plist ──────────────────────────────────
const plistPath = path.join(newBundle, 'Contents', 'Info.plist')
if (fs.existsSync(plistPath)) {
  let plist = fs.readFileSync(plistPath, 'utf8')

  plist = plist
    .replace(
      /(<key>CFBundleName<\/key>\s*<string>)[^<]*/g,
      `$1${APP_NAME}`
    )
    .replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*/g,
      `$1${APP_NAME}`
    )
    .replace(
      /(<key>CFBundleIdentifier<\/key>\s*<string>)[^<]*/g,
      `$1${APP_ID}`
    )

  fs.writeFileSync(plistPath, plist, 'utf8')
  console.log('[rename-electron-app] Patched Info.plist (CFBundleName, CFBundleDisplayName, CFBundleIdentifier)')
}

// ── Step 3: Update path.txt so electron/index.js finds the binary ──
if (fs.existsSync(pathTxtFile)) {
  let txt = fs.readFileSync(pathTxtFile, 'utf8')
  if (txt.includes('Electron.app')) {
    txt = txt.replace(/Electron\.app/g, `${APP_NAME}.app`)
    fs.writeFileSync(pathTxtFile, txt, 'utf8')
    console.log('[rename-electron-app] Updated path.txt')
  }
}

console.log(`[rename-electron-app] Done — dev mode will show "${APP_NAME}" in dock & menubar`)
