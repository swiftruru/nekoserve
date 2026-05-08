/**
 * NekoServe learning sidebar content (English).
 * Classroom-note style: formulas, examples, and the "why this design" reasoning.
 */

import { Formula, Example, Note, P, B, UL, LI, Ref, Term, type LearnContent } from './shared'
import { BlockMath } from '../../components/Math'
import FormulaExplain from '../../components/FormulaExplain'

export const LEARN_CONTENT_EN: LearnContent = {

  // ══════════════════════════════════════════════════════════
  // Settings page
  // ══════════════════════════════════════════════════════════
  settings: [
    {
      id: 'des-intro',
      icon: '🧩',
      title: 'What is discrete-event simulation?',
      content: (
        <div>
          <P>
            <B>Discrete-event simulation (DES)</B> models system state changes as a
            sequence of events. Between any two events the system state is frozen, and time
            jumps directly to the moment of the next event.
          </P>
          <P>
            Unlike continuous simulation (e.g. differential equations), DES does not
            integrate over tiny time steps, which makes it very efficient.
          </P>
          <Note>
            💡 Example events in our cat café:
            <br />Arrive → Seated → Order → Ready → Dining → Leave
          </Note>
          <P>
            This app uses <B>Python SimPy 4</B> as the DES engine. SimPy implements
            processes with generator functions and manages resource contention via
            {' '}<code className="text-xs bg-gray-100 dark:bg-bark-600 px-1 rounded">simpy.Resource</code>.
          </P>
        </div>
      ),
    },
    {
      id: 'poisson',
      icon: '📈',
      title: 'Poisson process & exponential distribution',
      content: (
        <div>
          <P>
            Customer arrivals in real queues typically follow a{' '}
            <B>Poisson process</B>: the number of arrivals in any time window is
            independent of other windows and proportional to its length.
          </P>
          <P>
            The <B>inter-arrival time</B> of a Poisson process is exponentially
            distributed:
          </P>
          <BlockMath formula={String.raw`T \sim \text{Exp}(\lambda), \quad \lambda = \frac{1}{\bar{T}}`} />
          <P>
            The exponential distribution is <B>memoryless</B>: no matter how long you
            have already waited, the distribution of the wait for the next arrival is
            unchanged.
          </P>
          <Example>
            💡 Example: with "mean arrival interval = 8 min"
            <br />→ λ = 1/8 = 0.125 customers/min
            <br />→ Expect about 7.5 arrivals per hour
          </Example>
        </div>
      ),
    },
    {
      id: 'normal-dist',
      icon: '🔔',
      title: 'Service times & the normal distribution',
      content: (
        <div>
          <P>
            Service times (order, food prep, dining, interaction) usually cluster
            around a mean with modest spread. A <B>normal distribution</B> is a natural
            fit:
          </P>
          <BlockMath formula={String.raw`T \sim \mathcal{N}(\mu,\, \sigma^2), \quad \sigma = 0.2\,\mu`} />
          <P>
            This simulator fixes the standard deviation at 20% of the mean and clamps
            negative draws with <code className="text-xs bg-gray-100 dark:bg-bark-600 px-1 rounded">max(1, sample)</code>.
          </P>
          <P><B>Why not exponential here?</B></P>
          <UL>
            <LI>Service times have a natural lower bound; nothing finishes in 0 s</LI>
            <LI>Trained staff have tight, not long-tailed, service times</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'simpy-resource',
      icon: '🏗️',
      title: 'SimPy resources & queues',
      content: (
        <div>
          <P>
            A SimPy <B>Resource</B> represents a shared resource with finite capacity.
            When all units are busy, subsequent requests automatically enter a FIFO
            wait queue.
          </P>
          <Formula>
            seats = Resource(env, capacity=seatCount)
            <br />staff = Resource(env, capacity=staffCount)
            <br />{'# v0.4.0: cats are NOT a Resource; each cat'}
            <br />{'# runs its own autonomous process'}
            <br />for i in range(catCount):
            <br />{'    env.process(cat(i))'}
          </Formula>
          <P>Customer flow (v0.4.0):</P>
          <UL>
            <LI>request(seats) → wait for or immediately take a seat</LI>
            <LI>request(staff) → wait for a free staff to take the order</LI>
            <LI>dine, possibly visited by cats at the seat</LI>
            <LI>wait for all visiting cats to leave before standing up</LI>
          </UL>
          <Note>
            🔍 Only seats and staff form queues.
            <br />Cats are now <B>autonomous agents</B>: each picks a seated customer
            and walks over to them. There is no cat queue — instead each cat is a
            little character with its own life cycle.
          </Note>
        </div>
      ),
    },
    {
      id: 'littles-law',
      icon: '⚖️',
      title: "Little's Law",
      content: (
        <div>
          <P>
            Little's Law is the cornerstone of queueing theory, linking three
            steady-state quantities:
          </P>
          <BlockMath formula={String.raw`N = \lambda \cdot W`} />
          <UL>
            <LI><B>N</B>: average number of customers in the system</LI>
            <LI><B>λ</B>: effective arrival rate (customers/min)</LI>
            <LI><B>W</B>: average time a customer spends in the system (min)</LI>
          </UL>
          <P>
            It holds for any stable waiting system, <B>regardless of the underlying
            distributions</B>.
          </P>
          <Example>
            💡 If λ = 0.1 customers/min and W = 60 min,
            <br />→ there are on average N = 6 customers in the system
            <br />→ you need at least 6 seats to hold them
          </Example>
        </div>
      ),
    },
    {
      id: 'scenario-assumption',
      icon: '📘',
      title: 'A note about these numbers',
      content: (
        <div>
          <P>
            I didn't actually go sit in a cat café with a stopwatch to build this app.
            Every default on the Settings page, 10 seats, 8-minute arrival interval,
            cats finding someone every 4 minutes, comes from my own common sense,
            casual observation of small cafés, and rough imagination of how cats behave.
            These are <B>scenario assumptions</B>, not measured field data.
          </P>
          <P>
            So why did I still build it this way? Because the point of this app
            was never "predict what happens in a specific real store". It's to let
            people feel how queueing theory and discrete-event simulation behave by
            playing with it. The questions I want it to answer are <B>qualitative</B>:
            "what happens to waiting time when arrivals speed up?" Not quantitative
            ones like "how many extra staff do I need on Wednesday lunch?" That
            second kind really does need measurement.
          </P>
          <Note>
            💡 One distinction I think matters a lot:
            <br />
            "Modeling arrivals with an exponential distribution" is backed by Kleinrock
            and similar classics.
            <br />
            "Mean = 8 minutes" is purely my scenario guess, with no literature behind it.
            <br />
            The two claims need to be answered separately. Each parameter's 📚 References
            field guarantees the first (distribution choice), not the second (the number itself).
          </Note>
          <P>
            So if someone asks where these numbers come from, I'll say it honestly:
            this is a teaching-scenario simulation. The numerical values are common-sense
            estimates for a small café; the distribution choices are the part that has
            literature backing. If I ever needed to plan a real store, I'd add a
            sensitivity analysis and measure the most important few parameters on site
            to calibrate.
          </P>
          <P>To make that position solid, here's what I can still do:</P>
          <UL>
            <LI>
              <B>Say where each number came from.</B> Every parameter's "Default-value basis"
              field spells out whether it's common sense, analogy, or a literature range,
              so I can point to it directly if challenged.
            </LI>
            <LI>
              <B>Sensitivity analysis.</B> Sweep the key parameters (arrival interval,
              dining time) across a plausible range and see if the conclusions flip.
              If the conclusion is extremely sensitive to one number, that number must
              be measured, not guessed.
            </LI>
            <LI>
              <B>Partial on-site calibration.</B> To use this for a specific café, I only
              need 30 minutes on-site with a stopwatch for a handful of key numbers.
              That alone upgrades the study from "illustrative" to "semi-measured".
            </LI>
            <LI>
              <B>Cite a plausible range.</B> For parameters that have been discussed in
              the literature (Maister 1985 and Larson 1987 both talk about a 15–30 min
              abandonment window), I cite the range and pick a midpoint, which is more
              grounded than inventing a number from nothing.
            </LI>
          </UL>
          <Note>
            🎓 The one-line summary of my stance:
            <br />
            This app is a tool for feeling "why queues behave the way they do",
            not a tool for predicting "what will actually happen".
            <br />
            In the first role, scenario assumptions are a reasonable choice; in the
            second role, they fail.
          </Note>
          <P>So my line is:</P>
          <UL>
            <LI>
              <B>Good for</B>: classroom demos of queueing dynamics, what-if exploration
              (peak vs off-peak, what if we add one more staff), hands-on SimPy practice.
            </LI>
            <LI>
              <B>Not good for</B>: real investment decisions, quantitative predictions
              in government reports, scientific papers that need bounded error.
              Those all need measured data, which scenario assumptions cannot stand in for.
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'lit-2-1-queueing-foundation',
      icon: '📘',
      title: '2.1 Discrete-event simulation & queueing theory foundations',
      content: (
        <div>
          <P>
            NekoServe's methodological lineage goes back to Erlang's 1909 telephone-exchange work. Classical queueing theory decomposes the problem into three probabilistic pieces — arrivals, service, and the queue discipline — which Kendall later codified as <Term k="mmc">M/M/c</Term>: Markovian arrivals (<Term k="poisson">Poisson</Term>), Markovian service times (<Term k="exponential">Exponential</Term>), and c servers.
          </P>
          <P>
            The model has to track arrival rate <Term k="lambdaRate">λ</Term>, service rate μ, and system occupancy L. <Term k="littlesLaw">Little's Law</Term> ties these together:
          </P>
          <FormulaExplain
            formula={String.raw`L = \lambda W, \qquad \rho = \frac{\lambda}{c\,\mu}`}
            hint={<>Left: average system population = arrival rate × average time in system. Right: <Term k="utilization">utilization ρ</Term> = arrivals ÷ (servers × per-server service rate).</>}
            more={<>Little's Law is distribution-free — it holds for any stationary system. The right-hand side requires ρ &lt; 1 for stability; as ρ → 1 the queue length blows up (which is why in practice you never want staff pinned at 100%).</>}
          />
          <P>
            <Term k="balking">Balking</Term> and <Term k="reneging">reneging</Term> — customers refusing to join, or bailing out of the queue — were formalized by Ancker &amp; Gafarian (1963). They assumed patience times follow an <Term k="exponential">Exponential distribution</Term>, which is still the textbook default. NekoServe's maximum-wait parameter inherits this.
          </P>
          <P>
            I picked <Term k="des">DES</Term> over a closed-form solution because cats are a stochastic non-fixed resource, which breaks the analytical tractability of plain M/M/c. DES lets me watch each event, run sensitivity sweeps, and study tail behavior at peaks — things closed-form solutions can't give.
          </P>
          <P><B>References</B></P>
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
      title: '2.2 Empirical service-system studies in F&B',
      content: (
        <div>
          <P>
            My advisor said "every shop is different" — the literature bears that out. Hasugian et al. (2020) did a <Term k="curveFit">curve fit</Term> with EasyFit on an Indonesian fast-food chain and reported: interarrival times fit a <Term k="weibull"><B>Weibull distribution</B></Term> (mean 67.5 s), service times fit a <Term k="normalDist"><B>Normal distribution</B></Term> (mean 125.1 s). That's the most concrete "curve fitting" example I have in hand.
          </P>
          <P>
            Dbeis &amp; Al-Sahili (2024), however, studied a Palestinian drive-thru (<Term k="mm1">M/M/1</Term>, 123 hours of observation, 2,713 customers) and, with <Term k="chiSquare">chi-square</Term> tests, landed on: arrivals are <Term k="poisson"><B>Poisson</B></Term> (22/hr, p=0.414), service times are <Term k="logNormal"><B>Log-Normal</B></Term> (mean 2.01 min, σ=0.9, p=0.634), and <Term k="reneging">reneging</Term> event spacing is <Term k="exponential"><B>Exponential</B></Term> (λ=0.23, p=0.669).
          </P>
          <P>
            Two rigorous studies, two different arrival distributions (Weibull vs Poisson). Not one being wrong — the shop's context matters. I took away two things: first, NekoServe's defaults need to be swappable; second, Hasugian's pipeline is the template if I ever calibrate against a specific real café.
          </P>
          <P>
            Dbeis also caught a subtle point: reneging <i>event spacing</i> is Poisson-like, but the reneging <i>rate itself</i> is strongly time-varying (sharply peaking at rush hour, nonlinearly in a peak-sensitivity index S ∈ [0,1]). Their correction formula (the <Term k="rcrf">RCRF</Term> model) based on that observation gets its own section in 2.5.
          </P>
          <P><B>References</B></P>
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
      title: '2.3 Why cat cafés need their own model',
      content: (
        <div>
          <P>
            Cat cafés started in Taiwan, took off in Japan, and spread to Europe and North America. But through 2025 there is almost nothing that treats a cat café as a queueing system. The three closest studies I found:
          </P>
          <P>
            Hirsch, Navarro Rivero &amp; Andersson (2025) did <B>227 hours of direct observation</B> across 70 days and 27 cats at a Stockholm cat café. Key empirical numbers:
          </P>
          <UL>
            <LI>Median daily arrivals: 59 (weekday 34, weekend 84.5, max 134)</LI>
            <LI>Capacity cap: 14 customers; staff 2 weekday / 3 weekend; 8–9 cats</LI>
            <LI>Cat behavior mix: resting 31.7%, social 12.8%, out-of-sight 10.7%</LI>
            <LI>
              <B>Cat-human interaction fills only 55.6% of observed time</B> (non-contact 29.0%, contact 23.2%, other 3.4%); conversely, <B>cats and humans are doing nothing together 44.4% of the time</B>
            </LI>
            <LI>Cat-cat interaction rate: 0.58 interactions/cat/hr</LI>
            <LI>Cats clearly prefer elevated perches (49.3% of observed time)</LI>
          </UL>
          <P>
            This overturned my intuition. I assumed "cat presence = customers delighted." In reality cats spend nearly half their time doing their own thing. A NekoServe that assumes every cat is always engaging a customer would overstate satisfaction.
          </P>
          <P>
            Li et al. (2025) ran <Term k="plsSem">PLS-SEM</Term> on 423 Chinese pet café customers and found that <B>coffee quality has no significant impact on satisfaction</B>, while <B>pet interactivity</B>, <B>cuteness</B>, and <B>cleanliness</B> are the main drivers. Fortunately NekoServe already ignores coffee quality — that matches the empirical finding.
          </P>
          <P>
            Ropski, Pike &amp; Ramezani (2023) compared 797 cats across foster networks vs cat cafés: cat-café mean stay was 23.06 days (median 16), with a significantly higher illness rate (p=0.03). Useful institutional backdrop, less actionable for the queueing model itself.
          </P>
          <P><B>References</B></P>
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
      title: '2.4 Research gap & how NekoServe positions itself',
      content: (
        <div>
          <P>
            Lining up the three literature clusters side by side, three clear gaps show up:
          </P>
          <P><B>Gap A: cat-café empirical research isn't plugged into a queueing system</B></P>
          <P>
            Hirsch 2025, Li 2025, and Ropski 2023 document cat behavior, customer psychology, and animal welfare in detail, but no one has fed those numbers into a service-system simulation to see what peak hour or abandonment looks like.
          </P>
          <P><B>Gap B: F&amp;B queueing simulations don't model "stochastic resources"</B></P>
          <P>
            Hasugian 2020 and Dbeis 2024 both assume fixed servers (staff). None of them simulates "part of the service is delivered by an animal that wanders off on its own and occasionally takes a nap." NekoServe's cats are <Term k="agentBased">agent-based</Term> non-fixed resources, structurally different from the c in <Term k="mmc">M/M/c</Term>.
          </P>
          <P><B>Gap C: <Term k="balking">balking</Term> / <Term k="reneging">reneging</Term> hasn't been validated "in the presence of animals"</B></P>
          <P>
            Ancker 1963 assumes <Term k="exponential">exponential</Term> patience, but that's in a cat-free context. When there's a cat nearby, does patience stretch? Does a customer who gets temporarily stuck during a cat visit renege sooner? Nobody has addressed this interaction.
          </P>
          <P><B>NekoServe's positioning</B></P>
          <UL>
            <LI>First open-source tool I'm aware of that plugs cat-café behavior data directly into a queueing simulation, bridging gaps A + B + C.</LI>
            <LI>Target audience is researchers and operators — this is a design-thinking tool, not a predictor for any single café.</LI>
            <LI>
              After running many scenarios, I noticed that whenever staff saturate, <B>every cat-side effect gets systematically diluted</B>. I call this the <B>bottleneck-dominance effect</B> and write it up in the results chapter.
            </LI>
          </UL>
          <Note>
            💡 Scope caveat: all 14 parameters are scenario assumptions, not curve-fit results from a specific café. The obvious next step is to replicate Hasugian 2020's pipeline against a real partner café.
          </Note>
        </div>
      ),
    },
    {
      id: 'lit-2-5-math-rho-correction',
      icon: '🧮',
      title: '2.5 Math correction: Dbeis 2024 ρ_R formula',
      content: (
        <div>
          <P>
            A follow-on to 2.2. One of the biggest contributions in Dbeis &amp; Al-Sahili (2024) is pointing out that the classical <Term k="utilization">utilization</Term> formula breaks down when the system has <Term k="reneging">reneging</Term>.
          </P>
          <P>Classical:</P>
          <FormulaExplain
            formula={String.raw`\rho = \frac{\lambda}{\mu}`}
            hint={<>Single-server utilization: arrival rate λ over service rate μ. Values close to 1 mean the server is slammed.</>}
            more={<>λ is customers arriving per minute, μ is customers a single server can finish per minute. When ρ &gt; 1 the classical reading is "system collapse" — arrivals outpace service and the queue diverges. The corrected form below shows this reading is wrong when customers keep walking away before being served.</>}
          />
          <P>Dbeis 2024 corrected (Eq. 7):</P>
          <FormulaExplain
            formula={String.raw`\rho_R = \frac{\lambda - RR}{\mu}`}
            hint={<>Subtract the reneging rate RR from λ first, then divide by μ. That's the actual load staff experience.</>}
            more={<>RR is customers per minute who joined and later bailed out. They never actually used the server, so they shouldn't be in the numerator. The <Term k="rhoCorrected">ρ_R</Term> that remains is the true resource utilization. Dbeis's data: at morning peak, classical ρ reads 1.14 (fake collapse) while ρ_R is only 0.94 (system actually running fine).</>}
          />
          <P>
            RR is the reneging rate (customers per unit time). The intuition is direct: customers who left early never actually consumed server time, so subtracting them out gives the real load. Dbeis validated it against observed data:
          </P>
          <UL>
            <LI>All time windows: classical ρ = 0.74, corrected ρ_R = 0.69</LI>
            <LI>Morning peak: classical ρ = 0.97, corrected ρ_R = 0.90</LI>
            <LI>
              Reneging-detected + all windows: classical ρ = <B>1.02 (collapse)</B>, corrected ρ_R = <B>0.82 (reasonable)</B>
            </LI>
            <LI>
              Reneging-detected + morning peak: classical ρ = <B>1.14 (collapse)</B>, corrected ρ_R = <B>0.94 (reasonable)</B>
            </LI>
          </UL>
          <P>
            That's a methodological red flag. If NekoServe only reported the classical ρ, a scenario that produces ρ &gt; 1 would look like a system crash, when in fact the system runs fine — it's just that a lot of people walked away. So NekoServe's Results page now shows three ρ values side by side: time-based (engine-measured), classical λ/(cμ), and <Term k="rhoCorrected">ρ_R</Term> — with a warning banner when the classical formula falsely reports collapse.
          </P>
          <P>
            Dbeis also provides a nonlinear regression that describes how reneging density moves with peak-hour sensitivity S ∈ [0,1] (R² = 0.945):
          </P>
          <FormulaExplain
            formula={String.raw`\text{RCRF} = -2.056\,S + 1.37\,e^{S} - 1.173`}
            hint={<>RCRF is the share of customers who <Term k="reneging">renege</Term>. Near off-peak (S=0) it's tiny; at peak (S=1) it explodes to 0.5+.</>}
            more={<>R² = 0.945 means the model fits Dbeis's observations tightly. The -2.056S term bends the curve down linearly; the 1.37·eˢ term blows it up exponentially as S rises; the -1.173 constant anchors the baseline. Together they produce "near-zero reneging off-peak, explosive reneging at peak." If later implemented, feeding S = (current hour's arrivals ÷ peak-hour arrivals) is the natural mapping.</>}
          />
          <P>
            I'm deferring the <Term k="rcrf">RCRF</Term> model to Priority 1.
          </P>
          <P><B>References</B></P>
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
      title: 'References',
      content: (
        <div>
          <P>
            The full bibliography for the "📚 References" field on every parameter,
            grouped by topic. These sources support the <B>choice of distributions
            and theoretical framework</B>; they do not directly support specific
            numerical defaults (those remain scenario assumptions).
          </P>
          <P><B>Queueing theory foundations</B></P>
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
          <P><B>Core theorems</B></P>
          <UL>
            <LI>
              <Ref href="https://doi.org/10.1287/opre.9.3.383">
                Little, J. D. C. (1961). "A Proof for the Queuing Formula: L = λW". <i>Operations Research</i>, 9(3), 383–387.
              </Ref>
            </LI>
          </UL>
          <P><B>Simulation methodology</B></P>
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
          <P><B>Agent-based modeling</B></P>
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
          <P><B>Waiting-line psychology / reneging</B></P>
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
          <P><B>Random number generation</B></P>
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
            ⚠️ Reminder: these references support <B>distribution and framework choice</B>,
            not specific default values (10 seats, 8 min interval, etc.). Those remain scenario assumptions.
          </Note>
        </div>
      ),
    },
    {
      id: 'batch-replication',
      icon: '🔁',
      title: 'Batch replication: why one run is not enough',
      content: (
        <div>
          <P>
            Simulation results come from a random number generator. Change the <B>random seed</B> and
            every KPI changes too, because arrival times, service times, and cat behavior are all random
            variables. Drawing conclusions from a single run is like rolling a die once and calling the result
            the average.
          </P>
          <P>
            <B>Replication</B> means running the same parameters N times (usually 10+) with different seeds
            and averaging the results. The more you run, the more the average stabilizes toward the true
            system behavior.
          </P>
          <Note>
            💡 Enable "Batch mode" at the bottom of the Settings page, set the replication count, and run.
            The app uses seed, seed+1, seed+2, ... automatically and computes the mean and confidence interval.
          </Note>
          <P>This is not optional overhead. In DES, results without replication are considered unreliable.</P>
        </div>
      ),
    },
    {
      id: 'sensitivity-analysis',
      icon: '📈',
      title: 'Sensitivity analysis: which parameter matters most',
      content: (
        <div>
          <P>
            You have 14 adjustable parameters, but not all of them affect results equally.
            <B> Sensitivity analysis</B> means holding everything else fixed, changing one parameter across a
            range, and watching how KPIs respond.
          </P>
          <P>
            For example, sweep staff count from 1 to 5: if the abandon rate drops from 40% to 2%, staff is
            the key parameter. If it barely moves, the bottleneck is elsewhere.
          </P>
          <Example>
            💡 Enable "Sensitivity analysis" at the bottom of the Settings page, pick the parameter and range.
            The app runs a batch at each sweep point and shows the result as a line chart.
            Look for the "knee" in the curve, where the slope flattens. That is where adding more of the
            resource stops helping as much.
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // Results page
  // ══════════════════════════════════════════════════════════
  results: [
    {
      id: 'utilization',
      icon: '📊',
      title: 'What utilization ρ means',
      content: (
        <div>
          <P>
            <B>Utilization ρ</B> measures how busy a resource is and is the core
            efficiency indicator of a service system:
          </P>
          <BlockMath formula={String.raw`\rho = \dfrac{\lambda}{\mu \, c}`} />
          <UL>
            <LI><B>λ</B>: arrival rate</LI>
            <LI><B>μ</B>: service rate of a single server</LI>
            <LI><B>c</B>: number of servers (seats/staff)</LI>
          </UL>
          <Note>
            ⚠️ ρ above 0.9 is dangerous:
            <br />In an M/M/1 queue, wait time at ρ=0.9 is <B>9×</B> that at ρ=0.5!
          </Note>
          <P>
            Don't chase 100% utilization, because any tiny perturbation then creates a long
            queue. A healthy range is usually 0.7 – 0.85.
          </P>
        </div>
      ),
    },
    {
      id: 'wait-decompose',
      icon: '⏱️',
      title: 'Decomposing wait time',
      content: (
        <div>
          <P>A customer's total time in the system decomposes as:</P>
          <Formula>
            W (total) = Wq (queueing) + Ws (service)
          </Formula>
          <P>In this simulation the breakdown is:</P>
          <UL>
            <LI>Wait for seat (Wq1)</LI>
            <LI>Wait for order completion (Wq2 + prep time)</LI>
            <LI>Dining (Ws1)</LI>
            <LI>Wait for any visiting cats to leave before standing up (Wq3; varies with how many cats are currently on the customer)</LI>
          </UL>
          <P>
            The <B>Erlang-C formula</B> for M/M/c queues gives a theoretical wait time
            that can be compared against simulation results to validate the model.
          </P>
          <Example>
            💡 Heuristic: if "wait for seat" dwarfs the other components, seats are
            the bottleneck, so adding seats will have the largest impact.
          </Example>
        </div>
      ),
    },
    {
      id: 'abandon-rate',
      icon: '🚪',
      title: 'What the abandon rate tells you',
      content: (
        <div>
          <P>Queueing theory recognizes two ways customers leave:</P>
          <UL>
            <LI><B>Balking</B>: customer sees a long queue on arrival and never joins</LI>
            <LI><B>Reneging</B>: customer gives up while already waiting ← used here</LI>
          </UL>
          <P>
            A high abandon rate means the system <B>cannot absorb demand</B>, not
            that demand is low.
          </P>
          <Note>
            🎯 "Max wait tolerance" = the customer's patience threshold. Customers
            exceeding this value produce CUSTOMER_ABANDON events.
          </Note>
          <Example>
            💡 Playbook: when abandon rate &gt; 20%, find the resource with the highest
            utilization and raise its capacity first.
          </Example>
        </div>
      ),
    },
    {
      id: 'bottleneck',
      icon: '🔍',
      title: 'Identifying and fixing bottlenecks',
      content: (
        <div>
          <P>
            System-wide <B>throughput</B> is determined by the most constrained
            resource, the <B>bottleneck</B>.
          </P>
          <UL>
            <LI>Find the resource with the highest utilization</LI>
            <LI>Try bumping its capacity by +1 and observe the effect</LI>
            <LI>Improving non-bottleneck resources barely moves throughput</LI>
          </UL>
          <Formula>Throughput ≤ bottleneck capacity × bottleneck service rate</Formula>
          <P>
            This is exactly the core idea of the{' '}
            <B>Theory of Constraints (TOC)</B>: continually identify and relieve the
            tightest constraint in the system.
          </P>
          <Example>
            💡 Classroom exercise: run a simulation once, then double the capacity of
            the most utilized resource and run again. Use the Compare tab to view the
            two runs side-by-side.
          </Example>
        </div>
      ),
    },
    {
      id: 'confidence-intervals',
      icon: '📐',
      title: 'Confidence intervals: how reliable is the average',
      content: (
        <div>
          <P>
            After a batch run you have N KPI values. The mean is a point estimate, but the
            <B> 95% confidence interval (CI)</B> tells you how precise that estimate is.
          </P>
          <P>
            Intuitive reading: if you re-ran the entire batch many times and computed a CI each time,
            95% of those intervals would contain the true average.
            A <B>narrow interval</B> means the estimate is precise;
            a <B>wide interval</B> means you need more replications.
          </P>
          <BlockMath formula={String.raw`\bar{X} \pm t_{\alpha/2,\, n-1} \cdot \frac{s}{\sqrt{n}}`} />
          <P>
            Here n is the replication count, s is the standard deviation, and t is the t-distribution
            critical value. With small samples, t is larger than 1.96 (wider, more conservative);
            once n exceeds about 30, it approaches the normal distribution.
          </P>
          <Note>
            💡 The small text below each KPI card shows the 95% CI. If the interval spans more than
            20% of the mean, the results are still unstable. Try increasing replications to 20 or 30.
          </Note>
        </div>
      ),
    },
    {
      id: 'sweep-charts',
      icon: '📈',
      title: 'Reading sweep charts: finding the tipping point',
      content: (
        <div>
          <P>
            Sensitivity analysis results are displayed as a line chart.
            The <B>X-axis</B> is the swept parameter value,
            the <B>Y-axis</B> is the KPI you selected (switch via the dropdown).
            Each point is the mean of multiple replications at that parameter value,
            and the shaded band is the 95% CI.
          </P>
          <P>The goal is not to read individual numbers, but to <B>spot trends and tipping points</B>:</P>
          <UL>
            <LI>Steep sections mean the parameter has a large marginal effect.</LI>
            <LI>Where the curve flattens is the point of diminishing returns: adding more has little effect.</LI>
            <LI>If the CI band is wide, that region has high variance and needs more replications.</LI>
          </UL>
          <Example>
            💡 Typical observation: increasing seats from 5 to 10 drops the abandon rate from 50% to 5%
            (steep section). From 10 to 15, it only drops from 5% to 3% (flat section).
            Conclusion: 10 seats is enough; extra seats have diminishing returns.
          </Example>
        </div>
      ),
    },
    {
      id: 'what-if-explorer',
      icon: '🔮',
      title: 'What-If Explorer: compare without re-running',
      content: (
        <div>
          <P>
            At the bottom of the Results page there is a <B>"What-If Explorer"</B> panel.
            Open it to reveal four sliders: seats, staff, cats, and arrival interval.
          </P>
          <P>
            Drag any slider and the app automatically re-runs a simulation in the background
            (takes about 0.5 seconds), then shows the new results alongside the original in a
            comparison table: <B>green</B> means the metric improved, <B>red</B> means it got worse.
          </P>
          <Note>
            💡 What-If is for quick exploration:
            instead of going back to Settings, changing a parameter, and clicking Run,
            you can drag a slider right on the Results page and instantly see
            "what if I had one more staff member."
          </Note>
          <P>
            The difference from sensitivity analysis: sensitivity analysis systematically sweeps
            an entire range and draws a trend chart. What-If is for trying a single value on the
            spot when inspiration strikes.
          </P>
          <P>
            What-If results are <B>not saved to history</B>,
            so you can experiment freely without cluttering your saved experiments.
          </P>
        </div>
      ),
    },
    {
      id: 'passive-exposure',
      icon: '👀',
      title: 'Passive exposure: the channel the paper missed',
      content: (
        <div>
          <P>
            Hirsch et al. (2025) only measured <B>contact</B> time (cat physically visiting
            a customer). The paper never touches another obvious source of enjoyment:
            <B> a customer just seeing a cat nearby is already a good time</B>.
            Watching a cat jump onto a shelf, play with someone at the next table,
            or stroll across the aisle all contribute to satisfaction, but traditional
            contact-rate metrics throw those moments away.
          </P>
          <P>
            This simulator adds a second channel called <B>Passive Exposure</B> to fill
            that gap. The rate formula has two hard filters (customer must be seated,
            at least one cat in the same AREA) multiplied by three weights:
          </P>
          <UL>
            <LI><B>Distance decay</B>: further from the seat, lower weight: <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">1 / (1 + d/150)</code></LI>
            <LI><B>Visibility</B>: on a shelf 1.2, on furniture 1.1, on the floor 1.0</LI>
            <LI><B>Behavior</B>: PLAYING 1.3, MOVING/EXPLORING/ALERT/SOCIALIZING 1.1, others 1.0</LI>
          </UL>
          <P>
            Summed across cats that is an exposure <B>rate</B> per minute; integrated
            over time it becomes accumulated exposure minutes. The Results page cat
            section reports three new KPIs:
            <B> average passive exposure minutes</B>, <B>passive / active ratio</B>,
            and a saturated <B>0–1 score</B>.
          </P>
          <Note>
            ⚠️ This is a <B>simulator-proposed research framework</B>, not a
            validated empirical model. Hirsch 2025 did not measure passive exposure,
            so the weights (1.2, 1.3 etc.) are reasoned estimates, not measurements.
            Future empirical work could collect customer satisfaction surveys and
            regress <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">satisfaction ~ β·active + γ·passive</code> to
            estimate real β and γ coefficients.
          </Note>
          <P>
            To keep this new metric from contaminating the existing validation baseline,
            I <B>deliberately kept passive exposure out of the existing
            customerSatisfactionScore formula</B> and surfaced it as a separate side
            KPI. That way validation-mode scores don't silently degrade just because
            I bolted on a new model.
          </P>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // Event log page
  // ══════════════════════════════════════════════════════════
  eventlog: [
    {
      id: 'trace-intro',
      icon: '📋',
      title: 'Simulation traces',
      content: (
        <div>
          <P>
            A <B>simulation trace</B> is a key DES output. It records, for every
            event during a run:
          </P>
          <UL>
            <LI><B>Timestamp</B>: simulation time when the event fired (min)</LI>
            <LI><B>Event type</B>: what happened</LI>
            <LI><B>Subject</B>: which customer (or cat) was involved</LI>
            <LI><B>Resource</B>: which seat/staff/cat was involved</LI>
          </UL>
          <P>Main uses of a trace:</P>
          <UL>
            <LI>Verify the model behaves as expected (debugging)</LI>
            <LI>Compute derived metrics such as per-customer wait time</LI>
            <LI>Visualize the run (e.g. Gantt charts)</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'queue-detection',
      icon: '🔎',
      title: 'Spotting queue build-up',
      content: (
        <div>
          <P>How to detect "heavy waiting" in the event log:</P>
          <UL>
            <LI>Filter <B>Wait seat</B> events and watch for dense clusters</LI>
            <LI>
              Increasing "wait → seated" intervals across consecutive customers
              indicate a growing queue
            </LI>
            <LI>
              Every <B>Abandon</B> event is always preceded by a matching "wait seat"
              event
            </LI>
          </UL>
          <Note>
            🔍 Tracking a single customer: type their id (e.g.{' '}
            <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">#12</code>) in the
            search box to filter the full journey for that customer.
          </Note>
          <Example>
            💡 Click the "Abandon" slice in the results pie chart to jump straight
            here with the filter pre-applied.
          </Example>
        </div>
      ),
    },
    {
      id: 'event-types-guide',
      icon: '🗺️',
      title: 'Customer journey event map',
      content: (
        <div>
          <P><B>A complete (happy-path) customer journey (v0.4.0):</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-gray-50 dark:bg-bark-700 rounded-lg p-3 my-2 select-text leading-6">
            ARRIVE<br />
            ↓ [if no free seat]<br />
            WAIT_SEAT → SEATED<br />
            ↓<br />
            ORDER → start preparing<br />
            ↓<br />
            ORDER_READY → START_DINING<br />
            ↓ [cats may drop by during dining]<br />
            FINISH_DINING<br />
            ↓ [wait for any visiting cats to leave]<br />
            LEAVE
          </div>
          <P><B>Interleaved cat events (independent of any single customer):</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-pink-50 dark:bg-pink-900/30 rounded-lg p-3 my-2 select-text leading-6">
            CAT_VISIT_SEAT<br />
            ↓ [visit duration; may overlap other customers]<br />
            CAT_LEAVE_SEAT<br />
            ↓ [probabilistic]<br />
            CAT_START_REST → CAT_END_REST
          </div>
          <P><B>Short-circuit (abandon) path:</B></P>
          <div className="text-xs text-gray-600 dark:text-bark-200 font-mono bg-red-50 dark:bg-red-900/30 rounded-lg p-3 my-2 select-text">
            ARRIVE → WAIT_SEAT → ABANDON
          </div>
          <Note>
            💡 <B>CAT_VISIT_SEAT</B> / <B>CAT_LEAVE_SEAT</B> carry the cat identity
            in <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">resourceId</code>
            (e.g. <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">貓-2</code>);
            <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">customerId</code> is the
            customer being visited. A single customer may be visited by several cats
            during their stay, possibly overlapping in time.
          </Note>
        </div>
      ),
    },
    {
      id: 'interval-analysis',
      icon: '📐',
      title: 'Experiments: validating the distributions',
      content: (
        <div>
          <P>You can use the event log to <B>sanity-check the distributions</B>:</P>
          <P><B>1. Verify the exponential arrival-interval distribution:</B></P>
          <UL>
            <LI>Filter all "Arrive" events</LI>
            <LI>Compute the time differences between consecutive arrivals</LI>
            <LI>They should follow an exponential distribution (many short, a few long)</LI>
          </UL>
          <P><B>2. Verify seed reproducibility:</B></P>
          <UL>
            <LI>Two runs with the same seed should produce identical event logs</LI>
            <LI>Changing the seed should give different logs with similar statistics</LI>
          </UL>
          <Example>
            💡 Classroom experiment: run the "Weekday daytime" scenario three times
            with seed=42 and verify the logs are identical. Then switch to seed=123
            and compare.
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // Simulation Playback page
  // ══════════════════════════════════════════════════════════
  playback: [
    {
      id: 'playback-how-to-read',
      icon: '🎬',
      title: 'Reading the animation',
      content: (
        <div>
          <P>
            The café floor plan runs left-to-right through seven zones.
            Customers flow through them like parts on an assembly line:
          </P>
          <UL>
            <LI><B>🚪 Door</B>: where customers arrive</LI>
            <LI><B>Seat queue</B>: where they wait when all seats are full</LI>
            <LI><B>🪑 Seats</B>: N cells, matching the <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">seatCount</code> parameter</LI>
            <LI><B>👩‍🍳 Kitchen</B>: M staff dots that light up orange when busy</LI>
            <LI><B>🐱 Cat zone</B>: home base for K cats; each wanders out to a seat when it decides to visit</LI>
            <LI><B>🏁 Exit</B>: served or abandoned customers fade out here</LI>
          </UL>
          <P>Each customer's emoji swaps to match their current stage:</P>
          <UL>
            <LI>🙂 Waiting for seat</LI>
            <LI>📝 Ordering</LI>
            <LI>⏳ Waiting for food</LI>
            <LI>🍽️ Dining</LI>
            <LI>😺 Being visited by at least one cat</LI>
            <LI>😿 Abandoning</LI>
            <LI>👋 Leaving</LI>
          </UL>
          <Note>
            🐈 <B>Cats are autonomous agents</B>. Each cat wanders in the cat
            zone, waits an exponential idle interval, then picks a random
            seated customer and walks over. A customer may be visited by
            multiple cats at once, and must wait for all of them to leave
            before standing up, so "clingy cats" directly inflate total stay time.
          </Note>
          <Note>
            🏠 <B>Why is the cat room empty most of the time?</B> Hirsch et al.
            (2025) measured cats spending about 31.7% of observed time in the
            cat room (out of sight), and the remaining ~2/3 roaming, resting,
            or being visited in customer areas. My sim reuses that paper's
            behavior probabilities, so an often-empty cat room is expected,
            not a bug.
          </Note>
        </div>
      ),
    },
    {
      id: 'playback-controls',
      icon: '⌨',
      title: 'Controls',
      content: (
        <div>
          <P>The transport bar, left to right:</P>
          <UL>
            <LI><B>🔄 Reset</B>: rewind to t=0</LI>
            <LI><B>⏮ / ⏭</B>: jump to the previous / next event timestamp</LI>
            <LI><B>▶ / ⏸</B>: play / pause</LI>
            <LI><B>Speed</B>: 0.5× / 1× / 2× / 4× / 8× (default 4×)</LI>
          </UL>
          <P>
            The orange bars under the scrubber form an <B>event-density
            heatmap</B>: brighter columns mean more events fired in that
            window, which usually marks bottlenecks or waves of abandons.
            Dragging the scrubber pauses playback so you can inspect a
            specific moment.
          </P>
          <P><B>Keyboard shortcuts (disabled while an input is focused):</B></P>
          <UL>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">Space</code>: play / pause</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">← →</code>: seek ±10 minutes</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">, .</code>: step events</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">0</code>: reset</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">1-5</code>: change speed</LI>
            <LI><code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">Esc</code>: close inspect card</LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'playback-inspect',
      icon: '🔍',
      title: 'Digging for details',
      content: (
        <div>
          <P>
            <B>Click any seat or cat</B> to open a small card showing the
            current occupant's ID, stage and elapsed stay time. Click the
            same slot again (or the background) to dismiss.
          </P>
          <P>
            <B>Speech bubbles</B> float above customers for about 0.8 sim
            minutes at key moments: "Here! ✨", "Ordering!", "Yum 🍽️",
            "So soft 💕", "Giving up 😤". They live in the reducer, so
            scrubbing the timeline always rebuilds the exact set of bubbles
            that should be visible at any moment.
          </P>
          <P>
            <B>Event log linking</B>: while playback is running, the matching
            row in the Event Log page is highlighted and auto-scrolled into
            view. The reverse also works — click any row in the log and the
            playback cursor seeks to that event. Both pages share a single
            timeline.
          </P>
        </div>
      ),
    },
    {
      id: 'playback-teaching',
      icon: '🧠',
      title: 'Teaching angles',
      content: (
        <div>
          <P>Ways to use the playback page in class:</P>
          <UL>
            <LI>
              <B>Find the bottleneck</B>: run at 4× and watch which zone
              saturates first — usually seats (capacity), or cats (all
              resting or already visiting other customers).
            </LI>
            <LI>
              <B>Tune cat friendliness</B>: drop <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">catIdleInterval</code> to 2 and
              watch cats become hyper-clingy (almost every customer has a
              cat on them); raise it to 20 and see <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">noCatVisitRate</code> climb
              as customers leave untouched.
            </LI>
            <LI>
              <B>Provoke abandons</B>: lower <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">maxWaitTime</code> (say, 2 minutes),
              raise arrival rate, and you'll see a wave of 😿. Use the step
              buttons to walk through each abandoning customer one event at
              a time.
            </LI>
            <LI>
              <B>"Cats keep people seated" effect</B>: raise
              <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">catInteractionTime</code> and <code className="px-1 rounded bg-orange-100 dark:bg-bark-600 font-mono text-[0.9em]">avgTotalStayTime</code> rises even though
              dining time is unchanged — direct evidence that cats inflate
              occupancy.
            </LI>
            <LI>
              <B>Compare 1× vs 8×</B>: 1× lets you watch individual cats
              walk from their zone to a seat and back; 8× emphasises the
              aggregate flow and bottleneck formation.
            </LI>
          </UL>
          <Example>
            💡 Pair with the Event Log search box: type a single customer's
            ID (for example <code className="text-xs bg-orange-100 dark:bg-bark-600 px-1 rounded">#12</code>)
            to isolate their entire event chain, then come back here and
            match it against the animation's timeline. This links the trace
            and the visual views into a single narrative.
          </Example>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // About page
  // ══════════════════════════════════════════════════════════
  // The "How it Works" page is itself a long-form learning essay, so the sidebar
  // deliberately has no extra notes for it; readers focus on the main content.
  howitworks: [
    {
      id: 'how-paradigms',
      icon: '🗺️',
      title: 'Simulation paradigms: DES, ABM, SD',
      content: (
        <div>
          <P>Computer simulation has three main paradigms; the right choice depends on what behavior the study aims to observe:</P>
          <UL>
            <LI>
              <B>Discrete-Event Simulation (DES)</B>: NekoServe's paradigm.
              Time advances by jumping to the next scheduled event. Best for resource queues and process flows
              (queues, manufacturing, ERs).
            </LI>
            <LI>
              <B>Agent-Based Modeling (ABM)</B>: each entity has autonomous decision logic; global behavior emerges.
              Best for emergent phenomena (epidemics, markets, ecosystems).
            </LI>
            <LI>
              <B>System Dynamics (SD)</B>: differential equations over stocks and flows in continuous time.
              Best for strategic-level long-term trends (population, climate, industry policy).
            </LI>
          </UL>
          <Note>
            NekoServe is DES-skeleton plus a touch of ABM (autonomous cat behavior).
            Hybrid paradigms are increasingly common.
          </Note>
        </div>
      ),
    },
    {
      id: 'how-fel',
      icon: '⏭️',
      title: 'FEL data structure',
      content: (
        <div>
          <P>The <B>Future Event List (FEL)</B> needs two operations:</P>
          <UL>
            <LI><B>Insert</B> a new event with timestamp</LI>
            <LI><B>Pop</B> the next (smallest-timestamp) event</LI>
          </UL>
          <P>This is the classic <B>priority queue</B> problem. Common implementations:</P>
          <UL>
            <LI><B>Binary heap</B>: O(log n) insert/pop. Used by SimPy.</LI>
            <LI><B>Balanced BST</B>: also O(log n), larger constants but supports range queries.</LI>
            <LI><B>Skip list</B>: expected O(log n), simpler to write.</LI>
            <LI><B>Calendar Queue</B>: expected O(1) but needs dynamic bucket management; works when event density is uniform.</LI>
          </UL>
          <Example>
            10000 events × log(10000) ≈ 13 comparisons. A laptop processes millions of events per second.
            That's why NekoServe's 720-min run with 4700 events finishes in under a second.
          </Example>
        </div>
      ),
    },
    {
      id: 'how-poisson-exponential',
      icon: '🎯',
      title: 'Why Poisson / exponential by default?',
      content: (
        <div>
          <P>
            Queueing theory's textbook defaults are <B>Poisson arrivals</B> and <B>exponential service times</B>.
            Not arbitrary — both have special mathematical properties.
          </P>
          <P><B>Memoryless property</B>: the exponential is the unique continuous memoryless distribution.</P>
          <Formula>
            P(X &gt; s + t | X &gt; s) = P(X &gt; t)
          </Formula>
          <P>
            Meaning: if you've already waited s minutes, the chance of waiting t more is the same as starting fresh.
            This makes the system <B>Markovian</B>; closed-form analytical results (M/M/1, M/M/c) all rest on this.
          </P>
          <Note>
            Real service times rarely follow a pure exponential (there's usually a minimum service time).
            NekoServe uses fixed order/prep time plus normal jitter — closer to reality, but
            no longer matches M/M/c closed form, hence the need for DES.
          </Note>
        </div>
      ),
    },
    {
      id: 'how-warmup',
      icon: '🔥',
      title: 'Warm-up period',
      content: (
        <div>
          <P>
            At t=0 the system is <B>empty</B>: no customers, no queues. Early observations are biased by this
            initial condition and do not represent steady state.
          </P>
          <P>
            <B>Fix</B>: run long enough, then discard the first W minutes. Compute statistics on [W, T] only.
            That W is the warm-up period.
          </P>
          <P>
            <B>Welch's plot method</B>: run N independent replications, take a moving average of each,
            overlay them, and find the point where the curves "go flat". Everything after is steady state;
            everything before is warm-up.
          </P>
          <Example>
            NekoServe's 720-minute day usually takes 30–60 minutes to warm up
            (customers arrive gradually, seats start filling). Cat-behavior warm-up is shorter
            (cats are already in the cafe).
          </Example>
          <Note>
            Short-horizon (terminating) simulations <B>don't always need warm-up removal</B>.
            If the research question is "what's the experience in the first hour?", the warm-up is part of the study itself.
          </Note>
        </div>
      ),
    },
    {
      id: 'how-verification-validation',
      icon: '✅',
      title: 'Verification vs Validation',
      content: (
        <div>
          <P>Two key checks for simulation research (Sargent, 2013):</P>
          <UL>
            <LI>
              <B>Verification</B>: "Does the program faithfully implement the model?"
              i.e. "Is my code right?". Methods: unit tests, edge cases, Little's Law consistency checks.
            </LI>
            <LI>
              <B>Validation</B>: "Does the model faithfully reflect reality?"
              i.e. "Is my model right?". Methods: compare to empirical data, expert review, sensitivity analysis.
            </LI>
          </UL>
          <P>
            NekoServe's "Validation" page does both:
            Verification (check that simulator matches Hirsch paper numbers) +
            Validation (confirm cat behavior shares match field observations).
          </P>
          <Note>
            In my own papers I document both. Many writers conflate them, but separating them lets reviewers
            see the methodology faster.
          </Note>
        </div>
      ),
    },
    {
      id: 'how-output-analysis',
      icon: '📑',
      title: 'Output analysis: terminating vs steady-state',
      content: (
        <div>
          <P>The right statistical method depends on the scenario:</P>
          <UL>
            <LI>
              <B>Terminating</B>: clear start and end (e.g. 9:00-21:00 business day).
              Replications are independent — sample mean + t-distribution CI works directly.
            </LI>
            <LI>
              <B>Steady-state</B>: long-running, looking at long-term behavior (e.g. 24/7 call center).
              Need warm-up removal, and may need <B>batch means</B> or the <B>regenerative method</B>
              to handle sample correlation.
            </LI>
          </UL>
          <Note>
            NekoServe is a <B>terminating simulation</B> (fixed daily hours).
            The Live Mode page's batch + CI band is the standard analysis for terminating cases.
          </Note>
        </div>
      ),
    },
    {
      id: 'how-crn',
      icon: '🎰',
      title: 'Common Random Numbers (CRN)',
      content: (
        <div>
          <P>
            To compare "3 staff vs 4 staff" fairly, use the <B>same arrival sequence</B> for both —
            change only the staff count, see the result delta. That's CRN.
          </P>
          <P>
            CRN is a <B>variance reduction technique</B>: two alternatives share a seed,
            so the difference is "purely from the parameter", noise is much smaller, and fewer samples are needed.
          </P>
          <Formula>
            Var(A − B) = Var(A) + Var(B) − 2·Cov(A, B)
          </Formula>
          <P>Under CRN Cov(A, B) is positive, so the variance of the difference is smaller than independent runs.</P>
          <Note>
            NekoServe's sweep mode is exactly CRN: same baseSeed, only parameters vary.
            The resulting parameter sensitivity estimate is far more accurate than independent-seed equivalents.
          </Note>
        </div>
      ),
    },
  ],

  citations: [
    {
      id: 'cite-how-to-read',
      icon: '📖',
      title: 'How to read an academic paper effectively',
      content: (
        <div>
          <P>
            Papers are not novels — don't read them cover to cover. Use the <B>three-pass approach (Keshav, 2013)</B>:
          </P>
          <UL>
            <LI>
              <B>Pass 1 (5-10 min)</B>: read the <B>title, abstract, conclusion</B> and figure captions.
              Decide if the paper is relevant. Most papers stop here.
            </LI>
            <LI>
              <B>Pass 2 (~1 hr)</B>: read intro, method, results sections — the <B>first and last paragraphs only</B> — and study every figure.
              Pull out the main claims and evidence; skip the math.
            </LI>
            <LI>
              <B>Pass 3 (4-5 hrs)</B>: word-by-word, redo key derivations and experiments yourself.
              I reserve this for papers I'll review, cite heavily, or reproduce.
            </LI>
          </UL>
          <Example>
            Of the 8 papers cited in NekoServe, I used Pass 3 only on Hirsch 2025 (because I needed to reimplement the 9-state ethogram).
            The rest stopped at Pass 2. Don't deep-read everything; you'll run out of time.
          </Example>
        </div>
      ),
    },
    {
      id: 'cite-source-types',
      icon: '🏛️',
      title: 'Journal vs conference vs preprint',
      content: (
        <div>
          <UL>
            <LI>
              <B>Peer-reviewed journal</B>: 2-4 anonymous experts review.
              Cycle time 6 months to 2 years. <B>Highest quality bar in academia</B>.
              E.g. Animal Cognition, Operations Research.
            </LI>
            <LI>
              <B>Conference</B>: dominant in computer science.
              Faster cycle (1-3 months) but acceptance is still selective.
              Often has a follow-up journal version. E.g. WSC (Winter Simulation Conference).
            </LI>
            <LI>
              <B>Preprint</B>: posted directly to arXiv, bioRxiv etc with <B>no review</B>.
              Newest but unverified — I cite these carefully and label them as preprints.
            </LI>
            <LI>
              <B>Theses (MSc / PhD)</B>: depth varies; quality depends on advisor and institution.
              No peer review, but oral defense provides some scrutiny.
            </LI>
            <LI>
              <B>White papers / technical reports</B>: industry/government, not peer-reviewed.
              Cite explicitly so readers can judge.
            </LI>
          </UL>
          <Note>
            All 8 papers in NekoServe are peer-reviewed. But in the user manual I also cite SimPy docs (technical doc) and Wikipedia (terminology cleanup).
            <B>Different source types deserve different framing in the prose</B>.
          </Note>
        </div>
      ),
    },
    {
      id: 'cite-peer-review',
      icon: '🔍',
      title: 'What peer review actually is',
      content: (
        <div>
          <P>
            <B>Peer review</B> is academia's quality gate, but not bulletproof:
          </P>
          <UL>
            <LI>2-4 anonymous experts review (typically double-blind)</LI>
            <LI>They recommend accept / minor revision / major revision / reject</LI>
            <LI>Editor makes the final call, sometimes after extra opinions</LI>
          </UL>
          <P><B>Limitations</B>:</P>
          <UL>
            <LI>Reviewers are <B>peers</B> — possible competition, possible blind spots</LI>
            <LI>Doesn't guarantee reproducibility (the reproducibility crisis is real)</LI>
            <LI>Novel ideas may be rejected; incremental work is easier to publish (publication bias)</LI>
            <LI>Slow: from submission to publication typically over 1 year</LI>
          </UL>
          <Note>
            So <B>citing a peer-reviewed paper ≠ it must be correct</B>.
            Methodology, sample size, and effect magnitude still need independent judgement.
            But peer-reviewed work is more reliable than non-reviewed — that baseline matters.
          </Note>
        </div>
      ),
    },
    {
      id: 'cite-citation-styles',
      icon: '📝',
      title: 'Common citation styles',
      content: (
        <div>
          <P>Different fields use different formats. Quick reference for what each looks like:</P>
          <UL>
            <LI>
              <B>APA (American Psychological Association)</B>: dominant in social sciences.
              Format: Author, A. A. (Year). Title. <i>Journal</i>, vol(issue), pages.
            </LI>
            <LI><B>MLA</B>: humanities. Emphasizes author names and page numbers.</LI>
            <LI><B>Chicago / Turabian</B>: history, interdisciplinary. Footnote and author-date variants.</LI>
            <LI>
              <B>IEEE / Vancouver (numeric)</B>: CS, medicine.
              Citations as [1], [2]; references listed in citation order.
            </LI>
            <LI>
              <B>BibTeX</B>: not a style, a <B>data format</B> for LaTeX. One .bib file exports all the above styles.
            </LI>
          </UL>
          <Example>
            NekoServe's PDF docs use APA 7th — interdisciplinary fit (psychology, OR, animal behavior) and clean reference lists.
          </Example>
        </div>
      ),
    },
    {
      id: 'cite-evaluating-source',
      icon: '⚖️',
      title: 'Evaluating source credibility',
      content: (
        <div>
          <P>"Published" doesn't equal "good". Evaluate on multiple axes:</P>
          <UL>
            <LI>
              <B>Recency</B>: fast-moving fields (AI, Web) get stale in 3 years;
              slow-moving (queueing theory, pure math) papers from 50 years ago are still classics.
            </LI>
            <LI>
              <B>Journal prestige</B>: see <B>Journal Impact Factor (JIF)</B> and
              <B>SJR (SCImago Journal Rank)</B>. High IF ≠ paper is necessarily good.
            </LI>
            <LI>
              <B>Citation count</B>: Google Scholar shows it. High = recognized in the field,
              but older papers accumulate naturally — compare "citations per year" for fairness.
            </LI>
            <LI>
              <B>Sample size</B>: n=10 vs n=10000 are radically different.
              Social science often has n &lt; 50 — beware overgeneralization.
            </LI>
            <LI>
              <B>Conflict of interest</B>: are authors funded by related companies?
              Modern papers must disclose.
            </LI>
            <LI>
              <B>Retraction status</B>: check Retraction Watch.
            </LI>
          </UL>
        </div>
      ),
    },
    {
      id: 'cite-tools',
      icon: '🛠️',
      title: 'Reference management tools',
      content: (
        <div>
          <P>Manual reference management doesn't scale. Notes on tools I've used / seen others use:</P>
          <UL>
            <LI>
              <B>EndNote</B>: my main tool. NTUNHS (my university) library provides a campus-wide license,
              so I download it from the library site at no personal cost.
              Long-established paid software with the most complete Word integration —
              one-click insert citation, auto-update bibliography, swap journal styles.
            </LI>
            <LI>
              <B>Mendeley (Elsevier)</B>: free baseline. Browser extension to grab papers,
              PDF annotation sync, social features.
            </LI>
            <LI>
              <B>Google Scholar</B>: not a manager — a <B>search engine</B>.
              Click "Cite" to copy a citation in APA, MLA, Chicago etc. Handy for one-offs.
            </LI>
            <LI>
              <B>Connected Papers</B> (connectedpapers.com): visualizes paper-paper relationships;
              I use it to find "papers related to this one".
            </LI>
          </UL>
          <Note>
            For NekoServe's PDF docs I lean on EndNote's Word plugin
            (<B>Cite While You Write</B>) for one-click citation insertion and style switching,
            plus the browser extension (<B>Capture Reference</B>) for grabbing paper metadata.
            Once that toolchain is in place, bibliography work takes less than half the time.
          </Note>
        </div>
      ),
    },
    {
      id: 'cite-literature-review',
      icon: '📚',
      title: 'How to write a literature review',
      content: (
        <div>
          <P>
            A literature review is not a paper-by-paper recap — it's a <B>narrative</B>
            arguing from "how others tackled this problem" to "why a new paper is needed".
          </P>
          <UL>
            <LI><B>Theme-based grouping</B>, not chronological. Group papers by what problem they solve.</LI>
            <LI><B>Find the gap</B>: end each group with "but they didn't solve X" — X is the new paper's contribution.</LI>
            <LI><B>Summarize, don't transcribe</B>: condense each paper's claim into the writer's own words.</LI>
            <LI><B>Be critical</B>: don't just say what they did, say what their limits are.</LI>
            <LI><B>10-30 papers is enough</B> for an undergrad thesis. Depth beats breadth.</LI>
          </UL>
          <Example>
            NekoServe's Citations page is itself a mini literature review:
            Little's Law (theory) → queueing empirics → pet-cafe-specific behavior.
            Each of the 8 papers is connected to a specific NekoServe design decision.
          </Example>
        </div>
      ),
    },
  ],

  validation: [
    {
      id: 'val-purpose',
      icon: '🎯',
      title: 'Why bother with validation',
      content: (
        <div>
          <P>
            No matter how elegant the simulator's code, if its outputs disagree with reality, it's <B>science fiction</B>.
            This page exists to answer one question: "Should this simulation be trusted?"
          </P>
          <P>Sargent's framework splits "is it right" into two:</P>
          <UL>
            <LI><B>Verification</B>: does the code faithfully implement the model I designed? (Is my code right?)</LI>
            <LI><B>Validation</B>: does the model faithfully reflect reality? (Is my model right?)</LI>
          </UL>
          <P>
            This page primarily handles <B>Validation</B>: it compares the simulator's cat-behavior shares
            against the 12,505 scans Hirsch et al. (2025) collected at the Stockholm cat cafe.
          </P>
          <Note>
            For research publication this page is my "claim of faithfulness" — without it,
            reviewers can only take my word; with it, reviewers can read the numbers themselves.
          </Note>
        </div>
      ),
    },
    {
      id: 'val-wilson-ci',
      icon: '📐',
      title: 'Why Wilson Score CI replaces Wald',
      content: (
        <div>
          <P>The textbook starting point for a proportion's 95% CI is the <B>Wald CI</B>:</P>
          <Formula>
            CI<sub>Wald</sub> = p̂ ± z × √(p̂(1−p̂) / n)
          </Formula>
          <P>Simple but with two fatal problems:</P>
          <UL>
            <LI>Near 0 or 1, the CI lower bound can drop below 0 or upper exceed 1 (probabilities can't escape [0, 1]).</LI>
            <LI>At p̂ = 0 the CI degenerates to [0, 0] regardless of n — clearly wrong.</LI>
          </UL>
          <P>
            <B>Wilson Score CI (1927)</B> rearranges by solving for the bounds in z, giving:
          </P>
          <Formula>
            CI<sub>Wilson</sub> = (p̂ + z²/2n ± z√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)
          </Formula>
          <UL>
            <LI>Bounds stay inside [0, 1] automatically.</LI>
            <LI>p̂ = 0 still gives a positive-width CI (n=10 ≠ n=100), matching intuition.</LI>
            <LI>Far more accurate at small n than Wald.</LI>
          </UL>
          <Note>
            I picked Wilson over Clopper-Pearson because Wilson is cheaper to compute,
            and its boundary behavior is "narrower but still correct" — fine for live charts.
            Clopper-Pearson is the conservative choice, more appropriate for clinical trials.
          </Note>
        </div>
      ),
    },
    {
      id: 'val-goodness-of-fit',
      icon: '📊',
      title: 'Goodness-of-fit tests',
      content: (
        <div>
          <P>
            "Sim proportion lies inside Wilson CI" judges <B>one indicator</B> at a time.
            Judging the whole distribution requires a formal <B>goodness-of-fit test</B>:
          </P>
          <UL>
            <LI>
              <B>Chi-square</B>: compares observed vs expected counts via χ² = Σ(O−E)²/E.
              For 9 categories, df = 8. Each cell needs expected ≥ 5.
            </LI>
            <LI>
              <B>Kolmogorov-Smirnov (KS) test</B>: compares two CDFs by their max distance.
              Used for continuous variables (e.g. wait-time distribution).
            </LI>
            <LI>
              <B>Anderson-Darling</B>: tail-sensitive variant of KS, good for "is this normal?" checks.
            </LI>
          </UL>
          <P>
            Validation Mode's "composite score 80" is a simplified overall indicator, not a strict χ² test.
            Adding χ² is on the wishlist, but isn't always needed; depends on research rigor required.
          </P>
        </div>
      ),
    },
    {
      id: 'val-overfitting',
      icon: '⚠️',
      title: 'Overfitting risk',
      content: (
        <div>
          <P>
            It's tempting to tune simulation params until they match Hirsch 2025 perfectly,
            but matching ≠ the simulator is good — could just be <B>overfit to that one paper</B>.
          </P>
          <P>Symptoms of overfitting:</P>
          <UL>
            <LI>Tuning 15+ params to push 9 behavior shares all inside CI → degrees of freedom exhausted, no explanatory power.</LI>
            <LI>Apply same params to a different paper (e.g. Taiwan cafe data), sees big mismatch.</LI>
            <LI>Composite 100 score, but extreme scenarios (0 staff, 50 cats) still output reasonable numbers → suspiciously over-fitted.</LI>
          </UL>
          <Note>
            I deliberately use Hirsch's <B>probabilities</B> (state time shares) only,
            without back-fitting "magic adjusters" to match any specific output distribution.
            The simulator's plausibility flows <B>from probabilities to distribution</B>, not reverse-calibrated.
            That's why some metrics (e.g. cat-cat interaction rate) aren't perfect — I prefer honest gaps over forced fits.
          </Note>
        </div>
      ),
    },
    {
      id: 'val-multiple-comparisons',
      icon: '🎲',
      title: 'Multiple comparisons trap',
      content: (
        <div>
          <P>
            Validation Mode compares 9 behavior categories simultaneously, each with 95% CI —
            and there's a hidden statistical pitfall here.
          </P>
          <P>
            <B>Single test false-positive rate is 5%</B>.
            With 9 independent comparisons, the chance of <B>not making any error</B> is 0.95⁹ ≈ 63%.
            So the family-wise error rate is ~37%, well above 5%.
          </P>
          <Formula>
            P(all pass | H₀ true) = (1 − α)<sup>k</sup>
          </Formula>
          <P>Correction methods:</P>
          <UL>
            <LI><B>Bonferroni</B>: each test uses α/k = 0.05/9 ≈ 0.0056 (i.e. 99.4% CI). Most conservative.</LI>
            <LI><B>Holm-Bonferroni</B>: improvement on Bonferroni, higher power.</LI>
            <LI><B>FDR (False Discovery Rate)</B>: Benjamini-Hochberg method, suited for many comparisons.</LI>
          </UL>
          <Note>
            Validation Mode currently uses single 95% CI judgement without multiple-comparison correction —
            a weakness for strict publication. For a formal paper version I'd add Bonferroni or FDR.
            The "composite 80 score" here is a rough indicator, primarily for intuitive sanity checking.
          </Note>
        </div>
      ),
    },
    {
      id: 'val-field-observation-limits',
      icon: '🔬',
      title: 'Limits of field-observation data',
      content: (
        <div>
          <P>
            Comparing simulation to "real observation" sounds rigorous, but <B>real observations have biases too</B>:
          </P>
          <UL>
            <LI>
              <B>Observer bias</B>: same behavior, observer A says "exploring", B says "moving".
              Hirsch used <B>two-observer blind coding</B>, kappa = 0.83 is decent but imperfect.
            </LI>
            <LI>
              <B>Scan sampling vs continuous sampling</B>: Hirsch sampled at 1-minute intervals,
              so brief behaviors (play, cat-cat interaction) may be undercounted — "playing 0.3%" is plausibly an underestimate.
            </LI>
            <LI>
              <B>Observation hours</B>: Hirsch covers daytime 11:00-19:00. Late-night cat behavior is out of scope.
            </LI>
            <LI>
              <B>Single venue</B>: one Stockholm cafe. Cultural differences (Taiwan visitors more proactive?) aren't captured.
            </LI>
          </UL>
          <Note>
            When the simulation diverges from Hirsch, sometimes it's not the sim that's wrong but the data being limited.
            Honest research lists both: data limits and simulation approximations.
          </Note>
        </div>
      ),
    },
    {
      id: 'val-choosing-benchmark',
      icon: '🏆',
      title: 'How I picked the validation benchmark',
      content: (
        <div>
          <P>
            "Which paper to use as ground truth" is itself a quality decision.
            My reasons for picking Hirsch 2025:
          </P>
          <UL>
            <LI><B>Peer-reviewed</B>: published in Animals (MDPI), not a preprint.</LI>
            <LI><B>Sufficient sample size</B>: 12,505 scans, big enough that CIs are tight and tests are meaningful.</LI>
            <LI>
              <B>Methodological transparency</B>: published the ethogram definitions, coding rules, and raw data —
              high reproducibility.
            </LI>
            <LI>
              <B>Setting fit</B>: a commercial cat cafe (not a lab cattery), close to NekoServe's modeled scenario.
            </LI>
            <LI>
              <B>Recency</B>: 2025 publication, methods aligned with modern animal behavior science.
            </LI>
          </UL>
          <Note>
            If only an n=50 study existed, I'd say honestly "small sample, indicative only"
            rather than forcing it as ground truth. <B>No perfect benchmark</B> is the norm —
            research must explain the chosen benchmark's limitations.
          </Note>
        </div>
      ),
    },
  ],

  // ══════════════════════════════════════════════════════════
  // Live Mode page
  // ══════════════════════════════════════════════════════════
  liveMode: [
    {
      id: 'live-monte-carlo',
      icon: '🎲',
      title: 'What is Monte Carlo simulation?',
      content: (
        <div>
          <P>
            <B>Monte Carlo simulation</B> estimates a system's average behavior by running many
            randomized trials. A single run produces ONE answer (possibly an outlier);
            averaging across N runs converges to the true expected value.
          </P>
          <P>
            Each NekoServe run uses a different seed (<code>baseSeed + i</code>),
            so customer arrivals, cat behavior, and service times all vary slightly per run.
            The resulting metrics differ each time.
          </P>
          <Example>
            <B>Example</B>: One run says "avg wait 8.3 min", another says 11.1, a third says 6.7.
            One run alone can't reveal the true mean; 50 runs of cumulative averaging will settle near the truth.
          </Example>
        </div>
      ),
    },
    {
      id: 'live-cumulative-curve',
      icon: '📈',
      title: 'Cumulative-mean convergence curve',
      content: (
        <div>
          <P>
            The main visual: each completed run plots a point where Y is the mean across all samples up to that point.
          </P>
          <Formula>
            mean<sub>n</sub> = (X<sub>1</sub> + X<sub>2</sub> + ... + X<sub>n</sub>) / n
          </Formula>
          <P>
            By the <B>Law of Large Numbers</B>, mean<sub>n</sub> → μ as n → ∞.
          </P>
          <UL>
            <LI>First ~30 runs swing wildly — too few samples</LI>
            <LI>Curve flattens as more samples drown out individual variation</LI>
            <LI>Last 100 runs change &lt; 1% → auto-flagged stable, region tinted green</LI>
          </UL>
          <Note>
            ⚠️ Cumulative mean is <B>not monotonic</B>. Each new sample can pull the mean either way,
            but the magnitude shrinks with n. A late-stage "jump" usually means an outlier landed.
          </Note>
        </div>
      ),
    },
    {
      id: 'live-confidence-interval',
      icon: '📏',
      title: '95% confidence interval (CI band)',
      content: (
        <div>
          <P>
            The light-orange band is the <B>95% CI</B>: the true value lies within it 95% of the time.
          </P>
          <Formula>
            CI<sub>95%</sub> = mean ± t<sub>n-1, 0.025</sub> × (s / √n)
          </Formula>
          <UL>
            <LI>n=2: t = 12.7, band is wide (we know almost nothing)</LI>
            <LI>n=30: t ≈ 2.04, band is roughly 1.96·SE</LI>
            <LI>n=1000: band is very narrow, high confidence</LI>
          </UL>
          <P>
            The band shrinks as <B>1/√n</B> — halving requires 4× samples; 10× shrink requires 100× samples.
            This is why studies need large samples.
          </P>
        </div>
      ),
    },
    {
      id: 'live-distribution-shape',
      icon: '🔔',
      title: 'Distribution shape (KDE)',
      content: (
        <div>
          <P>
            The dark-orange smooth curve over the histogram is a <B>Kernel Density Estimate</B>:
            it turns the bars into a continuous density so the shape becomes readable.
          </P>
          <P>NekoServe uses a <B>Gaussian kernel</B> with Silverman's bandwidth:</P>
          <Formula>h = 1.06 × σ × n<sup>-1/5</sup></Formula>
          <P><B>Auto verdicts</B> (bottom-right):</P>
          <UL>
            <LI><B>✓ Approximately normal</B>: symmetric bell, predictable</LI>
            <LI><B>→ Right-skewed</B>: long tail right (e.g. wait times)</LI>
            <LI><B>← Left-skewed</B>: long tail left</LI>
            <LI><B>⚠ Long-tail</B>: heavy outliers (high kurtosis)</LI>
          </UL>
          <Formula>
            skewness = m<sub>3</sub> / σ³ ;&nbsp; kurtosis = m<sub>4</sub> / σ⁴ - 3
          </Formula>
          <P>Normal: skew=0, kurt=0. Exponential: skew=2, kurt=6.</P>
        </div>
      ),
    },
    {
      id: 'live-percentiles',
      icon: '📊',
      title: 'P5 / P50 / P95 quantiles',
      content: (
        <div>
          <P>Three dashed lines on the histogram:</P>
          <UL>
            <LI><B>P5 (gray)</B>: 5% of samples lie to the left</LI>
            <LI><B>P50 / median (black, thicker)</B>: 50% on each side — the typical value</LI>
            <LI><B>P95 (gray)</B>: 95% left, 5% right</LI>
          </UL>
          <P>
            [P5, P95] is the <B>middle 90% range</B> (shown top-right) — "where most outcomes actually fall".
          </P>
          <Note>
            <B>Median far from mean</B> ⇒ skewed distribution. For skewed data the mean is misleading;
            report median + middle 90% to describe what users actually experience.
          </Note>
          <Example>
            Avg wait = 8 min but P95 = 25 min → 5% of customers wait 25+ min.
            That tail directly shapes user experience.
          </Example>
        </div>
      ),
    },
    {
      id: 'live-batch-vs-single',
      icon: '⚖️',
      title: 'Single vs batch: Crystal Ball idea',
      content: (
        <div>
          <P>
            <B>Crystal Ball</B> (a risk-analysis tool) popularized the idea that a simulation's result is
            not a number but a distribution. Decisions should be informed by the shape.
          </P>
          <UL>
            <LI><B>One run</B> → one dot → no idea if accurate</LI>
            <LI><B>20-run batch</B> → curve + CI band → see stability</LI>
            <LI><B>Distribution chart</B> → see tail risk</LI>
          </UL>
          <P>
            This page brings that workflow to the cat cafe sim: the
            <B> cumulative-mean curve</B> answers "how many runs is enough?", the
            <B> distribution + KDE</B> answers "what shape does the result take?".
            Together they answer "can I trust this answer?"
          </P>
        </div>
      ),
    },
    {
      id: 'live-N-vs-n',
      icon: 'ℹ️',
      title: 'N vs n',
      content: (
        <div>
          <P>Statistical convention:</P>
          <UL>
            <LI><B>Capital N</B> = total runs planned for the batch. The chart extends to X = N.</LI>
            <LI><B>Lowercase n</B> = runs completed so far, growing from 1 to N.</LI>
          </UL>
          <Example>
            Mid-run: target N=50, current n=30 → 20 left.<br/>
            After completion: n = N = 50.
          </Example>
          <P>
            The n in the CI formula is always the current sample count, which is why the band tightens as runs land.
          </P>
        </div>
      ),
    },
    {
      id: 'live-reproducibility',
      icon: '🔁',
      title: 'Reproducibility',
      content: (
        <div>
          <P>
            NekoServe batches are <B>fully reproducible</B>: same baseSeed run twice produces
            pixel-identical curves on every chart.
          </P>
          <P>
            Run <i>i</i>'s seed is <code>baseSeed + i</code>, so the random sequence is fully determined by baseSeed.
            Pause/resume/stop don't affect reproducibility (as long as baseSeed is unchanged).
          </P>
          <Note>
            Crucial for research: recording the baseSeed in the paper lets a reviewer reproducing it get identical results.
          </Note>
        </div>
      ),
    },
  ],

  about: [
    {
      id: 'queueing-theory',
      icon: '📚',
      title: 'Queueing theory foundations',
      content: (
        <div>
          <P>
            Queueing theory is the branch of mathematics that studies waiting
            systems. It was founded in 1909 by <B>A.K. Erlang</B> to model
            telephone-exchange load.
          </P>
          <P><B>Kendall notation</B> describes queues as A/S/c:</P>
          <Formula>M/M/c (Erlang-C model)</Formula>
          <UL>
            <LI><B>M</B> (Markovian) = exponential arrivals</LI>
            <LI><B>M</B> = exponential service times</LI>
            <LI><B>c</B> = number of parallel servers</LI>
          </UL>
          <P>
            Our cat café is closer to <B>M/G/c/K</B> (G = general service times,
            K = finite capacity) with reneging customers. Closed-form solutions are
            intractable, so we simulate instead.
          </P>
        </div>
      ),
    },
    {
      id: 'simpy-reference',
      icon: '🐍',
      title: 'SimPy quick reference',
      content: (
        <div>
          <P>SimPy's core concepts:</P>
          <UL>
            <LI><B>Environment</B>: the simulation clock that drives event advancement</LI>
            <LI><B>Process</B>: a flow implemented as a Python generator</LI>
            <LI><B>Resource</B>: a shared resource with a capacity limit</LI>
            <LI><B>timeout(t)</B>: let a process wait for t time units</LI>
          </UL>
          <Formula>
            with seats.request() as req:<br />
            {'  '}yield req  # wait for the resource<br />
            {'  '}yield env.timeout(dining_time)
          </Formula>
          <Note>
            📖 Further reading:
            <br />• SimPy docs: simpy.readthedocs.io
            <br />• <i>Introduction to Simulation</i>, Banks et al.
            <br />• <i>Queueing Systems</i>, Kleinrock
          </Note>
        </div>
      ),
    },
  ],
}
