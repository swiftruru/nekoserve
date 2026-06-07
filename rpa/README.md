# NekoServe RPA 外掛

兩支獨立的 Python 腳本,把 NekoServe 桌面 app 當黑盒子,用 pyautogui 模擬真人操作介面、
跑一輪 `catCount × staffCount` 的情境組合,然後產出一份 HTML 比較報表。

不修改 NekoServe 本體的任何程式碼;只透過畫面互動 + 它內建的「Export Metrics CSV」按鈕
取得結果。

## 安裝

```bash
cd rpa
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 第一次使用前:抓 UI 模板圖

pyautogui 靠「比對螢幕上有沒有某張小圖」來找按鈕,所以 demo 之前要先在「實際 demo 用的
那台 Mac、那個解析度、那個淺色主題」抓一輪模板圖。

**最快的方法**:跑互動式 wizard,用 macOS 內建十字游標(`Cmd+Shift+4` 那個),拖 7 個框就好:

```bash
.venv/bin/python capture_templates.py
```

Wizard 會逐張告訴你 NekoServe 要切到哪一頁、要框哪一顆按鈕,你 Enter → 拖框 → Enter → 下一張。
非 macOS 或想手動抓,看 `templates/README.md`。

7 張模板:

1. `settings_tab.png` -- 上方導航第 1 顆「⚙️ 模擬設定」tab,**未啟用態**
2. `preset_paper_weekday.png` -- 預設情境列第 2 顆「**論文樣本・平日白天**」
3. `cat_count_label.png` -- 「🏠 咖啡廳資源設定」區的「貓咪數量」4 個字
4. `staff_count_label.png` -- 同一區的「店員數量」4 個字
5. `run_button.png` -- Settings 頁最下方那顆橘色「開始」按鈕(要往下捲)
6. `results_tab_enabled.png` -- 上方導航第 4 顆「📊 統計結果」tab(橘色底線啟用態,**必須先跑過一次模擬才會啟用**)
7. `export_csv_button.png` -- 統計結果頁頂端工具列的「Export Metrics CSV」按鈕

抓完後可以先跑一次校正,確認 7 張全找得到:

```bash
python bot.py --calibrate
```

## How to run a demo

1. 開 NekoServe(已開著就跳過),把視窗放到主螢幕、淺色主題、不要全螢幕。
2. `cd rpa && source .venv/bin/activate`
3. `python bot.py` -- 跑完 12 組情境(預估 6-10 分鐘,期間不要動滑鼠鍵盤)。
4. `python report.py` -- 自動開啟 HTML 報表。

要只跑單一情境煙霧測試:

```bash
python bot.py --only cats3_staff2
```

## 檔案結構

```
rpa/
  bot.py                 -- RPA 主程式
  report.py              -- 報表產生器
  scenarios.csv          -- 要跑的情境矩陣(scenario_id, catCount, staffCount)
  requirements.txt
  README.md
  lib/
    ui_actions.py        -- pyautogui 包裝(activate / find / click / type / calibrate)
    downloads_watcher.py -- 監看 ~/Downloads 取最新的 nekoserve-metrics-*.csv
    kpi_extractor.py     -- 從 NekoServe 匯出 CSV 抽 KPI 欄位
  templates/             -- UI 模板 PNG(請在 demo 機自己抓)
  output/
    results.csv          -- bot 輸出,report.py 輸入
    report-*.html        -- 報表
```

## 結果檔合約(`output/results.csv`)

bot.py 寫、report.py 讀:

| 欄位 | 說明 |
|---|---|
| `scenario_id` | 來自 scenarios.csv |
| `catCount`, `staffCount` | 該情境的兩個變動參數 |
| `avgWaitForSeat`, `avgWaitForOrder`, `avgTotalStayTime` | 等候時間 KPI(分鐘) |
| `abandonRate` | 顧客放棄率 |
| `totalCustomersServed` | 完成服務人數 |
| `seatUtilization`, `staffUtilization`, `catUtilization` | 三種利用率 |
| `customerSatisfactionScore`, `catWelfareScore` | 滿意度與貓福祉 |
| `run_started_at_iso` | 該組情境開始時間 |
| `source_csv_filename` | NekoServe 匯出的 CSV 檔名(可回溯) |
| `status` | `ok` 或 `failed` |

## 限制與避雷

- 跑 bot 期間不要動滑鼠鍵盤,焦點被搶會打到別的 app。
- 模板圖跟主題綁定。請在「淺色主題」下抓也在「淺色主題」下跑;切到 dark mode 模板全部會失效。
- 解析度 / 縮放比變了也得重抓。換螢幕、外接螢幕、調 macOS 顯示比例,都會讓模板比不到。
- 不連網、不呼叫任何 AI API。所有計算都在本機。
