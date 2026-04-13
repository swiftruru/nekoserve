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
- Export KPI metrics as **CSV** with stable English snake_case headers (Excel-compatible across locales)
- Export filtered event log as **CSV**; the `description` column follows the current UI language

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

### Internationalization (i18n)

- **Full bilingual coverage**: Traditional Chinese (`zh-TW`) and English (`en`), with every visible string — including pages, charts, event log, error messages, learning sidebar, and the native Electron menu / About dialog — flowing through i18n.
- Built on [`react-i18next`](https://react.i18next.com/); resources are bundled and loaded synchronously before React mounts, so there is no first-frame language flash.
- **Initial language resolution order:**
  1. User preference saved in `localStorage` (key `nekoserve:locale`)
  2. System locale captured from Electron `app.getLocale()` at preload time (normalized: `zh*` → `zh-TW`, otherwise `en`)
  3. Hard fallback: `en`
- **One-click toggle** — a single `🌐 繁中 / 🌐 EN` button in the header flips the entire UI (renderer + native menu + next-opened About dialog). Changes persist across relaunches.
- **Typed translation keys** — `react-i18next` module augmentation points at the canonical `zh-TW` JSON files, so `t('settings:parameters.seatCount.label')` auto-completes and any typo fails `tsc --noEmit`.
- **Renderer ↔ main sync** — when the user toggles language, the renderer notifies main via a `locale-changed` IPC message; main rebuilds the native application menu immediately.
- **Dynamic event descriptions** — the event log composes each row via `` t(`events:${eventType}`, { customerId, resourceId, ... }) ``, so the 15 customer-journey events render naturally in either language. The Python simulator's pre-formatted `description` field is kept as a debug fallback only.
- **Error messages** — `SimulatorError` is now a structured `{ type: SimulatorErrorType, error: string }` pair. The `error` field is an **English developer diagnostic** (never shown as-is); the renderer always localizes via `` t(`errors:${error.type}`) `` so the same code path feeds both languages.
- **Locale-aware exports** — CSV headers are always English `snake_case` (for cross-locale Excel compatibility); the event-log `description` column follows the current UI language so users get a CSV that matches what they see on screen.

#### Translation resource layout

```text
src/renderer/src/i18n/
├── index.ts              # i18n init, locale detection, persistence, main-process sync
├── formatters.ts         # Intl-based percent / integer / decimal formatters
├── types.d.ts            # react-i18next module augmentation for typed keys
└── locales/
    ├── zh-TW/            # canonical schema (used as the type source)
    │   ├── common.json   # header / status / buttons / units
    │   ├── nav.json      # top navigation labels
    │   ├── settings.json # SettingsPage (sections, 13 parameters, actions, scenarios)
    │   ├── results.json  # ResultsPage KPIs, comparison, config summary, chart labels
    │   ├── eventLog.json # EventLogTable columns, summary, empty, search
    │   ├── events.json   # 15 event templates + short chip labels
    │   ├── errors.json   # SimulatorError type → user-facing message
    │   ├── scenarios.json# built-in scenario names/descriptions
    │   ├── about.json    # AboutPage (course, tech, architecture, 5 principles)
    │   └── learn.json    # LearningPanel UI shell (title, close, footer)
    └── en/               # structural subset of zh-TW
src/renderer/src/data/learnContent/
├── shared.tsx            # shared JSX style primitives (Formula, Example, Note, …)
├── zh-TW.tsx             # learning-sidebar content in Traditional Chinese
├── en.tsx                # learning-sidebar content in English
└── index.ts              # getLearnContent(locale) dispatcher
src/main/i18n.ts          # tiny main-process string table (menu + About dialog)
```

#### Adding a key

1. Add the key to the relevant `zh-TW/*.json` file (zh-TW is the canonical type source).
2. Add the same key to `en/*.json`. Missing English keys will silently fall back to zh-TW — review manually during PRs until a CI diff script is added.
3. In TSX: `const { t } = useTranslation('settings'); t('settings:parameters.seatCount.label')`.
4. `tsc --noEmit` verifies the key exists (typo → compile error), thanks to the `react-i18next` module augmentation in [types.d.ts](src/renderer/src/i18n/types.d.ts).

#### Dynamic event descriptions

Event templates use i18next interpolation keyed by the `EventType` code:

```jsonc
// events.json (zh-TW)
"CUSTOMER_SEATED": "顧客 #{{customerId}} 入座 {{resourceId}}"
// events.json (en)
"CUSTOMER_SEATED": "Customer #{{customerId}} seated at {{resourceId}}"
```

Renderer lookup (in [EventLogTable.tsx](src/renderer/src/components/EventLogTable.tsx)):

```ts
t(`events:${e.eventType}` as const, {
  customerId: e.customerId,
  resourceId: e.resourceId ?? '',
  defaultValue: e.description ?? '',  // debug fallback to Python-emitted text
})
```

The EventLogTable memoizes the rendered localized description per row, so the search box consistently matches what the user sees regardless of language.

#### Adding a third language

1. Create `src/renderer/src/i18n/locales/<lng>/*.json` as a sibling of `zh-TW` and `en`.
2. Import the new files in [src/renderer/src/i18n/index.ts](src/renderer/src/i18n/index.ts), add them to `resources`, and extend the `AppLocale` union + `SUPPORTED_LOCALES`.
3. Add a `<lng>.tsx` variant under [src/renderer/src/data/learnContent/](src/renderer/src/data/learnContent/) and update `getLearnContent()` to dispatch to it.
4. Add a new entry to the `TABLES` record in [src/main/i18n.ts](src/main/i18n.ts) for the native menu and About dialog.
5. Update the `normalizeLocale()` heuristic in both `src/renderer/src/i18n/index.ts` and `src/main/i18n.ts` if you want the language picked up from `app.getLocale()` automatically.
6. No code in pages or components needs to change — all strings already flow through `t()`.

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
