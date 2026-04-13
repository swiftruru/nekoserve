# NekoServe - Build Python Simulator (Windows PowerShell)
# Output: simulator-python\dist\simulator\

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
$SimDir = Join-Path $RootDir "simulator-python"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host " NekoServe - Building Python Simulator" -ForegroundColor Cyan
Write-Host " Platform: Windows" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

Set-Location $SimDir

# Check Python
$PythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PythonCmd = "python3"
} else {
    Write-Error "ERROR: python not found in PATH"
    exit 1
}
Write-Host "Using Python: $(& $PythonCmd --version)"

# Install deps
Write-Host ""
Write-Host "[1/3] Installing Python dependencies..." -ForegroundColor Yellow
& $PythonCmd -m pip install -r requirements.txt --quiet

# Clean previous build
Write-Host ""
Write-Host "[2/3] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

# Run PyInstaller
Write-Host ""
Write-Host "[3/3] Running PyInstaller..." -ForegroundColor Yellow
& $PythonCmd -m PyInstaller simulator.spec --noconfirm --clean

# Verify output
$ExecPath = Join-Path $SimDir "dist\simulator\simulator.exe"
if (Test-Path $ExecPath) {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host " Build complete!" -ForegroundColor Green
    Write-Host " Executable: $ExecPath" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
} else {
    Write-Error "ERROR: Build failed - $ExecPath not found"
    exit 1
}
