/**
 * NekoServe learning sidebar content (Traditional Chinese).
 * Classroom-notebook style: formulas, examples, and "why this design" reasoning.
 */

import { Formula, Example, Note, P, B, UL, LI, Ref, Term, type LearnContent } from './shared'
import { BlockMath } from '../../components/Math'
import FormulaExplain from '../../components/FormulaExplain'

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
      id: 'lit-2-1-queueing-foundation',
      icon: '📘',
      title: '2.1 離散事件模擬與排隊理論基礎',
      content: (
        <div>
          <P>
            NekoServe 的方法學脈絡，我從 1909 年 Erlang 處理電話交換台流量的研究一路接到現在。
            排隊論的核心是把「到達」「服務」「排隊」三件事拆開用機率描述，這套符號後來被
            Kendall 整理成 <Term k="mmc">M/M/c</Term> 這種速記：第一個 M 代表到達是馬可夫（<Term k="poisson">Poisson</Term>），第二個 M 代表服務時間是指數，c 是服務台數量。
          </P>
          <P>
            我的模擬要算三件事：平均到達率 <Term k="lambdaRate">λ</Term>、平均服務率 μ、系統中的人數 L。<Term k="littlesLaw">Little's Law</Term> 告訴我這三者永遠串在一起：
          </P>
          <FormulaExplain
            formula={String.raw`L = \lambda W, \qquad \rho = \frac{\lambda}{c\,\mu}`}
            hint={<>左式：平均系統人數 = 到達率 × 平均停留時間。右式：<Term k="utilization">利用率 ρ</Term> = 到達率 ÷（服務台數 × 每台服務率）。</>}
            more={<>Little's Law 神奇的地方是它不管分佈長什麼樣都成立，只要系統是穩態。右式的 ρ 要小於 1 系統才穩定，ρ 逼近 1 時排隊長度會爆炸成長（這就是為什麼沒人把店員排到 100%）。</>}
          />
          <P>
            <Term k="balking">Balking</Term> 與 <Term k="reneging">reneging</Term> 這兩個行為早在 1963 年就被 Ancker &amp; Gafarian 做成可解析的模型：顧客看到人太多會直接放棄（balk），進了隊伍又等太久也會離開（renege）。他們假設耐心時間是<Term k="exponential">指數分佈</Term>，這個假設到今天還是一般排隊教科書的預設起點。
          </P>
          <P>
            我選擇<Term k="des">離散事件模擬（DES）</Term>而不是純解析解，是因為貓咖的隨機資源（貓）讓封閉解變複雜。DES 讓我直接觀察每個事件、做敏感度分析、看尖峰尾端行為，這些都不是 M/M/c 閉式解能給我的。
          </P>
          <P><B>引用</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.11.1.88">
                Ancker Jr., C. J., &amp; Gafarian, A. V. (1963). Some Queuing Problems with Balking and Reneging. I. <i>Operations Research</i>, 11(1), 88–100.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.11.6.928">
                Ancker Jr., C. J., &amp; Gafarian, A. V. (1963). Some Queuing Problems with Balking and Reneging. II. <i>Operations Research</i>, 11(6), 928–937.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.9.3.383">
                Little, J. D. C. (1961). A Proof for the Queuing Formula: L = λW. <i>Operations Research</i>, 9(3), 383–387.
              </Ref>
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'lit-2-2-service-empirical',
      icon: '☕',
      title: '2.2 咖啡廳與餐飲業服務系統實證',
      content: (
        <div>
          <P>
            教授講的那句「每家店不一樣」，我在文獻裡看到了實證版。
            Hasugian 等 (2020) 用 EasyFit 對印尼一家 XYZ 快餐的營運資料做 <Term k="curveFit">curve fitting</Term>，結論是：顧客到達間隔服從 <Term k="weibull"><B>Weibull 分佈</B></Term>（均值 67.5 秒），服務時間服從 <Term k="normalDist"><B>常態分佈</B></Term>（均值 125.1 秒）。這是我目前看到最直接的「curve fitting 實例」。
          </P>
          <P>
            可是 Dbeis &amp; Al-Sahili (2024) 在巴勒斯坦 Al-Bireh 一家 drive-thru（<Term k="mm1">M/M/1</Term> 結構）做了 123 小時直接觀察，2,713 位顧客，<Term k="chiSquare">卡方檢定</Term>結果卻是：顧客到達是 <Term k="poisson"><B>Poisson</B></Term>（22 人/小時, p=0.414），服務時間是 <Term k="logNormal"><B>Log-Normal</B></Term>（均值 2.01 分, σ=0.9 分, p=0.634），<Term k="reneging">reneging</Term> 事件間隔是 <Term k="exponential"><B>指數分佈</B></Term>（λ=0.23, p=0.669）。
          </P>
          <P>
            兩篇文獻都有嚴謹方法論，卻得到不同的到達分佈（Weibull vs Poisson）。這不是誰錯，而是反映店家情境真的會影響分佈。我從這兩篇學到兩件事：第一，NekoServe 的預設應該要能換分佈；第二，如果未來要對某家特定店家校準，curve fitting 這套流程就是範本。
          </P>
          <P>
            Dbeis 還發現一件關鍵事：reneging <i>事件間隔</i>是 Poisson-like，但 reneging <i>rate 本身</i>跟時段高度相關（顛峰時期 reneging 暴增，接近顛峰敏感度 S ∈ [0,1] 呈非線性）。他們拿這個觀察推出一個修正公式（<Term k="rcrf">RCRF</Term> 模型），留給我的 2.5 節處理。
          </P>
          <P><B>引用</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1088/1757-899X/851/1/012028">
                Hasugian, I. A., Vandrick, N., &amp; Dewi, E. (2020). Analysis of Queuing Models of Fast Food Restaurant with Simulation Approach. <i>IOP Conf. Ser. Mater. Sci. Eng.</i>, 851, 012028.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1080/23270012.2024.2408528">
                Dbeis, A., &amp; Al-Sahili, K. (2024). Enhancing Queuing Theory Realism: Analysis of Reneging Behavior Impact on M/M/1 Drive-Thru Service System. <i>Journal of Management Analytics</i>, 11(4), 659–674.
              </Ref>
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'lit-2-3-cat-cafe-uniqueness',
      icon: '🐾',
      title: '2.3 貓咖的獨特性',
      content: (
        <div>
          <P>
            貓咖起源於台灣、在日本發揚光大，之後擴散到歐美。但一路到 2025 年之前，幾乎沒有把貓咖當排隊系統來研究的文獻。我找到的三篇最接近的是：
          </P>
          <P>
            Hirsch, Navarro Rivero &amp; Andersson (2025) 在瑞典斯德哥爾摩一家貓咖做了 <B>227 小時直接觀察</B>、70 天、27 隻貓。關鍵實證：
          </P>
          <UL>
            <LI>來客中位數 59 人/天（平日 34、週末 84.5，max 134）</LI>
            <LI>顧客容量上限 14 人，店員平日 2、週末 3，貓 8–9 隻</LI>
            <LI>貓咪行為分布：休息 31.7%、社交 12.8%、離開視線 10.7%</LI>
            <LI>
              <B>貓-人互動佔比只有 55.6%</B>（非接觸 29.0% + 接觸 23.2% + 其他 3.4%）；
              反過來說，<B>貓-人 44.4% 的時間完全沒在互動</B>
            </LI>
            <LI>貓-貓互動率 0.58 次/貓/小時</LI>
            <LI>貓咪明顯偏好高處（49.3% 時間在高處）</LI>
          </UL>
          <P>
            這推翻了我原本的直覺：我以為「貓咪陪伴 = 顧客愛爆」，但實際上近一半時間貓根本在做自己的事。NekoServe 如果模擬成「每隻貓都在跟客人互動」會高估顧客滿意度。
          </P>
          <P>
            Li et al. (2025) 針對 423 位中國寵物咖啡廳顧客做 <Term k="plsSem">PLS-SEM</Term> 結構方程模型，結論：
            <B>咖啡品質對滿意度沒有顯著影響</B>，但<B>寵物互動性</B>、<B>寵物可愛度</B>、<B>清潔度</B>是核心因子。
            所以 NekoServe 不模擬咖啡品質這件事，剛好跟這個發現對得上。
          </P>
          <P>
            Ropski, Pike &amp; Ramezani (2023) 則從動物福祉角度比較寄養家庭 vs 貓咖的 797 隻貓：貓咖平均停留 23.06 天（中位數 16 天），疾病率顯著較高（p=0.03）。這提供制度性背景，但對排隊模型幫助有限。
          </P>
          <P><B>引用</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.3390/ani15223233">
                Hirsch, E. N., Navarro Rivero, B., &amp; Andersson, M. (2025). Cats in a Cat Café: Individual Cat Behavior and Interactions with Humans. <i>Animals</i>, 15(22), 3233.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1177/21582440251378834">
                Li, J., Wong, J. W. C., Fong, L. H. N., &amp; Zhou, Y. (2025). Attributes Influencing Pet Café Satisfaction and Social Media Sharing Intentions. <i>SAGE Open</i>.
              </Ref>
            </LI>
            <LI>
              <Ref href="https://doi.org/10.1016/j.jveb.2023.02.005">
                Ropski, M. K., Pike, A. L., &amp; Ramezani, N. (2023). Analysis of illness and length of stay for cats in a foster-based rescue organization compared with cats housed in a cat café. <i>Journal of Veterinary Behavior</i>.
              </Ref>
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'lit-2-4-gap-and-positioning',
      icon: '🎯',
      title: '2.4 研究缺口與本研究定位',
      content: (
        <div>
          <P>
            把前面三類文獻對齊看，會看到三個清楚的空白區：
          </P>
          <P><B>缺口 A：貓咖實證研究沒被接上排隊系統</B></P>
          <P>
            Hirsch 2025、Li 2025、Ropski 2023 把貓的行為、顧客心理、動物福祉講得很細，但沒有人把這些參數餵給一個服務系統模型去看尖峰會怎樣、放棄率會怎樣。
          </P>
          <P><B>缺口 B：餐飲排隊模擬沒處理「隨機資源」</B></P>
          <P>
            Hasugian 2020、Dbeis 2024 都只有固定服務台（店員），沒有人模擬「服務的一部分來自一個會自己亂跑、有時候就趴下去睡的貓」。貓在我的模型裡是 <Term k="agentBased">agent-based</Term> 的非固定資源，這跟傳統 <Term k="mmc">M/M/c</Term> 的 c 完全不一樣。
          </P>
          <P><B>缺口 C：<Term k="balking">Balking</Term> / <Term k="reneging">reneging</Term> 沒在「動物陪伴情境」被驗證</B></P>
          <P>
            Ancker 1963 的經典模型假設耐心是<Term k="exponential">指數分佈</Term>，但那是在沒有貓的場景。當現場有貓時，顧客的耐心是否會延長？短期受阻於貓咪互動的顧客，是否會提前 renege？目前沒有文獻處理這個交互作用。
          </P>
          <P><B>NekoServe 的定位</B></P>
          <UL>
            <LI>
              整合 A + B + C 三領域，是我看到第一個把貓咖行為資料直接接到排隊模擬的開源工具。
            </LI>
            <LI>
              目標讀者是研究者和業者，不是單一店家的決策依據。它是「設計思考工具」，不是預測器。
            </LI>
            <LI>
              我在跑了一堆情境後發現一個有趣現象：只要店員滿載，貓咪的所有影響都被系統性稀釋。我把它叫做<B>瓶頸主導效應</B>，會寫進結果章節。
            </LI>
          </UL>
          <Note>
            💡 研究限制：14 個參數目前都是情境假設，不是針對特定店家 curve fitting 的結果。我下一步想做的，就是跟實際店家合作把 Hasugian 2020 那套流程搬過來。
          </Note>
        </div>
      ),
    },
    {
      id: 'lit-2-5-math-rho-correction',
      icon: '🧮',
      title: '2.5 數學修正：Dbeis 2024 的 ρ_R 公式',
      content: (
        <div>
          <P>
            這節是 2.2 的延伸。Dbeis &amp; Al-Sahili (2024) 最大的貢獻之一，就是指出傳統<Term k="utilization">利用率</Term>公式在有 <Term k="reneging">reneging</Term> 的系統裡會壞掉。
          </P>
          <P>傳統公式：</P>
          <FormulaExplain
            formula={String.raw`\rho = \frac{\lambda}{\mu}`}
            hint={<>單服務台的利用率：到達率 λ 除以服務率 μ。值越接近 1 代表越忙。</>}
            more={<>λ 是每分鐘平均進來幾位客人，μ 是每台服務台每分鐘平均能完成幾位客人。ρ 若大於 1 傳統上被當成「系統崩潰」，因為進來的速度超過處理的速度，隊伍會無限累積。下面的修正版會說明這個判斷在有 reneging 時會誤判。</>}
          />
          <P>
            修正公式（Dbeis 2024, Eq. 7）：
          </P>
          <FormulaExplain
            formula={String.raw`\rho_R = \frac{\lambda - RR}{\mu}`}
            hint={<>從 λ 扣掉 reneging rate RR，再除以服務率 μ，才是真正壓在店員身上的負擔。</>}
            more={<>RR 是每分鐘有幾個客人「排了但最後放棄」。他們根本沒被店員服務過，所以不該算進分子裡。把他們扣掉後的 <Term k="rhoCorrected">ρ_R</Term> 才反映實際資源使用率。Dbeis 的實測顯示：同一組資料在顛峰時段，傳統 ρ 會算出 1.14（看起來崩潰），但 ρ_R 只有 0.94（實際運作正常）。</>}
          />
          <P>
            其中 RR 是 reneging rate（人/單位時間）。概念上很直覺：提早離開的人根本沒真的佔用店員，把他們扣掉才是「真實負擔」。Dbeis 用實測資料驗證：
          </P>
          <UL>
            <LI>整體全時段：傳統 ρ = 0.74，修正 ρ_R = 0.69</LI>
            <LI>早晨顛峰：傳統 ρ = 0.97，修正 ρ_R = 0.90</LI>
            <LI>
              Reneging 被偵測 + 全時段：傳統 ρ = <B>1.02（崩潰）</B>，但修正 ρ_R = <B>0.82（合理）</B>
            </LI>
            <LI>
              Reneging 被偵測 + 早晨顛峰：傳統 ρ = <B>1.14（崩潰）</B>，但修正 ρ_R = <B>0.94（合理）</B>
            </LI>
          </UL>
          <P>
            這是一個方法論上的警訊：如果我在 NekoServe 只報傳統 ρ，當情境跑出 ρ &gt; 1 時使用者會以為系統崩潰，但實際上系統在跑、只是一堆人提早放棄。所以 NekoServe 的 Results 頁現在會把時間型 ρ（引擎實測）、古典 λ/(cμ) 與 <Term k="rhoCorrected">ρ_R</Term> 三個一起列出來，並在古典公式誤判為崩潰時加一條警示。
          </P>
          <P>
            Dbeis 還給了一個非線性回歸模型，描述 reneging 密度如何隨顛峰敏感度 S ∈ [0,1] 變化（R² = 0.945）：
          </P>
          <FormulaExplain
            formula={String.raw`\text{RCRF} = -2.056\,S + 1.37\,e^{S} - 1.173`}
            hint={<>RCRF 描述「<Term k="reneging">reneging</Term> 客人佔比」隨尖峰程度 S 變化，S=0（離峰）RCRF 約 0，S=1（滿尖峰）RCRF 衝到 0.5 以上。</>}
            more={<>這個模型的 R² = 0.945 表示對 Dbeis 的觀測資料解釋力很強。拆開看：-2.056S 是線性下壓項，1.37·eˢ 是指數膨脹項，兩項加起來形成「離峰幾乎沒人 renege，但一接近尖峰就指數爆炸」的形狀。常數 -1.173 是基準線校正。之後若要實作，只要把 S 當作「目前時段相對於當日最忙時段的比例」就可以直接餵進去。</>}
          />
          <P>
            這個 <Term k="rcrf">RCRF</Term> 模型我暫時先不實作，等 Priority 1 一起處理。
          </P>
          <P><B>引用</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1080/23270012.2024.2408528">
                Dbeis, A., &amp; Al-Sahili, K. (2024). Enhancing Queuing Theory Realism: Analysis of Reneging Behavior Impact on M/M/1 Drive-Thru Service System. <i>Journal of Management Analytics</i>, 11(4), 659–674.
              </Ref>
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
          <BlockMath formula={String.raw`\bar{X} \pm t_{\alpha/2,\, n-1} \cdot \frac{s}{\sqrt{n}}`} />
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

  citations: [],

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
