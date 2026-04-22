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
            <LI><B>🪑 Seats</B>: N cells, matching the `seatCount` parameter</LI>
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
            before standing up — so "clingy cats" directly inflate total stay time.
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
              <B>Tune cat friendliness</B>: drop `catIdleInterval` to 2 and
              watch cats become hyper-clingy (almost every customer has a
              cat on them); raise it to 20 and see `noCatVisitRate` climb
              as customers leave untouched.
            </LI>
            <LI>
              <B>Provoke abandons</B>: lower `maxWaitTime` (say, 2 minutes),
              raise arrival rate, and you'll see a wave of 😿. Use the step
              buttons to walk through each abandoning customer one event at
              a time.
            </LI>
            <LI>
              <B>"Cats keep people seated" effect</B>: raise
              `catInteractionTime` and `avgTotalStayTime` rises even though
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
  howitworks: [],

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
