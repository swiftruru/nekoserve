# 🐱 NekoServe

**Cat Café Seat & Service Simulation System**

A desktop application for simulating cat café operations using Discrete Event Simulation (DES). Built with Electron + React + Python SimPy.

![NekoServe Screenshot](https://raw.githubusercontent.com/swiftruru/nekoserve/main/build-resources/icon.png)

---

## Features

### Simulation Core
- Discrete Event Simulation powered by **Python SimPy 4**
- Full customer lifecycle: arrive → queue → seated → order → dine → cat interaction → leave
- Poisson arrival process (exponential inter-arrival times)
- Normal-distributed service times with 20% standard deviation
- Cat rest mechanic (probability-based post-interaction rest)
- Configurable random seed for reproducible results

### UI & Pages
| Page | Description |
|------|-------------|
| **Simulation Settings** | 12 configurable parameters, 3 built-in scenario presets |
| **Statistics Results** | 10 KPI cards, 3 charts (utilization, wait time, customer distribution) |
| **Event Log** | Full simulation trace with type filter and keyword search |
| **About** | System info, architecture overview, simulation experiment guide |

### UX Features
- **Scenario Comparison** — run multiple configurations and compare KPIs side-by-side (up to 3 runs)
- **Custom Scenario Presets** — save, name, and persist your own parameter sets across restarts
- **Progress Animation** — exponential progress bar with elapsed-time counter during simulation
- **Window State Persistence** — restores window size and position on relaunch
- **Chart → Event Log Linking** — click a pie chart segment to jump directly to filtered event log

### Export
- Export full simulation result as **JSON**
- Export KPI metrics as **CSV** (Excel-compatible with BOM)
- Export filtered event log as **CSV**

### Learning Sidebar
- Collapsible right-side panel with classroom-notebook-style content
- Context-aware: content changes based on the current page
- Covers: DES concepts, Poisson process, Little's Law, utilization, bottleneck theory, event trace reading
- State persisted in localStorage

### Native Desktop Polish
- Custom title bar — macOS `hiddenInset` style with native traffic lights integrated into the header
- Custom app icon (all platforms: `.icns` / `.ico` / `.png`)
- Custom About dialog with app icon
- macOS Dock icon in dev mode

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop container | Electron 33 |
| Build tool | electron-vite |
| UI framework | React 18 + TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Simulation engine | Python 3.11 + SimPy 4 |
| Python packaging | PyInstaller 6 (one-folder mode) |
| Desktop packaging | electron-builder 24 |

---

## Development Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x |
| npm | 10.x |
| Python | 3.11+ |
| pip | 23.x+ |

## Setup

```bash
# Install Node dependencies
npm install

# Install Python dependencies
cd simulator-python
pip install -r requirements.txt
cd ..
```

## Running in Development

```bash
npm run dev
```

> **Note:** In dev mode, if `simulator-python/dist/simulator/` does not exist, Electron automatically falls back to running `python3 -m simulator` directly. To use the packaged binary, run `npm run build:simulator` first.

## Python Simulator (standalone)

```bash
cd simulator-python

# Run with default config
python -m simulator

# Run with custom JSON config
python -m simulator --config config.json

# Write result to file
python -m simulator --config config.json --output result.json

# Run tests
python -m pytest tests/ -v
```

## Build Python Simulator

```bash
# macOS / Linux
npm run build:simulator   # runs scripts/build-simulator.sh

# Windows (PowerShell)
npm run build:simulator   # runs scripts/build-simulator.ps1
```

Output: `simulator-python/dist/simulator/`

## Package Desktop App

> **Prerequisite:** Python simulator must be built first.

```bash
# Verify simulator binary exists
node scripts/verify-simulator.js

# Package for current platform
npm run pack

# Platform-specific
npm run pack:mac    # → dist/desktop/*.dmg + *.zip  (arm64 + x64)
npm run pack:win    # → dist/desktop/*.exe           (portable, x64)
npm run pack:linux  # → dist/desktop/*.AppImage      (x64)
```

## CI/CD (GitHub Actions)

The included `.github/workflows/build.yml` triggers on:
- Push to `main` or `develop`
- Pull requests to `main`
- Manual workflow dispatch

Each run builds on macOS / Windows / Linux runners in parallel and uploads artifacts.

Download from: **GitHub → Actions → [run] → Artifacts**

### Platform Artifacts

| Platform | Format | Notes |
|----------|--------|-------|
| macOS | `.dmg` + `.zip` | dmg for install; zip is portable |
| Windows | `.exe` (portable) | No installer needed |
| Linux | `.AppImage` | `chmod +x` then run |

### macOS — First Run (unsigned build)
```
Right-click → Open → Confirm Open
```
Or: `xattr -c /Applications/NekoServe.app`

### Windows — SmartScreen
Choose "Run anyway" when prompted.

### Linux
```bash
chmod +x NekoServe-*.AppImage
./NekoServe-*.AppImage
```

---

## Project Structure

```
nekoserve/
├── src/
│   ├── main/
│   │   ├── index.ts              # Window creation, app lifecycle, custom title bar
│   │   └── simulator-bridge.ts  # Python process IPC bridge
│   ├── preload/
│   │   └── index.ts             # contextBridge whitelist API
│   └── renderer/src/
│       ├── pages/               # SettingsPage, ResultsPage, EventLogPage, AboutPage
│       ├── components/          # KpiCard, ScenarioButtons, ComparisonTable, charts, EventLogTable
│       │   └── charts/          # UtilizationChart, WaitTimeChart, CustomerPieChart
│       ├── hooks/
│       │   └── useSimulation.ts # Simulation state, history, elapsed timer
│       ├── data/
│       │   ├── scenarios.ts     # Built-in + custom scenario presets (localStorage)
│       │   └── learnContent.tsx # Learning sidebar content
│       └── utils/
│           └── export.ts        # JSON / CSV export utilities
├── simulator-python/
│   ├── simulator/               # Python SimPy core (core.py, models.py, metrics.py)
│   └── tests/                   # Golden test cases
├── shared/contracts/
│   └── types.ts                 # Shared TypeScript interfaces
├── build-resources/             # App icons (.icns / .ico / .png)
├── scripts/                     # Build scripts (sh + ps1 + verify)
└── .github/workflows/           # CI matrix build
```

---

## Known Limitations

- macOS builds are unsigned (Gatekeeper warning on first launch)
- Windows build is a portable `.exe` with no installer
- Simulation results are not persisted across app restarts
- No multi-run averaging or confidence intervals yet

## Roadmap

- [ ] Persistent simulation history (SQLite)
- [ ] Timeline animation playback
- [ ] CSV import for batch parameter testing
- [ ] macOS / Windows code signing & notarization
- [ ] Auto-update (electron-updater)
- [ ] Advanced statistics (confidence intervals, multi-seed averaging)
