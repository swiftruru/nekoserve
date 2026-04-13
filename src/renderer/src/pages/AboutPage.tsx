export default function AboutPage() {
  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">🐱</span>
        <div>
          <h2 className="text-2xl font-bold text-orange-700">NekoServe</h2>
          <p className="text-gray-500">貓咪咖啡廳座位與服務模擬系統</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 專案說明 */}
        <div className="card">
          <div className="card-title">📖 專案說明</div>
          <p className="text-sm text-gray-700 leading-relaxed">
            NekoServe 是一個桌面應用程式，用於模擬貓咪咖啡廳的顧客服務流程。
            透過離散事件模擬（Discrete Event Simulation），
            系統可精確重現顧客到達、排隊、入座、點餐、用餐、與貓咪互動直到離開的完整流程，
            並計算各項服務指標，適合用於教學示範或服務系統分析。
          </p>
        </div>

        {/* 技術架構 */}
        <div className="card">
          <div className="card-title">🔧 技術架構</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <div className="space-y-2">
              <div className="font-semibold text-orange-600">前端 / 桌面容器</div>
              <ul className="space-y-1 text-gray-600">
                <li>• Electron — 跨平台桌面應用容器</li>
                <li>• React 18 + TypeScript — UI 框架</li>
                <li>• Tailwind CSS — 樣式設計</li>
                <li>• Recharts — 資料視覺化圖表</li>
                <li>• electron-vite — 建置工具</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-orange-600">模擬核心</div>
              <ul className="space-y-1 text-gray-600">
                <li>• Python 3.11 — 模擬引擎語言</li>
                <li>• SimPy 4 — 離散事件模擬框架</li>
                <li>• PyInstaller — Python 打包工具</li>
                <li>• JSON stdin/stdout — IPC 通訊方式</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 架構說明 */}
        <div className="card">
          <div className="card-title">🏗️ 系統架構</div>
          <div className="text-sm text-gray-700 space-y-2 leading-relaxed">
            <p>
              <span className="font-semibold">模擬邏輯</span>完全由 Python + SimPy 實作，
              不在 UI 端重複撰寫。Electron main process 透過 spawn 啟動打包好的
              Python executable，以 JSON 格式透過 stdin/stdout 傳遞參數與結果。
            </p>
            <p>
              <span className="font-semibold">IPC 架構</span>遵循 Electron 安全原則：
              renderer process 只能透過 contextBridge 暴露的白名單 API 與 main process 溝通，
              不可直接存取 Node.js 或 Electron 高權限 API。
            </p>
          </div>
        </div>

        {/* 隨機分佈規格 */}
        <div className="card">
          <div className="card-title">🎲 隨機分佈規格</div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• <span className="font-medium">顧客到達間隔</span>：Exponential 分佈（Poisson process）</p>
            <p>• <span className="font-medium">點餐 / 製作 / 用餐 / 互動 / 休息時間</span>：Normal 分佈，std = mean × 0.2，最小值 1 分鐘</p>
            <p>• <span className="font-medium">貓咪休息觸發</span>：每次互動後以 catRestProbability 機率決定</p>
          </div>
        </div>

        {/* 使用方式 */}
        <div className="card">
          <div className="card-title">📌 使用方式</div>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>在「模擬設定」頁面調整各項參數，或選擇預設情境</li>
            <li>點擊「開始模擬」按鈕，等待模擬完成（一般不超過 5 秒）</li>
            <li>在「統計結果」頁面查看 KPI 指標與圖表</li>
            <li>在「事件紀錄」頁面查看完整的時間序列事件，可依類型篩選</li>
            <li>修改參數後再次執行，對比不同情境的差異</li>
          </ol>
        </div>

        {/* 如何設計模擬實驗 */}
        <div className="card">
          <div className="card-title">🔬 如何設計模擬實驗</div>
          <div className="text-sm text-gray-700 space-y-4 leading-relaxed">

            <div>
              <p className="font-semibold text-orange-700 mb-1">原則一：控制變數法</p>
              <p>
                每次只改變<span className="font-medium">一個</span>參數，其他所有參數（包含隨機種子）保持不變。
                例如想研究「增加座位數對等待時間的影響」，就只調整「座位數」，其餘維持預設值。
                這樣才能確定是這個參數造成了結果差異，而不是多個變因混雜。
              </p>
            </div>

            <div>
              <p className="font-semibold text-orange-700 mb-1">原則二：固定隨機種子以確保可重現性</p>
              <p>
                相同的隨機種子會產生完全相同的隨機序列，讓兩次模擬僅有你調整的參數不同。
                若要觀察隨機性本身的影響，可改用不同種子跑多次，取平均值作為穩健估計。
              </p>
            </div>

            <div>
              <p className="font-semibold text-orange-700 mb-1">原則三：如何比較情境差異</p>
              <p className="mb-1">
                跑完多次後，切換到「統計結果」頁面的<span className="font-medium">「對比」</span>標籤，
                可同時看到最近 3 次模擬的所有 KPI，橘色欄位代表差異顯著（&gt;10%）。
              </p>
              <p>
                重點指標優先順序：先看<span className="font-medium">放棄率</span>（系統是否過載）→
                再看<span className="font-medium">利用率</span>（找出瓶頸資源）→
                最後看<span className="font-medium">平均等待時間</span>（顧客體驗）。
              </p>
            </div>

            <div>
              <p className="font-semibold text-orange-700 mb-1">原則四：如何判斷結果是否可信</p>
              <ul className="space-y-1 ml-3">
                <li>• <span className="font-medium">模擬時長</span>要夠長（至少是平均停留時間的 20 倍以上），避免初始效應影響指標</li>
                <li>• <span className="font-medium">不同種子跑 3–5 次</span>，若各次結果相差不到 5%，則單次結果已足夠穩定</li>
                <li>• <span className="font-medium">利特爾定律驗證</span>：N ≈ λ × W（系統內平均人數 ≈ 到達率 × 平均停留時間）；若偏差大，可能模擬時長不足</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-orange-700 mb-1">原則五：改善瓶頸的策略</p>
              <p className="mb-1">
                找到利用率最高的資源（座位 / 店員 / 貓咪），優先擴充該資源的容量。
                根據瓶頸理論（TOC），改善非瓶頸資源對系統吞吐量幾乎沒有幫助。
              </p>
              <p>
                例如座位利用率 95%、店員利用率 60%：加店員不會改善等待座位的問題；應先增加座位數或縮短用餐時間（加快翻桌）。
              </p>
            </div>

          </div>
        </div>

        <div className="card">
          <div className="card-title">📦 版本資訊</div>
          <p className="text-sm text-gray-500">NekoServe v0.1.0</p>
          <p className="text-xs text-gray-400 mt-1">
            GitHub：<span className="font-mono">nekoserve</span>
          </p>
        </div>
      </div>
    </div>
  )
}
