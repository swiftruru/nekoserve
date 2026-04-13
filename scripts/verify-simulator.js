#!/usr/bin/env node
/**
 * NekoServe — Verify simulator binary exists before packaging
 *
 * Called automatically by electron-builder beforePack hook (optional),
 * or manually before `npm run pack`.
 *
 * Exit 0 → binary exists
 * Exit 1 → binary missing (user must run npm run build:simulator first)
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

const rootDir = path.resolve(__dirname, '..')
const execName = os.platform() === 'win32' ? 'simulator.exe' : 'simulator'
const binaryPath = path.join(rootDir, 'simulator-python', 'dist', 'simulator', execName)

if (fs.existsSync(binaryPath)) {
  console.log(`[verify-simulator] ✓ Found: ${binaryPath}`)
  process.exit(0)
} else {
  console.error(`[verify-simulator] ✗ Not found: ${binaryPath}`)
  console.error(`[verify-simulator] Please run: npm run build:simulator`)
  process.exit(1)
}
