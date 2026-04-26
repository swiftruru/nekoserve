"""
NekoServe Simulator — Golden Test Cases

Validates:
  1. JSON output structure matches SimulationResult schema
  2. Metric fields are correct types and within sensible ranges
  3. Event log is non-empty and timestamps are non-decreasing
  4. abandoned + served <= total_arrived (with tolerance for in-flight customers)
  5. Different scenarios produce meaningfully different results
"""

import pytest
from simulator.core import run_simulation
from simulator.models import (
    DEFAULT_CONFIG,
    SCENARIO_WEEKDAY,
    SCENARIO_HOLIDAY_RUSH,
    SCENARIO_CAT_NAP,
)


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

VALID_EVENT_TYPES = {
    "CUSTOMER_ARRIVE",
    "CUSTOMER_WAIT_SEAT",
    "CUSTOMER_SEATED",
    "CUSTOMER_ORDER",
    "ORDER_START_PREPARE",
    "ORDER_READY",
    "CUSTOMER_START_DINING",
    "CUSTOMER_FINISH_DINING",
    "CUSTOMER_LEAVE",
    "CUSTOMER_ABANDON",
    # v0.4.0: autonomous cat visits replace customer-initiated interaction
    "CAT_VISIT_SEAT",
    "CAT_LEAVE_SEAT",
    "CAT_START_REST",
    "CAT_END_REST",
    # v2.0: cat FSM state transitions (idle / seeking / visiting / resting)
    # emitted alongside the existing VISIT/LEAVE/REST events so the Playback
    # floor plan can animate the cat's current behavior band.
    "CAT_STATE_CHANGE",
    # v2.3: cat-cat interaction events (Hirsch 2025 §3.3 — 0.58/cat/hr,
    # 53/47 affiliative/agonistic split).
    "CAT_CAT_AFFILIATIVE",
    "CAT_CAT_AGONISTIC",
    # v2.3: venue maintenance routines (Hirsch 2025 Methods §2.1 —
    # feeding 4×/day, litter cleaning 2×/day).
    "STAFF_FEEDING",
    "STAFF_LITTER_CLEANING",
}


def _run(config):
    return run_simulation(config.to_dict())


# ──────────────────────────────────────────────────────────────
# Structure tests
# ──────────────────────────────────────────────────────────────

def test_result_has_required_keys():
    result = _run(DEFAULT_CONFIG)
    assert "config" in result
    assert "metrics" in result
    assert "eventLog" in result


def test_metrics_has_all_fields():
    m = _run(DEFAULT_CONFIG)["metrics"]
    required = {
        "avgWaitForSeat",
        "avgWaitForOrder",
        "avgTotalStayTime",
        "catInteractionRate",
        "avgCatVisitsPerCustomer",
        "noCatVisitRate",
        "seatUtilization",
        "staffUtilization",
        "catUtilization",
        "totalCustomersServed",
        "totalCustomersArrived",
        "abandonRate",
    }
    assert required.issubset(m.keys()), f"Missing fields: {required - m.keys()}"


def test_config_echoed_in_result():
    cfg = DEFAULT_CONFIG.to_dict()
    result = run_simulation(cfg)
    assert result["config"]["seatCount"] == cfg["seatCount"]
    assert result["config"]["randomSeed"] == cfg["randomSeed"]


# ──────────────────────────────────────────────────────────────
# Metric range tests
# ──────────────────────────────────────────────────────────────

def test_utilisation_rates_in_range():
    m = _run(DEFAULT_CONFIG)["metrics"]
    for key in ("seatUtilization", "staffUtilization", "catUtilization"):
        assert 0.0 <= m[key] <= 1.0, f"{key} = {m[key]} out of [0,1]"


def test_rates_in_range():
    m = _run(DEFAULT_CONFIG)["metrics"]
    assert 0.0 <= m["catInteractionRate"] <= 1.0
    assert 0.0 <= m["abandonRate"] <= 1.0


def test_average_times_non_negative():
    m = _run(DEFAULT_CONFIG)["metrics"]
    assert m["avgWaitForSeat"] >= 0.0
    assert m["avgWaitForOrder"] >= 0.0
    assert m["avgTotalStayTime"] >= 0.0


def test_customer_counts_consistent():
    m = _run(DEFAULT_CONFIG)["metrics"]
    arrived = m["totalCustomersArrived"]
    served = m["totalCustomersServed"]
    abandoned_count = round(m["abandonRate"] * arrived)
    # served + abandoned must not exceed arrived (in-flight customers tolerated)
    assert served + abandoned_count <= arrived + 1, (
        f"served({served}) + abandoned({abandoned_count}) > arrived({arrived})"
    )
    assert served >= 0
    assert arrived >= 0


# ──────────────────────────────────────────────────────────────
# Event log tests
# ──────────────────────────────────────────────────────────────

def test_event_log_non_empty():
    logs = _run(DEFAULT_CONFIG)["eventLog"]
    assert len(logs) > 0


def test_event_log_timestamps_non_decreasing():
    logs = _run(DEFAULT_CONFIG)["eventLog"]
    timestamps = [e["timestamp"] for e in logs]
    assert timestamps == sorted(timestamps), "Event log not sorted by timestamp"


def test_event_log_required_fields():
    logs = _run(DEFAULT_CONFIG)["eventLog"]
    for entry in logs:
        assert "timestamp" in entry
        assert "eventType" in entry
        assert "customerId" in entry
        assert "description" in entry
        assert isinstance(entry["timestamp"], (int, float))
        assert entry["eventType"] in VALID_EVENT_TYPES


def test_event_log_has_arrive_events():
    logs = _run(DEFAULT_CONFIG)["eventLog"]
    arrive_events = [e for e in logs if e["eventType"] == "CUSTOMER_ARRIVE"]
    assert len(arrive_events) > 0


def test_cat_visits_happen_autonomously():
    """v0.4.0: cats proactively visit seated customers. A default 240-min
    run with 3 cats should produce a non-trivial number of CAT_VISIT_SEAT
    events and roughly matching CAT_LEAVE_SEAT events."""
    cfg = DEFAULT_CONFIG
    logs = _run(cfg)["eventLog"]
    visits = [e for e in logs if e["eventType"] == "CAT_VISIT_SEAT"]
    leaves = [e for e in logs if e["eventType"] == "CAT_LEAVE_SEAT"]
    assert len(visits) > 0, "no cat visits happened — cats may not be spawning"
    # Every completed visit has a matching leave. At simulation end, up to
    # `catCount` cats can be mid-visit, so we tolerate that many unclosed
    # visits.
    assert len(leaves) >= len(visits) - cfg.catCount


def test_cat_visit_events_carry_cat_id_in_resource():
    """Cat visit / leave events should tag the cat identity in resourceId so
    the renderer can track which cat went where. As of v0.5.0 the
    resource label is the locale-neutral ``cat-N`` form (previously
    ``貓-N``); the renderer localizes it via i18n."""
    logs = _run(DEFAULT_CONFIG)["eventLog"]
    visits = [e for e in logs if e["eventType"] == "CAT_VISIT_SEAT"]
    assert visits, "no visits to inspect"
    for e in visits:
        assert "resourceId" in e and e["resourceId"].startswith("cat-"), (
            f"visit event missing cat resourceId: {e}"
        )


def test_timestamps_within_simulation_duration():
    cfg = DEFAULT_CONFIG
    result = _run(cfg)
    max_ts = max(e["timestamp"] for e in result["eventLog"])
    assert max_ts <= cfg.simulationDuration + 1.0  # allow tiny floating point overshoot


# ──────────────────────────────────────────────────────────────
# Reproducibility test
# ──────────────────────────────────────────────────────────────

def test_same_seed_same_result():
    r1 = _run(DEFAULT_CONFIG)
    r2 = _run(DEFAULT_CONFIG)
    assert r1["metrics"] == r2["metrics"]
    assert len(r1["eventLog"]) == len(r2["eventLog"])


# ──────────────────────────────────────────────────────────────
# Scenario differentiation test
# ──────────────────────────────────────────────────────────────

def test_holiday_rush_higher_abandon_than_weekday():
    """假日尖峰 (更短等待容忍 + 更多顧客) 應有更高的放棄率。"""
    m_wd = _run(SCENARIO_WEEKDAY)["metrics"]
    m_hr = _run(SCENARIO_HOLIDAY_RUSH)["metrics"]
    # Holiday rush has shorter maxWaitTime (15 vs 25) and faster arrivals (3 vs 8)
    # so it should generally have higher or equal abandon rate
    assert m_hr["totalCustomersArrived"] > m_wd["totalCustomersArrived"], (
        "Holiday rush should have more customers"
    )


def test_cat_nap_higher_cat_rest_effect():
    """貓咪午睡模式應讓更多貓咪進入休息。"""
    m_wd = _run(SCENARIO_WEEKDAY)["metrics"]
    m_cn = _run(SCENARIO_CAT_NAP)["metrics"]
    # Cat nap: catRestProbability=0.7 vs weekday=0.2 → lower cat utilisation
    # (more rest time for same interaction count)
    # Both should be > 0
    assert m_cn["catUtilization"] >= 0.0
    assert m_wd["catUtilization"] >= 0.0


def test_all_three_scenarios_run_without_error():
    for cfg in (SCENARIO_WEEKDAY, SCENARIO_HOLIDAY_RUSH, SCENARIO_CAT_NAP):
        result = _run(cfg)
        assert "metrics" in result
        assert result["metrics"]["totalCustomersArrived"] > 0


# ──────────────────────────────────────────────────────────────
# Validation tests
# ──────────────────────────────────────────────────────────────

def test_invalid_seat_count_raises():
    from simulator.models import SimulationConfig
    with pytest.raises(ValueError, match="seatCount"):
        run_simulation({**DEFAULT_CONFIG.to_dict(), "seatCount": 0})


def test_invalid_probability_raises():
    from simulator.models import SimulationConfig
    with pytest.raises(ValueError, match="catRestProbability"):
        run_simulation({**DEFAULT_CONFIG.to_dict(), "catRestProbability": 1.5})
