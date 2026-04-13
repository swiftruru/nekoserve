<div align="center">

# 🐱 NekoServe

**Cat Café Seat & Service Simulation System**

A desktop application for simulating cat café operations using Discrete Event Simulation (DES). Built with Electron, React, and Python SimPy, designed for classroom demonstration and service system analysis.

[![Build](https://github.com/swiftruru/nekoserve/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/swiftruru/nekoserve/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/swiftruru/nekoserve?sort=semver&color=orange&logo=github)](https://github.com/swiftruru/nekoserve/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/swiftruru/nekoserve/blob/main/package.json)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![i18n](https://img.shields.io/badge/i18n-zh--TW%20%7C%20en-ff69b4)

[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![SimPy](https://img.shields.io/badge/SimPy-4-2E7D32)](https://simpy.readthedocs.io/)
[![KaTeX](https://img.shields.io/badge/KaTeX-0.16-329F5B?logo=latex&logoColor=white)](https://katex.org/)

<img src="https://raw.githubusercontent.com/swiftruru/nekoserve/main/build-resources/icon.png" alt="NekoServe" width="128" />

</div>

---

## 📦 Download

Pre-built binaries are published on every tagged release. Pick your platform below:

<div align="center">

[![Download for macOS (Apple Silicon)](https://img.shields.io/badge/Download-macOS%20Apple%20Silicon-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![Download for macOS (Intel)](https://img.shields.io/badge/Download-macOS%20Intel-555555?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![Download for Windows (portable)](https://img.shields.io/badge/Download-Windows%20Portable-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![Download for Linux (AppImage)](https://img.shields.io/badge/Download-Linux%20AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/swiftruru/nekoserve/releases/latest)

</div>

| Platform | Architecture | Format | File name pattern |
| --- | --- | --- | --- |
| macOS | Apple Silicon | `.dmg` + `.zip` | `NekoServe-<ver>-mac-arm64.*` |
| macOS | Intel | `.dmg` + `.zip` | `NekoServe-<ver>-mac-x64.*` |
| Windows | x64 | `.exe` (portable, no installer) | `NekoServe-<ver>-win-x64.exe` |
| Linux | x64 | `.AppImage` | `NekoServe-<ver>-linux-x86_64.AppImage` |

> All download badges above link to **[github.com/swiftruru/nekoserve/releases/latest](https://github.com/swiftruru/nekoserve/releases/latest)**, so they stay valid across future releases without any maintenance.

First-launch tips for unsigned builds:

- **macOS**: right-click the app, choose *Open*, confirm the dialog. Or run `xattr -c /Applications/NekoServe.app` once.
- **Windows**: click *More info* → *Run anyway* on the SmartScreen prompt.
- **Linux**: `chmod +x NekoServe-*.AppImage && ./NekoServe-*.AppImage`.

---

## Features

### Simulation Core

- Discrete Event Simulation powered by **Python SimPy 4**
- Full customer lifecycle: arrive → queue → seated → order → dine → cat interaction → leave
- Poisson arrival process (exponential inter-arrival times)
- Normal-distributed service times with 20% standard deviation
- Cat rest mechanic (probability-based post-interaction rest, modelled as a sub-process on a dynamic-capacity Container)
- Configurable random seed for reproducible results

### UI & Pages

| Page | Description |
|------|-------------|
| **⚙️ Simulation Settings** | 13 configurable parameters, 3 built-in scenario presets, custom presets persisted in `localStorage` |
| **📊 Statistics Results** | 10 KPI cards, 3 Recharts visualizations (utilization, wait time, customer outcome pie), up-to-3-run side-by-side comparison |
| **📋 Event Log** | Full simulation trace with 15 typed event codes, chip filter and localized keyword search |
| **🎬 How it Works** | Dedicated system-simulation walkthrough: event-driven clock, entity as process, queueing vs service, dynamic capacity, end-of-run aggregation (with KaTeX-rendered formulas and small SimPy code excerpts) |
| **ℹ️ About** | Course background, tech stack, architecture overview, experiment design principles |

### UX Features

- **Scenario Comparison**: run multiple configurations and compare KPIs side-by-side (up to 3 runs)
- **Custom Scenario Presets**: save, name, and persist your own parameter sets across restarts
- **Progress Animation**: exponential progress bar with elapsed-time counter during simulation
- **Window State Persistence**: restores window size and position on relaunch
- **Chart → Event Log Linking**: click a pie chart segment to jump directly to a filtered event log
- **Page Transition Animation**: a mascot cat dashes across a cream veil whenever the active tab changes. Direction-aware (left-to-right for "forward" navigation, right-to-left for "back"), driven by a shared `PAGE_ORDER` list. The React unmount/mount happens mid-animation while the veil fully covers the viewport, hiding any content flash. Fully bypassed when the OS reports `prefers-reduced-motion: reduce`.
- **Custom In-Window Cursor**: a pixel-art cat paw / arrow replaces the native cursor while the pointer is inside the app window. Hover over interactive controls swaps to a tabby-cat-with-coffee sprite with a soft drop shadow; clicks dip the sprite briefly for tactile feedback. Input fields, drag regions, and the window exterior fall back to the native cursor so typing, window dragging, and crossing window edges all feel correct. Built on a zero-rerender `useMousePosition` ref + `requestAnimationFrame` render loop, so it costs nothing on every frame.
- **Polished Parameter Inputs**: each of the 13 settings uses a redesigned `ParamInput` control with an uppercase tracking-wide label, an in-field floating unit, a hover-only `i` help tooltip (with pop animation and arrow), and a thin gradient value-in-range fill bar that shows where the current value sits between min and max. Labels reserve two lines of vertical space so long bilingual labels stay baseline-aligned with short ones.

### Export

- Export full simulation result as **JSON**
- Export KPI metrics as **CSV** with stable English `snake_case` headers (Excel-compatible across locales)
- Export filtered event log as **CSV**; the `description` column follows the current UI language

### Learning Sidebar

- Collapsible right-side panel with classroom-notebook-style content in both languages
- Context-aware: notes change based on the current page
- Covers DES concepts, Poisson process, Little's Law, utilization, bottleneck theory, and event-trace reading techniques
- Uses **KaTeX** for pretty rendering of core formulas (for example $\rho = \frac{\lambda}{\mu c}$ and $N = \lambda \cdot W$)
- Sidebar state persisted in `localStorage`

### Native Desktop Polish

- Custom title bar: macOS `hiddenInset` style with native traffic lights integrated into the header
- Custom app icon (all platforms: `.icns` / `.ico` / `.png`)
- Custom About dialog with app icon (main-process, localized)
- macOS Dock icon in dev mode
- Native application menu rebuilt live on language toggle

### Internationalization (i18n)

- **Full bilingual coverage**: Traditional Chinese (`zh-TW`) and English (`en`). Every visible string, including pages, charts, event log, error messages, learning sidebar, native Electron menu, and About dialog, flows through i18n.
- Built on [`react-i18next`](https://react.i18next.com/). All resources are bundled and loaded synchronously before React mounts, so there is no first-frame language flash.
- **Initial language resolution order**:
  1. User preference saved in `localStorage` (key `nekoserve:locale`)
  2. System locale captured from Electron `app.getLocale()` at preload time (normalized: `zh*` → `zh-TW`, otherwise `en`)
  3. Hard fallback: `en`
- **One-click toggle**: a single `🌐 繁中 / 🌐 EN` button in the header flips the entire UI (renderer + native menu + next-opened About dialog). Selection persists across relaunches.
- **Typed translation keys**: `react-i18next` module augmentation points at the canonical `zh-TW` JSON files, so `t('settings:parameters.seatCount.label')` autocompletes and any typo fails `tsc --noEmit`.
- **Renderer ↔ main sync**: when the user toggles language, the renderer notifies main via a `locale-changed` IPC message; main rebuilds the native application menu immediately.
- **Dynamic event descriptions**: the event log composes each row via `` t(`events:${eventType}`, { customerId, resourceId, ... }) ``, so the 15 customer-journey events render naturally in either language. The Python simulator's pre-formatted `description` field is kept as a debug fallback only.
- **Error messages**: `SimulatorError` is a structured `{ type: SimulatorErrorType, error: string }` pair. The `error` field is an **English developer diagnostic** (never shown as is); the renderer always localizes via `` t(`errors:${error.type}`) ``.
- **Locale-aware exports**: CSV headers are always English `snake_case` (for cross-locale Excel compatibility). The event-log `description` column follows the current UI language so users get a CSV that matches what they see on screen.

#### Translation resource layout

```text
src/renderer/src/i18n/
├── index.ts              # i18n init, locale detection, persistence, main-process sync
├── formatters.ts         # Intl-based percent / integer / decimal formatters
├── types.d.ts            # react-i18next module augmentation for typed keys
└── locales/
    ├── zh-TW/            # canonical schema (used as the type source)
    │   ├── common.json      # header / status / buttons / units
    │   ├── nav.json         # top navigation labels
    │   ├── settings.json    # SettingsPage (sections, 13 parameters, actions, scenarios)
    │   ├── results.json     # ResultsPage KPIs, comparison, config summary, chart labels
    │   ├── eventLog.json    # EventLogTable columns, summary, empty, search
    │   ├── events.json      # 15 event templates + short chip labels
    │   ├── errors.json      # SimulatorError type → user-facing message
    │   ├── scenarios.json   # built-in scenario names / descriptions
    │   ├── about.json       # AboutPage (course, tech, architecture, 5 principles)
    │   ├── howItWorks.json  # HowItWorksPage (walkthrough intro, 5 sections, outro)
    │   └── learn.json       # LearningPanel UI shell (title, close, footer)
    └── en/                  # structural subset of zh-TW

src/renderer/src/data/learnContent/
├── shared.tsx        # shared JSX style primitives (Formula, Example, Note, ...)
├── zh-TW.tsx         # learning-sidebar content in Traditional Chinese
├── en.tsx            # learning-sidebar content in English
└── index.ts          # getLearnContent(locale) dispatcher

src/renderer/src/components/
└── Math.tsx          # KaTeX wrappers: <InlineMath> / <BlockMath>

src/main/i18n.ts      # small main-process string table (menu + About dialog)
```

#### Adding a key

1. Add the key to the relevant `zh-TW/*.json` file (zh-TW is the canonical type source).
2. Add the same key to `en/*.json`. Missing English keys will silently fall back to zh-TW. Review manually during PRs until a CI diff script is added.
3. In TSX: `const { t } = useTranslation('settings'); t('settings:parameters.seatCount.label')`.
4. `tsc --noEmit` verifies the key exists (typo → compile error), thanks to the `react-i18next` module augmentation in `types.d.ts`.

#### Dynamic event descriptions

Event templates use i18next interpolation keyed by the `EventType` code:

```jsonc
// events.json (zh-TW)
"CUSTOMER_SEATED": "顧客 #{{customerId}} 入座 {{resourceId}}"
// events.json (en)
"CUSTOMER_SEATED": "Customer #{{customerId}} seated at {{resourceId}}"
```

Renderer lookup (in `EventLogTable.tsx`):

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
2. Import the new files in `src/renderer/src/i18n/index.ts`, add them to `resources`, and extend the `AppLocale` union and `SUPPORTED_LOCALES`.
3. Add a `<lng>.tsx` variant under `src/renderer/src/data/learnContent/` and update `getLearnContent()` to dispatch to it.
4. Add a new entry to the `TABLES` record in `src/main/i18n.ts` for the native menu and About dialog.
5. Update the `normalizeLocale()` heuristic in both `src/renderer/src/i18n/index.ts` and `src/main/i18n.ts` if you want the language picked up from `app.getLocale()` automatically.
6. No code in pages or components needs to change. All strings already flow through `t()`.

### Math rendering (KaTeX)

Non-trivial formulas in learning content and the How it Works walkthrough are rendered via a thin KaTeX wrapper at [`src/renderer/src/components/Math.tsx`](src/renderer/src/components/Math.tsx):

```tsx
import { InlineMath, BlockMath } from './components/Math'

<InlineMath formula={String.raw`\lambda = 1 / \bar T`} />
<BlockMath formula={String.raw`\rho = \dfrac{\lambda}{\mu \, c}`} />
```

Design notes:

- The KaTeX stylesheet is imported once globally in [`src/renderer/src/main.tsx`](src/renderer/src/main.tsx); no per-component CSS loading.
- LaTeX source lives directly in JSX, not in i18n JSON, because math is language-neutral.
- The wrapper sets `throwOnError: false`, `strict: 'ignore'`, and `trust: false`, so a malformed formula degrades to red inline text with a tooltip instead of blanking out the page.
- `BlockMath` reuses the amber-left-border card look of the existing `Formula` primitive, so it fits the classroom-note aesthetic.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop container | Electron 33 |
| Build tool | electron-vite 2 |
| UI framework | React 18 + TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts 2 |
| Math rendering | KaTeX 0.16 |
| i18n | react-i18next 14 |
| Simulation engine | Python 3.11 + SimPy 4 |
| Python packaging | PyInstaller (one-folder mode) |
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

---

## CI / CD (GitHub Actions)

Two workflows drive the pipeline:

### 1. Continuous integration: [`.github/workflows/build.yml`](.github/workflows/build.yml)

Triggers on push to `main` / `develop`, on PRs to `main`, or manual dispatch. Builds the full desktop app on macOS, Windows, and Linux runners in parallel and uploads workflow artifacts (retention: 30 days). Use this to verify changes before tagging a release.

Download artifacts from: **GitHub → Actions → [run] → Artifacts**.

### 2. Tagged release: [`.github/workflows/release.yml`](.github/workflows/release.yml)

Triggers on a semver tag push (`v*.*.*`). Splits into two jobs:

1. **build** (matrix: `macos-latest` + `windows-latest`): builds the PyInstaller Python simulator, the Electron bundle, and packages the desktop app. Uploads the packaged files as workflow artifacts.
2. **publish** (Ubuntu, `needs: build`): downloads all matrix artifacts, verifies that `changelog/vX.Y.Z.md` exists, and creates / updates a GitHub Release via `softprops/action-gh-release`, using the per-version changelog file as the release body.

This keeps release notes **per version** and attaches the correct binaries for every tag automatically. See the [`changelog/`](changelog/) directory for the per-version notes.

### Platform artifacts

| Platform | Format | Notes |
|----------|--------|-------|
| macOS | `.dmg` + `.zip` (arm64 and x64) | dmg for install; zip is portable |
| Windows | `.exe` (portable, x64) | No installer needed |
| Linux | `.AppImage` (x64) | `chmod +x` then run |

---

## Project Structure

```text
nekoserve/
├── .github/workflows/
│   ├── build.yml                 # CI build matrix (mac / win / linux)
│   └── release.yml               # Tag-triggered release build + publish
├── changelog/                    # Per-version release notes (vX.Y.Z.md)
├── src/
│   ├── main/
│   │   ├── index.ts              # Window creation, app lifecycle, custom title bar
│   │   ├── i18n.ts               # Main-process string table (menu + About dialog)
│   │   └── simulator-bridge.ts   # Python process IPC bridge
│   ├── preload/
│   │   └── index.ts              # contextBridge whitelist API
│   └── renderer/src/
│       ├── pages/                # SettingsPage, ResultsPage, EventLogPage, HowItWorksPage, AboutPage
│       ├── components/
│       │   ├── KpiCard, ScenarioButtons, ComparisonTable, EventLogTable, LanguageSwitcher, LearningPanel
│       │   ├── ParamInput.tsx    # Redesigned number input: floating unit, help tooltip, range bar
│       │   ├── PageTransition.tsx # Mascot-cat sweep + cream veil overlay on page change
│       │   ├── CustomCursor.tsx  # In-window pixel-art cursor overlay with hover / press states
│       │   ├── Math.tsx          # <InlineMath> / <BlockMath> KaTeX wrappers
│       │   └── charts/           # UtilizationChart, WaitTimeChart, CustomerPieChart
│       ├── hooks/
│       │   ├── useSimulation.ts  # Simulation state, history, elapsed timer
│       │   └── useMousePosition.ts # Zero-rerender cursor position tracker for CustomCursor
│       ├── assets/
│       │   ├── mascot-cat.png    # Page-transition mascot sprite
│       │   └── cursors/          # CustomCursor sprites (default + hover) and archived source
│       ├── i18n/                 # react-i18next setup + typed JSON locales
│       ├── data/
│       │   ├── scenarios.ts      # Built-in + custom scenario presets (localStorage)
│       │   └── learnContent/     # Bilingual learning sidebar content (zh-TW.tsx + en.tsx)
│       └── utils/
│           └── export.ts         # JSON / CSV export utilities
├── simulator-python/
│   ├── simulator/                # Python SimPy core (core.py, models.py)
│   └── tests/                    # Golden test cases
├── shared/contracts/
│   └── types.ts                  # Shared TypeScript interfaces
├── build-resources/              # App icons (.icns / .ico / .png)
└── scripts/                      # Build scripts (sh + ps1 + verify)
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
- [ ] Third UI language (Japanese?)

---

## License

MIT. See `package.json` for details.
