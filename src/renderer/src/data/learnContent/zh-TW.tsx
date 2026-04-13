/**
 * NekoServe — 學習知識側邊欄內容（繁體中文）
 * 課堂筆記風格：有公式、有範例、有「為什麼這樣設計」的解釋
 */

import { Formula, Example, Note, P, B, UL, LI, type LearnContent } from './shared'

export const LEARN_CONTENT_ZH_TW: LearnContent = {

  // ══════════════════════════════════════════════════════════
  // 模擬設定頁
  // ══════════════════════════════════════════════════════════
  settings: [
    {
      id: 'des-intro',
      icon: '🧩',
      title: '什麼是離散事件模擬',
      content: (
        <div>
          <P>
            <B>離散事件模擬（Discrete-Event Simulation, DES）</B>
            把系統狀態的改變建模為一連串
            「事件」。兩個事件之間，系統狀態完全靜止——時間直接跳到下一個事件發生的時刻。
          </P>
          <P>這與「連續模擬」（例如微分方程）的差異在於：DES 不需要對每一個微小時間步長積分，計算效率高。</P>
          <Note>
            💡 貓咪咖啡廳的「事件」例子：
            <br />顧客到達 → 入座 → 點餐 → 餐點完成 → 用餐結束 → 離開
          </Note>
          <P>
            本 app 使用 <B>Python SimPy 4</B> 作為 DES 引擎。
            SimPy 以 generator function 實作 process，資源競爭
            透過 <code className="text-xs bg-gray-100 px-1 rounded">simpy.Resource</code> 管理。
          </P>
        </div>
      ),
    },
    {
      id: 'poisson',
      icon: '📈',
      title: '泊松過程與指數分佈',
      content: (
        <div>
          <P>
            現實中的顧客到達，通常符合
            <B>泊松過程（Poisson Process）</B>：
            在任意時間區間，到達人數與其他區間獨立，且與區間長度成比例。
          </P>
          <P>
            泊松過程的到達<B>間隔時間</B>服從指數分佈：
          </P>
          <Formula>T ~ Exponential(λ)，其中 λ = 1 / 平均間隔</Formula>
          <P>指數分佈具有<B>無記憶性</B>：不管已等多久，下一位顧客到來的機率分佈相同。</P>
          <Example>
            💡 範例：設定「平均到達間隔 = 8 分鐘」
            <br />→ λ = 1/8 = 0.125 人/分鐘
            <br />→ 60 分鐘內期望到達 7.5 人
          </Example>
        </div>
      ),
    },
    {
      id: 'normal-dist',
      icon: '🔔',
      title: '服務時間與常態分佈',
      content: (
        <div>
          <P>
            點餐、製作餐點、用餐時間等「服務時間」，
            通常圍繞一個均值波動，適合用
            <B>常態分佈（Normal Distribution）</B>建模：
          </P>
          <Formula>T ~ Normal(μ, σ²)，σ = μ × 0.2</Formula>
          <P>本模擬固定標準差為均值的 20%，並以 <code className="text-xs bg-gray-100 px-1 rounded">max(1, sample)</code> 截斷負值。</P>
          <P><B>為什麼不用指數分佈？</B></P>
          <UL>
            <LI>服務時間有自然下限（不可能 0 秒完成）</LI>
            <LI>訓練有素的員工服務時間較集中，不像指數分佈那樣長尾</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'simpy-resource',
      icon: '🏗️',
      title: 'SimPy 資源與佇列',
      content: (
        <div>
          <P>
            SimPy 的 <B>Resource</B> 代表有限的可共用資源。
            當所有資源被佔用，後續的請求自動排入等待佇列。
          </P>
          <Formula>
            seats = Resource(env, capacity=seatCount)
            <br />staff = Resource(env, capacity=staffCount)
            <br />cats  = Resource(env, capacity=catCount)
          </Formula>
          <P>顧客流程：</P>
          <UL>
            <LI>request(seats) → 等待或立即入座</LI>
            <LI>request(staff) → 等店員空閒點餐</LI>
            <LI>request(cats) → 等貓咪可互動</LI>
          </UL>
          <Note>
            🔍 三個資源形成三條獨立佇列。
            <br />哪條佇列等待時間最長 = 該資源是系統瓶頸。
          </Note>
        </div>
      ),
    },
    {
      id: 'littles-law',
      icon: '⚖️',
      title: "利特爾定律（Little's Law）",
      content: (
        <div>
          <P>
            利特爾定律是排隊論的基石，描述穩態系統中三個量的關係：
          </P>
          <Formula>N = λ × W</Formula>
          <UL>
            <LI><B>N</B>：系統中的平均顧客數</LI>
            <LI><B>λ</B>：有效到達率（人/分鐘）</LI>
            <LI><B>W</B>：顧客平均停留時間（分鐘）</LI>
          </UL>
          <P>此定律適用於任何穩定的等待系統，<B>不需假設分佈型態</B>。</P>
          <Example>
            💡 若到達率 λ = 0.1 人/分，平均停留 W = 60 分
            <br />→ 系統中同時約有 N = 6 位顧客
            <br />→ 要容納他們，需要至少 6 個座位
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // 統計結果頁
  // ══════════════════════════════════════════════════════════
  results: [
    {
      id: 'utilization',
      icon: '📊',
      title: '利用率 ρ 的意義',
      content: (
        <div>
          <P>
            <B>利用率（Utilization）ρ</B>
            表示資源的忙碌程度，是系統效率的核心指標：
          </P>
          <Formula>ρ = λ / (μ × c)</Formula>
          <UL>
            <LI><B>λ</B>：到達率</LI>
            <LI><B>μ</B>：單一資源的服務率</LI>
            <LI><B>c</B>：資源數量（座位數/店員數）</LI>
          </UL>
          <Note>
            ⚠️ ρ 超過 0.9 非常危險：
            <br />在 M/M/1 佇列中，ρ=0.9 時等待時間是 ρ=0.5 時的 <B>9 倍</B>！
          </Note>
          <P>不要追求 100% 利用率——那樣任何小波動都會造成長龍。理想值通常在 0.7–0.85 之間。</P>
        </div>
      ),
    },
    {
      id: 'wait-decompose',
      icon: '⏱️',
      title: '等待時間分解',
      content: (
        <div>
          <P>顧客的停留時間可以分解為：</P>
          <Formula>
            W（總停留）= Wq（佇列等待）+ Ws（服務時間）
          </Formula>
          <P>在本模擬中更細分為：</P>
          <UL>
            <LI>等座位（Wq1）</LI>
            <LI>等點餐完成（Wq2 + 製作時間）</LI>
            <LI>用餐時間（Ws1）</LI>
            <LI>等貓咪互動（Wq3 + 互動時間）</LI>
          </UL>
          <P>
            <B>M/M/c 佇列的 Erlang-C 公式</B>給出理論等待時間，
            可與模擬結果比對驗證模型正確性。
          </P>
          <Example>
            💡 觀察技巧：若「等座位時間」遠大於其他，
            表示座位數是主要瓶頸，增加座位可顯著改善。
          </Example>
        </div>
      ),
    },
    {
      id: 'abandon-rate',
      icon: '🚪',
      title: '放棄率的系統含義',
      content: (
        <div>
          <P>排隊論中描述顧客離開的行為有兩種：</P>
          <UL>
            <LI><B>Balking</B>：顧客到達後看到長龍，直接不進入</LI>
            <LI><B>Reneging</B>：已在等待中因等太久而離開 ← 本模擬</LI>
          </UL>
          <P>
            放棄率高代表的是系統<B>無法消化需求</B>，
            而不是「需求不足」。
          </P>
          <Note>
            🎯 「最大可接受等待時間」= 顧客耐心閾值（threshold）
            <br />超過此值的顧客計入 CUSTOMER_ABANDON 事件。
          </Note>
          <Example>
            💡 優化方向：放棄率 &gt; 20% 時，
            應先查哪個資源的利用率最高，
            增加該資源的 capacity。
          </Example>
        </div>
      ),
    },
    {
      id: 'bottleneck',
      icon: '🔍',
      title: '瓶頸識別與改善',
      content: (
        <div>
          <P>
            系統的整體<B>吞吐量（Throughput）</B>
            由最緊張的資源——即<B>瓶頸</B>——決定。
          </P>
          <UL>
            <LI>找出利用率最高的資源</LI>
            <LI>嘗試將該資源 capacity +1，觀察結果變化</LI>
            <LI>改善非瓶頸資源對整體吞吐量幫助有限</LI>
          </UL>
          <Formula>吞吐量 ≤ 瓶頸資源容量 × 瓶頸服務率</Formula>
          <P>這正是<B>約束理論（Theory of Constraints, TOC）</B>的核心思想：持續識別並解除系統中的最大限制。</P>
          <Example>
            💡 課堂操作：跑一次模擬後，
            把利用率最高的資源數量加倍，
            再跑一次，觀察 KPI 如何變化。
            用「對比」功能並排顯示差異。
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // 事件紀錄頁
  // ══════════════════════════════════════════════════════════
  eventlog: [
    {
      id: 'trace-intro',
      icon: '📋',
      title: '事件追蹤（Simulation Trace）',
      content: (
        <div>
          <P>
            <B>事件追蹤（Trace）</B>是 DES 的重要輸出。
            它記錄模擬過程中每個事件的：
          </P>
          <UL>
            <LI><B>時間戳</B>：事件發生的模擬時刻（分鐘）</LI>
            <LI><B>事件類型</B>：發生了什麼</LI>
            <LI><B>主體</B>：哪位顧客（或哪隻貓）</LI>
            <LI><B>資源</B>：涉及哪個座位/店員/貓咪</LI>
          </UL>
          <P>
            Trace 的主要用途：
          </P>
          <UL>
            <LI>驗證模型行為是否符合預期（除錯）</LI>
            <LI>計算衍生指標（如個別顧客等待時間）</LI>
            <LI>視覺化模擬過程（甘特圖等）</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'queue-detection',
      icon: '🔎',
      title: '識別佇列形成的技巧',
      content: (
        <div>
          <P>從事件紀錄中識別何時「開始大量等待」：</P>
          <UL>
            <LI>
              篩選 <B>等待座位</B> 事件，觀察密集出現的時段
            </LI>
            <LI>
              連續多位顧客的「等待 → 入座」間隔越來越長 = 佇列在累積
            </LI>
            <LI>
              <B>放棄離開</B>事件前，必然有對應的「等待座位」事件
            </LI>
          </UL>
          <Note>
            🔍 追蹤單一顧客的技巧：
            <br />在搜尋框輸入顧客編號（如 <code className="text-xs bg-orange-100 px-1 rounded">#12</code>），
            即可篩選出該顧客的完整旅程事件序列。
          </Note>
          <Example>
            💡 點擊結果頁派圖的「放棄等待」區段，
            可直接跳轉到此頁並自動篩選放棄事件！
          </Example>
        </div>
      ),
    },
    {
      id: 'event-types-guide',
      icon: '🗺️',
      title: '顧客旅程事件順序圖',
      content: (
        <div>
          <P><B>正常完成的顧客旅程：</B></P>
          <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded-lg p-3 my-2 select-text leading-6">
            ARRIVE<br />
            ↓ [若無空座位]<br />
            WAIT_SEAT → SEATED<br />
            ↓<br />
            ORDER → 開始製作<br />
            ↓<br />
            ORDER_READY → START_DINING<br />
            ↓<br />
            FINISH_DINING<br />
            ↓ [等貓咪]<br />
            WAIT_CAT → START_INTERACTION<br />
            ↓<br />
            FINISH_INTERACTION → LEAVE
          </div>
          <P><B>短路（放棄）情境：</B></P>
          <div className="text-xs text-gray-600 font-mono bg-red-50 rounded-lg p-3 my-2 select-text">
            ARRIVE → WAIT_SEAT → ABANDON
          </div>
          <P>
            <B>CAT_START_REST / CAT_END_REST</B>
            是<B>資源狀態事件</B>，不屬於顧客旅程，
            代表貓咪在互動後進入休息狀態。
          </P>
        </div>
      ),
    },
    {
      id: 'interval-analysis',
      icon: '📐',
      title: '驗證分佈的實驗技巧',
      content: (
        <div>
          <P>可用事件紀錄<B>驗證模擬的分佈是否正確</B>：</P>
          <P><B>1. 驗證指數分佈（到達間隔）：</B></P>
          <UL>
            <LI>篩選所有「顧客到達」事件</LI>
            <LI>計算相鄰兩筆的時間差</LI>
            <LI>應符合指數分佈（大多數間隔短，少數極長）</LI>
          </UL>
          <P><B>2. 驗證隨機種子的可重現性：</B></P>
          <UL>
            <LI>相同 seed 跑兩次，事件紀錄應完全一致</LI>
            <LI>改變 seed，結果應有所不同但統計特性相近</LI>
          </UL>
          <Example>
            💡 課堂實驗：用 seed=42 跑 3 次「平日白天」情境，
            驗證結果完全可重現。再換 seed=123，比較差異。
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // 關於頁
  // ══════════════════════════════════════════════════════════
  about: [
    {
      id: 'queueing-theory',
      icon: '📚',
      title: '排隊論基礎',
      content: (
        <div>
          <P>
            排隊論（Queueing Theory）是研究等待系統的數學分支，
            由 <B>A.K. Erlang</B> 於 1909 年為電話系統設計而創立。
          </P>
          <P><B>Kendall 表示法</B>用 A/S/c 描述佇列模型：</P>
          <Formula>M/M/c（Erlang-C 模型）</Formula>
          <UL>
            <LI><B>M</B>（Markovian）= 指數分佈到達</LI>
            <LI><B>M</B> = 指數分佈服務時間</LI>
            <LI><B>c</B> = 多個服務窗口</LI>
          </UL>
          <P>
            本 app 的貓咪咖啡廳更接近
            <B>M/G/c/K</B>（G = General 服務時間，K = 有限容量），
            加上顧客放棄行為（Reneging），
            理論解較複雜，因此採用模擬而非解析解。
          </P>
        </div>
      ),
    },
    {
      id: 'simpy-reference',
      icon: '🐍',
      title: 'SimPy 快速參考',
      content: (
        <div>
          <P>SimPy 的核心概念：</P>
          <UL>
            <LI><B>Environment</B>：模擬時鐘，驅動事件推進</LI>
            <LI><B>Process</B>：以 Python generator 實作的流程</LI>
            <LI><B>Resource</B>：有容量限制的共用資源</LI>
            <LI><B>timeout(t)</B>：讓 process 等待 t 個時間單位</LI>
          </UL>
          <Formula>
            with seats.request() as req:<br />
            {'  '}yield req  # 等待資源<br />
            {'  '}yield env.timeout(dining_time)
          </Formula>
          <Note>
            📖 延伸閱讀：
            <br />• SimPy 官方文件：simpy.readthedocs.io
            <br />• 《Introduction to Simulation》— Banks et al.
            <br />• 《Queueing Systems》— Kleinrock
          </Note>
        </div>
      ),
    },
  ],
}
