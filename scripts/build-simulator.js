#!/usr/bin/env node
/**
 * NekoServe — Cross-platform simulator build dispatcher
 * Used by: npm run build:simulator
 *
 * Detects OS and calls the appropriate build script.
 */

const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const rootDir = path.resolve(__dirname, '..')
const platform = os.platform()

console.log(`[build-simulator] Platform: ${platform}`)

try {
  if (platform === 'win32') {
    execSync(
      `powershell -ExecutionPolicy Bypass -File "${path.join(rootDir, 'scripts', 'build-simulator.ps1')}"`,
      { stdio: 'inherit', cwd: rootDir }
    )
  } else {
    // macOS or Linux
    execSync(`bash "${path.join(rootDir, 'scripts', 'build-simulator.sh')}"`, {
      stdio: 'inherit',
      cwd: rootDir,
    })
  }
} catch (err) {
  console.error('[build-simulator] Build failed:', err.message)
  process.exit(1)
}
