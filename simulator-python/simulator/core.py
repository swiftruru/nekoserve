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
    CAT_CAT_AFFILIATIVE_SHARE,
    CAT_CAT_INTERACTION_RATE_PER_HOUR,
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

    # v2.3: cap simultaneous in-lounge customers at the venue policy
    # limit (Hirsch 2025 — max 14 customers in the 60 m² lounge). When
    # `maxLoungeOccupancy` is 0 the cap is disabled and seat capacity
    # equals the raw seatCount (legacy behavior).
    effective_seat_capacity = (
        min(config.seatCount, config.maxLoungeOccupancy)
        if config.maxLoungeOccupancy > 0
        else config.seatCount
    )
    seats = simpy.Resource(env, capacity=effective_seat_capacity)
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
    # v2.3: cat-cat interaction counters (Hirsch 2025 §3.3).
    cat_cat_affiliative_count = 0
    cat_cat_agonistic_count = 0

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
    # v2.3: per-area time accumulators (Hirsch 2025 Figure 3 left — Area 1
    # 45.2%, Cat Room 31.6%, Area 2 23.2%). Used to validate that the
    # simulation's spatial use matches the paper's lounge breakdown.
    area_time: dict[str, float] = {a.value: 0.0 for a in CafeArea}

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

    # v2.3: registry of all cat agents, keyed by cat id. Populated when the
    # cat processes are launched; consulted by `cat_cat_interactions` to
    # find eligible partners (same area, in-lounge, not hidden) at each
    # interaction tick.
    cats_registry: dict[int, CatAgent] = {}

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
        log(env.now, "CUSTOMER_ORDER", cid,
            f"顧客 {cid} 呼叫店員點餐",
            seat_label)
        order_start = env.now
        with staff.request() as s_req:
            yield s_req
            order_dur = _normal(rng, config.orderTime)
            total_staff_busy += order_dur
            yield env.timeout(order_dur)
        log(env.now, "ORDER_START_PREPARE", cid,
            f"顧客 {cid} 完成點餐，餐點開始製作",
            seat_label)

        # Phase 3: Preparation
        with staff.request() as s_req:
            yield s_req
            prep_dur = _normal(rng, config.preparationTime)
            total_staff_busy += prep_dur
            yield env.timeout(prep_dur)
        wait_order = env.now - order_start
        wait_order_times.append(wait_order)
        log(env.now, "ORDER_READY", cid,
            f"顧客 {cid} 的餐點完成（等待 {wait_order:.1f} 分鐘）",
            seat_label)

        # Phase 4: Dining — cats may start visiting any time while seated,
        # but especially during this phase once the customer is settled.
        log(env.now, "CUSTOMER_START_DINING", cid,
            f"顧客 {cid} 開始用餐",
            seat_label)
        dining_dur = _normal(rng, config.diningTime)
        yield env.timeout(dining_dur)
        log(env.now, "CUSTOMER_FINISH_DINING", cid,
            f"顧客 {cid} 用餐完畢",
            seat_label)

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
            f"被 {record['visit_count']} 隻貓拜訪）",
            seat_label)

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

        # (v2.0: previously emitted an "initial state" CAT_STATE_CHANGE
        # with fromState=None here. Removed because it confuses the
        # Event Log display — the first real transition is the true
        # starting point.)

        while True:
            seated_count = len(seated)
            prev_state = agent.state
            next_state = agent.pick_next_state(
                rng, seated_count, previous_state=prev_state,
            )
            # SOCIALIZING with zero seated customers degenerates into
            # solo dwell-time and inflates the SOCIALIZING share without
            # any actual interaction. Resample once when this happens.
            if next_state == CatBehaviorState.SOCIALIZING and seated_count == 0:
                next_state = agent.pick_next_state(
                    rng, seated_count, previous_state=CatBehaviorState.SOCIALIZING,
                )
            duration = agent.sample_state_duration(rng, next_state)
            next_area, next_level = agent.pick_position(
                rng, seated_count, for_state=next_state,
            )

            # Accumulate time in the state and vertical level for welfare scoring.
            state_time[next_state.value] += duration
            if next_level is not None:
                level_time[next_level.value] += duration
            area_time[next_area.value] += duration

            # Emit the state-change event on every transition (skip if
            # identical; the self-loop penalty makes this rare). The
            # event carries the new (area, level) so Playback can route
            # the cat sprite to its 2.5D position without extra polling.
            #
            # Deliberate exception: when the cat is entering RESTING we
            # do NOT emit CAT_STATE_CHANGE because the existing
            # CAT_START_REST event (emitted a few lines below) already
            # tells the story in the Event Log, and two rows at the
            # same timestamp reads as a duplicate to users.
            if next_state != prev_state and next_state != CatBehaviorState.RESTING:
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

    # ── Cat-cat interaction process (v2.3) ─────────────────
    #
    # Hirsch 2025 §3.3 reports 0.58 cat-cat interaction events per cat
    # per hour, split 53% affiliative / 47% agonistic (χ²(1) = 1.264,
    # p = 0.261; not significantly different from 50/50). We model this
    # as a SimPy process that:
    #
    #   - Samples the next interaction time from
    #     Exponential(mean = 60 / (catCount × rate_per_hour)) minutes,
    #     so the aggregate rate matches the paper as catCount scales.
    #   - On firing, picks an initiator uniformly from cats currently
    #     in-lounge (not OUT_OF_LOUNGE) and not HIDDEN.
    #   - Picks a partner from the same area, same eligibility rules.
    #   - If no partner is available (cat is alone in area), drops the
    #     event silently — matches the paper's eligibility (cat-cat
    #     interactions can only happen when cats coexist in space).
    #   - Classifies the event via Bernoulli(AFFILIATIVE_SHARE).
    def cat_cat_interactions():
        nonlocal cat_cat_affiliative_count, cat_cat_agonistic_count
        cat_count = max(1, config.catCount)
        # Aggregate rate across all cats, in events per minute.
        agg_rate_per_min = (cat_count * CAT_CAT_INTERACTION_RATE_PER_HOUR) / 60.0
        if agg_rate_per_min <= 0:
            return
        mean_interval = 1.0 / agg_rate_per_min
        while True:
            yield env.timeout(rng.expovariate(1.0 / mean_interval))
            # Eligible cats: in-lounge, not hidden, not in cat room.
            eligible = [
                a for a in cats_registry.values()
                if a.state not in (
                    CatBehaviorState.OUT_OF_LOUNGE,
                    CatBehaviorState.HIDDEN,
                )
                and a.area != CafeArea.CAT_ROOM
            ]
            if len(eligible) < 2:
                continue
            initiator = rng.choice(eligible)
            partners = [
                a for a in eligible
                if a.cat_id != initiator.cat_id and a.area == initiator.area
            ]
            if not partners:
                continue
            partner = rng.choice(partners)
            affiliative = rng.random() < CAT_CAT_AFFILIATIVE_SHARE
            if affiliative:
                cat_cat_affiliative_count += 1
                log(env.now, "CAT_CAT_AFFILIATIVE", initiator.cat_id,
                    f"{initiator.label} 與 {partner.label} 親和互動"
                    f"（{initiator.area.value}）",
                    initiator.label,
                    extra={"partnerCatId": partner.cat_id,
                           "partnerLabel": partner.label,
                           "area": initiator.area.value})
            else:
                cat_cat_agonistic_count += 1
                log(env.now, "CAT_CAT_AGONISTIC", initiator.cat_id,
                    f"{initiator.label} 與 {partner.label} 衝突互動"
                    f"（{initiator.area.value}）",
                    initiator.label,
                    extra={"partnerCatId": partner.cat_id,
                           "partnerLabel": partner.label,
                           "area": initiator.area.value})

    # ── Maintenance routines (v2.3) ────────────────────────
    #
    # Hirsch 2025 Methods §2.1 reports the venue feeds cats 4×/day and
    # cleans litter boxes 2×/day. We schedule these at fixed within-day
    # times (relative to env.now mod 1440) so each simulated day emits:
    #
    #   - STAFF_FEEDING at minutes 480 / 660 / 840 / 1020 (08:00, 11:00,
    #     14:00, 17:00) of each 1440-minute day
    #   - STAFF_LITTER_CLEANING at minutes 540 / 1020 (09:00, 17:00)
    #
    # Pure observability markers — they do not alter cat or customer
    # behavior. Downstream analyses can correlate welfare scores with
    # routine timing if interesting.
    FEEDING_MINUTES = (480, 660, 840, 1020)
    LITTER_MINUTES = (540, 1020)

    def maintenance_schedule():
        last_emitted_day = -1
        while True:
            day = int(env.now // 1440)
            if day != last_emitted_day:
                day_offset = day * 1440
                for m in FEEDING_MINUTES:
                    if env.now <= day_offset + m < total_duration:
                        env.process(_fire_event_at(day_offset + m, "feed"))
                for m in LITTER_MINUTES:
                    if env.now <= day_offset + m < total_duration:
                        env.process(_fire_event_at(day_offset + m, "litter"))
                last_emitted_day = day
            # Re-check at the start of the next day.
            next_day_start = (day + 1) * 1440
            yield env.timeout(max(1.0, next_day_start - env.now))

    def _fire_event_at(at_time: float, kind: str):
        delay = max(0.0, at_time - env.now)
        yield env.timeout(delay)
        if env.now >= total_duration:
            return
        if kind == "feed":
            log(env.now, "STAFF_FEEDING", 0,
                "員工餵食（每日 4 次中的 1 次）")
        else:
            log(env.now, "STAFF_LITTER_CLEANING", 0,
                "員工清貓砂盆（每日 2 次中的 1 次）")

    # ── Customer generator ─────────────────────────────────
    #
    # v2.3: weekend multiplier applies in a 7-day cycle. Day index = floor
    # (sim_minute / 1440) mod 7, where indices 5 and 6 are weekend (Sat,
    # Sun) and the multiplier scales the arrival *rate* up (so the mean
    # interval scales down by 1/multiplier). Hirsch 2025 Fig 2 reports a
    # 2.5× weekend ratio (median 84.5 vs weekday 34).
    def is_weekend_minute(t_min: float) -> bool:
        if config.weekendArrivalMultiplier == 1.0:
            return False
        day_idx = int(t_min // 1440) % 7
        return day_idx >= 5

    def generator():
        cid = 1
        while True:
            current_mean = config.customerArrivalInterval
            if is_weekend_minute(env.now):
                current_mean = current_mean / config.weekendArrivalMultiplier
            inter = rng.expovariate(1.0 / current_mean)
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
        nonlocal cat_cat_affiliative_count, cat_cat_agonistic_count
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
        cat_cat_affiliative_count = 0
        cat_cat_agonistic_count = 0
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
        cats_registry[i] = agent
        env.process(cat(i, agent))
    if warm_up > 0:
        env.process(warm_up_reset())
    env.process(generator())
    env.process(cat_cat_interactions())
    env.process(maintenance_schedule())

    # Progress emitter: writes one newline-delimited JSON object every 5
    # simulated minutes so the Electron bridge can stream live progress
    # to the renderer instead of using a fake exponential curve.
    import sys as _sys, json as _json
    total_int = int(total_duration)
    # Initial 0% emit fires *before* env.run() so the UI snaps to the real
    # bar immediately. Emitting this from inside the simpy process would
    # queue behind every other process registered with env.process() above
    # (27+ cat agents, generator, warm-up reset), which on heavy configs
    # delays the first progress line by several seconds of wall time and
    # looks like the app is frozen.
    _sys.stdout.write(_json.dumps({
        "type": "progress",
        "stage": "warmup" if warm_up > 0 else "main",
        "elapsedMin": 0,
        "totalMin": total_int,
    }) + "\n")
    _sys.stdout.flush()

    def progress_emitter():
        while True:
            yield env.timeout(5.0)
            cur = int(env.now)
            if cur >= total_int:
                break
            _sys.stdout.write(_json.dumps({
                "type": "progress",
                "stage": "warmup" if cur < warm_up else "main",
                "elapsedMin": cur,
                "totalMin": total_int,
            }) + "\n")
            _sys.stdout.flush()

    env.process(progress_emitter())
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
    total_area_time = sum(area_time.values()) or 1.0
    area_share = {k: round(v / total_area_time, 4) for k, v in area_time.items()}

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
            "catAreaShare": area_share,
            "customerSatisfactionScore": customer_satisfaction,
            # v2.3: cat-cat interaction counts and per-cat-per-hour rate.
            "catCatAffiliativeCount": cat_cat_affiliative_count,
            "catCatAgonisticCount": cat_cat_agonistic_count,
            "catCatInteractionRatePerHour": round(
                (cat_cat_affiliative_count + cat_cat_agonistic_count)
                / max(1, config.catCount)
                / max(1.0, sim_dur / 60.0),
                4,
            ),
        },
        "eventLog": sorted(event_log, key=lambda e: e["timestamp"]),
    }

    return result
