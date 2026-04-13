"""
NekoServe Simulator — Core SimPy Simulation Engine

All simulation rules live here. UI must NOT reimplement this logic.

Random distribution spec (strict):
  - Customer arrival:    Exponential(mean = customerArrivalInterval)
  - All service times:   Normal(mean, std=mean*0.2), clamped to min=1
  - Cat rest trigger:    Bernoulli(catRestProbability) after each interaction
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


# ──────────────────────────────────────────────────────────────
# Simulation
# ──────────────────────────────────────────────────────────────

def run_simulation(config_dict: dict) -> dict:
    """
    Execute the cat-café discrete-event simulation.

    Parameters
    ----------
    config_dict : dict
        JSON-serialisable dict matching SimulationConfig fields.

    Returns
    -------
    dict
        JSON-serialisable dict matching SimulationResult shape.

    Raises
    ------
    ValueError
        If config values are out of range (caught by __main__ → INVALID_CONFIG).
    RuntimeError
        On unexpected simulation failure (caught by __main__ → SIMULATION_ERROR).
    """
    config = SimulationConfig.from_dict(config_dict)
    config.validate()

    rng = random.Random(config.randomSeed)
    env = simpy.Environment()

    # ── Resources ──────────────────────────────────────────
    seats = simpy.Resource(env, capacity=config.seatCount)
    staff = simpy.Resource(env, capacity=config.staffCount)
    # Cats modelled as Container so we can programmatically add/remove
    # capacity to simulate rest periods.
    cats = simpy.Container(env, capacity=config.catCount, init=config.catCount)

    # ── Accumulators ───────────────────────────────────────
    event_log: list[dict] = []

    total_arrived = 0
    total_served = 0
    total_abandoned = 0
    total_cat_interactions = 0

    # Cumulative busy-time for utilisation calculations
    total_seat_busy = 0.0    # sum of seat-occupied minutes across customers
    total_staff_busy = 0.0   # sum of staff-occupied minutes
    total_cat_busy = 0.0     # sum of cat-busy minutes (interaction + rest)

    wait_seat_times: list[float] = []
    wait_order_times: list[float] = []
    stay_times: list[float] = []

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

    # ── Cat rest process ───────────────────────────────────
    def cat_rest(last_customer_id: int):
        nonlocal total_cat_busy
        rest_dur = _normal(rng, config.catRestDuration)
        log(env.now, "CAT_START_REST", last_customer_id,
            f"貓咪開始休息（預計 {rest_dur:.1f} 分鐘）")
        total_cat_busy += rest_dur
        yield env.timeout(rest_dur)
        log(env.now, "CAT_END_REST", last_customer_id,
            "貓咪休息結束，恢復可互動狀態")
        cats.put(1)

    # ── Customer process ───────────────────────────────────
    def customer(cid: int):
        nonlocal total_arrived, total_served, total_abandoned
        nonlocal total_seat_busy, total_staff_busy, total_cat_busy
        nonlocal total_cat_interactions

        total_arrived += 1
        arrive_time = env.now
        log(arrive_time, "CUSTOMER_ARRIVE", cid,
            f"顧客 {cid} 抵達貓咪咖啡廳")
        log(arrive_time, "CUSTOMER_WAIT_SEAT", cid,
            f"顧客 {cid} 等候座位中")

        # ── Phase 1: Wait for seat (with abandonment timeout) ──
        seat_req = seats.request()
        abandon_ev = env.timeout(config.maxWaitTime)

        yield seat_req | abandon_ev

        if not seat_req.triggered:
            # Timed out — abandon
            seat_req.cancel()
            total_abandoned += 1
            log(env.now, "CUSTOMER_ABANDON", cid,
                f"顧客 {cid} 等待超過 {config.maxWaitTime:.0f} 分鐘，放棄離開")
            return

        wait_seat = env.now - arrive_time
        wait_seat_times.append(wait_seat)
        seated_at = env.now
        log(env.now, "CUSTOMER_SEATED", cid,
            f"顧客 {cid} 入座（等待 {wait_seat:.1f} 分鐘）",
            f"座位-{seats.count}")

        # ── Phase 2: Order (staff occupied for ordering) ───
        log(env.now, "CUSTOMER_ORDER", cid, f"顧客 {cid} 呼叫店員點餐")
        order_start = env.now

        with staff.request() as s_req:
            yield s_req
            order_dur = _normal(rng, config.orderTime)
            total_staff_busy += order_dur
            yield env.timeout(order_dur)

        log(env.now, "ORDER_START_PREPARE", cid,
            f"顧客 {cid} 完成點餐，餐點開始製作")

        # ── Phase 3: Preparation (staff occupied for prep) ─
        with staff.request() as s_req:
            yield s_req
            prep_dur = _normal(rng, config.preparationTime)
            total_staff_busy += prep_dur
            yield env.timeout(prep_dur)

        wait_order = env.now - order_start
        wait_order_times.append(wait_order)
        log(env.now, "ORDER_READY", cid,
            f"顧客 {cid} 的餐點完成（等待 {wait_order:.1f} 分鐘）")

        # ── Phase 4: Dining ────────────────────────────────
        log(env.now, "CUSTOMER_START_DINING", cid,
            f"顧客 {cid} 開始用餐")
        dining_dur = _normal(rng, config.diningTime)
        yield env.timeout(dining_dur)
        log(env.now, "CUSTOMER_FINISH_DINING", cid,
            f"顧客 {cid} 用餐完畢")

        # Record seat utilisation (seated → finish dining)
        total_seat_busy += env.now - seated_at
        seats.release(seat_req)

        # ── Phase 5: Cat interaction ───────────────────────
        log(env.now, "CUSTOMER_WAIT_CAT", cid,
            f"顧客 {cid} 等待與貓咪互動")
        yield cats.get(1)

        interact_dur = _normal(rng, config.catInteractionTime)
        log(env.now, "CUSTOMER_START_CAT_INTERACTION", cid,
            f"顧客 {cid} 開始與貓咪互動（預計 {interact_dur:.1f} 分鐘）")
        total_cat_busy += interact_dur
        yield env.timeout(interact_dur)
        total_cat_interactions += 1  # count only after interaction completes
        log(env.now, "CUSTOMER_FINISH_CAT_INTERACTION", cid,
            f"顧客 {cid} 完成貓咪互動")

        # Cat may rest after interaction
        if rng.random() < config.catRestProbability:
            env.process(cat_rest(cid))
        else:
            cats.put(1)

        # ── Done ───────────────────────────────────────────
        total_stay = env.now - arrive_time
        stay_times.append(total_stay)
        total_served += 1
        log(env.now, "CUSTOMER_LEAVE", cid,
            f"顧客 {cid} 離開咖啡廳（總停留 {total_stay:.1f} 分鐘）")

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
        round(total_cat_interactions / total_served, 4)
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
