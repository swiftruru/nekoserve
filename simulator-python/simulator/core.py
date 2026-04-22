"""
NekoServe Simulator — Core SimPy Simulation Engine (v0.4.0)

In this version cats are autonomous SimPy processes that wander between
seated customers on their own: each cat picks a random currently-seated
customer, walks to their seat, stays for `catInteractionTime` minutes,
then either rests or goes back to idle-wandering. A customer no longer
"waits for a cat" — they finish their meal and leave whenever the cat(s)
currently visiting them have all departed.

Random distribution spec (strict):
  - Customer arrival:    Exponential(mean = customerArrivalInterval)
  - Cat idle between visits: Exponential(mean = catIdleInterval)
  - All service times:   Normal(mean, std=mean*0.2), clamped to min=1
  - Cat rest trigger:    Bernoulli(catRestProbability) after each visit
  - Cat target selection: Uniform random over currently-seated customers
    that are not in the middle of leaving
"""

import random
import simpy
from typing import Any

from .models import SimulationConfig
from .agents.cat_agent import CatAgent, sample_personality
from .constants.hirsch2025 import (
    CAT_WELFARE_BASELINE,
    CafeArea,
    CatBehaviorState,
    CustomerType,
    CUSTOMER_TYPE_DEFAULT_MIX,
    VerticalLevel,
)


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _percentile(lst: list[float], p: float) -> float:
    """Compute the p-th percentile (0-100) of a sorted list."""
    if not lst:
        return 0.0
    s = sorted(lst)
    k = (len(s) - 1) * p / 100.0
    f = int(k)
    c = f + 1
    if c >= len(s):
        return round(s[f], 2)
    return round(s[f] + (k - f) * (s[c] - s[f]), 2)


def _normal(rng: random.Random, mean: float) -> float:
    """Normal distribution sample, std = mean * 0.2, clamped to min 1.0."""
    return max(1.0, rng.gauss(mean, mean * 0.2))


# How often the "waiting for cats to finish visiting" poll ticks, in sim
# minutes. Small enough that leaving feels responsive, large enough not to
# flood the scheduler.
_VISITOR_POLL_INTERVAL = 0.1


# ──────────────────────────────────────────────────────────────
# Simulation
# ──────────────────────────────────────────────────────────────

def run_simulation(config_dict: dict) -> dict:
    """Execute the cat-café discrete-event simulation."""
    config = SimulationConfig.from_dict(config_dict)
    config.validate()

    rng = random.Random(config.randomSeed)
    env = simpy.Environment()

    seats = simpy.Resource(env, capacity=config.seatCount)
    staff = simpy.Resource(env, capacity=config.staffCount)
    # Cats are no longer a pooled Resource/Container; each cat is an
    # individual long-running SimPy process (see `cat()` below).

    # ── Accumulators ───────────────────────────────────────
    event_log: list[dict] = []

    total_arrived = 0
    total_served = 0
    total_abandoned = 0
    total_cat_visits = 0
    customers_with_visit = 0

    total_seat_busy = 0.0
    total_staff_busy = 0.0
    total_cat_busy = 0.0

    wait_seat_times: list[float] = []
    wait_order_times: list[float] = []
    stay_times: list[float] = []

    # v2.0 Epic D: per-state time accumulators (seconds spent in each
    # CatBehaviorState across all cats). Used to compute the welfare
    # score and the behavior share distribution at the end of the run.
    state_time: dict[str, float] = {s.value: 0.0 for s in CatBehaviorState}
    level_time: dict[str, float] = {lv.value: 0.0 for lv in VerticalLevel}

    # Registry of currently-seated customers, keyed by customer id. Cat
    # processes pick a target from this dict; customer processes insert
    # themselves on seating and delete themselves after all visiting cats
    # have left. Each entry:
    #
    #   {
    #     "id": int,
    #     "seat_label": str,       # e.g. "座位-3"
    #     "visitors": set[int],    # cat ids currently on this customer
    #     "visit_count": int,      # total cats that have visited this stay
    #     "leaving": bool,         # dining done; no new visitors allowed
    #   }
    seated: dict[int, dict[str, Any]] = {}

    # ── Log helper ─────────────────────────────────────────
    def log(
        timestamp: float,
        event_type: str,
        customer_id: int,
        description: str,
        resource_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        entry: dict[str, Any] = {
            "timestamp": round(timestamp, 2),
            "eventType": event_type,
            "customerId": customer_id,
            "description": description,
        }
        if resource_id is not None:
            entry["resourceId"] = resource_id
        if extra:
            entry.update(extra)
        event_log.append(entry)

    def sample_customer_type() -> CustomerType:
        """Weighted draw from CUSTOMER_TYPE_DEFAULT_MIX using the shared rng."""
        mix = CUSTOMER_TYPE_DEFAULT_MIX
        total = sum(mix.values())
        threshold = rng.random() * total
        running = 0.0
        for ctype, weight in mix.items():
            running += weight
            if running >= threshold:
                return ctype
        return CustomerType.WOMAN

    # ── Customer process ───────────────────────────────────
    def customer(cid: int):
        nonlocal total_arrived, total_served, total_abandoned
        nonlocal total_seat_busy, total_staff_busy
        nonlocal customers_with_visit, total_cat_visits

        total_arrived += 1
        arrive_time = env.now
        ctype = sample_customer_type()
        log(arrive_time, "CUSTOMER_ARRIVE", cid,
            f"顧客 {cid} 抵達貓咪咖啡廳",
            extra={"customerType": ctype.value})
        log(arrive_time, "CUSTOMER_WAIT_SEAT", cid,
            f"顧客 {cid} 等候座位中",
            extra={"customerType": ctype.value})

        # Phase 1: Wait for seat, with abandonment timeout
        seat_req = seats.request()
        abandon_ev = env.timeout(config.maxWaitTime)
        yield seat_req | abandon_ev

        if not seat_req.triggered:
            seat_req.cancel()
            total_abandoned += 1
            log(env.now, "CUSTOMER_ABANDON", cid,
                f"顧客 {cid} 等待超過 {config.maxWaitTime:.0f} 分鐘，放棄離開")
            return

        wait_seat = env.now - arrive_time
        wait_seat_times.append(wait_seat)
        seated_at = env.now
        # Locale-neutral resource id; the renderer formats it via i18n.
        seat_label = f"seat-{seats.count}"
        log(env.now, "CUSTOMER_SEATED", cid,
            f"顧客 {cid} 入座（等待 {wait_seat:.1f} 分鐘）",
            seat_label)

        # Register into the seated registry so cat processes can target us.
        record: dict[str, Any] = {
            "id": cid,
            "seat_label": seat_label,
            "visitors": set(),
            "visit_count": 0,
            "leaving": False,
            "customerType": ctype.value,
        }
        seated[cid] = record

        # Phase 2: Order (staff occupied briefly)
        log(env.now, "CUSTOMER_ORDER", cid, f"顧客 {cid} 呼叫店員點餐")
        order_start = env.now
        with staff.request() as s_req:
            yield s_req
            order_dur = _normal(rng, config.orderTime)
            total_staff_busy += order_dur
            yield env.timeout(order_dur)
        log(env.now, "ORDER_START_PREPARE", cid,
            f"顧客 {cid} 完成點餐，餐點開始製作")

        # Phase 3: Preparation
        with staff.request() as s_req:
            yield s_req
            prep_dur = _normal(rng, config.preparationTime)
            total_staff_busy += prep_dur
            yield env.timeout(prep_dur)
        wait_order = env.now - order_start
        wait_order_times.append(wait_order)
        log(env.now, "ORDER_READY", cid,
            f"顧客 {cid} 的餐點完成（等待 {wait_order:.1f} 分鐘）")

        # Phase 4: Dining — cats may start visiting any time while seated,
        # but especially during this phase once the customer is settled.
        log(env.now, "CUSTOMER_START_DINING", cid,
            f"顧客 {cid} 開始用餐")
        dining_dur = _normal(rng, config.diningTime)
        yield env.timeout(dining_dur)
        log(env.now, "CUSTOMER_FINISH_DINING", cid,
            f"顧客 {cid} 用餐完畢")

        # Phase 5: Wait for any cats still on our lap to finish their visit,
        # then stand up. Cats that want to start a new visit after this
        # point will skip us because `leaving = True`.
        record["leaving"] = True
        while record["visitors"]:
            yield env.timeout(_VISITOR_POLL_INTERVAL)

        # Collect stats before cleanup
        total_seat_busy += env.now - seated_at
        if record["visit_count"] > 0:
            customers_with_visit += 1
        total_cat_visits += record["visit_count"]

        # Release seat, unregister, log departure
        del seated[cid]
        seats.release(seat_req)

        total_stay = env.now - arrive_time
        stay_times.append(total_stay)
        total_served += 1
        log(env.now, "CUSTOMER_LEAVE", cid,
            f"顧客 {cid} 離開咖啡廳（總停留 {total_stay:.1f} 分鐘，"
            f"被 {record['visit_count']} 隻貓拜訪）")

    # ── Cat process (v2.0 Epic B: 9-state FSM) ─────────────
    #
    # Each cat follows the Hirsch et al. (2025) nine-state ethogram,
    # perturbed by an individual personality vector. Core loop:
    #   1. Sample next state weighted by base rate × occupancy × personality
    #   2. Emit CAT_STATE_CHANGE event
    #   3. If state is SOCIALIZING / EXPLORING / PLAYING → visit a seated
    #      customer (legacy CAT_VISIT_SEAT / CAT_LEAVE_SEAT events preserved
    #      for UI animation compatibility).
    #   4. If state is RESTING → also emit CAT_START_REST / CAT_END_REST
    #      so the existing playback UI continues to show nap animations.
    #   5. Yield the sampled dwell duration for the state.
    def cat(cat_id: int, agent: CatAgent):
        nonlocal total_cat_busy
        cat_label = agent.label

        # Emit an opening CAT_STATE_CHANGE so the timeline has a clear
        # starting point for this cat's behavior track.
        log(
            env.now, "CAT_STATE_CHANGE", cat_id,
            f"{cat_label} 初始狀態：{agent.state.value}",
            cat_label,
            extra={"fromState": None, "toState": agent.state.value},
        )

        while True:
            seated_count = len(seated)
            prev_state = agent.state
            next_state = agent.pick_next_state(
                rng, seated_count, previous_state=prev_state,
            )
            duration = agent.sample_state_duration(rng, next_state)
            next_area, next_level = agent.pick_position(rng, seated_count)

            # Accumulate time in the state and vertical level for welfare scoring.
            state_time[next_state.value] += duration
            if next_level is not None:
                level_time[next_level.value] += duration

            # Emit the state-change event on every transition (skip if
            # identical; the self-loop penalty makes this rare). The
            # event carries the new (area, level) so Playback can route
            # the cat sprite to its 2.5D position without extra polling.
            if next_state != prev_state:
                log(
                    env.now, "CAT_STATE_CHANGE", cat_id,
                    f"{cat_label} 從 {prev_state.value} 轉為 {next_state.value} "
                    f"({next_area.value}{'/' + next_level.value if next_level else ''})",
                    cat_label,
                    extra={
                        "fromState": prev_state.value,
                        "toState": next_state.value,
                        "area": next_area.value,
                        "level": next_level.value if next_level else None,
                    },
                )
            agent.state = next_state
            agent.area = next_area
            agent.level = next_level if next_level else VerticalLevel.FLOOR

            # Interactable states: attempt a visit. If no seated customer
            # is available, fall through and just dwell for `duration`.
            if agent.is_available_to_interact():
                candidates = [rec for rec in seated.values() if not rec["leaving"]]
                if candidates:
                    # Weight candidates by their customer type's
                    # attractiveness (Hirsch 2025 Figure 6).
                    from .constants.hirsch2025 import CUSTOMER_BEHAVIOR_PROFILE
                    weights = [
                        CUSTOMER_BEHAVIOR_PROFILE[CustomerType(rec["customerType"])][
                            "attractiveness"
                        ]
                        for rec in candidates
                    ]
                    total_w = sum(weights)
                    threshold = rng.random() * total_w
                    running = 0.0
                    target = candidates[0]
                    for rec, w in zip(candidates, weights):
                        running += w
                        if running >= threshold:
                            target = rec
                            break
                    target_id = target["id"]
                    target["visitors"].add(cat_id)
                    target["visit_count"] += 1

                    visit_dur = min(duration, _normal(rng, config.catInteractionTime))
                    log(env.now, "CAT_VISIT_SEAT", target_id,
                        f"{cat_label} 走到顧客 {target_id} 的座位（狀態：{next_state.value}）",
                        cat_label)
                    total_cat_busy += visit_dur
                    yield env.timeout(visit_dur)
                    log(env.now, "CAT_LEAVE_SEAT", target_id,
                        f"{cat_label} 離開顧客 {target_id} 的座位",
                        cat_label)
                    if target_id in seated:
                        seated[target_id]["visitors"].discard(cat_id)
                    continue

            # Non-interactable states, or interactable with no target:
            # just dwell for the sampled duration. Rest states also emit
            # the legacy nap events so playback's nap animation still runs.
            if next_state == CatBehaviorState.RESTING:
                log(env.now, "CAT_START_REST", cat_id,
                    f"{cat_label} 開始休息（預計 {duration:.1f} 分鐘）",
                    cat_label)
                total_cat_busy += duration
                yield env.timeout(duration)
                log(env.now, "CAT_END_REST", cat_id,
                    f"{cat_label} 休息結束，恢復活動",
                    cat_label)
            else:
                yield env.timeout(duration)

    # ── Customer generator ─────────────────────────────────
    def generator():
        cid = 1
        while True:
            inter = rng.expovariate(1.0 / config.customerArrivalInterval)
            yield env.timeout(inter)
            if env.now >= total_duration:
                break
            env.process(customer(cid))
            cid += 1

    # ── Warm-up reset process ─────────────────────────────
    warm_up = config.warmUpDuration

    def warm_up_reset():
        """Wait until warm-up ends, then clear all accumulators."""
        nonlocal total_arrived, total_served, total_abandoned
        nonlocal total_cat_visits, customers_with_visit
        nonlocal total_seat_busy, total_staff_busy, total_cat_busy
        if warm_up <= 0:
            return
        yield env.timeout(warm_up)
        total_arrived = 0
        total_served = 0
        total_abandoned = 0
        total_cat_visits = 0
        customers_with_visit = 0
        total_seat_busy = 0.0
        total_staff_busy = 0.0
        total_cat_busy = 0.0
        wait_seat_times.clear()
        wait_order_times.clear()
        stay_times.clear()

    total_duration = config.simulationDuration + warm_up

    # Boot cat processes with per-cat personality + FSM, warm-up reset,
    # then start the customer generator.
    for i in range(1, config.catCount + 1):
        agent = CatAgent(
            cat_id=i,
            label=f"cat-{i}",
            personality=sample_personality(rng),
        )
        env.process(cat(i, agent))
    if warm_up > 0:
        env.process(warm_up_reset())
    env.process(generator())
    env.run(until=total_duration)

    # ── Compute metrics ────────────────────────────────────
    sim_dur = config.simulationDuration

    def avg(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    def safe_util(busy: float, capacity: int) -> float:
        raw = busy / (capacity * sim_dur) if sim_dur > 0 else 0.0
        return round(min(raw, 1.0), 4)

    cat_interaction_rate = (
        round(customers_with_visit / total_served, 4)
        if total_served > 0 else 0.0
    )
    avg_cat_visits_per_customer = (
        round(total_cat_visits / total_served, 2)
        if total_served > 0 else 0.0
    )
    no_cat_visit_rate = (
        round((total_served - customers_with_visit) / total_served, 4)
        if total_served > 0 else 0.0
    )
    abandon_rate = (
        round(total_abandoned / total_arrived, 4)
        if total_arrived > 0 else 0.0
    )

    # Classical-queueing λ, RR, μ and the paired ρ / ρ_R shown alongside the
    # time-based utilizations above. The modified-utilization formula is
    # ρ_R = (λ − RR) / μ from Dbeis & Al-Sahili (2024),
    # "Enhancing Queuing Theory Realism", J. Management Analytics 11(4),
    # DOI: 10.1080/23270012.2024.2408528. For the multi-server cafe here
    # we normalize by staff count, giving the standard M/M/c form
    # ρ = λ / (c · μ).
    arrival_rate = total_arrived / sim_dur if sim_dur > 0 else 0.0
    reneging_rate = total_abandoned / sim_dur if sim_dur > 0 else 0.0
    mean_service_time = config.orderTime + config.preparationTime
    service_rate = 1.0 / mean_service_time if mean_service_time > 0 else 0.0
    staff_c = max(1, config.staffCount)
    rho_classical = (
        arrival_rate * mean_service_time / staff_c
        if mean_service_time > 0 else 0.0
    )
    rho_corrected = (
        (arrival_rate - reneging_rate) * mean_service_time / staff_c
        if mean_service_time > 0 else 0.0
    )

    # v2.0 Epic D: cat welfare score.
    #   - three positive indicators reward being above baseline
    #   - two negative indicators reward being below baseline
    total_state_time = sum(state_time.values()) or 1.0
    behavior_share = {k: round(v / total_state_time, 4) for k, v in state_time.items()}
    total_level_time = sum(level_time.values()) or 1.0
    level_share = {k: round(v / total_level_time, 4) for k, v in level_time.items()}

    def welfare_component(share: float, baseline: float, positive: bool) -> float:
        if baseline <= 0:
            return 0.0
        ratio = share / baseline
        if positive:
            return max(0.0, min(1.0, ratio))
        return max(0.0, min(1.0, 1.0 - ratio))

    play_score = welfare_component(
        behavior_share.get("PLAYING", 0.0),
        CAT_WELFARE_BASELINE["play"],
        positive=True,
    )
    exploration_score = welfare_component(
        behavior_share.get("EXPLORING", 0.0),
        CAT_WELFARE_BASELINE["exploration"],
        positive=True,
    )
    maintenance_score = welfare_component(
        behavior_share.get("GROOMING", 0.0),
        CAT_WELFARE_BASELINE["maintenance"],
        positive=True,
    )
    not_hiding = welfare_component(
        behavior_share.get("HIDDEN", 0.0),
        CAT_WELFARE_BASELINE["hidden"],
        positive=False,
    )
    not_alert = welfare_component(
        behavior_share.get("ALERT", 0.0),
        CAT_WELFARE_BASELINE["alert"],
        positive=False,
    )
    welfare_total = round(
        play_score + exploration_score + maintenance_score + not_hiding + not_alert,
        3,
    )

    # Customer satisfaction proxy (0–1): low abandonment + most customers
    # get visited. Combines 1 - abandonRate (weight 0.6) and catInteractionRate
    # (weight 0.4). Keeps a single scalar for Pareto frontier plotting.
    customer_satisfaction = round(
        0.6 * (1.0 - abandon_rate) + 0.4 * cat_interaction_rate, 4
    )

    result: dict[str, Any] = {
        "config": config.to_dict(),
        "metrics": {
            "avgWaitForSeat": avg(wait_seat_times),
            "avgWaitForOrder": avg(wait_order_times),
            "avgTotalStayTime": avg(stay_times),
            "catInteractionRate": cat_interaction_rate,
            "avgCatVisitsPerCustomer": avg_cat_visits_per_customer,
            "noCatVisitRate": no_cat_visit_rate,
            "seatUtilization": safe_util(total_seat_busy, config.seatCount),
            "staffUtilization": safe_util(total_staff_busy, config.staffCount),
            "catUtilization": safe_util(total_cat_busy, config.catCount),
            "totalCustomersServed": total_served,
            "totalCustomersArrived": total_arrived,
            "abandonRate": abandon_rate,
            "arrivalRate": round(arrival_rate, 6),
            "renegingRate": round(reneging_rate, 6),
            "serviceRate": round(service_rate, 6),
            "meanServiceTime": round(mean_service_time, 4),
            "rhoClassical": round(rho_classical, 4),
            "rhoCorrected": round(rho_corrected, 4),
            "waitForSeatP50": _percentile(wait_seat_times, 50),
            "waitForSeatP95": _percentile(wait_seat_times, 95),
            "waitForSeatP99": _percentile(wait_seat_times, 99),
            "waitForOrderP50": _percentile(wait_order_times, 50),
            "waitForOrderP95": _percentile(wait_order_times, 95),
            "waitForOrderP99": _percentile(wait_order_times, 99),
            "catWelfareScore": welfare_total,
            "catBehaviorShare": behavior_share,
            "catVerticalLevelShare": level_share,
            "customerSatisfactionScore": customer_satisfaction,
        },
        "eventLog": sorted(event_log, key=lambda e: e["timestamp"]),
    }

    return result
