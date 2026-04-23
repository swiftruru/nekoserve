<div align="center">

# 🐱 NekoServe

[![English](https://img.shields.io/badge/lang-English-lightgrey?style=for-the-badge)](README.md)
[![繁體中文](https://img.shields.io/badge/lang-繁體中文-ff69b4?style=for-the-badge)](README.zh-TW.md)

**貓咪咖啡廳座位與服務模擬系統**

一款以離散事件模擬（DES）模擬貓咪咖啡廳營運的桌面應用程式。採用 Electron、React、Python SimPy 打造，適合課堂展示與服務系統分析。

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

## 📦 下載

每次 tag 發版都會附上預先編譯好的二進位檔，依平台挑選即可：

<div align="center">

[![下載 macOS (Apple Silicon)](https://img.shields.io/badge/Download-macOS%20Apple%20Silicon-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![下載 macOS (Intel)](https://img.shields.io/badge/Download-macOS%20Intel-555555?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![下載 Windows (portable)](https://img.shields.io/badge/Download-Windows%20Portable-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/swiftruru/nekoserve/releases/latest)
[![下載 Linux (AppImage)](https://img.shields.io/badge/Download-Linux%20AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/swiftruru/nekoserve/releases/latest)

</div>

| 平台 | 架構 | 格式 | 檔名規則 |
| --- | --- | --- | --- |
| macOS | Apple Silicon | `.dmg` + `.zip` | `NekoServe-<ver>-mac-arm64.*` |
| macOS | Intel | `.dmg` + `.zip` | `NekoServe-<ver>-mac-x64.*` |
| Windows | x64 | `.exe`（免安裝 portable） | `NekoServe-<ver>-win-x64.exe` |
| Linux | x64 | `.AppImage` | `NekoServe-<ver>-linux-x86_64.AppImage` |

> 上方所有下載 badge 都連到 **[github.com/swiftruru/nekoserve/releases/latest](https://github.com/swiftruru/nekoserve/releases/latest)**，不需要跟著版本手動更新。

未簽章版本首次啟動小提醒：

- **macOS**：對 app 按右鍵選「打開」再確認一次；或執行一次 `xattr -c /Applications/NekoServe.app`。
- **Windows**：SmartScreen 跳出時點「其他資訊」→「仍要執行」。
- **Linux**：`chmod +x NekoServe-*.AppImage && ./NekoServe-*.AppImage`。

---

## 功能

### 模擬核心

- 以 **Python SimPy 4** 驅動的離散事件模擬
- 顧客生命週期：到店 → 排隊 → 入座 → 點餐 → 用餐 → 等訪問的貓離開 → 離店
- **自主貓代理人**（v0.4.0）：每隻貓是獨立的 SimPy 長時程 process，`catIdleInterval` 分鐘閒置後隨機挑一位入座顧客靠過去互動 `catInteractionTime` 分鐘。一位顧客可能同時被多隻貓包圍，必須等全部的貓都離開才能起身，所以「貓在腿上」效應會直接推高 `avgTotalStayTime`。
- Poisson 抵達流程（指數分布的到店間隔）
- 常態分布服務時間（標準差 20%）
- 貓休息機制：每隻貓訪問後有一定機率進入休息，並以貓身份分別追蹤
- 可設定隨機 seed 讓結果可重現

### 介面與頁面

| 頁面 | 說明 |
|------|-------------|
| **⚙️ 模擬設定** | 14 個可調參數、3 個內建情境預設、客製預設存在 `localStorage`、每個參數都附 **設計理由**；另外還有 **批次模式**（多 seed 重複跑 + 信賴區間）與 **敏感度分析**（參數掃描）開關 |
| **📊 統計結果** | 4 個主題區塊、Hero Verdict、Bottleneck 提示、數字 count-up 動畫、7+ 種視覺化、Kingman 理論提示、14 個術語的 glossary tooltip、**持久化歷史面板**、**批次 CI 顯示**、**掃描圖表**、**What-If Explorer**、**列印/PDF 匯出**、比較視圖中的 **情境設定 diff** |
| **📋 事件日誌** | 完整模擬軌跡，15 種事件代碼、chip 過濾、依當前語言搜尋、列高亮和 Playback 游標同步 |
| **🎞️ 模擬回放** | 用 SVG 咖啡廳平面圖把事件日誌動畫化播放出來。角色依真實走道行走（不再穿牆斜切），環境裝飾隨時間變化，可選側邊 **Live Learning Mode** 疊層顯示四張 DES 概念即時卡（事件驅動時鐘、佇列長度、Little's Law、利用率），並提供 Beginner / Pro 等級切換 |
| **🎬 How it Works** | 互動式系統模擬教學頁，含 7 個獨立小示範（FEL stepper、資源佇列、patience race、cat pool、accumulator、replication scatter、CI explorer）、可收合的語法高亮 Python 程式區塊附複製鈕，以及浮動的 🐣 Beginner / 🎓 Expert 切換，在白話比喻與完整 DES 術語之間切換 |
| **ℹ️ 關於** | 課程背景、技術堆疊、架構概覽、實驗設計原則、版本與更新檢查 |

### UX 特色

- **深色模式**（v0.8.0）：暖色 "bark" 深色主題，保留咖啡廳溫暖氣氛。可從 header 按鈕或系統偏好切換，所有頁面、圖表、SVG、學習內容與 modal 都完整支援。
- **Toast 通知**（v0.8.0）：匯出、情境存取刪除、disabled tab 點擊時的視覺回饋，3 秒自動消失。
- **鍵盤快捷鍵說明**（v0.8.0）：按 `Cmd+K` / `Ctrl+K` 或點 header 上的 `⌘K` 查看所有快捷鍵。
- **新手導覽**（v0.8.0）：聚光燈風格的 4 步驟導覽，首次使用時出現；之後可按 `?` 或點 header 按鈕重播。
- **What's New Modal**（v0.8.0）：更新後首次啟動會顯示該版本亮點。
- **全螢幕回放**（v0.8.0）：按 `F` 或展開按鈕隱藏 header/nav/sidebar，沉浸式播放。
- **拖放情境匯入**（v0.8.0）：把 `.json` 設定檔拖進 Settings 頁即可立即載入參數。
- **聰明的數字輸入**（v0.8.0）：欄位可清空編輯，失焦時若留空則還原到上一個有效值。
- **Disabled Tab 引導**（v0.8.0）：點灰色 tab 會跳 toast 提示先跑模擬。
- **無障礙**（v0.8.0 / v0.9.0）：完整 WCAG 2.1 AA 支援，詳見下方「無障礙」章節。
- **持久化模擬歷史**（v1.0.0）：結果存在 IndexedDB，重開 app 還在。可從 Results 頁的收合歷史面板瀏覽、載入、重新命名、刪除過往執行。
- **多 seed 批次執行**（v1.0.0）：同一組設定跑 N 次（2–50）不同 seed，KPI 卡顯示平均值 +/- 95% CI。補上 DES 方法論中「區分系統行為與雜訊」的核心缺口。
- **參數敏感度分析**（v1.0.0）：在範圍內掃描單一參數，用可選帶 CI 的互動式折線圖呈現指標如何變化。
- **課堂挑戰**（v1.0.0）：8 道分級挑戰（easy / medium / hard），附漸進式提示、自動驗證與完成狀態持久化。從導覽列進入。
- **What-If Explorer**（v1.0.0）：Results 頁上的互動滑桿，即時調整參數、debounced 重跑模擬、以 delta 比較表呈現。
- **列印 / PDF 匯出**（v1.0.0）：一鍵列印，專用 `@media print` 樣式。圖表展開成整頁寬，非內容元素隱藏。
- **回放截圖**（v1.0.0）：透過 Electron `capturePage` API 把當前咖啡廳畫面存成 PNG。
- **情境設定 diff**（v1.0.0）：比較視圖用琥珀色 highlight 標出兩次 run 的參數差異。
- **情境比較**：跑多組設定、KPI 並排比對
- **客製情境預設**：儲存、命名、跨重開保留你自己的參數集
- **進度動畫**：指數型進度條 + 執行期間經過時間計數
- **視窗狀態持久化**：重開還原視窗大小與位置
- **圖表 → 事件日誌連結**：點圓餅圖區段直接跳到過濾好的事件日誌
- **頁面轉場動畫**：切 tab 時一隻吉祥物貓衝過乳白色 veil，方向感應（前進 left-to-right、返回 right-to-left），由共用 `PAGE_ORDER` 列表驅動。React unmount / mount 發生在 veil 完全覆蓋期間，藏住內容閃爍。OS 回報 `prefers-reduced-motion: reduce` 時完全停用。
- **視窗內客製游標**：游標進入 app 視窗時，pixel-art 貓爪 / 箭頭取代系統游標。懸停互動元件時切換為端著咖啡的虎斑貓 sprite 並帶柔陰影，點擊時 sprite 短暫下沉回饋觸感。輸入欄位、拖曳區與視窗外保留原生游標，打字、拖視窗、跨視窗邊界都維持正確體感。底層是零 rerender 的 `useMousePosition` ref + `requestAnimationFrame` render loop，每禎零成本。
- **精修過的參數輸入**：13 個設定都用重新設計的 `ParamInput`，有大寫加寬間距的 label、欄位內浮動單位、hover 才出現的 `i` 提示 tooltip（含彈跳動畫與箭頭），以及標示當前值位於 min / max 區間位置的漸層填充條。Label 預留兩行空間，讓中英文長短不一時也能與其他欄位基線對齊。

### 模擬回放

專屬的 **🎞️ 模擬回放** 頁面用手繪 SVG 平面圖把完整事件日誌動畫呈現。跑完模擬後直接進這頁並從 `t=0` 開始自動播放；header 上「檢視結果 →」按鈕一鍵跳統計頁，給只想看數字的使用者。

**場景布局** — 門口 → 候位排隊區 → N 格座位 → 廚房（M 個員工點，忙碌時亮燈）→ K 格貓活動區 → 出口。每位顧客是 emoji avatar（`🙂` 等待、`📝` 點餐、`⏳` 等餐、`🍽️` 用餐、`😺` 貓在腿上、`😿` 放棄、`👋` 離開）畫在分階段配色的 chip 上，每次換區帶 320 ms GPU 合成的 CSS transition。

**自主貓 sprite** — 每隻貓有自己的 sprite，平時在貓區，`CAT_VISIT_SEAT` 觸發時飛向目標座位、`CAT_LEAVE_SEAT` 時走回來，訪問之間也可能進入 💤 休息。和顧客同樣用 rAF 驅動 transform 動畫，只是疊在第二層，所以落地時會在顧客之上。

**對話泡泡** — 關鍵時刻顧客會短暫浮現雙語對白（`來囉 ✨` / `點餐了！` / `好好吃 🍽️` / `貓來了 💕` / `不等了 😤`）。泡泡存在 reducer state 裡、不是 side effect，所以拉 timeline scrubber 會 deterministic 重建該 sim-minute 應該出現的泡泡。

**回放控制** — 播放 / 暫停、重設、5 段速度（0.5× / 1× / 2× / 4× / 8×，預設 4×）、往前 / 往後一個事件（`⏮` `⏭`），可拖曳的 **timeline scrubber** 下方有 60 bin 的事件密度熱度圖，讓學生一眼看出最忙時段。

**鍵盤快捷鍵**（速度選擇器旁有 tooltip 列出）：

| 鍵 | 動作 |
| --- | --- |
| `Space` | 播放 / 暫停 |
| `←` / `→` | 前後跳 10 模擬分鐘 |
| `,` / `.` | 跳上 / 下一個事件 |
| `0` | 重設到 `t=0` |
| `1`--`5` | 切換速度（0.5x / 1x / 2x / 4x / 8x） |
| `F` | 切換全螢幕回放（v0.8.0） |
| `Esc` | 關閉 inspect popover |
| `Cmd+K` / `Ctrl+K` | 開啟鍵盤快捷鍵說明（v0.8.0） |
| `?` | 開啟新手導覽（v0.8.0） |

hook 會偵測焦點是否在 `<input>` / `<textarea>` / `contenteditable`，所以在事件日誌搜尋框按 `Space` 不會暫停動畫。

**點擊檢視** — 點平面圖上任何座位或貓會跳出小的 `InspectPopover` 卡片，顯示目前佔用者的顧客 ID、生命週期階段、已停留時間。再點一次或點背景關閉。

**事件日誌 ↔ 回放連動** — `playbackTime` 提升到 `App.tsx`，讓兩頁共享同一個 sim 時間游標：

- 回放播放時，對應的 `EventLogTable` 列會 highlight（`bg-orange-100 ring-2`）並自動捲入視野（debounce 150 ms 避免 rAF 更新打亂捲動）。
- 點事件日誌任何一列，直接跳到回放頁並把 `simTime` 設到該列時間戳。

架構上是一個 pure reducer `replayUpTo(ctx, simTime)` 位於 [`src/renderer/src/utils/replay.ts`](src/renderer/src/utils/replay.ts)，搭配 rAF 驅動的 [`usePlaybackClock`](src/renderer/src/hooks/usePlaybackClock.ts)。reducer 會維護自己的 **虛擬座位槽分配器**，因為 Python 模擬器的 `seat-N` resourceId 標的是事件發生當下佔用座位總數，不是穩定的槽位 ID，詳見 `simulator-python/simulator/core.py`。貓事件則已經把貓身份帶在 `resourceId = "cat-N"` 裡（v0.4.0；v0.5.0 改為語言中立），reducer 直接對應到穩定的貓槽。分配器在重播時是 deterministic 的，拉 timeline 每次畫面都一樣。

**真實行走路徑**（v0.5.0）— 每個角色都沿著實際走道走 L 形分段折線，不再斜穿過各區卡片。每次顧客 / 貓狀態轉換時 reducer 會 snapshot `stageStartPos`，專屬的 `pointOnPath(path, progress)` 插值器依弧長等速移動。行走時停用 CSS `transform` transition（改由 JS 每禎定位），停止時再恢復以保持排隊挪位的流暢。靠門的路徑在進入排隊欄前會保持門口高度，讓新顧客看起來真的走進店裡而不是從天花板掉下來。

**戲劇化事件瞬間**（v0.5.0）— `CUSTOMER_ABANDON` 現在會播放整整 1 模擬分鐘的小短劇：顧客 **原地跺腳三下**、走路途中頭上 **飄黑煙**、**慢慢從下方走道生氣離開**、**撞開大門** 帶 scaleX 抖動淡出，最後在門口留下 **灰塵雲**。以新的 `'abandonDrama'` scene-pulse kind 實作，帶自己的 1 模擬分鐘 TTL；`PULSE_TTL_MIN` 也改成 per-kind `Record` 支援不同時長。

**環境裝飾**（v0.5.0）— 背景現在有時間感的氛圍：14 朵 🌸 櫻花瓣斜飄過整個場景（永遠開著）、9 顆 🧶 毛線球從天花板微晃（永遠開著）、3 隻 🦋 蝴蝶在前 ~45% 時間做八字飛舞、7 隻 ✨ 螢火蟲在後 ~40% 閃黃光。全部純 CSS keyframes，零 React rerender，`prefers-reduced-motion` 時停用。

### 店面平面圖重建、被動曝光通道、引用故事化、效能大升級（v2.0.0）

v2.0.0 一次包裝了三條主要的功能線（平面圖、被動曝光通道、引用故事化），外加把論文尺寸模擬在 Playback / Results 頁面 mount 時的計算量砍掉約 640 倍的效能改寫。這是第一個版本能讓 Hirsch 2025 完整配置（35 座、27 貓、720 分鐘）在「模擬完成」後立刻進到模擬回放，不再卡住好幾秒。

**🏠 真實的 SVG 店面平面圖** — 模擬回放頁面不再用抽象色塊，改成直式畫布的實體店面：上方 Area 2 包含餐桌和貓咪層架、中間吧台把空間切開、下方 Area 1 是卡座、右側貓咪房間隔著玻璃有自己的食盆水盆和貓門，右邊是入口走道。顧客走真實的走道（要去 Area 2 會 L 型繞過吧台），貓咪穿越貓咪房時透明度會漸變，垂直層級切換（地板 / 家具 / 層架）用快速的 squash-and-stretch 跳躍動畫。

**😊 被動曝光通道（PE）** — Hirsch 2025 只測了「接觸」通道（貓實際靠在顧客身上）。實務上顧客光是「看見」附近有貓也會開心。新的第二通道模型用 `PE_rate = Σ_k 1[同區] · V(k) · D(c, k) · B(k)`（可見度 × 距離衰減 × 行為權重）累積每位顧客的「看得到但沒來訪」的貓咪分鐘數。新的 `PassiveExposureSection` 在統計結果頁顯示三個 KPI（每位已服務顧客的平均加權 PE 分鐘、被動 : 主動 比例、飽和化 0-1 分數），完全不動到原本 `customerSatisfactionScore`（那是驗證模式的 baseline）。新增 `PassiveChannelSensitivity` 小面板可以即時拉動權重觀察 PE 如何變化。

**📖 引用故事化** — 文獻依據頁從論文清單重建為捲動式故事，九個概念動畫模組各有 ambient（背景恆動）和 scripted（逐步解說）兩種模式：`LittlesLawGauge`、`BalkReneQueue`、`ArrivalDropper`、`RenegingFader`、`AttributeBars`（Li 2025 PLS-SEM 構念權重）、`EthogramWheel`（Ropski 2023）、`InteractionMatrix`（Hirsch 2025）、`VerticalLevelBounce`（Hirsch 2025 Figure 4）、`WelfareBars`。共享的 `ScriptedAnim` 基底組件提供確定性的 keyframe 播放、暫停、拖曳、倒轉。`CitationLandscapeMap` 與 `CitationPipelineFlow` 畫出頂層「這些論文怎麼串起來」的概念圖。

**📐 Hirsch 2025 Figure 4 基準值對齊 + `hirsch-paper` 情境預設** — 模擬器的 `HIRSCH_VERTICAL_BASE` 現在精準對上驗證器的目標值（0.182 / 0.325 / 0.492，來自 Figure 4 的「在咖啡廳內」小計，n = 8547），不再是手調近似值。新增「**論文樣本（Hirsch 2025）**」情境預設，一鍵載入完整的 35 座 / 27 貓 / 720 分鐘配置，讓重現論文分數變成一次點擊。原本三個預設（平日白天 / 假日尖峰 / 貓咪午睡）的 `seatCount` 從 10 升到 35，以配合新平面圖的店面尺度。

**⚡ 回放效能：sweep-line 版 `buildSnapshotSeries`** — 舊版每個取樣點都呼叫 `replayUpTo(ctx, t)`，每次都從 t=0 重播一次。Hirsch 情境（750 分鐘 × 4617 事件）等於在 Playback / Results mount 時把 ~346 萬次事件套用塞進同一個 frame。新版單次 pass 帶著 state 向前推進，在取樣邊界當下拍快照，複雜度從 O(events × duration) 降到 O(events + duration)，只剩 ~5400 次操作，輸出完全等價、約 **640 倍快**，再也不卡。

**🔔 GlobalRunIndicator** — 新的全域執行中指示器（螢幕頂端 3 px 進度條 + 右下浮動面板）活在頁面樹之外，切換分頁不會消失，也會跨越「結果 commit 期間 React 凍結」這段過渡。三種模式：批次進度、Python 即時串流的模擬時間進度、以及在 React 開始套用結果時手動插入的 render stage（避免使用者看到空白頁以為當掉）。沒收到即時進度時退化成指數曲線逼近 95% 的 fallback，確保進度條總是在動。

**🔧 開發體驗** — `npm run dev` 不再自動彈 DevTools（需要的話設 `NEKOSERVE_DEVTOOLS=1` 或按 `Cmd+Option+I`）；dev 模式一律直接跑 Python 原始碼，不再吃 `dist/simulator/` 下的舊 PyInstaller binary；模擬器 timeout 從 30 秒放寬到 5 分鐘，Hirsch 情境才跑得完；驗證警告現在是 `{key, params}` 結構的 i18n 物件，不再是寫死的英文字串；Python 的 0% 初始進度 emit 從 SimPy process 裡搬出來，在 `env.run()` 之前就直接寫 stdout，不用排隊等 27 個 cat agent。

### 文獻探討、ρ_R 修正與互動式公式教學（v1.3.0）

v1.3.0 是學術嚴謹度的大版本更新，回應指導教授「14 個參數是觀察假設、不是 curve fitting」的意見。模擬器本體沒變，變的是整套框架與教學的呈現方式。

**📚 文獻探討模組（2.1 到 2.5）** — 學習筆記側欄新增五張卡片，把學術脈絡從頭到尾串一次：

- 2.1 離散事件模擬與排隊理論基礎（Ancker & Gafarian 1963 I, II；Little 1961）
- 2.2 咖啡廳與餐飲業服務系統實證（Hasugian 2020 的 Weibull 到達 / Normal 服務 vs Dbeis 2024 的 Poisson 到達 / Log-Normal 服務）
- 2.3 貓咖的獨特性（Hirsch 等 2025 227 小時斯德哥爾摩觀察；Li 等 2025 PLS-SEM 證明寵物互動性壓過咖啡品質；Ropski 等 2023 動物福祉研究）
- 2.4 研究缺口與本研究定位（三個缺口 + 瓶頸主導效應觀察）
- 2.5 數學修正：Dbeis 2024 的 ρ_R 公式，含 RCRF = -2.056S + 1.37·eˢ - 1.173 非線性回歸模型

每張卡都有各節內的 APA 行內引用 + DOI 超連結，用昱如自己的第一人稱口吻寫。

**🧮 修正利用率 ρ_R** — 引擎現在多輸出六個 metric（`arrivalRate`、`renegingRate`、`serviceRate`、`meanServiceTime`、`rhoClassical`、`rhoCorrected`）。Results 頁新增 `RhoCorrectionPanel`，把古典 `ρ = λ/(c·μ)` 和 Dbeis 2024 修正後的 `ρ_R = (λ − RR)/(c·μ)` 並排給你看。古典 ρ ≥ 1 但 ρ_R < 1 時會跳「傳統公式誤判為崩潰」警示，就是 Dbeis 2024 指出的那個誤讀，直接在 UI 可見。原本的時間型利用率（`seatUtilization`、`staffUtilization`、`catUtilization`）保留當引擎實測真值。

**🔗 參數對應文獻 tooltip** — 每個核心參數的「📘 設計依據」面板，現在最上面那一筆引用就是實證來源，再下去才是原本就有的理論框架引用。對應關係：座位、店員、貓咪數，空閒間隔，休息機率，休息時間，拜訪時間 → Hirsch 等 2025；點餐 / 製餐 / 用餐時間 → Dbeis 2024；到達間隔 → Dbeis 2024 + Hasugian 2020；最大等待 → Ancker 1963a + Dbeis 2024。DOI 會直接在預設瀏覽器開啟。

**🔍 互動式公式教學** — app 裡每個公式都會自己教自己：

1. **可點擊的符號 chip**（`InteractiveFormula`）：11 個有公式的參數把每個符號（T、λ、μ、σ、p、X、Exp、N、Bernoulli、c、T_run）渲染成可點的圓角 chip。點下去會彈出說明卡（符號名稱 + 白話描述 + 單位 + 具體例子）。原本 Results 頁的元件被一般化，加上 `i18nNs` / `i18nBasePath` 兩個 prop，現在兩邊共用同一套。共用的符號字典有 13 條，放在 `settings:formulaParts.*`。
2. **🔍 一行白話翻譯** 永遠顯示在公式下方（11 個 formulaHint 字串 × 兩個語系）：例如 `T ~ Exp(λ), λ = 1/8` 會寫「到達間隔 T 服從 Exponential 分佈，率參數 λ = 1/8，平均每 8 分鐘來一位客人」。
3. **`FormulaExplain` 深度說明元件**：BlockMath + 🔍 hint + 可選的「更多說明 ▼」展開，用在 2.1、2.5 文獻卡的 Little's Law、古典 ρ、Dbeis ρ_R、RCRF 這幾個公式。

**📖 詞彙字典擴充** — `TermTooltip` 共用詞彙字典新增 12 條雙語詞條：`reneging`、`balking`、`Log-Normal`、`Weibull`、`RCRF`、`ρ_R`、`Normal distribution`、`curve fitting`、`M/M/1`、`PLS-SEM`、`chi-square`、`agent-based`。字典現在除了 Results 頁以外，也接進：模擬設定頁的「設計依據」面板（透過 `renderWithTerms` 自動包）、以及文獻探討五張卡片（用新匯出的 `<Term k="...">` JSX helper 顯式包）。

### Live Learning Mode（v0.5.0）

專屬的 **🎓 Live learning mode** 疊層位於回放頁，把模擬變成實際的教學工具。打開後頁面切成 60/40 格線，左側場景，右側四張隨模擬播放即時更新的概念卡。

**四張即時概念卡**：

| 卡片 | 概念 | 顯示內容 |
|---|---|---|
| **⏱️ 事件驅動時鐘** | DES 時間是離散的 | 最近 9 個事件的 mini timeline、當前游標、「下個事件 +X.XX 分鐘」倒數 |
| **📈 佇列長度 L(t)** | 佇列動態 | 全跑程 L(t) 的 SVG polyline、依嚴重度（藍 / 橘 / 紅）變色的當下點 |
| **⚖️ Little's Law** | 萬能恆等式 `L = λ × W` | 滾動 60 分鐘窗的三個即時數字，把恆等式連同實際值一起寫出。在 20% 容忍內顯示 ✓，前 15 模擬分鐘顯示「暖機中…」 |
| **🔥 利用率 ρ** | 瓶頸偵測 | 座位 / 員工 / 貓三條色碼長條，瓶頸資源上打 🔥 旗 |

**Beginner / Pro 等級切換** — 疊層標題有藥丸開關，把整張面板在兩種完全不同的呈現之間切換：

- **🐣 Beginner** — 給 DES 新手的比喻化視圖。Little's Law 變成水杯 SVG（水滴從上方流入，水位 = 當前 L，底部排水 = 等待時間）；佇列長度直接用 👤 emoji 排隊；利用率給每個資源貼心情 emoji（「超清閒 / 還有空位 / 有點忙 / 爆量了」）；事件時鐘用一句白話提示倒數。展開「看詳細 ▼」會秀 **白話文字公式** 放在柔和藥丸裡，不帶希臘字母、不用 KaTeX。
- **🎓 Pro**（預設）— 完整專業視圖，L / λ / W / ρ 符號和 KaTeX 公式（`L = λ · W`、`\bar{L} = (1/T) \int L(t) dt`、`\rho = \text{busy} / (c \cdot T)`、`t_{next} = \min\{t_{arrive}, t_{seat}, \ldots\}`）。這就是老師上課示範要的樣子。

同一份模擬、兩種完全不同的呈現，切開關整個疊層瞬間變身。

**架構** — 新的 `buildSnapshotSeries(ctx, duration, stepMin=1)` 工具在結果載入時預先算好每模擬分鐘的指標 snapshot（480 snapshot × ~500 事件 = ~240k reducer 步，現代 JS 一秒內搞定）。每張卡片每禎只做 O(log N) 的二分搜（`snapshotAt`），加上 `avgOverWindow` / `deltaOverWindow` 輔助函式做滾動視窗計算，沒有任何一張卡會重跑 `replayUpTo`。檔案全放在 [`src/renderer/src/components/learning/`](src/renderer/src/components/learning/)，文案來自新的 `learnMode` i18n namespace，Beginner / Pro 雙語齊備。

### Teach the Results（v0.6.0）

v0.6.0 把統計結果頁重做成有引導、有分析、給教學用的體驗。核心主張：**平均值藏了故事，就把分布、時間軸、理論直接擺在數字旁邊**。

**🏆 Hero Verdict** — 頁面最上方一句話標題，自動把每次 run 分類為 `healthy` / `strained` / `overloaded`，並附有可操作的瓶頸建議白話摘要。header 上的 🐣 Beginner / 🎓 Pro 藥丸切換把整頁在白話與完整 ρ / λ / L 術語之間切換，同一次模擬能同時支援新生入門與課堂展示。進場時依情境做對應 icon 脈衝（綠 🎉、琥珀 ⚠️ 晃動、紅 🚨 雙閃），全部尊重 `prefers-reduced-motion`。

**🔥 BottleneckCallout** — 只在 max ρ ≥ 85 % 時出現。辨識最忙資源並給針對該資源的操作建議（「擴充 `seatCount`，加員工沒用因為顧客根本進不到服務階段」）。雙語各三資源兩等級共 6 種建議。

**4 個主題區塊** — 流量 / 等候 / 利用率 / 貓互動。每個區塊是一張 `ResultsSection` 卡，有自己的 icon、摘要、KPI row、視覺化，以及可展開的詳細面板（Beginner：白話 + 文字公式；Pro：學術敘述 + KaTeX 公式）。區塊進入視窗時依 `IntersectionObserver` 由下往上滑入。

**Count-up 動畫** — 每個 KPI 數字都透過 rAF 驅動的 [`useCountUp`](src/renderer/src/hooks/useCountUp.ts) hook 用 easeOutQuart 從 0 跳到目標值，由 `IntersectionObserver` 控制只在真的進入視野才動。Recharts 的 bar / slice 重新啟用進場動畫。[`KpiCard`](src/renderer/src/components/KpiCard.tsx) 擴充了 `numeric` / `decimals` / `numericSuffix` props 走 [`AnimatedNumber`](src/renderer/src/components/results/AnimatedNumber.tsx)；原本的 `value: string` 路徑保留。

**新視覺化** — 全部從 `result.eventLog` 推出、模擬器本身不動：

- **`QueueTimeSeries`** — 全程 L(t) 的 mini SVG polyline，加上脈衝環高峰標記與自然語言高峰註記，直接呼應 Section 2 展開裡的 Little's Law 積分。
- **`WaitHistogram`** — 個別 `waitForSeat` 時間的 10 bin 橫向直方圖（bin 數依 `sqrt(N)` 動態、夾在 [8, 16]），平均用紅虛線標。視覺上證明為何平均值會蓋掉長尾。
- **`KeyMomentsTimeline`** — Section 1 頂部的可點敘事時間軸，自動抓出最多 5 個關鍵時刻（首位抵達、佇列高峰、首位放棄、員工高峰、最後一位被服務）。單人排隊等微弱高峰會過濾掉，時間接近的時刻會垂直堆疊，3 個以上會合併成一顆 `+N` badge 的氣泡。軸上若有大於 40 % 的空隙會補一個「平穩運作」標籤，讓冷靜時段看起來是刻意的。**點任一氣泡會觸發 `onJumpToPlayback(simTime)`，App 會把共用游標拉到那一刻並切到回放頁**，學生可以立刻看到該瞬間咖啡廳長什麼樣，而不是只讀一行摘要。
- **`UtilizationTimeSeries`** — 座位 / 員工 / 貓三條堆疊 sparkline，顯示每個資源利用率如何演變。各自有左側 label 欄、填色區域、虛線高峰標記、右側平均 + 高峰註記。
- **`StayDistribution`** — 依是否遇到貓切成兩組的並列直方圖，兩條平均線 + 一句 delta 註記（「有貓組平均 48.2 分鐘、無貓組 41.7 分鐘，delta 6.5 分鐘 ≈ 一次互動時長」）。直接印證 Section 4 主張：貓訪問會推高停留時間。
- **`FlowDiagram`** — 自製 SVG 的 Sankey-lite，顯示抵達如何分成已服務 / 放棄 / in-flight，每條 bar 上有粒子點滑過，帶「data in motion」感。
- **`StayBreakdown`** — 橫向堆疊條，把平均總停留時間拆成等座 + 等點餐 + 用餐 + 其他延遲（殘差，吸收貓互動）。

**🧪 Kingman 理論 vs 模擬** — Section 3 新增 `KingmanPrediction` 提示卡，對設定（Poisson + exponential baseline）跑 Kingman 單站近似 `W_q ≈ (ρ / (1 − ρ)) · ((C_a² + C_s²) / 2) · E[S]`，和模擬器實際 `avgWaitForOrder` 比較。三級嚴重度：< 20 % 差距（綠「理論成立」）、20–50 %（琥珀「開始偏離」）、≥ 50 % 或 ρ ≥ 1（紅「理論失效，這正是 DES 存在的理由」）。看到理論差 50 % 正好教學生為何 DES 是獨立於純佇列理論的工具。

**📚 內嵌術語 tooltip** — 結果頁內文裡每個 DES / 佇列術語（`Kingman`、`Little's Law`、`ρ`、`λ`、`Poisson`、`M/M/c`、`SimPy`、`env.run`、`W_q`、`L(t)`、`Erlang-C`、`in-flight`、`bottleneck`、`利用率`）都會被加上橘色虛線底線。滑鼠 hover 或 tab 焦點顯示小 popover，有標題和白話定義。雙語共 14 個術語。技術上：[`glossary.ts`](src/renderer/src/utils/glossary.ts) 建長度排序關鍵字索引與編譯好的 regex；`splitByTerms(text)` 把任何翻譯字串切成 text / term 片段；[`TermTooltip`](src/renderer/src/components/results/TermTooltip.tsx) 把每個 term 渲染成可 focus 的 `<span>`，並**把 popover portal 到 `document.body`** 用 `position: fixed`，才不會被有 overflow 或捲動的祖先裁切。`useLayoutEffect` 用 `getBoundingClientRect` 量觸發點，依空間把 popover 翻到上方或下方，靠近視窗頂端的術語會向下展開。水平位置夾在視窗內，tooltip 不會超出螢幕邊緣。`renderWithTerms(text)` 套用於 Hero Verdict、Bottleneck、Kingman prediction 與所有 8 個區塊展開內文。

### Defend the Setup（v0.6.1）

v0.6.1 把模擬設定頁做成可以在老師面前替自己辯護的樣子。頁面上每個預設值都有結構化的 rationale、清楚的理論框架、可點的文獻連結。

**📘 每參數設計理由** — 設定頁每個區塊（🏠 咖啡廳資源、👥 顧客行為、☕ 服務時間、🐱 貓互動、🎲 模擬參數）的標題下都有一個可收合的 **「設計理由」** `<details>` 區塊。展開後會看到該區塊每個參數的結構化理由，有 5 個欄位：**意義**（代表什麼）、**為何需要**（控制哪個系統行為）、**理論依據**（對應到哪個佇列理論 / DES 概念，相關時附 inline KaTeX 公式）、**預設值依據**（這個數字怎麼估出來的：常識、類比或文獻範圍）、**📚 參考文獻**（可點的引用，支撐分布或建模框架）。14 個參數 zh-TW 與 en 皆齊備。

**📚 可點的文獻引用** — rationale 內每個引用與新參考書目卡的每個條目都是透過 Electron 既有的 `setWindowOpenHandler` 開預設瀏覽器的實連結。`settings.json` 的 reference schema 現在是 `{ text, url }[]`。URL 策略：INFORMS Operations Research 論文（Little 1961、Larson 1987、L'Ecuyer 1999）用高信心 DOI 指向 `doi.org`、Law 2010 WSC tutorial 直指 ACM DL URL、Knuth TAOCP Vol 2 用 SIAM Review DOI；無法確定直接 DOI 的書與老期刊用 Google Scholar 搜尋 URL。新的共用 [`<Ref>`](src/renderer/src/data/learnContent/shared.tsx) primitive 讓所有引用都是一致的琥珀虛線底線樣式，同一套樣式也在 [`ParamRationale.tsx`](src/renderer/src/components/ParamRationale.tsx) 中重用，兩種介面觀感一致。

**🎓 「關於這些數字」側邊卡** — Learning 面板新增側邊卡，用作者自己的第一人稱聲音（不是 AI 或教科書）說明方法論立場。解釋什麼叫情境假設、這 app 為何採用、關鍵的 **分布 vs 值** 差異（「挑 Exp 給 arrivals 背後有 Kleinrock，挑 8 當平均沒有文獻可靠，沒關係，這是兩件事」）、以及如何在書面文件中替情境假設模型辯護（宣告、逐一列出每個猜測來源、敏感度分析、部分現場校準、引用文獻合理範圍）。卡尾附明確的「適用 / 不適用」：課堂展示、What-if 探索、SimPy 練習 vs 真實投資決策、政府報告、精度要求高的科學。英文翻譯隨 `en` locale 一起附上。

**📚 參考書目卡** — Learning 側邊新增 `references` 卡，依主題列完整書目（佇列理論基礎、核心定理、模擬方法論、agent-based 建模、等候心理 / reneging、亂數）。每行都用同一個 `<Ref>` primitive 可點。結尾提醒讀者：這些參考支援的是分布與框架選擇，不是具體預設數字（那仍屬情境假設）。

**📘 學術免責橫幅** — 設定頁頂的情境預設按鈕正下方放了一張卡，在讀者還沒捲到參數前就以第一人稱宣告立場：「這頁上每個預設值都是我憑常識與對小店的觀察訂出來的情境假設，不是從哪家真實店家量測來的」。老師一眼看到，而不是要翻到 tooltip 才發現。

**✍️ App 文案 voice（專案約定）** — 所有新加入的 app 內文案都用作者第一人稱寫。這是往後的明確約定：app 內方法論文案應該像作者在解釋自己的設計選擇，不是中立教科書。早期寫得像教科書章節的情境假設卡，就是在使用者反饋後重寫的。

### 匯出

- 完整模擬結果匯出為 **JSON**
- KPI 指標匯出為 **CSV**，標頭一律用穩定英文 `snake_case`（跨 locale 的 Excel 相容）
- 過濾後的事件日誌匯出為 **CSV**；`description` 欄依當前 UI 語言

### 學習側欄

- 可收合的右側面板，雙語都有課堂筆記風的內容
- 情境感知：內容依當前頁面切換
- 涵蓋 DES 概念、Poisson process、Little's Law、利用率、瓶頸理論、事件軌跡讀法
- 核心公式用 **KaTeX** 漂亮渲染（例如 $\rho = \frac{\lambda}{\mu c}$ 與 $N = \lambda \cdot W$）
- 側欄狀態持久化在 `localStorage`

### 更新檢查（v0.7.0）

內建對 GitHub Releases 的更新檢查，無外部依賴（用 Electron 自帶的 `net.fetch`）。

- **啟動時自動檢查**：啟動後 5 秒靜默查 GitHub Releases API。有新版且使用者沒 skip 過就跳 modal；已是最新或離線什麼都不做。第一次檢查失敗（例如網路還沒準備好）會靜默重試一次（30 秒後）。
- **選單手動檢查**：macOS：*NekoServe > 檢查更新…*；Windows/Linux：*Help > 檢查更新…*。關於頁的新「版本與更新」卡也有按鈕。檢查進行中按鈕顯示 spinner 並 disable，重複點擊被忽略。
- **三選一更新 modal**：找到新版時使用者會看到：
  1. **前往下載**（主要）— 在系統瀏覽器開 GitHub Releases 頁
  2. **略過此版**（次要）— 記住選擇，不再為此版提示
  3. **稍後提醒**（第三）— 關掉 modal，下次啟動再檢查並提示
- **更新說明預覽**：「有新版本」modal 包含可收合的 "What's New" 區塊，顯示 GitHub release body 的 changelog，更新前可先看變動。
- **錯誤容錯**：檢查失敗時 modal 顯示 **重試** 按鈕，使用者不需要關掉再從選單走一次。
- **可存取 modal**：`role="dialog"`、`aria-modal`、`aria-labelledby`、Esc 關閉、主要動作按鈕自動 focus。
- **平台策略**：目前所有 build target（macOS DMG/ZIP、Windows portable EXE、Linux AppImage）都走導流到 GitHub 的流程。updater 模組的結構允許未來 Windows NSIS 安裝版新增自動下載安裝，而不需動既有路徑。
- **雙語**：所有 update UI 字串 zh-TW / en 都有。
- **關於頁**：版本顯示現在動態讀 `app.getVersion()`（不再寫死 i18n key），底部新增「版本與更新」卡顯示當前版本 + 一鍵檢查更新按鈕。

架構：`src/main/updater/` 含四模組（config、service、store、IPC）。renderer 透過 `useUpdateCheck` hook 與 `UpdateModal` 元件使用。略過版偏好持久化到 `userData/update-prefs.json`。

### 無障礙（v0.9.0）

v0.9.0 是聚焦無障礙的版次，把 NekoServe 推近 WCAG 2.1 AA 水準，涵蓋鍵盤操作、screen reader、語意 HTML。

**焦點管理**

- **`useFocusTrap` hook**：零依賴的 focus trap，記下先前 focus 的元素、在容器內循環 Tab / Shift+Tab、停用時還原。套用於全部 5 個 modal / overlay：UpdateModal、WhatsNewModal、ShortcutHelp、OnboardingOverlay、InspectPopover。
- 所有 modal 都有正確的 `role="dialog"`、`aria-modal="true"`、`aria-labelledby` 指向標題，Esc 關閉。
- **Skip to main content**：第一次按 Tab 時冒出的視覺隱藏連結，把 focus 跳過 header 和導覽到 `<main id="main-content">`。

**Screen reader 播報**

- **`RouteAnnouncer`**：視覺隱藏的 `aria-live="polite"` 區域，每次切 tab 會播報頁名（例如 "Navigated to Settings" / 「已導覽至模擬設定」）。
- **語言切換 toast**：切 locale 時 toast 透過既有 `aria-live` 容器播報。
- **過濾結果數**：EventLogTable 在搜尋 / 類型過濾變動時播報符合事件數。

**語意 HTML 與 ARIA**

- icon-only 按鈕（主題切換、快捷鍵說明、新手導覽、modal 關閉）除 `title` 外都加 `aria-label`。
- EventLogTable：所有欄標頭 `<th scope="col">`、搜尋框 `aria-label`、過濾按鈕 `aria-pressed`、可點列 `tabIndex={0}` + Enter/Space 啟用。
- ParamInput：新 `error` prop 接上 `aria-invalid` + `aria-describedby` 做表單驗證；HelpButton tooltip 有 `aria-expanded` + `aria-describedby`。
- SettingsPage 進度條：`role="progressbar"` 元素加上 `aria-label`。
- LearningPanel `<aside>`：加 `aria-label` 做 landmark 識別。
- 10 個圖表 / 視覺化元件：外層 wrapper 有 `role="figure"` + `aria-label`；Recharts 圖表（UtilizationChart、WaitTimeChart、CustomerPieChart）附 `sr-only` 文字摘要。

**回放場景鍵盤操作**

- CafeScene SVG：每個 seat 和 cat `<g>` 都有 `tabIndex={0}`、`role="button"`、描述當前狀態的 `aria-label`（例如 "Seat 3, occupied" / 「貓 1，訪問中」），Enter/Space 開啟 InspectPopover。
- InspectPopover：Esc 關閉（之前只能點）。

**全螢幕按鈕文字**

- 回放全螢幕切換按鈕現在顯示可見文字 label（"Fullscreen" / "Exit fullscreen" / 「全螢幕」/「退出全螢幕」），取代客製游標 tooltip 系統看不到的 `⊞` / `⊡` 符號。

**既有基礎（v0.8.0）**

- 導覽有 `role="tablist"` / `role="tab"` / `aria-selected`
- toast 有 `role="status"` + `aria-live="polite"`
- 進度條有 `role="progressbar"` 與 `aria-valuenow/min/max`
- 全域 `:focus-visible` 橘色外框
- `prefers-reduced-motion` 支援（CSS + JS）
- Tailwind `dark:` 深色模式
- 裝飾元素 `aria-hidden`
- ParamInput 表單 label `htmlFor`

**i18n keys**：所有新無障礙字串 zh-TW / en 都有（`common:a11y.*`、`eventLog:searchLabel`、`eventLog:filterResultAnnounce`、`playback:a11y.*`、`playback:fullscreen`、`playback:exitFullscreen`）。

### 原生桌面細節

- 自訂標題列：macOS `hiddenInset` 樣式，原生紅綠燈直接嵌在 header 裡
- 自訂 app icon（全平台：`.icns` / `.ico` / `.png`）
- 自訂關於視窗（主程序、已在地化）
- dev 模式下 macOS Dock 有 icon
- 切換語言時原生 application menu 即時重建

### 國際化（i18n）

- **完整雙語**：繁體中文（`zh-TW`）與英文（`en`）。所有可見字串（頁面、圖表、事件日誌、錯誤訊息、學習側欄、原生 Electron menu、關於視窗）都走 i18n。
- 建立在 [`react-i18next`](https://react.i18next.com/) 之上。所有資源隨 bundle 載入、React mount 前就同步到位，沒有第一禎語言閃爍。
- **初始語言決定順序**：
  1. 使用者在 `localStorage` 存的偏好（key `nekoserve:locale`）
  2. preload 時從 Electron `app.getLocale()` 抓的系統語系（正規化：`zh*` → `zh-TW`，其餘 → `en`）
  3. 硬 fallback：`en`
- **一鍵切換**：header 上一個 `🌐 繁中 / 🌐 EN` 按鈕切換整個 UI（renderer + 原生 menu + 下次開啟的關於視窗）。選擇跨重啟保留。
- **型別化翻譯 key**：`react-i18next` module augmentation 指向 canonical 的 `zh-TW` JSON，所以 `t('settings:parameters.seatCount.label')` 有自動完成，打錯字 `tsc --noEmit` 會擋。
- **Renderer ↔ main 同步**：使用者切語言時 renderer 透過 `locale-changed` IPC 通知 main，main 立刻重建原生 menu。
- **動態事件描述**：事件日誌透過 `` t(`events:${eventType}`, { customerId, resourceId, ... }) `` 組出每列，15 種顧客旅程事件在兩種語言都自然。Python 模擬器預格式化的 `description` 僅保留作為除錯 fallback。
- **錯誤訊息**：`SimulatorError` 是結構化的 `{ type: SimulatorErrorType, error: string }`。`error` 欄是 **英文開發者診斷**（永遠不直接顯示），renderer 一律以 `` t(`errors:${error.type}`) `` 在地化。
- **語系感知匯出**：CSV 標頭永遠英文 `snake_case`（跨 locale Excel 相容）；事件日誌的 `description` 欄依當前 UI 語言，使用者拿到的 CSV 和畫面一致。

#### 翻譯資源結構

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

#### 新增一個 key

1. 把 key 加進對應的 `zh-TW/*.json`（zh-TW 是 canonical 型別源）。
2. 同樣的 key 加進 `en/*.json`。缺英文 key 會靜默 fallback 回 zh-TW，PR 時人工檢查，之後再加 CI diff script。
3. 在 TSX：`const { t } = useTranslation('settings'); t('settings:parameters.seatCount.label')`。
4. `tsc --noEmit` 會驗證 key 存在（打錯 → 編譯錯），靠的是 `types.d.ts` 裡 `react-i18next` 的 module augmentation。

#### 動態事件描述

事件模板用 i18next 插值，以 `EventType` 代碼做 key：

```jsonc
// events.json (zh-TW)
"CUSTOMER_SEATED": "顧客 #{{customerId}} 入座 {{resourceId}}"
// events.json (en)
"CUSTOMER_SEATED": "Customer #{{customerId}} seated at {{resourceId}}"
```

renderer 查找（在 `EventLogTable.tsx`）：

```ts
t(`events:${e.eventType}` as const, {
  customerId: e.customerId,
  resourceId: e.resourceId ?? '',
  defaultValue: e.description ?? '',  // debug fallback to Python-emitted text
})
```

EventLogTable 會把每列已翻譯的 description memo 起來，搜尋框的比對永遠和畫面一致，跟語言無關。

#### 加入第三個語言

1. 在 `src/renderer/src/i18n/locales/<lng>/*.json` 建立和 `zh-TW`、`en` 同位階的資料夾。
2. 在 `src/renderer/src/i18n/index.ts` 匯入新檔、加進 `resources`、擴充 `AppLocale` 聯集與 `SUPPORTED_LOCALES`。
3. 在 `src/renderer/src/data/learnContent/` 下加 `<lng>.tsx` 變體，並更新 `getLearnContent()` dispatcher。
4. `src/main/i18n.ts` 的 `TABLES` record 新增一筆，供原生 menu 與關於視窗使用。
5. 如果想從 `app.getLocale()` 自動抓到，更新 `src/renderer/src/i18n/index.ts` 與 `src/main/i18n.ts` 裡的 `normalizeLocale()` heuristic。
6. 頁面與元件不需要改。所有字串已經都走 `t()`。

### 數學渲染（KaTeX）

學習內容與 How it Works 裡較複雜的公式透過 [`src/renderer/src/components/Math.tsx`](src/renderer/src/components/Math.tsx) 的薄 KaTeX 包裝渲染：

```tsx
import { InlineMath, BlockMath } from './components/Math'

<InlineMath formula={String.raw`\lambda = 1 / \bar T`} />
<BlockMath formula={String.raw`\rho = \dfrac{\lambda}{\mu \, c}`} />
```

設計註記：

- KaTeX stylesheet 在 [`src/renderer/src/main.tsx`](src/renderer/src/main.tsx) 全域 import 一次，元件內不再載入 CSS。
- LaTeX 原始碼直接寫在 JSX，不放 i18n JSON，因為數學本來就語言中立。
- 包裝設 `throwOnError: false`、`strict: 'ignore'`、`trust: false`，公式格式錯會退化為紅色 inline 文字 + tooltip，而不是整頁空白。
- `BlockMath` 沿用現有 `Formula` primitive 的琥珀左框卡片樣式，符合課堂筆記視覺。

---

## 技術堆疊

| 層 | 技術 |
|-------|-----------|
| 桌面容器 | Electron 33 |
| 建置工具 | electron-vite 2 |
| UI 框架 | React 18 + TypeScript 5 |
| 樣式 | Tailwind CSS v3 |
| 圖表 | Recharts 2 |
| 數學渲染 | KaTeX 0.16 |
| i18n | react-i18next 14 |
| 模擬引擎 | Python 3.11 + SimPy 4 |
| Python 打包 | PyInstaller（one-folder 模式） |
| 桌面打包 | electron-builder 24 |

---

## 開發環境需求

| 工具 | 最低版本 |
|------|----------------|
| Node.js | 20.x |
| npm | 10.x |
| Python | 3.11+ |
| pip | 23.x+ |

## 安裝

```bash
# 安裝 Node 依賴
npm install

# 安裝 Python 依賴
cd simulator-python
pip install -r requirements.txt
cd ..
```

## 開發模式執行

```bash
npm run dev
```

> **備註：** dev 模式下，若 `simulator-python/dist/simulator/` 不存在，Electron 會自動 fallback 直接跑 `python3 -m simulator`。想用打包好的 binary，先執行 `npm run build:simulator`。

## Electron UI 測試

Playwright 在 E2E 模式下驅動真的 Electron 視窗，但把 Python 模擬器換成穩定 fixture，UI 流程保持 deterministic。

```bash
# 先 build 再跑 headless UI 測
npm run test:ui

# 同一組測試，但 Electron 視窗可見（方便 demo）
npm run test:ui:headed

# 單獨跑真模擬器的 smoke
npm run test:ui:real-smoke

# 跑完開 HTML 報告
npm run test:ui:report
```

`test:ui` 與 `test:ui:headed` 只跑 deterministic 的 mocked UI 測試。`test:ui:real-smoke` 是獨立 smoke，會驗證真的模擬器橋接，需要 `simulator-python/dist/simulator/` 已存在（若無，先 `npm run build:simulator`）。內部用純 Electron + CDP harness，不走被 mock 的 `_electron.launch` 路徑，好在不污染日常 deterministic 套件的情況下驗證真模擬器。

目前套件包含：

- `17` 個 deterministic Playwright UI 測試（`npm run test:ui`）
- `1` 個真模擬器 smoke 測試（`npm run test:ui:real-smoke`）

覆蓋範圍：

- app 啟動與主 Settings 流程
- 成功模擬 run 與錯誤狀態處理
- 批次模式與敏感度分析 / sweep
- 回放控制、timeline scrubbing、Live Learning Mode 疊層
- Results 渲染、歷史比較 / 載入 / 刪除 / 清空、What-If Explorer 互動
- 事件日誌過濾與跳回回放流程
- 挑戰抽屜 smoke 與持久化
- How It Works smoke
- 跨頁切換的 Learning Panel 互動

聯網的更新檢查與原生存檔對話框刻意排除在 UI 套件外，本地 demo 才穩定可重複。

## Python 模擬器（獨立執行）

```bash
cd simulator-python

# 用預設設定跑
python -m simulator

# 用自訂 JSON 設定跑
python -m simulator --config config.json

# 把結果寫到檔案
python -m simulator --config config.json --output result.json

# 跑測試
python -m pytest tests/ -v
```

## 建置 Python 模擬器

```bash
# macOS / Linux
npm run build:simulator   # 執行 scripts/build-simulator.sh

# Windows（PowerShell）
npm run build:simulator   # 執行 scripts/build-simulator.ps1
```

輸出：`simulator-python/dist/simulator/`

## 打包桌面 app

> **先決條件：** Python 模擬器必須先 build 好。

```bash
# 確認模擬器 binary 存在
node scripts/verify-simulator.js

# 為目前平台打包
npm run pack

# 指定平台
npm run pack:mac    # → dist/desktop/*.dmg + *.zip  (arm64 + x64)
npm run pack:win    # → dist/desktop/*.exe           (portable, x64)
npm run pack:linux  # → dist/desktop/*.AppImage      (x64)
```

---

## CI / CD（GitHub Actions）

pipeline 由兩個 workflow 驅動：

### 1. 持續整合：[`.github/workflows/build.yml`](.github/workflows/build.yml)

`main` / `develop` push、對 `main` 的 PR、或手動 dispatch 時觸發。在 macOS、Windows、Linux runner 平行建置完整桌面 app，並上傳 workflow artifact（保留 30 天）。發版前先用它驗證變更。

artifact 從 **GitHub → Actions → [run] → Artifacts** 下載。

### 2. Tag 發版：[`.github/workflows/release.yml`](.github/workflows/release.yml)

推 semver tag（`v*.*.*`）時觸發，分兩個 job：

1. **build**（matrix：`macos-latest` + `windows-latest`）：建置 PyInstaller Python 模擬器、Electron bundle、打包桌面 app，並把檔案以 workflow artifact 上傳。
2. **publish**（Ubuntu，`needs: build`）：下載所有 matrix artifact、檢查 `changelog/vX.Y.Z.md` 存在、透過 `softprops/action-gh-release` 建立 / 更新 GitHub Release，並以該版本的 changelog 檔作為 release body。

這樣每個 tag 的 release note 都 **依版本分開**、且自動附正確 binaries。每版 note 見 [`changelog/`](changelog/) 目錄。

### 平台產物

| 平台 | 格式 | 備註 |
|----------|--------|-------|
| macOS | `.dmg` + `.zip`（arm64 與 x64） | dmg 用來安裝，zip 攜帶式 |
| Windows | `.exe`（portable，x64） | 不需安裝 |
| Linux | `.AppImage`（x64） | `chmod +x` 後執行 |

---

## 專案結構

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

## 已知限制

- macOS build 未簽章（首次啟動會跳 Gatekeeper 警告）
- Windows build 是 portable `.exe`，沒有安裝程式

## Roadmap

- [x] 透過 GitHub Releases 檢查更新（v0.7.0）
- [x] 暖色主題深色模式（v0.8.0）
- [x] 新手導覽、Toast 通知、快捷鍵說明（v0.8.0）
- [x] 全螢幕回放、拖放匯入、What's New modal（v0.8.0）
- [x] 完整無障礙 / WCAG 2.1 AA（v0.9.0）
- [x] 以 IndexedDB 持久化模擬歷史（v1.0.0）
- [x] 多 seed 批次執行 + 95% 信賴區間（v1.0.0）
- [x] 參數敏感度分析 / sweep（v1.0.0）
- [x] 附引導式提示的課堂挑戰（v1.0.0）
- [x] 即時參數比較的 What-If Explorer（v1.0.0）
- [x] Results 頁列印 / PDF 匯出（v1.0.0）
- [x] 回放截圖匯出 PNG（v1.0.0）
- [x] 批次參數測試的 CSV 匯入（v1.1.0）
- [x] 暖機期設定消除初始化偏差（v1.1.0）
- [x] 等候時間百分位 P50/P95/P99（v1.1.0）
- [x] 事件日誌：欄排序、時間範圍過濾、顧客旅程追蹤（v1.1.0）
- [x] 模擬取消按鈕、參數驗證、ErrorBoundary（v1.1.0）
- [x] 互動式 How-It-Works 頁：7 個 mini-demo + Beginner/Expert 切換（v1.2.0）
- [x] 語法高亮可收合程式區塊附複製鈕（v1.2.0）
- [x] 互動式公式解釋：點任何符號看白話說明（v1.2.0）
- [x] Results 與 How-It-Works 頁浮動 Beginner/Expert 切換（v1.2.0）
- [x] 學習內容 CI 公式重複渲染修正（v1.2.0）

---

## 授權

MIT。詳見 `package.json`。
