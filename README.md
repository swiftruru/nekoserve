<div align="center">

# 🐱 NekoServe

[![English](https://img.shields.io/badge/lang-English-ff69b4?style=for-the-badge)](README.md)
[![繁體中文](https://img.shields.io/badge/lang-繁體中文-lightgrey?style=for-the-badge)](README.zh-TW.md)

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
| **⚙️ Simulation Settings** | 14 configurable parameters, 3 built-in scenario presets, custom presets persisted in `localStorage`, per-parameter **design rationale**, plus **batch mode** (multi-seed replication with CI) and **sensitivity analysis** (parameter sweep) toggles |
| **⚡ Live Mode** (v2.4.0) | Streaming batch-replication page: launch N runs and watch the cumulative-mean curve climb, the 95% CI band tighten as `1/√n`, and the histogram morph from one bar into a bell. Auto-detects "stable" and tells you when you can stop. Multi-metric small-multiples grid + a live SVG café animation that cycles through every completed run as it lands. |
| **📊 Statistics Results** | 4 themed sections with Hero Verdict, Bottleneck callout, count-up KPIs, 7+ visualizations, Kingman theory callout, 14-term glossary tooltips, **persistent history panel**, **batch CI display**, **sweep chart**, **What-If Explorer**, **print/PDF export**, and **scenario config diff** in comparison view |
| **📋 Event Log** | Full simulation trace with 15 typed event codes, chip filter, localized keyword search, row highlight synced to the Playback cursor |
| **🎞️ Simulation Playback** | Animated replay of the event log on an SVG café floor plan. Characters walk through real aisles (no more ghosting through walls), ambient decorations react to time of day, and an optional side-by-side **Live Learning Mode** overlay shows four live DES concept cards (Event-driven clock, Queue length, Little's Law, Utilization) with a Beginner / Pro level toggle |
| **🎬 How it Works** | Interactive system-simulation walkthrough with 7 self-contained mini-demos (FEL stepper, resource queue, patience race, cat pool dynamics, accumulator, replication scatter, CI explorer), collapsible syntax-highlighted Python code blocks with copy button, and a floating 🐣 Beginner / 🎓 Expert toggle that switches between plain-language analogies and full DES terminology |
| **ℹ️ About** | Course background, tech stack, architecture overview, experiment design principles, version & update check |

### UX Features

- **Dark Mode** (v0.8.0): warm "bark" dark theme that preserves the cozy cafe vibe. Toggle via header button or system preference. All pages, charts, SVG visualizations, learning content, and modals are fully adapted.
- **Toast Notifications** (v0.8.0): visual feedback for exports, scenario save/delete, and disabled-tab clicks. Auto-dismiss after 3 seconds.
- **Keyboard Shortcut Help** (v0.8.0): press `Cmd+K` / `Ctrl+K` or click the `⌘K` header button to view all available shortcuts.
- **Onboarding Tour** (v0.8.0): spotlight-style 4-step walkthrough for first-time users. Press `?` or click the header button to replay anytime.
- **What's New Modal** (v0.8.0): shows release highlights on first launch after an update.
- **Fullscreen Playback** (v0.8.0): press `F` or click the expand button to hide header/nav/sidebar for an immersive playback view.
- **Drag-and-Drop Scenario Import** (v0.8.0): drop a `.json` config file onto the Settings page to load parameters instantly.
- **Smart Number Inputs** (v0.8.0): fields allow clearing to empty while editing; on blur, revert to last valid value if left blank.
- **Disabled Tab Guidance** (v0.8.0): clicking a grayed-out tab shows a toast prompting users to run a simulation first.
- **Accessibility** (v0.8.0 / v0.9.0): comprehensive WCAG 2.1 AA support -- see "Accessibility" section below for full details.
- **Persistent Simulation History** (v1.0.0): results stored in IndexedDB, survive app restarts. Browse, load, rename, delete past runs from a collapsible history panel on the Results page.
- **Multi-Seed Batch Run** (v1.0.0): run the same config N times (2-50) with different seeds. KPI cards show mean +/- 95% CI. Addresses the core DES methodology gap of distinguishing system behavior from noise.
- **Parameter Sensitivity Analysis** (v1.0.0): sweep one parameter across a range, visualize how metrics respond in an interactive line chart with optional CI bands.
- **Classroom Challenges** (v1.0.0): 8 graduated challenges (easy/medium/hard) with progressive hints, a verification system, and persisted completion state. Accessible from the navigation bar.
- **What-If Explorer** (v1.0.0): interactive sliders on the Results page for instant parameter tweaking with debounced re-simulation and delta comparison table.
- **Print / PDF Export** (v1.0.0): one-click print with a dedicated `@media print` stylesheet. Charts expand to full width, non-content elements hidden.
- **Playback Screenshot** (v1.0.0): capture the current cafe scene as PNG via Electron's `capturePage` API.
- **Scenario Config Diff** (v1.0.0): comparison view highlights parameter differences between runs with amber highlighting.
- **Scenario Comparison**: run multiple configurations and compare KPIs side-by-side
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
| `1`--`5` | Change speed (0.5x / 1x / 2x / 4x / 8x) |
| `F` | Toggle fullscreen playback (v0.8.0) |
| `Esc` | Close inspect popover |
| `Cmd+K` / `Ctrl+K` | Open keyboard shortcut help (v0.8.0) |
| `?` | Open onboarding tour (v0.8.0) |

The hook guards against firing shortcuts while any `<input>` / `<textarea>` / `contenteditable` element has focus, so typing `Space` in the Event Log search box does not pause the animation.

**Click to inspect** — click any seat or any cat on the floor plan to pop up a small `InspectPopover` card with the current occupant's customer ID, lifecycle stage, and elapsed stay time. Click the same target again (or the background) to dismiss.

**Event Log ↔ Playback linking** — `playbackTime` is lifted to `App.tsx` so both pages share a single sim-time cursor:

- While Playback is playing, the corresponding `EventLogTable` row is highlighted (`bg-orange-100 ring-2`) and auto-scrolled into view (debounced 150 ms so rAF-driven updates don't thrash the scroll container).
- Clicking any row in the Event Log jumps straight to Playback with `simTime` seeded at that row's exact timestamp.

The architecture is one pure reducer `replayUpTo(ctx, simTime)` in [`src/renderer/src/utils/replay.ts`](src/renderer/src/utils/replay.ts) plus an `rAF`-driven [`usePlaybackClock`](src/renderer/src/hooks/usePlaybackClock.ts). The reducer maintains its own **virtual seat slot allocator** because the Python simulator's `seat-N` resourceId label is the count of currently-occupied seats at the moment the event fired — not a stable slot identity, see `simulator-python/simulator/core.py`. Cat events, however, now carry cat identity in `resourceId = "cat-N"` (v0.4.0, locale-neutralized in v0.5.0), so the reducer maps cats directly onto stable cat slots. Allocators are deterministic under re-replay, so scrubbing the timeline produces the same scene every time.

**Real walking paths** (v0.5.0) — every character follows a piecewise-linear L-shaped path through real aisles instead of ghosting diagonally through zone cards. Each customer / cat state transition snapshots `stageStartPos` into the reducer so a dedicated `pointOnPath(path, progress)` interpolator can move them along arc length at uniform speed. CSS `transform` transition is disabled while walking (per-frame JS positioning takes over) and re-enabled when stationary for smooth queue shuffles. Door-adjacent paths stay at door height until they reach the queue column so new customers visibly walk in instead of falling from the ceiling.

**Dramatic event moments** (v0.5.0) — `CUSTOMER_ABANDON` now plays a full 1-sim-minute mini-skit: the customer **stomps three times in place**, **angry smoke trails above their head** for the whole walk, they **slowly storm out the bottom aisle**, **slam through the front door** with a scaleX wobble + fade, and leave a **dust cloud** at the door. Implemented as a new `'abandonDrama'` scene-pulse kind with its own 1-sim-minute TTL; `PULSE_TTL_MIN` became a per-kind `Record` to support the mixed-duration world.

**Ambient scene decorations** (v0.5.0) — the background now has time-of-day-aware atmosphere: 14 🌸 cherry blossom petals drift diagonally across the whole scene (always on), 9 🧶 yarn balls hang from the ceiling with a gentle sway (always on), 3 🦋 butterflies flutter in a figure-8 during the first ~45% of sim time, and 7 ✨ fireflies twinkle with a yellow glow during the final ~40%. All pure CSS keyframes, zero React re-render cost, disabled by `prefers-reduced-motion`.

### Live Convergence Mode (v2.4.0)

v2.4.0 adds a brand-new **⚡ Live Mode** page that turns batch replication from "press run, wait, look at one CI" into a streaming, classroom-friendly experience. Launch N replications and immediately watch the cumulative-mean curve climb, the 95% CI band tighten as `1/√n`, and the histogram morph from one sparse bar into a bell shape — the *"how many runs is enough?"* question becomes something a student can see, not just trust.

**📈 Cumulative-mean chart with live CI band** — `CumulativeMeanChart` draws an orange cumulative-mean line and a light-orange 95% CI band that visibly contracts as `1/√n`. A pulsing dot marks the most recent run; a gray dashed reference line shows run 1's lone value (so the gap between "trust one run" and "trust the average" is literally drawn); a green stable zone auto-shades the segment where the cumulative mean changed by less than 1% over the trailing 100 runs.

**📊 Live histogram + KDE smoother + shape verdict** — `LiveHistogram` renders 20 bins with an overlaid KDE (`utils/kde.ts`), median + P5 + P95 reference lines, and an auto-classified shape verdict in the corner ("approximately normal", "right-skewed (long tail right)", "long-tail distribution (heavy outliers)" — driven by `utils/distributionShape.ts`). The bell shape emerges live as samples accumulate.

**🎯 Convergence detector + celebration** — `utils/convergence.ts` watches the trailing 100 cumulative means and flips to "stable" when the relative change drops below 1%. When that happens the chart shades a green zone, a hint banner tells the user "✓ Stable: you can stop here", and a one-shot `ConfettiBurst` plays. Threshold and window are surfaced in the hint copy, so it's a teachable signal rather than a magic light.

**🐱 Live SVG café animation that cycles through completed runs** — while the batch runs, the left half of the page plays the same playback animation as the regular Playback page, but cycles through every completed run as it lands. A horizontal `RunThumbnailStrip` lets the user click any past run to scrub to that one. The cycling is gated on playback being paused / ended so we never yank the scene mid-replay.

**📐 Multi-metric small-multiples** — a grid of mini cumulative-mean charts (default 6 metrics, configurable, persisted via `MetricSelectionPanel`). Click any tile to drill into the full chart + histogram view for that metric. 21 KPIs available: wait-for-seat / wait-for-order means and percentiles, total stay, abandon rate, all three utilisations, cat-interaction rate, cat-welfare score, customer-satisfaction score, etc.

**▶️ Streaming runner with pause / stop + partial commit** — `useLiveRunner` drives one replication at a time and pumps results into a Zustand `liveBatchStore`. The runner exposes pause / resume / stop, surfaces per-run errors without aborting the batch, and hands a partial-results array to the commit step when the user stops early — so a 50-run batch the user halts at run 27 still lands a valid 27-run summary on the Results page.

**🔁 Replay curves** — a "Replay curves" button redraws every cumulative-mean / histogram bin from `n=1` to the end, animating the growth — useful for showing the convergence story to an audience after the batch is done.

**💡 Discoverability nudges** — a Settings batchHint card explains *"1 run → one dot (no idea if accurate). 20 runs → a curve + CI band (see stability)"* above the batch / sweep toggles when both are off. A one-time `BatchPromoBanner` on the Playback page nudges single-run users toward the new mode with a one-click "🚀 Run 20-replica batch now" CTA. Both hide permanently once the user runs their first batch.

**📚 N vs n notation glossary** — two new tooltipped terms (`bigN` / `lowerN`) so chart copy can use the statistical convention — **N** = total planned, **n** = completed so far — without confusing first-time viewers.

### Hirsch 2025 fidelity audit (v2.3.0)

v2.3.0 closes the gap between the four Hirsch et al. (2025) results NekoServe was implicitly citing and what the simulator + validator actually checked. The simulator now emits cat-cat interaction events, three-area time accumulators, and venue-routine markers; the validator gains a three-area benchmark and surfaces the paper's open questions instead of papering over them.

**🐈‍⬛ Cat-cat interactions modelled** -- new `CAT_CAT_AFFILIATIVE` / `CAT_CAT_AGONISTIC` event types fire at the paper's reported rate (0.58 events/cat/hr, 53/47 affiliative/agonistic split, χ²(1) = 1.264, p = 0.261). A SimPy process picks initiator + same-area partner from in-lounge non-hidden cats. New metrics `catCatAffiliativeCount`, `catCatAgonisticCount`, `catCatInteractionRatePerHour`. 24-hour Hirsch-config sims reproduce the rate to within ±3% on a fixed seed.

**📐 Three-area benchmark + validator support** -- `area_time` accumulator parallels existing state / level accumulators; emits `catAreaShare: { AREA_1, AREA_2, CAT_ROOM }`. Validation page adds the Hirsch Figure 3 left-panel breakdown (45.2% / 23.2% / 31.6%) with Wilson 95% CIs and per-area `suggest.area.*` advisories.

**👥 Human-cat attention 4-mode benchmark** -- Hirsch Figure 6 distribution surfaced in the provenance card: `NO_INTERACTION` 44.4%, `NON_CONTACT_ATTENTION` 29.0%, `CONTACT_ATTENTION` 23.2%, `NO_ATTENTION_FROM_HUMAN` 3.4%, n = 3,310 customer-scan dyads. Marked 🚧 because NekoServe does not yet emit per-dyad attention classifications -- the paper distribution is shown for transparency and future validation.

**📝 Open paper questions disclosed** -- new "📝 Open questions in the source paper" section in the provenance card: (1) Figure 6 df=18 vs df=16 mismatch between body and caption, (2) in-lounge n=8,547 vs 8,553 rounding gap, (3) cats staying >12 weeks reverting to floor without explanation. Surfaced honestly rather than glossed.

**⚠ Non-Hirsch thresholds disclosed** -- new amber card in the Methodology section lists the 5 validator knobs that are *not* from the paper (`abandonRate [0%, 25%]`, `noInteractionRate [30%, 60%]`, KS/KL soft-cap 0.3, composite weights 40/30/30, significant-gap 6pp). Keeps citations honest -- readers know which numbers are Hirsch-derived and which are V&V-framework choices.

**📊 Practical-equivalence band on CI checks** -- Hirsch's n = 12,505 makes Wilson half-widths ~±0.8pp, too tight for any Monte Carlo simulation. The provenance table now shows three-tier symbols: ✓ inside CI, ≈ outside CI but within 3pp practical band, ⚠ off by >3pp. The Wilson CI is still computed and shown; the symbol just expresses *practical* equivalence in addition to *statistical* equivalence.

**🏢 Lounge-cap and weekend-multiplier config** -- new `maxLoungeOccupancy` (default 0 = disabled) caps simultaneous in-lounge customers at the paper's policy max (14); new `weekendArrivalMultiplier` (default 1.0) scales arrival rate on days 5-6 of a 7-day cycle to match the paper's 2.5× weekend ratio. The canonical `hirsch-paper` preset leaves both off so the validator compares apples-to-apples against Hirsch's mixed-occupancy averages; both are exposed for what-if studies.

**🍱 Maintenance routines as observability markers** -- new `STAFF_FEEDING` / `STAFF_LITTER_CLEANING` event types fire at fixed within-day times (4×/day feeding, 2×/day litter cleaning per Hirsch Methods §2.1). Pure markers; do not currently alter cat behavior.

**📖 Hirsch-paper jargon glossary (+14 terms)** -- scan sampling / 掃描取樣, all-occurrence sampling / 全發生取樣, focal sampling / 焦點取樣, BORIS, in-lounge, Figure 3 / Figure 6 (Hirsch 2025), Mann-Whitney U, effect size r, facultative sociality / 兼性社會性, feigned sleep / 假寐, affiliative, agonistic, occupancy level. All provenance prose runs through `renderWithTerms` so every Hirsch term gets a hover tooltip with bilingual definition.

**🪑 Event log resource cleanup** -- customer-side events (`ORDER_START_PREPARE`, `ORDER_READY`, etc.) now carry the customer's seat label as `resourceId`. Pre-seat events render as italic "queueing"; staff-only events as "all staff". Source notes localized to zh-TW.

### Citations page hero — four interactive diagrams behind every stat pill (v2.2.0)

v2.2.0 turns the four static stat pills at the top of the Citations page (`X papers / Y methodology papers / Z cited parameters / 1 validation benchmark`) into **four clickable tabs**, each expanding its own interactive diagram in the same hero slot. The numbers are no longer decorative — click them and you see the actual papers, parameters, or benchmark data behind each one.

**🗺️ Tab 1 — story landscape (default)** keeps the existing three-tier `CitationLandscapeMap` for the 8 narrative papers (Little / Ancker ×2 / Hasugian / Dbeis / Li / Hirsch / Ropski). The component is refactored to take a `variant` prop so story and methodology share the same SVG layout.

**📐 Tab 2 — methodology landscape** is a new three-tier diagram for the 5 papers backing the *how* of NekoServe's validator: Sargent (2013) + Kleijnen (1995) on V&V framework, Rubner (2000) on Earth Mover's Distance, Agresti (2013) on categorical data analysis, Wilson (1927) on confidence intervals. Same visual grammar as tab 1; clicking a node reveals kind + contribution + DOI (new `story.landscape.details.*` entries in both locales).

**🌳 Tab 3 — parameter radial tree** (`CitationParameterRadial`) draws **NekoServe capstone → 4 source-paper hubs → 15 parameter chips** in vertical columns sorted by hub param-count: Hirsch 2025 (8 params) → Dbeis 2024 (4) → Little 1961 (2) → Ancker 1963 (1). Every chip shows the parameter name plus its literal default (`seatCount · 10 seats`, `catRestProbability · 0.2 probability`, …), extracted live from `PARAMETER_META`. Two independent popover paths: clicking a **parameter chip** shows the default value + rationale note + source DOI; clicking a **source-paper hub** shows the kind/contribution text and a full list of every parameter that hub backs as monospace pill badges. Hover dims everything outside the selected subtree.

**📊 Tab 4 — benchmark bar chart** (`CitationBenchmarkBars`) renders the 9-state Hirsch 2025 ethogram as horizontal bars sorted by empirical proportion. Each bar animates from 0 → target on mount, with a **Wilson 95% CI whisker** drawn on every row. Clicking any row opens a `StateDetailCard` with: (1) header with p, n/N, CI rendered as `<InlineMath>`; (2) ethological description ("what this state is") wrapped in `renderWithTerms`; (3) NekoServe mapping ("how the sim uses it"); (4) the full Wilson score interval formula with an **`InteractiveFormula`** chip explorer — click any of the 6 symbol chips (`p̂_Wilson`, `p̂`, `n`, `z`, `z²/2n`, `±`) to see its label, description, unit, and a concrete Hirsch-number example. The card auto-scrolls into view on click and carries a 600ms entrance animation with an orange glow pulse so first-time users don't miss the response. Three methodology tie-in chips at the bottom (`EMD · Rubner 2000`, `Wilson CI · Wilson 1927`, `χ² · Agresti 2013`) jump back to tab 2, closing the loop between *what we validate* and *how we validate it*.

Counts in every pill are computed live from the underlying data (`CITATIONS`, `PARAMETER_META`, role filtering), so adding a new methodology paper or cited parameter automatically updates the numbers and tab contents in lockstep. Tabs follow the same `role="tab" / role="tablist" / role="tabpanel"` ARIA pattern already used by the app's main nav.

### Validation page auditability (v2.1.0)

v2.1.0 transforms the Validation page from a black-box score into an auditable research tool. The χ²/KS/KL math itself is byte-identical to v2.0; v2.1 wraps a methodology, provenance, and teaching layer around it so every number on the page can be traced back to its source.

**🎓 Methodology section** — new collapsible card at the top cites Sargent (2013), Kleijnen (1995), Rubner (2000), Agresti (2013), and Wilson (1927) as the framework behind the composite scoring. A prominent alignment callout surfaces that **Hirsch 2025 itself uses χ² goodness-of-fit** (χ²(2) = 1234.2, χ²(16) = 1113.2, etc., all p < 0.001 with Bonferroni correction) — we use the same method the paper uses, not a new invention. A 3×3 complementarity matrix documents what each indicator detects and its blind spot, and the 80-point threshold is justified against Agresti's critical values and Sargent's face-validity ≥ 0.8 convention.

**📊 Per-metric breakdown panels** — each of the three sub-score cards (χ² / KS / KL) is now clickable. Expanding χ² reveals a 9-row residual contribution table (O, E, O−E, standardised residual, contribution, share-of-total as a bar chart) so you can see at a glance which category drives the deviation. Expanding KS renders a 600×200 SVG CDF overlay with a red line marking the exact category where the max gap sits. Expanding KL renders a divergent bar chart (orange = over-committed mass, sky = under-committed) with `exp(−KL) × 100%` as the approximation-fidelity reading. All three panels honestly surface the tension between strict critical values and the deliberately loose soft-cap design, rather than hiding it.

**📜 Benchmark provenance audit trail** — new collapsible card beneath the benchmark header. `benchmarks.ts` extends from `Record<string, number>` to `Record<string, CategoryBenchmark>` with `{proportion, n, total, wilsonCI95, source: {figureOrTable, page?, note?}}`. The card renders two tables (behavior distribution + vertical level) showing each category's empirical %, raw n, 95% Wilson score CI, simulation %, and ✓/⚠ whether the simulation value falls inside the CI. Source column cites the exact Figure / Table and notes any extraction judgment calls. Hirsch 2025's raw numbers grounded via direct PDF extraction: total 12,505 scans (107 observations × 70 days × 27 cats × 227 hours), in-lounge n = 8547, vertical values reported directly (1560 / 2778 / 4209).

**🧪 Teachable formulas** — all six formulas on the page (composite score, soft-cap mapping, Pearson χ², KS D, KL divergence, Wilson CI) render via `InteractiveFormula`, the clickable-chip teaching widget already used on the Results / Settings pages. Click any symbol (p̂, n, z, χ², Oᵢ, Eᵢ, (Oᵢ−Eᵢ)², Σ, k, F_sim, F_emp, D_KL, P, Q, pᵢ, qᵢ, log-ratio, etc.) to expand a card with its label, plain-language description, unit, and a concrete example plugging in this run's actual numbers. Each formula also carries a 🔍 always-visible one-liner and an optional "更多說明 ▼" deep-dive expander.

**📖 Jargon glossary (+19 terms)** — `goodness-of-fit`, `Kolmogorov-Smirnov`, `Kullback-Leibler divergence`, `Wilson score`, `CDF`, `p-value`, `critical value`, `degrees of freedom`, `standardized residual`, `residual`, `nats`, `Monte Carlo`, `Bonferroni correction`, `face validity`, `multi-metric composite`, `soft-cap`, `Type I error`, `outlier`, `V&V`. All prose on the Validation page (methodology section, interpretation callouts, provenance intro) runs through `renderWithTerms` so these jargon words auto-wrap with hover-tooltips, bilingual.

Voice is mixed: formal when citing papers ("Sargent 2013 recommends…"), first-person when explaining design choices ("I picked three complementary indicators because…"). Matches existing app copy style.

### Floor plan rebuild, passive exposure, citations story, perf (v2.0.0)

v2.0.0 bundles three major feature tracks (floor plan, passive exposure channel, citations story) plus a performance rewrite that drops the Playback / Results mount cost by ~640× on paper-sized runs.

**🏠 Real SVG floor plan** — the Playback page now paints a portrait-canvas café with real furniture anchors: Area 2 lounge with tables and cat shelving up top, a bar counter splitting the room, Area 1 booth seating below, a partitioned Cat Room with its own food / water bowls and cat flap, and an entrance corridor on the right. Customers walk through real aisles (including an L-shaped detour around the counter for Area 2 destinations), cats fade their opacity as they cross into the Cat Room, and vertical-level transitions (floor / furniture / shelf) use a quick squash-and-stretch hop.

**😊 Passive Exposure channel (PE)** — Hirsch 2025 only measured the *contact* channel (cat physically on a customer). In practice patrons also derive happiness from just *seeing* a cat nearby. A new second-channel model accumulates "visible but not visiting" cat-minutes per customer via `PE_rate = Σ_k 1[same_area] · V(k) · D(c, k) · B(k)` (visibility × distance decay × behavior weight). A new `PassiveExposureSection` on the Results page reports three KPIs (average weighted PE minutes per served customer, Passive:Active ratio, saturated 0-1 score) without perturbing the existing `customerSatisfactionScore` that validation mode scores against. A `PassiveChannelSensitivity` sub-panel lets you live-slide the weights.

**📖 Citations story mode** — the Citations page is rebuilt from a flat paper list into a scrollable story with nine animated concept modules, each in ambient (background) and scripted (step-through) modes: `LittlesLawGauge`, `BalkReneQueue`, `ArrivalDropper`, `RenegingFader`, `AttributeBars` (Li 2025 PLS-SEM weights), `EthogramWheel` (Ropski 2023), `InteractionMatrix` (Hirsch 2025), `VerticalLevelBounce` (Hirsch 2025 Figure 4), `WelfareBars`. A shared `ScriptedAnim` base drives deterministic keyframe playback with pause / scrub / reverse. `CitationLandscapeMap` and `CitationPipelineFlow` render the top-level "how these papers connect" diagrams.

**📐 Hirsch 2025 Figure 4 benchmark alignment + `hirsch-paper` preset** — the simulator's `HIRSCH_VERTICAL_BASE` now mirrors the validator's targets exactly (0.182 / 0.325 / 0.492 — the in-lounge subtotal from Figure 4, n = 8547), instead of hand-tuned approximations. A new **論文樣本（Hirsch 2025）** scenario preset anchors the full 35-seat / 27-cat / 720-minute configuration so reproducing the paper's scores is one click. The three existing presets' `seatCount` bumps from 10 to 35 to match the new floor plan footprint. The validation page pairs with this preset: its new **methodology section** cites Sargent (2013) / Kleijnen (1995) / Rubner (2000) / Agresti (2013) / Wilson (1927) as the statistical framework behind our χ²/KS/KL composite scoring, and a per-category **provenance table** shows each benchmark's raw n, 95% Wilson score CI, and the Figure/Table it was extracted from — so the "87 / 100" score is auditable all the way back to the source paper.

**⚡ Playback perf: sweep-line `buildSnapshotSeries`** — the old snapshot builder called `replayUpTo(ctx, t)` for every sample, which replays from t=0 every time. For the Hirsch scenario (750 min × 4617 events) that was ~3.46 M reducer applications on the main thread at Playback / Results mount. The new single-pass implementation carries state forward and emits at step boundaries in O(events + duration) ≈ 5.4 K ops — same output, ~640× less work, no more freeze.

**🔔 GlobalRunIndicator** — a new always-on-top overlay (top-of-screen 3 px progress bar + bottom-right floating panel) survives tab transitions and stays visible through the heavy post-result render cascade. Three modes: batch progress, live simulated-time progress streamed from Python, and a synthetic "rendering" stage inserted while React commits the heavy result cascade. Fallback exponential ease toward 95 % when no live progress has arrived yet.

**🔧 DX fixes** — DevTools no longer auto-pop on `npm run dev` (opt in with `NEKOSERVE_DEVTOOLS=1` or press `Cmd+Option+I`); dev mode always tracks the Python source and never silently prefers a stale PyInstaller binary; simulator timeout 30 s → 5 min so the Hirsch scenario can finish; validation warnings are now typed `{key, params}` i18n objects instead of hardcoded English strings; Python's initial 0 % progress emit is hoisted out of the SimPy process so it fires before `env.run()` instead of queueing behind 27 cat agents.

### Literature review, ρ_R correction, and interactive formula teaching (v1.3.0)

v1.3.0 is a major academic-rigor release that responds to advisor feedback about the 14 parameters being "observational assumptions" rather than "literature-backed curve fits". The underlying simulator shape did not change; the framing and teaching around it did.

**📚 Literature review module (2.1 to 2.5)** — five new cards in the Learning Notes sidebar cover the academic lineage end-to-end:

- 2.1 Discrete-event simulation & queueing theory foundations (Ancker & Gafarian 1963 I, II; Little 1961)
- 2.2 Empirical service-system studies in F&B (Hasugian 2020 Weibull-arrivals / Normal-service vs Dbeis 2024 Poisson-arrivals / Log-Normal-service)
- 2.3 Why cat cafés need their own model (Hirsch et al. 2025 227-hour Stockholm observation; Li et al. 2025 PLS-SEM showing pet interactivity dominates coffee quality; Ropski et al. 2023 welfare study)
- 2.4 Research gap & positioning (three identified gaps + the "bottleneck-dominance effect" observation)
- 2.5 Math correction: Dbeis 2024 ρ_R formula, including the RCRF = -2.056S + 1.37·eˢ - 1.173 nonlinear regression

Every card has per-section APA-style citations with DOI links and is written in Ruru's first-person voice.

**🧮 Corrected utilization ρ_R** — the engine now emits six new metrics (`arrivalRate`, `renegingRate`, `serviceRate`, `meanServiceTime`, `rhoClassical`, `rhoCorrected`). A new `RhoCorrectionPanel` on the Results page shows the classical `ρ = λ/(c·μ)` next to the Dbeis 2024 corrected `ρ_R = (λ − RR)/(c·μ)`. When classical ρ ≥ 1 but ρ_R < 1 the panel raises a "traditional formula misreads as collapse" warning — the misreading that Dbeis 2024 flagged, live in the UI. The original time-based utilization (`seatUtilization`, `staffUtilization`, `catUtilization`) is preserved as the engine's measured truth.

**🔗 Parameter-to-literature tooltips** — every core parameter's "📘 Design rationale" panel now cites its empirical source as the first reference, ahead of the theoretical-framework references that were already there. Mapping: seat/staff/cat counts, idle interval, rest probability, rest duration, visit duration → Hirsch et al. 2025; order / prep / dining times → Dbeis 2024; arrival interval → Dbeis 2024 + Hasugian 2020; max wait → Ancker 1963a + Dbeis 2024. DOIs open in the default browser.

**🔍 Interactive formula teaching** — every formula in the app now teaches itself:

1. **Clickable symbol chips** (`InteractiveFormula`): 11 parameters with formulas render each symbol (T, λ, μ, σ, p, X, Exp, N, Bernoulli, c, T_run) as a clickable chip. Clicking pops a card with label + plain-language description + unit + example. The existing Results-page component was generalized with `i18nNs` / `i18nBasePath` props so it can read from either the `results` or `settings` namespace. A 13-entry shared symbol dictionary lives under `settings:formulaParts.*`.
2. **🔍 one-line plain-language hint** next to every formula (11 formulaHint strings per locale): e.g. `T ~ Exp(λ), λ = 1/8` gets "interarrival time T follows Exponential with rate λ = 1/8 — one customer every 8 minutes on average."
3. **`FormulaExplain` deep-dive component**: BlockMath + 🔍 hint + optional "更多說明 ▼" expander, used in the 2.1 and 2.5 literature cards for Little's Law, classical ρ, Dbeis ρ_R, and the RCRF regression.

**📖 Glossary expansion** — 12 new bilingual terms join the shared `TermTooltip` glossary: `reneging`, `balking`, `Log-Normal`, `Weibull`, `RCRF`, `ρ_R`, `Normal distribution`, `curve fitting`, `M/M/1`, `PLS-SEM`, `chi-square`, `agent-based`. The glossary is now also wired into the Design rationale panels (auto-wrap via `renderWithTerms`) and the literature review cards (explicit `<Term k="...">` wraps), in addition to the Results page where it originated.

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

### Update Checking (v0.7.0)

Built-in update checking against GitHub Releases, with no external dependencies (uses Electron's built-in `net.fetch`).

- **Automatic check on launch**: 5 seconds after startup, silently queries the GitHub Releases API. If a newer version exists and the user hasn't skipped it, a modal notification appears. If up-to-date or offline, nothing happens. If the first check fails (e.g. network not ready), a single silent retry fires after 30 seconds.
- **Manual check via menu**: macOS: *NekoServe > Check for Updates...*; Windows/Linux: *Help > Check for Updates...*. Also available as a button on the About page's new "Version & Updates" card. The button shows a spinner and disables itself while a check is in progress; duplicate clicks are ignored.
- **Three-action update modal**: when a new version is found, the user sees:
  1. **Go to Download** (primary) — opens the GitHub Releases page in the system browser
  2. **Skip This Version** (secondary) — persists the choice; the app will not prompt for this version again
  3. **Remind Me Later** (tertiary) — dismisses the modal; the next app launch will check and prompt again
- **Release notes preview**: the "update available" modal includes a collapsible "What's New" section that shows the changelog body from the GitHub release, so users can see what changed before deciding to update.
- **Error resilience**: if a check fails, the modal shows a **Retry** button so users can re-check without dismissing and navigating back to the menu.
- **Accessible modal**: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape key to dismiss, and auto-focus on the primary action button.
- **Platform strategy**: all current build targets (macOS DMG/ZIP, Windows portable EXE, Linux AppImage) use the redirect-to-GitHub flow. The updater module is structured so a future Windows NSIS installer target could add auto-download-and-install without changing the existing code paths.
- **Bilingual**: all update UI strings ship in both zh-TW and en.
- **About page**: version display is now dynamic (reads `app.getVersion()` instead of a hardcoded i18n key), and a new "Version & Updates" card at the bottom shows the current version with a one-click update check button.

Architecture: `src/main/updater/` contains four modules (config, service, store, IPC). The renderer consumes updates via a `useUpdateCheck` hook and an `UpdateModal` component. Skipped-version preferences are persisted to `userData/update-prefs.json`.

### Accessibility (v0.9.0)

v0.9.0 is an accessibility-focused release that brings NekoServe closer to WCAG 2.1 AA compliance across keyboard navigation, screen reader support, and semantic HTML.

**Focus management**

- **`useFocusTrap` hook**: zero-dependency focus trap that saves the previously-focused element, cycles Tab/Shift+Tab within a container, and restores focus on deactivation. Applied to all 5 modal/overlay components: UpdateModal, WhatsNewModal, ShortcutHelp, OnboardingOverlay, InspectPopover.
- All modals now have proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to their heading, and Escape key to dismiss.
- **Skip to main content**: a visually-hidden link appears on first Tab press, jumping focus past the header and navigation to `<main id="main-content">`.

**Screen reader announcements**

- **`RouteAnnouncer`**: a visually-hidden `aria-live="polite"` region announces page name on every tab switch (e.g. "Navigated to Settings" / "已導覽至模擬設定").
- **Language switch toast**: changing locale fires a toast that is announced via the existing `aria-live` toast container.
- **Filter result count**: the EventLogTable announces the number of matching events when search or type filters change.

**Semantic HTML & ARIA**

- Icon-only buttons (theme toggle, shortcut help, onboarding tour, modal close buttons) now have `aria-label` in addition to `title`.
- EventLogTable: `<th scope="col">` on all column headers, `aria-label` on the search input, `aria-pressed` on filter toggle buttons, `tabIndex={0}` + Enter/Space keyboard activation on clickable rows.
- ParamInput: new `error` prop wires up `aria-invalid` + `aria-describedby` for form validation; HelpButton tooltip has `aria-expanded` + `aria-describedby`.
- SettingsPage progress bar: `aria-label` added to the `role="progressbar"` element.
- LearningPanel `<aside>`: `aria-label` for landmark identification.
- All 10 chart/visualization components: outer wrapper has `role="figure"` + `aria-label`; Recharts-based charts (UtilizationChart, WaitTimeChart, CustomerPieChart) include `sr-only` text summaries of the data.

**Playback scene keyboard access**

- CafeScene SVG: each seat and cat `<g>` element now has `tabIndex={0}`, `role="button"`, `aria-label` describing its current state (e.g. "Seat 3, occupied" / "Cat 1, visiting customer"), and Enter/Space to open the InspectPopover.
- InspectPopover: Escape key to close (previously mouse-only).

**Fullscreen button label**

- The playback fullscreen toggle button now shows a visible text label ("Fullscreen" / "Exit fullscreen" / "全螢幕" / "退出全螢幕") instead of a bare `⊞` / `⊡` symbol that was invisible to the custom cursor tooltip system.

**Existing foundations (v0.8.0)**

- `role="tablist"` / `role="tab"` / `aria-selected` on navigation
- `role="status"` + `aria-live="polite"` on toast notifications
- `role="progressbar"` with `aria-valuenow/min/max`
- Global `:focus-visible` orange outlines
- `prefers-reduced-motion` support (CSS + JS)
- Dark mode with Tailwind `dark:` classes
- `aria-hidden` on decorative elements
- Form labels with `htmlFor` on ParamInput

**i18n keys**: all new accessibility strings ship in both zh-TW and en (`common:a11y.*`, `eventLog:searchLabel`, `eventLog:filterResultAnnounce`, `playback:a11y.*`, `playback:fullscreen`, `playback:exitFullscreen`).

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
    │   ├── learn.json       # LearningPanel UI shell (title, close, footer)
    │   └── update.json      # Update checking modal + About page update card
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

## Electron UI Tests

Playwright drives the real Electron window in E2E mode, but swaps the Python simulator for a stable fixture so the UI flow stays deterministic.

```bash
# Build first, then run headless UI tests
npm run test:ui

# Same tests, but with the Electron window visible for demo
npm run test:ui:headed

# Run the separate real-simulator smoke test
npm run test:ui:real-smoke

# Open the HTML report after a run
npm run test:ui:report
```

`test:ui` and `test:ui:headed` run only deterministic mocked UI tests. `test:ui:real-smoke` is a separate smoke that exercises the real simulator bridge and requires an existing simulator binary in `simulator-python/dist/simulator/` (build it first with `npm run build:simulator` if needed). Internally it uses a plain Electron + CDP harness instead of the mocked `_electron.launch` path, so the real simulator can be verified without mixing it into the daily deterministic suite.

The current suite contains:

- `17` deterministic Playwright UI tests via `npm run test:ui`
- `1` real simulator smoke test via `npm run test:ui:real-smoke`

Coverage currently includes:

- app startup and the main Settings flow
- successful simulation runs plus error-state handling
- batch mode and sensitivity analysis / sweep mode
- Playback transport controls, timeline scrubbing, and Live Learning Mode overlay
- Results rendering, history compare/load/delete/clear, and What-If Explorer interactions
- Event Log filtering and jump-back-to-Playback flow
- Challenge Drawer smoke/persistence
- How It Works smoke tests
- Learning Panel interactions across page changes

Network-backed update checks and native save dialogs are intentionally excluded from the UI suite so local demos stay stable and repeatable.

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
│   │   ├── simulator-bridge.ts   # Python process IPC bridge
│   │   └── updater/              # Update checking: config, service, store, IPC handlers
│   ├── preload/
│   │   └── index.ts              # contextBridge whitelist API
│   └── renderer/src/
│       ├── pages/                # SettingsPage, ResultsPage, EventLogPage, PlaybackPage, HowItWorksPage, AboutPage
│       ├── components/
│       │   ├── KpiCard, ScenarioButtons, ComparisonTable, EventLogTable, LanguageSwitcher, LearningPanel
│       │   ├── ChallengeDrawer.tsx # Classroom challenges with themed confirm dialog
│       │   ├── ParamInput.tsx    # Redesigned number input: floating unit, help tooltip, range bar
│       │   ├── PageTransition.tsx # Mascot-cat sweep + cream veil overlay on page change
│       │   ├── CustomCursor.tsx  # In-window pixel-art cursor overlay with hover / press states
│       │   ├── Math.tsx          # <InlineMath> / <BlockMath> KaTeX wrappers
│       │   ├── playback/         # Simulation Playback: CafeScene, PlaybackControls, TimelineScrubber, InspectPopover
│       │   ├── results/          # SweepChart, WhatIfExplorer, HeroVerdict, BottleneckCallout, ...
│       │   └── charts/           # UtilizationChart, WaitTimeChart, CustomerPieChart
│       ├── hooks/
│       │   ├── useSimulation.ts  # Simulation state, history, batch/sweep, elapsed timer
│       │   ├── useUpdateCheck.ts # Update checking state, auto/manual check, skip/remind actions
│       │   ├── useMousePosition.ts # Zero-rerender cursor position tracker for CustomCursor
│       │   ├── usePlaybackClock.ts # rAF sim-time clock driving the Playback animation
│       │   ├── useKeyboardShortcuts.ts # Document-level key map with input-focus protection
│       │   └── useFocusTrap.ts    # Zero-dep focus trap for modals (Tab cycling + restore)
│       ├── assets/
│       │   ├── mascot-cat.png    # Page-transition mascot sprite
│       │   └── cursors/          # CustomCursor sprites (default + hover) and archived source
│       ├── i18n/                 # react-i18next setup + typed JSON locales
│       ├── data/
│       │   ├── scenarios.ts      # Built-in + custom scenario presets (localStorage)
│       │   ├── challenges.ts    # 8 classroom challenge definitions with condition predicates
│       │   └── learnContent/     # Bilingual learning sidebar content (zh-TW.tsx + en.tsx)
│       └── utils/
│           ├── export.ts         # JSON / CSV export utilities
│           ├── replay.ts         # Pure reducer rebuilding café state from the event log for Playback
│           ├── historyStore.ts   # IndexedDB CRUD for persistent simulation history
│           └── statistics.ts     # Mean, stdDev, 95% CI with t-distribution lookup
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

## Roadmap

- [x] Update checking via GitHub Releases (v0.7.0)
- [x] Dark mode with warm theme (v0.8.0)
- [x] Onboarding tour, toast notifications, keyboard shortcut help (v0.8.0)
- [x] Fullscreen playback, drag-and-drop import, What's New modal (v0.8.0)
- [x] Comprehensive accessibility / WCAG 2.1 AA (v0.9.0)
- [x] Persistent simulation history via IndexedDB (v1.0.0)
- [x] Multi-seed batch run with 95% confidence intervals (v1.0.0)
- [x] Parameter sensitivity analysis / sweep (v1.0.0)
- [x] Classroom challenges with guided hints (v1.0.0)
- [x] What-If Explorer for instant parameter comparison (v1.0.0)
- [x] Print / PDF export for Results page (v1.0.0)
- [x] Playback screenshot export as PNG (v1.0.0)
- [x] CSV import for batch parameter testing (v1.1.0)
- [x] Warm-up period configuration for initialization bias (v1.1.0)
- [x] Wait time percentiles P50/P95/P99 (v1.1.0)
- [x] Event Log: column sorting, time range filter, customer journey tracking (v1.1.0)
- [x] Simulation cancel button, parameter validation, ErrorBoundary (v1.1.0)
- [x] Interactive How-It-Works page with 7 mini-demos and Beginner/Expert toggle (v1.2.0)
- [x] Syntax-highlighted collapsible code blocks with copy button (v1.2.0)
- [x] Interactive formula explainer: click any symbol to see plain-language explanation (v1.2.0)
- [x] Floating Beginner/Expert toggle on Results and How-It-Works pages (v1.2.0)
- [x] CI formula double-render fix in learning content (v1.2.0)

---

## License

MIT. See `package.json` for details.
