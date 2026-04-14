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
- Customer lifecycle: arrive → queue → seated → order → dine → wait for visiting cats to leave → depart
- **Autonomous cat agents** (v0.4.0): each cat is its own long-running SimPy process that idles for `catIdleInterval` minutes, then picks a random seated customer and walks over for a `catInteractionTime`-minute visit. A customer may be visited by several cats at once, and must wait for all of them to leave before standing up — so the "cat on my lap" effect directly inflates `avgTotalStayTime`.
- Poisson arrival process (exponential inter-arrival times)
- Normal-distributed service times with 20% standard deviation
- Cat rest mechanic: probabilistic post-visit rest per cat, tracked per cat identity
- Configurable random seed for reproducible results

### UI & Pages

| Page | Description |
|------|-------------|
| **⚙️ Simulation Settings** | 14 configurable parameters, 3 built-in scenario presets, custom presets persisted in `localStorage`, plus per-parameter **design rationale** with meaning / theoretical basis / default-value basis / clickable literature references — see "Defend the Setup" below |
| **📊 Statistics Results** | 4 themed sections (flow / wait / utilization / cat) with Hero Verdict, Bottleneck callout, count-up KPIs, queue-length + wait-time distributions, clickable key-moments timeline, Kingman theory-vs-simulation callout, and 14-term inline glossary tooltips — see "Teach the Results" below for full details |
| **📋 Event Log** | Full simulation trace with 15 typed event codes, chip filter, localized keyword search, row highlight synced to the Playback cursor |
| **🎞️ Simulation Playback** | Animated replay of the event log on an SVG café floor plan. Characters walk through real aisles (no more ghosting through walls), ambient decorations react to time of day, and an optional side-by-side **Live Learning Mode** overlay shows four live DES concept cards (Event-driven clock, Queue length, Little's Law, Utilization) with a Beginner / Pro level toggle |
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

### Simulation Playback

A dedicated **🎞️ Simulation Playback** page animates the full event log on a hand-drawn SVG café floor plan. Running a simulation now lands the user on this page and auto-starts playback from `t=0`; a one-click **View Results →** button in the header jumps to the statistics page for users who only want the numbers.

**Scene layout** — door → seat queue → N-cell seat grid → kitchen (M staff dots, lit when busy) → K-cell cat zone → exit. Every customer is drawn as an emoji avatar (`🙂` waiting, `📝` ordering, `⏳` waiting for food, `🍽️` dining, `😺` cat on lap, `😿` abandoning, `👋` leaving) on a stage-colored chip, and moves between zones with a 320 ms GPU-composited CSS transition.

**Autonomous cat sprites** — each cat has its own sprite that lives in the cat zone by default and flies out to a customer's seat when `CAT_VISIT_SEAT` fires, then walks back when `CAT_LEAVE_SEAT` fires. A cat may also enter 💤 rest between visits. Same rAF-driven transform animation as customers, just a second layer on top so cats sit above customer avatars when they land.

**Speech bubbles** — at key moments the customer floats a short bilingual bubble (`來囉 ✨` / `點餐了！` / `好好吃 🍽️` / `貓來了 💕` / `不等了 😤`). Bubbles are stored in reducer state, not a side effect, so scrubbing the timeline deterministically rebuilds whichever bubbles should be visible at that exact sim-minute.

**Playback transport** — play / pause, reset, five speed presets (0.5× / 1× / 2× / 4× / 8×, default 4×), step to previous / next event (`⏮` `⏭`), and a draggable **timeline scrubber** with a 60-bin event-density heatmap underneath so students can spot the busiest moments at a glance.

**Keyboard shortcuts** (shown in a tooltip next to the speed selector):

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Seek ±10 simulation minutes |
| `,` / `.` | Step to previous / next event |
| `0` | Reset to `t=0` |
| `1`–`5` | Change speed (0.5× / 1× / 2× / 4× / 8×) |

The hook guards against firing shortcuts while any `<input>` / `<textarea>` / `contenteditable` element has focus, so typing `Space` in the Event Log search box does not pause the animation.

**Click to inspect** — click any seat or any cat on the floor plan to pop up a small `InspectPopover` card with the current occupant's customer ID, lifecycle stage, and elapsed stay time. Click the same target again (or the background) to dismiss.

**Event Log ↔ Playback linking** — `playbackTime` is lifted to `App.tsx` so both pages share a single sim-time cursor:

- While Playback is playing, the corresponding `EventLogTable` row is highlighted (`bg-orange-100 ring-2`) and auto-scrolled into view (debounced 150 ms so rAF-driven updates don't thrash the scroll container).
- Clicking any row in the Event Log jumps straight to Playback with `simTime` seeded at that row's exact timestamp.

The architecture is one pure reducer `replayUpTo(ctx, simTime)` in [`src/renderer/src/utils/replay.ts`](src/renderer/src/utils/replay.ts) plus an `rAF`-driven [`usePlaybackClock`](src/renderer/src/hooks/usePlaybackClock.ts). The reducer maintains its own **virtual seat slot allocator** because the Python simulator's `seat-N` resourceId label is the count of currently-occupied seats at the moment the event fired — not a stable slot identity, see `simulator-python/simulator/core.py`. Cat events, however, now carry cat identity in `resourceId = "cat-N"` (v0.4.0, locale-neutralized in v0.5.0), so the reducer maps cats directly onto stable cat slots. Allocators are deterministic under re-replay, so scrubbing the timeline produces the same scene every time.

**Real walking paths** (v0.5.0) — every character follows a piecewise-linear L-shaped path through real aisles instead of ghosting diagonally through zone cards. Each customer / cat state transition snapshots `stageStartPos` into the reducer so a dedicated `pointOnPath(path, progress)` interpolator can move them along arc length at uniform speed. CSS `transform` transition is disabled while walking (per-frame JS positioning takes over) and re-enabled when stationary for smooth queue shuffles. Door-adjacent paths stay at door height until they reach the queue column so new customers visibly walk in instead of falling from the ceiling.

**Dramatic event moments** (v0.5.0) — `CUSTOMER_ABANDON` now plays a full 1-sim-minute mini-skit: the customer **stomps three times in place**, **angry smoke trails above their head** for the whole walk, they **slowly storm out the bottom aisle**, **slam through the front door** with a scaleX wobble + fade, and leave a **dust cloud** at the door. Implemented as a new `'abandonDrama'` scene-pulse kind with its own 1-sim-minute TTL; `PULSE_TTL_MIN` became a per-kind `Record` to support the mixed-duration world.

**Ambient scene decorations** (v0.5.0) — the background now has time-of-day-aware atmosphere: 14 🌸 cherry blossom petals drift diagonally across the whole scene (always on), 9 🧶 yarn balls hang from the ceiling with a gentle sway (always on), 3 🦋 butterflies flutter in a figure-8 during the first ~45% of sim time, and 7 ✨ fireflies twinkle with a yellow glow during the final ~40%. All pure CSS keyframes, zero React re-render cost, disabled by `prefers-reduced-motion`.

### Live Learning Mode (v0.5.0)

A dedicated **🎓 Live learning mode** overlay lives in the Playback page and turns the simulation into an actual teaching tool. Toggling it on splits the page into a 60/40 grid — scene on the left, four live concept cards on the right that update as the simulation plays.

**Four live concept cards**:

| Card | Concept | What it shows |
|---|---|---|
| **⏱️ Event-driven clock** | DES time is not continuous | Mini event timeline with the nearest 9 events, current cursor, and the "next event in +X.XX min" countdown |
| **📈 Queue length L(t)** | Queue dynamics | SVG polyline of queue length across the full run, color-coded current-time dot (blue / orange / red by severity) |
| **⚖️ Little's Law** | The universal identity `L = λ × W` | Three live numbers computed over a rolling 60-minute window, with the identity printed with actual values plugged in. Shows ✓ when within 20% tolerance, "warming up…" during the first 15 sim-min |
| **🔥 Utilization ρ** | Bottleneck detection | Three bars for seat / staff / cat resources, color-coded, with a 🔥 flag on whichever resource is the bottleneck |

**Beginner / Pro level toggle** — a pill switcher in the overlay header flips the whole panel between two completely different presentations of the same data:

- **🐣 Beginner** — metaphor-driven views for students new to DES. Little's Law gets a water cup SVG (drops flowing in from above, water level = current L, drain at bottom = wait time); Queue Length shows a literal 👤 emoji queue; Utilization labels each resource with a mood emoji ("totally free / plenty of room / getting busy / over capacity"); Event Clock highlights the countdown with a one-line plain-language hint. The "Tell me more ▼" expand shows a **plain-language word formula** in a soft pill, no Greek letters, no KaTeX.
- **🎓 Pro** (default) — the full professional view with L / λ / W / ρ symbols and KaTeX-rendered formulas in the expand (`L = λ · W`, `\bar{L} = (1/T) \int L(t) dt`, `\rho = \text{busy} / (c \cdot T)`, `t_{next} = \min\{t_{arrive}, t_{seat}, \ldots\}`). This is what a teacher wants to demo.

Same simulation, two completely different presentations. Flip the switch and the whole overlay updates instantly.

**Architecture** — a new `buildSnapshotSeries(ctx, duration, stepMin=1)` utility pre-computes metric snapshots every sim-minute when the result loads (480 snapshots × ~500 events = ~240k reducer steps, sub-second on modern JS). Each concept card then does an O(log N) binary search (`snapshotAt`) per frame plus `avgOverWindow` / `deltaOverWindow` helpers for rolling-window computations. No card ever re-runs `replayUpTo` on its own. All files live in [`src/renderer/src/components/learning/`](src/renderer/src/components/learning/) and pull copy from a new `learnMode` i18n namespace with full Beginner / Pro bilingual coverage.

### Teach the Results (v0.6.0)

v0.6.0 rebuilt the Statistics Results page into a guided, analytic, teaching-oriented experience. The core thesis: **averages hide the story — show the distribution, the timeline, and the theory right next to the number**.

**🏆 Hero Verdict** — a one-sentence headline at the top auto-classifies every run into `healthy` / `strained` / `overloaded` and writes a plain-language summary with actionable bottleneck advice. A 🐣 Beginner / 🎓 Pro pill toggle in the header flips the whole page between plain-language wording and full ρ / λ / L terminology, so the same simulation drives both student onboarding and classroom demos. Situation-specific icon pulse on entrance (green 🎉, wobbling amber ⚠️, double-flashing red 🚨), all respecting `prefers-reduced-motion`.

**🔥 BottleneckCallout** — only appears when max ρ ≥ 85 %. Identifies the busiest resource and gives resource-specific actionable advice ("expand `seatCount` — adding staff does nothing because customers never reach the service phase"). Six advice variants (3 resources × 2 levels) in both languages.

**4 themed sections** — Flow / Wait / Utilization / Cat Interaction. Each section is a `ResultsSection` card with its own icon, summary, KPI row, visualizations, and an expand-on-demand detail panel with Beginner (plain language + word formula) or Pro (academic prose + KaTeX formula) theory. Sections slide in from below as they enter the viewport via `IntersectionObserver`.

**Count-up animations** — every KPI number ticks from 0 to its target via an `rAF`-driven [`useCountUp`](src/renderer/src/hooks/useCountUp.ts) hook with easeOutQuart, gated by an `IntersectionObserver` so numbers only animate when they actually enter view. Recharts bars / slices re-enabled with entrance animations. Extended [`KpiCard`](src/renderer/src/components/KpiCard.tsx) with `numeric` / `decimals` / `numericSuffix` props that route through [`AnimatedNumber`](src/renderer/src/components/results/AnimatedNumber.tsx); old `value: string` path preserved.

**New visualizations** — all derived from `result.eventLog` with no simulator changes:

- **`QueueTimeSeries`** — mini SVG polyline of L(t) over the full run with a pulse-ringed peak marker and a natural-language peak annotation. Directly matches the Little's Law integral in the Section 2 expand detail.
- **`WaitHistogram`** — 10-bin horizontal histogram of individual `waitForSeat` times (dynamic bin count via `sqrt(N)` clamped to [8, 16]), with the mean marked by a dashed red line. Proves visually why averages hide the long tail.
- **`KeyMomentsTimeline`** — clickable narrative timeline at the top of Section 1 that auto-surfaces up to 5 moments (first arrival, queue peak, first abandon, staff peak, last served). Trivial peaks (single-person queue) are filtered out. Moments that are close together stack vertically; three or more collapse into a single merged bubble with a `+N` badge. A "quiet running" label fills any gap > 40 % of the axis so calm stretches read as intentional. **Clicking any bubble fires `onJumpToPlayback(simTime)` which App routes to the Playback page with the shared cursor seeked to that instant** — students can immediately see what the café looked like at that moment instead of just reading a summary stat.
- **`UtilizationTimeSeries`** — three stacked sparklines (seat / staff / cat) showing how each resource's utilization evolved across the run, each with a label column on the left, a filled area plot, a dashed vertical peak marker, and an average + peak annotation on the right.
- **`StayDistribution`** — side-by-side histograms of total stay time split by whether the customer met a cat. Two cohorts, two mean lines, one delta annotation ("with-cat average 48.2 min, without 41.7 min — delta 6.5 min ≈ one interaction duration"). Directly validates the Section 4 thesis that cat visits inflate stay time.
- **`FlowDiagram`** — custom SVG Sankey-lite showing how arrivals split into served / abandoned / in-flight, with particle dots sliding along each bar for a "data in motion" feel.
- **`StayBreakdown`** — horizontal stacked bar decomposing the total average stay into wait-seat + wait-order + dining + other delays (residual, capturing cat visits).

**🧪 Kingman theory vs simulation** — a new `KingmanPrediction` callout in Section 3 runs Kingman's single-station approximation `W_q ≈ (ρ / (1 − ρ)) · ((C_a² + C_s²) / 2) · E[S]` against the simulator's config (Poisson + exponential baseline) and compares the predicted queue wait against the simulator's actual `avgWaitForOrder`. Three severity tones: < 20 % gap (green "theory holds"), 20–50 % (amber "diverging"), ≥ 50 % or ρ ≥ 1 (red "theory fails — and that's the whole point of DES"). Seeing theory miss by 50 % teaches why discrete-event simulation exists as a tool separate from pure queueing theory.

**📚 Inline glossary tooltips** — every DES / queueing term that appears in Results prose (`Kingman`, `Little's Law`, `ρ`, `λ`, `Poisson`, `M/M/c`, `SimPy`, `env.run`, `W_q`, `L(t)`, `Erlang-C`, `in-flight`, `bottleneck`, `利用率`) gets a dotted orange underline. Hovering or tab-focusing shows a small popover with a label and plain-language definition. 14 terms covered bilingually. Technical: [`glossary.ts`](src/renderer/src/utils/glossary.ts) builds a length-sorted keyword index and a compiled regex; `splitByTerms(text)` splits any translated string into text / term segments; [`TermTooltip`](src/renderer/src/components/results/TermTooltip.tsx) renders each term as a focusable `<span>` and **portals the popover to `document.body`** with `position: fixed` so it escapes any overflow-clipped or scrollable ancestor. `useLayoutEffect` measures the trigger via `getBoundingClientRect` and flips the popover above / below the trigger based on available space, so terms near the top of the viewport flip downward. Horizontal position is clamped to the viewport so tooltips never overflow screen edges. `renderWithTerms(text)` is applied to Hero Verdict, Bottleneck callout, Kingman prediction, and all 8 section expand prose slots.

### Defend the Setup (v0.6.1)

v0.6.1 turns the Simulation Settings page into something that can be defended in front of a teacher. Every default value on the page now has a structured rationale, a clear theoretical framing, and clickable literature references.

**📘 Per-parameter design rationale** — every section on the Settings page (🏠 Café resources, 👥 Customer behavior, ☕ Service time, 🐱 Cat interaction, 🎲 Simulation parameters) has a collapsible **"Design rationale"** `<details>` block under the section title. Expanding it reveals a structured rationale for every parameter in that section, with five fields: **Meaning** (what it represents), **Why it's needed** (which system behavior it controls), **Theoretical basis** (the queueing-theory / DES concept it maps onto, with an inline KaTeX formula where relevant), **Default-value basis** (how the default number was estimated — common sense, analogy, or a literature range), and **📚 References** (clickable citations supporting the distribution or modeling framework). All 14 parameters are covered in both zh-TW and en.

**📚 Clickable literature references** — every citation in the rationale block, and every entry in the new bibliography card, is a live link that opens in the default browser via Electron's existing `setWindowOpenHandler`. The reference schema in `settings.json` is now `{ text, url }[]`. URL strategy: high-confidence DOIs on `doi.org` for INFORMS Operations Research papers (Little 1961, Larson 1987, L'Ecuyer 1999), the exact ACM DL URL for Law's 2010 WSC tutorial, a SIAM Review DOI for Knuth TAOCP Vol 2, and Google Scholar search URLs for books and older journals where the direct DOI is not verifiable. A new reusable [`<Ref>`](src/renderer/src/data/learnContent/shared.tsx) primitive gives every citation the same dotted-amber-underline styling, and the same style is reused inside [`ParamRationale.tsx`](src/renderer/src/components/ParamRationale.tsx) so the two surfaces look consistent.

**🎓 "A note about these numbers" sidebar card** — a new sidebar card in the Learning panel lays out the methodology stance in the author's own first-person voice, not an AI or textbook voice. It explains what a scenario assumption is, why this app uses them, the crucial **distribution vs value distinction** ("picking Exp for arrivals is backed by Kleinrock; picking 8 as the mean has no literature behind it and that's fine, they're answered separately"), and how to defend a scenario-assumption model in writing (declare it, state every guess's source, sensitivity analysis, partial on-site calibration, cite plausible ranges from literature). The card ends with an explicit "good for / not good for" split: classroom demos, what-if exploration, and SimPy practice vs real investment decisions, government reports, and precision-bounded science. A matching English translation ships with the `en` locale.

**📚 Bibliography card** — a new `references` sidebar card lists the full bibliography grouped by topic (queueing-theory foundations, core theorems, simulation methodology, agent-based modeling, waiting-line psychology / reneging, random number generation). Every line is clickable via the same `<Ref>` primitive. Closing note reminds the reader that these references support the distribution and framework choices, not the specific numerical defaults (those remain scenario assumptions).

**📘 Academic disclaimer banner** — a new card sits immediately under the scenario-preset buttons at the top of the Settings page, declaring the stance in first person before the reader scrolls to the parameters: "這頁上每個預設值都是我憑常識與對小店的觀察訂出來的情境假設，不是從哪家真實店家量測來的". The teacher sees it up front instead of buried in a tooltip.

**✍️ App copy voice (project convention)** — all new app-facing prose is written in the user's own first-person voice. This is a deliberate convention going forward: in-app methodology copy should sound like the author explaining their own design choices, not a neutral textbook. Earlier drafts of the scenario-assumption card that read like a textbook chapter were rewritten after user feedback.

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
│       ├── pages/                # SettingsPage, ResultsPage, EventLogPage, PlaybackPage, HowItWorksPage, AboutPage
│       ├── components/
│       │   ├── KpiCard, ScenarioButtons, ComparisonTable, EventLogTable, LanguageSwitcher, LearningPanel
│       │   ├── ParamInput.tsx    # Redesigned number input: floating unit, help tooltip, range bar
│       │   ├── PageTransition.tsx # Mascot-cat sweep + cream veil overlay on page change
│       │   ├── CustomCursor.tsx  # In-window pixel-art cursor overlay with hover / press states
│       │   ├── Math.tsx          # <InlineMath> / <BlockMath> KaTeX wrappers
│       │   ├── playback/         # Simulation Playback: CafeScene, PlaybackControls, TimelineScrubber, InspectPopover
│       │   └── charts/           # UtilizationChart, WaitTimeChart, CustomerPieChart
│       ├── hooks/
│       │   ├── useSimulation.ts  # Simulation state, history, elapsed timer
│       │   ├── useMousePosition.ts # Zero-rerender cursor position tracker for CustomCursor
│       │   ├── usePlaybackClock.ts # rAF sim-time clock driving the Playback animation
│       │   └── useKeyboardShortcuts.ts # Document-level key map with input-focus protection
│       ├── assets/
│       │   ├── mascot-cat.png    # Page-transition mascot sprite
│       │   └── cursors/          # CustomCursor sprites (default + hover) and archived source
│       ├── i18n/                 # react-i18next setup + typed JSON locales
│       ├── data/
│       │   ├── scenarios.ts      # Built-in + custom scenario presets (localStorage)
│       │   └── learnContent/     # Bilingual learning sidebar content (zh-TW.tsx + en.tsx)
│       └── utils/
│           ├── export.ts         # JSON / CSV export utilities
│           └── replay.ts         # Pure reducer rebuilding café state from the event log for Playback
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
