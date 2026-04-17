/**
 * NekoServe learning sidebar content (Traditional Chinese).
 * Classroom-notebook style: formulas, examples, and "why this design" reasoning.
 */

import { Formula, Example, Note, P, B, UL, LI, Ref, type LearnContent } from './shared'
import { BlockMath } from '../../components/Math'

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
            「事件」。兩個事件之間，系統狀態完全靜止，時間直接跳到下一個事件發生的時刻。
          </P>
          <P>這與「連續模擬」（例如微分方程）的差異在於：DES 不需要對每一個微小時間步長積分，計算效率高。</P>
          <Note>
            💡 貓咪咖啡廳的「事件」例子：
            <br />顧客到達 → 入座 → 點餐 → 餐點完成 → 用餐結束 → 離開
          </Note>
          <P>
            本 app 使用 <B>Python SimPy 4</B> 作為 DES 引擎。
            SimPy 以 generator function 實作 process，資源競爭
            透過 <code className="text-xs bg-gray-100 dark:bg-bark-600 px-1 rounded">simpy.Resource</code> 管理。
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
          <BlockMath formula={String.raw`T \sim \text{Exp}(\lambda), \quad \lambda = \frac{1}{\bar{T}}`} />
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
          <BlockMath formula={String.raw`T \sim \mathcal{N}(\mu,\, \sigma^2), \quad \sigma = 0.2\,\mu`} />
          <P>本模擬固定標準差為均值的 20%，並以 <code className="text-xs bg-gray-100 dark:bg-bark-600 px-1 rounded">max(1, sample)</code> 截斷負值。</P>
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
            <br />{'# v0.4.0: 貓咪不是 Resource，'}
            <br />{'# 每隻貓都是獨立的 process'}
            <br />for i in range(catCount):
            <br />{'    env.process(cat(i))'}
          </Formula>
          <P>顧客流程（v0.4.0 版）：</P>
          <UL>
            <LI>request(seats) → 等待或立即入座</LI>
            <LI>request(staff) → 等店員空閒點餐</LI>
            <LI>用餐，期間可能被貓咪拜訪</LI>
            <LI>等身上所有貓離開才能起身</LI>
          </UL>
          <Note>
            🔍 Resource 形成的佇列只有座位與店員。
            <br />貓咪改成 <B>主動式 agent</B>：自己挑一位入座的顧客走過去停留。
            <br />因此貓咪不是一條佇列，而是一群獨立的角色。
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
          <BlockMath formula={String.raw`N = \lambda \cdot W`} />
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
    {
      id: 'scenario-assumption',
      icon: '📘',
      title: '關於這些數字，先說在前頭',
      content: (
        <div>
          <P>
            我做這個 app 的時候，沒有真的跑去一間貓咪咖啡廳蹲點計時。
            設定頁上看到的每個數字，不管是座位 10 張、到達間隔 8 分鐘，
            還是貓咪 4 分鐘找一次人，都是我憑常識、對小店的生活觀察，
            以及對貓的想像所訂出來的。它們屬於<B>情境假設</B>，不是實地量測的資料。
          </P>
          <P>
            我為什麼還是這樣做？因為這個 app 的目的從頭到尾都不是「預測某家真實店家」，
            而是想讓人透過互動去體會排隊論與離散事件模擬的動態。
            我想回答的是「到達率上升，等待時間會怎麼變」這種<B>質性</B>問題，
            不是「禮拜三中午要多請幾個店員」那種需要實測的<B>量化</B>問題。
          </P>
          <Note>
            💡 有一個區分我覺得很重要：
            <br />
            「為什麼選用 Exp 分佈來建模到達間隔」這件事，是有 Kleinrock 等經典文獻背書的；
            <br />
            「為什麼平均是 8 分鐘」這件事，則純粹是我的情境取值，沒有文獻。
            <br />
            兩件事要分開看。每個參數展開後的「📚 文獻依據」欄，只保證前者（分佈選擇），
            不保證後者（具體數值）。被問起的時候我也會分開答。
          </Note>
          <P>
            所以若有人問我這些數字從哪來，我會老實說：
            這是教學情境模擬，數字取值基於對小型咖啡廳的常識推估；
            分佈選擇才是有文獻支持的那一塊。若有一天要拿去為某家真實的店做規劃，
            我會再做敏感度分析，並把最關鍵的幾個數字拿到現場量測校準。
          </P>
          <P>要讓這個立場站得住腳，我自己覺得還有幾件事可以做：</P>
          <UL>
            <LI>
              <B>把每個數字的出處寫清楚</B>。
              設定頁上每個參數的「預設值依據」欄，我都寫了是常識、類比還是文獻區間，
              不裝作有資料，被問就能直接指給對方看。
            </LI>
            <LI>
              <B>做敏感度分析</B>。
              把到達間隔、用餐時間這類關鍵參數，在合理範圍內（例如到達 4 到 16 分鐘）掃一遍，
              看結論會不會翻盤。如果結論對某個數字極度敏感，那它就必須實測，不能靠我猜。
            </LI>
            <LI>
              <B>做部分實測校準</B>。
              真要用在某家店，其實只要現場計時 30 分鐘，
              抓幾個最關鍵的數字代回模擬，整個研究就能從「示意」升級成「半實測」，
              說服力馬上不一樣。
            </LI>
            <LI>
              <B>引用合理區間</B>。
              像「顧客放棄等待時間」這種已經有人寫過的參數
              （Maister 1985、Larson 1987 都討論過 15 到 30 分鐘的忍耐區間），
              我就引用區間再取中位數，比自己憑感覺取值紮實得多。
            </LI>
          </UL>
          <Note>
            🎓 一句話總結我的立場：
            <br />
            這個 app 是用來體會排隊論「為什麼會這樣」的工具，
            不是拿來預測「實際上會怎樣」的工具。
            <br />
            擺在前者的位置上，情境假設就是合理的選擇；
            擺錯位置，它就失職了。
          </Note>
          <P>所以我心裡的分界是：</P>
          <UL>
            <LI>
              <B>適合</B>：課堂示範排隊動態、what-if 探索（尖峰 vs 離峰、多一個店員會怎樣）、
              SimPy 的動手練習。
            </LI>
            <LI>
              <B>不適合</B>：真實投資決策、政府報告的量化預測、需要誤差保證的科學論文。
              這些都需要實地資料校準，不是情境假設能承擔的。
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'references',
      icon: '📚',
      title: '參考文獻',
      content: (
        <div>
          <P>
            以下是每個參數「📚 文獻依據」欄位所引用的完整書目，
            按主題分類。這些文獻支持<B>分佈與理論框架的選擇</B>，
            不直接支持具體數值（具體數值屬情境假設）。
          </P>
          <P><B>排隊論基礎</B></P>
          <UL>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Kleinrock+Queueing+Systems+Volume+1+Theory+1975">
                Kleinrock, L. (1975). <i>Queueing Systems, Volume 1: Theory</i>. Wiley.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Gross+Shortle+Fundamentals+of+Queueing+Theory+4th+edition">
                Gross, D., Shortle, J. F., Thompson, J. M., &amp; Harris, C. M. (2008). <i>Fundamentals of Queueing Theory</i> (4th ed.). Wiley.
              </Ref>
            </LI>
          </UL>
          <P><B>核心定理</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.9.3.383">
                Little, J. D. C. (1961). "A Proof for the Queuing Formula: L = λW". <i>Operations Research</i>, 9(3), 383–387.
              </Ref>
            </LI>
          </UL>
          <P><B>模擬方法論</B></P>
          <UL>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Law+Kelton+Simulation+Modeling+and+Analysis+5th+edition">
                Law, A. M., &amp; Kelton, W. D. (2015). <i>Simulation Modeling and Analysis</i> (5th ed.). McGraw-Hill.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Banks+Carson+Nelson+Nicol+Discrete+Event+System+Simulation+5th+edition">
                Banks, J., Carson, J. S., Nelson, B. L., &amp; Nicol, D. M. (2010). <i>Discrete-Event System Simulation</i> (5th ed.). Pearson.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Ross+Introduction+to+Probability+Models+12th+edition">
                Ross, S. M. (2019). <i>Introduction to Probability Models</i> (12th ed.). Academic Press.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://dl.acm.org/doi/10.5555/2433508.2433519">
                Law, A. M. (2010). "Statistical Analysis of Simulation Output Data: The Practical State of the Art". <i>Proc. 2010 Winter Simulation Conference</i>, 65–74.
              </Ref>
            </LI>
          </UL>
          <P><B>Agent-Based 建模</B></P>
          <UL>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Borshchev+Filippov+2004+System+Dynamics+Agent+Based+Modeling">
                Borshchev, A., &amp; Filippov, A. (2004). "From System Dynamics and Discrete Event to Practical Agent-Based Modeling". <i>Proc. 22nd International Conference of the System Dynamics Society</i>.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Macal+North+2010+Tutorial+Agent+Based+Modeling+Simulation">
                Macal, C. M., &amp; North, M. J. (2010). "Tutorial on Agent-Based Modelling and Simulation". <i>Journal of Simulation</i>, 4(3), 151–162.
              </Ref>
            </LI>
          </UL>
          <P><B>等待心理學 / Reneging</B></P>
          <UL>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Maister+1985+Psychology+of+Waiting+Lines">
                Maister, D. H. (1985). "The Psychology of Waiting Lines". In J. A. Czepiel, M. R. Solomon, &amp; C. F. Surprenant (Eds.), <i>The Service Encounter</i>. Lexington Books.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.35.6.895">
                Larson, R. C. (1987). "Perspectives on Queues: Social Justice and the Psychology of Queueing". <i>Operations Research</i>, 35(6), 895–905.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://scholar.google.com/scholar?q=Haight+1959+Queueing+with+reneging+Metrika">
                Haight, F. A. (1959). "Queueing with reneging". <i>Metrika</i>, 2(1), 186–197.
              </Ref>
            </LI>
          </UL>
          <P><B>亂數生成</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1137/1012065">
                Knuth, D. E. (1997). <i>The Art of Computer Programming, Volume 2: Seminumerical Algorithms</i> (3rd ed.). Addison-Wesley.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.47.1.159">
                L'Ecuyer, P. (1999). "Good Parameters and Implementations for Combined Multiple Recursive Random Number Generators". <i>Operations Research</i>, 47(1), 159–164.
              </Ref>
            </LI>
          </UL>
          <Note>
            ⚠️ 再次提醒：上述文獻支持<B>分佈選擇與模型架構</B>，
            不支持具體的預設值（10 座位、8 分鐘間隔等），這些仍為情境假設。
          </Note>
        </div>
      ),
    },
    {
      id: 'batch-replication',
      icon: '🔁',
      title: '批次重複：為什麼跑一次不夠',
      content: (
        <div>
          <P>
            模擬的結果來自隨機數產生器。換一個<B>隨機種子(seed)</B>，顧客到達時間、服務時間、貓咪行為全部不同，KPI 也會跟著變。
            跑一次就下結論，跟擲一次骰子就說平均點數是那個數字一樣不靠譜。
          </P>
          <P>
            <B>批次重複(replication)</B>的做法是：用同一組參數、不同的種子跑 N 次（通常 10 次以上），
            取所有結果的平均值。跑越多次，平均越穩定，越接近「真正的系統表現」。
          </P>
          <Note>
            💡 在設定頁面底部開啟「批次模式」，設好重複次數後按執行，
            系統會自動用 seed, seed+1, seed+2, ... 依序跑完並計算平均和信賴區間。
          </Note>
          <P>這不是多此一舉。在 DES 領域，沒有重複實驗的結果被視為不可靠的。</P>
        </div>
      ),
    },
    {
      id: 'sensitivity-analysis',
      icon: '📈',
      title: '敏感度分析：哪個參數影響最大',
      content: (
        <div>
          <P>
            你有 14 個參數可以調整，但不是每個參數對結果的影響都一樣大。
            <B>敏感度分析(sensitivity analysis)</B>的做法是：
            固定所有其他參數，只改變一個，觀察 KPI 隨之怎麼變化。
          </P>
          <P>
            例如把店員數從 1 掃到 5，如果放棄率從 40% 驟降到 2%，那店員數就是關鍵參數；
            反之如果變化很小，代表瓶頸不在店員。
          </P>
          <Example>
            💡 在設定頁面底部開啟「敏感度分析」，選擇要掃描的參數和範圍，
            系統會在每個掃描點跑一組批次，結果以折線圖呈現。
            找到曲線的「拐點」（斜率突然變平的地方），那就是邊際效益開始遞減的臨界值。
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
          <BlockMath formula={String.raw`\rho = \dfrac{\lambda}{\mu \, c}`} />
          <UL>
            <LI><B>λ</B>：到達率</LI>
            <LI><B>μ</B>：單一資源的服務率</LI>
            <LI><B>c</B>：資源數量（座位數/店員數）</LI>
          </UL>
          <Note>
            ⚠️ ρ 超過 0.9 非常危險：
            <br />在 M/M/1 佇列中，ρ=0.9 時等待時間是 ρ=0.5 時的 <B>9 倍</B>！
          </Note>
          <P>不要追求 100% 利用率，那樣任何小波動都會造成長龍。理想值通常在 0.7–0.85 之間。</P>
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
            <LI>等身上所有拜訪中的貓離開（Wq3，取決於當下幾隻貓來拜訪）</LI>
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
            由最緊張的資源（即<B>瓶頸</B>）決定。
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
    {
      id: 'confidence-intervals',
      icon: '📐',
      title: '信賴區間：平均值有多可靠',
      content: (
        <div>
          <P>
            批次重複跑完後，你拿到 N 個 KPI 數值。平均值是點估計，
            但<B>95% 信賴區間(CI)</B>告訴你這個估計有多精確。
          </P>
          <P>
            直覺解讀：如果你把整組批次重新跑很多次，
            每次算出一個區間，其中 95% 的區間會包含「真正的平均值」。
            <B>區間越窄</B>代表估計越精確；
            <B>區間很寬</B>代表重複次數不夠多，還需要更多 replication。
          </P>
          <Formula>
            <BlockMath formula={String.raw`\bar{X} \pm t_{\alpha/2,\, n-1} \cdot \frac{s}{\sqrt{n}}`} />
          </Formula>
          <P>
            其中 n 是重複次數、s 是標準差、t 是 t-distribution 的臨界值。
            樣本少的時候 t 會比 1.96 大（區間更寬更保守），
            n 超過 30 左右就接近常態分布了。
          </P>
          <Note>
            💡 KPI 卡片下方的小字就是 95% CI。如果區間跨度超過平均值的 20%，
            代表結果還不太穩定，試著把重複次數加到 20 或 30。
          </Note>
        </div>
      ),
    },
    {
      id: 'sweep-charts',
      icon: '📈',
      title: '解讀掃描圖：找到系統的臨界點',
      content: (
        <div>
          <P>
            敏感度分析的結果會以折線圖呈現。
            <B>X 軸</B>是你掃描的參數值，
            <B>Y 軸</B>是你選的 KPI（可從下拉選單切換）。
            每個點是該參數值下多次重複的平均，帶狀陰影是 95% CI。
          </P>
          <P>
            重點不是看個別數字，而是<B>找趨勢和拐點</B>：
          </P>
          <UL>
            <LI>曲線陡峭的區段代表這個參數的邊際效益很大。</LI>
            <LI>曲線變平的地方就是邊際效益遞減的臨界點，再加資源也沒太大效果。</LI>
            <LI>如果 CI 帶很寬，代表那個區段的隨機波動大，需要更多重複。</LI>
          </UL>
          <Example>
            💡 典型觀察：座位數從 5 加到 10，放棄率從 50% 驟降到 5%（陡峭段）；
            從 10 加到 15，放棄率只從 5% 降到 3%（平坦段）。
            結論：10 個座位就夠了，多加座位的投資報酬率很低。
          </Example>
        </div>
      ),
    },
    {
      id: 'what-if-explorer',
      icon: '🔮',
      title: 'What-If 探索器：不用重跑就能比較',
      content: (
        <div>
          <P>
            結果頁底部有一個<B>「What-If 探索器」</B>面板。
            點開後會出現四個滑桿：座位數、店員數、貓咪數、到達間隔。
          </P>
          <P>
            拖動任何一個滑桿，系統會在背景自動重新跑一次模擬（大約 0.5 秒），
            然後把新結果和原始結果放在一張對比表裡：
            <B>綠色</B>代表指標改善了，<B>紅色</B>代表惡化了。
          </P>
          <Note>
            💡 What-If 的用途是「快速試探」：
            你不需要回到設定頁面改參數再按執行，
            直接在結果頁拖滑桿就能看到「如果多一個店員會怎樣」。
          </Note>
          <P>
            和敏感度分析的差別在於：敏感度分析是系統化地掃描一整個範圍並畫出趨勢圖，
            What-If 是隨手試一個值馬上看結果，適合靈感來的時候用。
          </P>
          <P>
            What-If 的結果<B>不會存入歷史紀錄</B>，
            所以你可以盡情嘗試，不會弄亂已保存的實驗數據。
          </P>
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
            <br />在搜尋框輸入顧客編號（如 <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">#12</code>），
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
          <P><B>正常完成的顧客旅程（v0.4.0）：</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-gray-50 dark:bg-bark-700 rounded-lg p-3 my-2 select-text leading-6">
            ARRIVE<br />
            ↓ [若無空座位]<br />
            WAIT_SEAT → SEATED<br />
            ↓<br />
            ORDER → 開始製作<br />
            ↓<br />
            ORDER_READY → START_DINING<br />
            ↓ [用餐期間貓咪可能主動拜訪]<br />
            FINISH_DINING<br />
            ↓ [等身上所有貓離開]<br />
            LEAVE
          </div>
          <P><B>交錯發生的貓咪事件（獨立於顧客旅程）：</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-pink-50 dark:bg-pink-900/30 rounded-lg p-3 my-2 select-text leading-6">
            CAT_VISIT_SEAT<br />
            ↓ [互動時間，可能與其他顧客同時發生]<br />
            CAT_LEAVE_SEAT<br />
            ↓ [有機率觸發]<br />
            CAT_START_REST → CAT_END_REST
          </div>
          <P><B>短路（放棄）情境：</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-red-50 dark:bg-red-900/30 rounded-lg p-3 my-2 select-text">
            ARRIVE → WAIT_SEAT → ABANDON
          </div>
          <Note>
            💡 <B>CAT_VISIT_SEAT</B> / <B>CAT_LEAVE_SEAT</B> 的 <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">resourceId</code>
            會帶貓的 ID（例如 <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">貓-2</code>），
            <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">customerId</code> 是被拜訪的那位顧客。
            同一位顧客在用餐期間可能被多隻貓輪流或同時拜訪。
          </Note>
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
  // 模擬回放頁
  // ══════════════════════════════════════════════════════════
  playback: [
    {
      id: 'playback-how-to-read',
      icon: '🎬',
      title: '動畫怎麼讀',
      content: (
        <div>
          <P>
            咖啡廳平面圖從左到右分成七個區域，顧客就像一條生產線上的工件，
            依序經過每一區：
          </P>
          <UL>
            <LI><B>🚪 入口</B>：顧客剛到達的位置</LI>
            <LI><B>等座位</B>：座位滿了就在這裡排隊</LI>
            <LI><B>🪑 座位區</B>：N 格，對應 `seatCount` 參數</LI>
            <LI><B>👩‍🍳 廚房</B>：M 位店員，忙碌時會亮橘色</LI>
            <LI><B>🐱 貓咪區</B>：K 隻貓的家；貓在這裡閒晃，想拜訪時會主動走到座位旁</LI>
            <LI><B>🏁 出口</B>：完成整趟或放棄的顧客淡出於此</LI>
          </UL>
          <P>每位顧客的 emoji 會隨階段變換：</P>
          <UL>
            <LI>🙂 等待座位</LI>
            <LI>📝 點餐中</LI>
            <LI>⏳ 等待餐點</LI>
            <LI>🍽️ 用餐中</LI>
            <LI>😺 被貓拜訪中（身上有至少一隻貓）</LI>
            <LI>😿 放棄離開</LI>
            <LI>👋 離開中</LI>
          </UL>
          <Note>
            🐈 <B>貓咪是自主 agent</B>：每隻貓各自在貓咪區閒晃，間隔時間一到就
            隨機挑一位正在座位上的顧客走過去停留。同一位顧客可能同時被好幾隻
            貓拜訪。顧客要等身上的貓全部離開才能起身，因此「貓很黏」會拉長總停留時間。
          </Note>
        </div>
      ),
    },
    {
      id: 'playback-controls',
      icon: '⌨',
      title: '操作方式',
      content: (
        <div>
          <P>控制列從左到右是：</P>
          <UL>
            <LI><B>🔄 重播</B>：時間拉回 0</LI>
            <LI><B>⏮ / ⏭</B>：跳到上一 / 下一個事件發生的時間點</LI>
            <LI><B>▶ / ⏸</B>：播放 / 暫停</LI>
            <LI><B>速度按鈕</B>：0.5× / 1× / 2× / 4× / 8×（預設 4×）</LI>
          </UL>
          <P>
            時間軸拖拉條下方的橘色長條是<B>事件密度圖</B>：
            越亮的地方表示那段時間發生的事件越多，通常是瓶頸時段或放棄潮。
            拖拉時會自動暫停，放開後由你決定要不要續播。
          </P>
          <P><B>鍵盤快捷鍵（輸入框有焦點時自動停用）：</B></P>
          <UL>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">Space</code>：播放 / 暫停</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">← →</code>：前後跳 10 分鐘</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">, .</code>：逐事件</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">0</code>：重播</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">1-5</code>：切換速度</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">Esc</code>：關閉詳情卡片</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'playback-inspect',
      icon: '🔍',
      title: '挖掘細節',
      content: (
        <div>
          <P>
            <B>點座位或貓</B>
            會彈出一張小卡片，顯示目前坐在那裡（或正在摸的）顧客編號、
            所在階段、已停留多少模擬分鐘。再點一次同一格即可關閉。
          </P>
          <P>
            <B>說話泡泡</B>會在關鍵事件觸發時浮現約 0.8 分鐘：
            「來囉 ✨」「點餐了！」「好好吃 🍽️」「摸摸 💕」「不等了 😤」。
            這些是純 reducer 狀態，拖拉時間軸後會精確重建，
            不會因為 scrub 而錯位。
          </P>
          <P>
            <B>事件紀錄列連動</B>：回放播放時，
            事件紀錄頁對應那一列會自動高亮並捲到可視範圍。
            反向也成立——點事件紀錄裡的任一列，會跳回這裡並把時間設到該事件。
            兩個分頁共用同一條時間軸。
          </P>
        </div>
      ),
    },
    {
      id: 'playback-teaching',
      icon: '🧠',
      title: '教學切入點',
      content: (
        <div>
          <P>建議在課堂上這樣用這個分頁：</P>
          <UL>
            <LI>
              <B>找瓶頸</B>：調快到 4× 觀察哪個區域最早「塞滿」。
              通常是座位（容量不足）或貓咪（全都在休息或都跑去拜訪別人了）。
            </LI>
            <LI>
              <B>觀察貓咪行為</B>：把 `catIdleInterval` 調到 2 → 貓變得超黏人，
              幾乎每位顧客隨時都有貓在身邊；調到 20 → 貓很懶，
              很多顧客一次都沒被拜訪（noCatVisitRate 會飆高）。
            </LI>
            <LI>
              <B>觀察放棄事件</B>：把 `maxWaitTime` 調小（例如 2 分鐘），
              再調高 `customerArrivalInterval` 的倒數，就能刻意製造一連串 😿。
              用逐事件 step 看每一位顧客從到達到放棄的完整序列。
            </LI>
            <LI>
              <B>貓把人留住的效應</B>：顧客必須等身上的貓全走才能離開。
              調高 `catInteractionTime` 會讓 `avgTotalStayTime` 延長，
              即使用餐時間完全沒變 —— 這是「貓咪拉長停留」的直接證據。
            </LI>
            <LI>
              <B>比較 1× 和 8×</B>：1× 能看到每隻貓從貓區走到座位再走回來的完整軌跡，
              8× 則凸顯整體流量與瓶頸形成的時序。
            </LI>
          </UL>
          <Example>
            💡 搭配事件紀錄頁的搜尋框：輸入單一顧客編號（例如 <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">#12</code>）
            篩出該顧客的完整事件序列，再回到這裡用時間軸對照，
            能把 trace 和動畫兩種視角串起來。
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // 關於頁
  // ══════════════════════════════════════════════════════════
  // The "運作原理" page is itself a long-form learning essay, so the sidebar
  // deliberately has no extra notes for it; readers focus on the main content.
  howitworks: [],

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
            <br />• 《Introduction to Simulation》, Banks et al.
            <br />• 《Queueing Systems》, Kleinrock
          </Note>
        </div>
      ),
    },
  ],
}
