# UI 模板圖抓圖指南

pyautogui 用 `locateOnScreen(image)` 找按鈕,所以這些模板必須是「demo 機螢幕的真實截圖」,
不能從別處貼上來。Retina Mac 上,PIL 截圖回傳的是邏輯點,而 macOS 系統截圖工具(`Cmd+Shift+4`)
存的是實體像素,兩者尺寸不一樣 -- **一定要用 Python 自己截、自己存**,不要混用。

## 抓圖小工具

在 `rpa/` 目錄下執行:

```bash
python -c "
import pyautogui, time
print('5 秒後截一張全螢幕,請把 NekoServe 切到要抓的畫面')
time.sleep(5)
pyautogui.screenshot('templates/_full_screen.png')
print('Saved templates/_full_screen.png -- 用 Preview 打開,框出每個按鈕另存')
"
```

接著用 macOS Preview 打開 `_full_screen.png`,
工具列 -> Tools -> Rectangular Selection,
框出按鈕、`Cmd+C` 複製、`File -> New from Clipboard`(`Cmd+N`)、
存成下面對應的檔名。

## 7 張要抓的圖

| 檔名 | 在哪一頁 | 框什麼 |
|---|---|---|
| `settings_tab.png` | 任何頁 | 上方導航第 1 顆「⚙️ 模擬設定」tab,**未啟用態**(要拍未啟用態請先切到「ℹ️ 關於」再回頭截圖) |
| `preset_paper_weekday.png` | Settings | 預設情境列的「**論文樣本・平日白天**」按鈕(不是「論文樣本(Hirsch 2025)」那顆) |
| `cat_count_label.png` | Settings | 「🏠 咖啡廳資源設定」區裡的「貓咪數量」4 個字(不含後面的數字輸入框) |
| `staff_count_label.png` | Settings | 同一區的「店員數量」4 個字本身 |
| `run_button.png` | Settings | 頁面**最下方**(模擬參數設定區再往下)那顆橘色「開始」按鈕(未在執行的狀態) |
| `results_tab_enabled.png` | 跑過一次模擬之後 | 上方導航第 4 顆「📊 統計結果」tab,**啟用態**(橘色底線);沒跑過時是灰的、拍了沒用 |
| `export_csv_button.png` | Results | 「Export Metrics CSV」按鈕(在統計結果頁頂端工具列) |

## 抓圖原則

- 框得「緊」一點,但要把按鈕背景的辨識特徵留進去(別只框文字)。
- 不要包含閃爍的元素(loading spinner、pulsing dot)。
- 同一張圖不要包含後面會變動的內容(例如時間戳)。
- `cat_count_label.png` 跟 `staff_count_label.png` 只框 label,不框輸入欄 -- bot 會找到 label
  後算偏移點到輸入欄。
- 抓完跑 `python bot.py --calibrate`,如果某張比不到,把它重抓並再跑一次,直到 7 張都通過。

## 校正失敗常見原因

- 抓圖時 NekoServe 不是淺色主題 -- 解法:設定 -> 主題 -> Light,重新抓
- 抓圖時 NekoServe 是全螢幕 -- 解法:退出全螢幕,重新抓
- 抓圖時用了 `Cmd+Shift+4` -- 解法:改用上面 Python 那段截圖,重抓
- 螢幕縮放比改過 -- 解法:回到 demo 設定,重抓所有 7 張
