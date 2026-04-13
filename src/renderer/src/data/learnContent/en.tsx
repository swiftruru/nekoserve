/**
 * NekoServe learning sidebar content (English).
 * Classroom-note style: formulas, examples, and the "why this design" reasoning.
 */

import { Formula, Example, Note, P, B, UL, LI, type LearnContent } from './shared'
import { BlockMath } from '../../components/Math'

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
            {' '}<code className="text-xs bg-gray-100 px-1 rounded">simpy.Resource</code>.
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
            negative draws with <code className="text-xs bg-gray-100 px-1 rounded">max(1, sample)</code>.
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
            <code className="text-xs bg-orange-100 px-1 rounded">#12</code>) in the
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
          <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded-lg p-3 my-2 select-text leading-6">
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
          <div className="text-xs text-gray-600 font-mono bg-pink-50 rounded-lg p-3 my-2 select-text leading-6">
            CAT_VISIT_SEAT<br />
            ↓ [visit duration; may overlap other customers]<br />
            CAT_LEAVE_SEAT<br />
            ↓ [probabilistic]<br />
            CAT_START_REST → CAT_END_REST
          </div>
          <P><B>Short-circuit (abandon) path:</B></P>
          <div className="text-xs text-gray-600 font-mono bg-red-50 rounded-lg p-3 my-2 select-text">
            ARRIVE → WAIT_SEAT → ABANDON
          </div>
          <Note>
            💡 <B>CAT_VISIT_SEAT</B> / <B>CAT_LEAVE_SEAT</B> carry the cat identity
            in <code className="text-xs bg-orange-100 px-1 rounded">resourceId</code>
            (e.g. <code className="text-xs bg-orange-100 px-1 rounded">貓-2</code>);
            <code className="text-xs bg-orange-100 px-1 rounded">customerId</code> is the
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
            <LI><code className="text-xs bg-orange-100 px-1 rounded">Space</code>: play / pause</LI>
            <LI><code className="text-xs bg-orange-100 px-1 rounded">← →</code>: seek ±10 minutes</LI>
            <LI><code className="text-xs bg-orange-100 px-1 rounded">, .</code>: step events</LI>
            <LI><code className="text-xs bg-orange-100 px-1 rounded">0</code>: reset</LI>
            <LI><code className="text-xs bg-orange-100 px-1 rounded">1-5</code>: change speed</LI>
            <LI><code className="text-xs bg-orange-100 px-1 rounded">Esc</code>: close inspect card</LI>
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
            ID (for example <code className="text-xs bg-orange-100 px-1 rounded">#12</code>)
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
