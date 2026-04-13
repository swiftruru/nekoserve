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


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

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
    def log(timestamp: float, event_type: str, customer_id: int,
            description: str, resource_id: str | None = None) -> None:
        entry: dict[str, Any] = {
            "timestamp": round(timestamp, 2),
            "eventType": event_type,
            "customerId": customer_id,
            "description": description,
        }
        if resource_id is not None:
            entry["resourceId"] = resource_id
        event_log.append(entry)

    # ── Customer process ───────────────────────────────────
    def customer(cid: int):
        nonlocal total_arrived, total_served, total_abandoned
        nonlocal total_seat_busy, total_staff_busy
        nonlocal customers_with_visit, total_cat_visits

        total_arrived += 1
        arrive_time = env.now
        log(arrive_time, "CUSTOMER_ARRIVE", cid,
            f"顧客 {cid} 抵達貓咪咖啡廳")
        log(arrive_time, "CUSTOMER_WAIT_SEAT", cid,
            f"顧客 {cid} 等候座位中")

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
        seat_label = f"座位-{seats.count}"
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

    # ── Cat process ────────────────────────────────────────
    def cat(cat_id: int):
        nonlocal total_cat_busy
        cat_label = f"貓-{cat_id}"

        while True:
            # Wander around / idle, then look for someone to visit.
            idle_dur = rng.expovariate(1.0 / config.catIdleInterval)
            yield env.timeout(idle_dur)

            # Pick a target uniformly from currently-seated, non-leaving
            # customers. If nobody is available we just go back to idle.
            candidates = [rec for rec in seated.values() if not rec["leaving"]]
            if not candidates:
                continue
            target = rng.choice(candidates)
            target_id = target["id"]

            target["visitors"].add(cat_id)
            target["visit_count"] += 1

            visit_dur = _normal(rng, config.catInteractionTime)
            log(env.now, "CAT_VISIT_SEAT", target_id,
                f"{cat_label} 走到顧客 {target_id} 的座位",
                cat_label)
            total_cat_busy += visit_dur
            yield env.timeout(visit_dur)
            log(env.now, "CAT_LEAVE_SEAT", target_id,
                f"{cat_label} 離開顧客 {target_id} 的座位",
                cat_label)

            # Detach from whoever we were visiting (the customer may have
            # already been cleaned up if they were waiting on other cats).
            if target_id in seated:
                seated[target_id]["visitors"].discard(cat_id)

            # Possibly nap for a while.
            if rng.random() < config.catRestProbability:
                rest_dur = _normal(rng, config.catRestDuration)
                log(env.now, "CAT_START_REST", cat_id,
                    f"{cat_label} 開始休息（預計 {rest_dur:.1f} 分鐘）",
                    cat_label)
                total_cat_busy += rest_dur
                yield env.timeout(rest_dur)
                log(env.now, "CAT_END_REST", cat_id,
                    f"{cat_label} 休息結束，恢復活動",
                    cat_label)

    # ── Customer generator ─────────────────────────────────
    def generator():
        cid = 1
        while True:
            inter = rng.expovariate(1.0 / config.customerArrivalInterval)
            yield env.timeout(inter)
            if env.now >= config.simulationDuration:
                break
            env.process(customer(cid))
            cid += 1

    # Boot cat processes, then start the customer generator.
    for i in range(1, config.catCount + 1):
        env.process(cat(i))
    env.process(generator())
    env.run(until=config.simulationDuration)

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
        },
        "eventLog": sorted(event_log, key=lambda e: e["timestamp"]),
    }

    return result
