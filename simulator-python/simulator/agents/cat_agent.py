"""
CatAgent — nine-state cat ethogram with per-cat personality.

Replaces the old 3-state generator (idle -> visit -> rest -> idle) from
core.py with the full nine-state FSM described in Hirsch et al. (2025).
Each cat holds a personality vector that perturbs its base-rate
distribution, so two cats in the same room will behave differently.

Reference: Hirsch, E. N., Navarro Rivero, B., & Andersson, M. (2025).
Cats in a Cat Café. Animals, 15(22), 3233.
DOI: 10.3390/ani15223233
"""

from dataclasses import dataclass, field
from random import Random
from typing import Callable

from ..constants.hirsch2025 import (
    CafeArea,
    CatBehaviorState,
    HIRSCH_BASE_PROBABILITIES,
    HIRSCH_OCCUPANCY_MODIFIERS,
    HIRSCH_STATE_MEAN_DURATION,
    HIRSCH_VERTICAL_BASE,
    OccupancyLevel,
    VerticalLevel,
    classify_occupancy,
    shelf_preference_for_occupancy,
)


# ─────────────────────────────────────────────────────────────────────
# Personality: four traits in [0, 1] range. Values near 0.5 behave like
# the population mean; extremes skew the state distribution.
# ─────────────────────────────────────────────────────────────────────

@dataclass
class CatPersonality:
    """
    Per-cat perturbation vector. Each trait nudges specific state
    probabilities up or down, producing individual variation without
    requiring per-cat calibration.
    """
    # Higher => more SOCIALIZING, less HIDDEN / OUT_OF_LOUNGE
    socialness: float = 0.5
    # Higher => more HIDDEN, less SOCIALIZING
    hiding_tendency: float = 0.5
    # Higher => more EXPLORING / MOVING, less RESTING
    activity_level: float = 0.5
    # Higher => more ALERT / HIDDEN at high occupancy
    stress_sensitivity: float = 0.5

    def as_state_modifier(self, state: CatBehaviorState) -> float:
        """
        Return a multiplier applied to the base probability of this
        state. Values around 1.0 produce the population mean; extremes
        shift the cat toward its idiosyncratic profile.
        """
        s = self.socialness
        h = self.hiding_tendency
        a = self.activity_level
        e = self.stress_sensitivity
        # Center personality traits at 0 and map each trait to a small
        # multiplicative window so a trait of 1.0 roughly doubles the
        # weight for its affinity state, and 0.0 roughly halves it.
        def scale(trait: float, strength: float = 0.8) -> float:
            return 1.0 + (trait - 0.5) * strength

        if state == CatBehaviorState.SOCIALIZING:
            return scale(s) * scale(1.0 - h)
        if state == CatBehaviorState.HIDDEN:
            return scale(h) * scale(1.0 - s)
        if state == CatBehaviorState.OUT_OF_LOUNGE:
            return scale(h, 0.6) * scale(1.0 - s, 0.4)
        if state == CatBehaviorState.RESTING:
            return scale(1.0 - a)
        if state == CatBehaviorState.MOVING:
            return scale(a)
        if state == CatBehaviorState.EXPLORING:
            return scale(a) * scale(1.0 - e, 0.4)
        if state == CatBehaviorState.PLAYING:
            return scale(a, 1.2) * scale(1.0 - e, 0.4)
        if state == CatBehaviorState.ALERT:
            return scale(e)
        if state == CatBehaviorState.GROOMING:
            return scale(1.0 - e, 0.4)
        return 1.0


def sample_personality(rng: Random) -> CatPersonality:
    """Draw a personality vector uniformly in [0.2, 0.8] per trait.
    Avoiding 0/1 extremes keeps every cat believable."""
    return CatPersonality(
        socialness=0.2 + 0.6 * rng.random(),
        hiding_tendency=0.2 + 0.6 * rng.random(),
        activity_level=0.2 + 0.6 * rng.random(),
        stress_sensitivity=0.2 + 0.6 * rng.random(),
    )


# ─────────────────────────────────────────────────────────────────────
# CatAgent: FSM with base + occupancy + personality composition.
# ─────────────────────────────────────────────────────────────────────

InteractableStates = frozenset(
    {CatBehaviorState.SOCIALIZING, CatBehaviorState.EXPLORING, CatBehaviorState.PLAYING}
)
"""States during which a cat is available to visit a customer's seat."""

UnavailableStates = frozenset(
    {
        CatBehaviorState.OUT_OF_LOUNGE,
        CatBehaviorState.RESTING,
        CatBehaviorState.HIDDEN,
        CatBehaviorState.ALERT,
        CatBehaviorState.GROOMING,
    }
)


@dataclass
class CatAgent:
    """One cat's FSM state + personality + 2.5D position. Stateless
    w.r.t. SimPy env; core.py owns the timing / yielding."""

    cat_id: int
    label: str
    personality: CatPersonality
    state: CatBehaviorState = CatBehaviorState.RESTING
    area: CafeArea = CafeArea.AREA_1
    level: VerticalLevel = VerticalLevel.FLOOR

    def pick_next_state(
        self,
        rng: Random,
        seated_count: int,
        previous_state: CatBehaviorState | None = None,
    ) -> CatBehaviorState:
        """
        Sample the next behavior state given current occupancy and
        personality. Blends three layers:
          1. Hirsch 2025 base rate (Figure 3)
          2. Hirsch 2025 occupancy modifier (Figure 5)
          3. This cat's personality modifier
        Optionally discourages immediate self-loops to avoid the agent
        getting stuck in the same state forever.
        """
        occupancy = classify_occupancy(seated_count)
        weights: dict[CatBehaviorState, float] = {}
        for state, base in HIRSCH_BASE_PROBABILITIES.items():
            occ_mod = HIRSCH_OCCUPANCY_MODIFIERS.get(state, {}).get(occupancy, 1.0)
            pers_mod = self.personality.as_state_modifier(state)
            # Hirsch Figure 3 base rates are *time shares*, not transition
            # probabilities. For a CTMC the long-run time share converges
            # to (transition_weight x mean_duration) / Σ, so we divide by
            # mean_duration here to make the simulator hit Figure 3.
            mean_dur = HIRSCH_STATE_MEAN_DURATION.get(state, 5.0)
            weight = (base / mean_dur) * occ_mod * pers_mod
            # Light self-loop penalty so the cat doesn't repeat the
            # same state every tick. 0.7x makes a re-entry possible
            # but less likely than transitioning.
            if previous_state is not None and state == previous_state:
                weight *= 0.7
            weights[state] = max(weight, 1e-6)

        total = sum(weights.values())
        threshold = rng.random() * total
        running = 0.0
        for state, weight in weights.items():
            running += weight
            if running >= threshold:
                return state
        # Numerical fallback
        return CatBehaviorState.RESTING

    def sample_state_duration(self, rng: Random, state: CatBehaviorState) -> float:
        """
        Draw a dwell time (minutes) for the given state. Uses an
        exponential distribution centered on the state's mean so
        durations have the right variance without clustering.
        """
        mean = HIRSCH_STATE_MEAN_DURATION.get(state, 5.0)
        if mean <= 0:
            return 1.0
        return max(0.25, rng.expovariate(1.0 / mean))

    def is_available_to_interact(self) -> bool:
        """Does the current state allow the cat to visit a customer seat?"""
        return self.state in InteractableStates

    def pick_position(
        self,
        rng: Random,
        seated_count: int,
        for_state: CatBehaviorState | None = None,
    ) -> tuple[CafeArea, VerticalLevel | None]:
        """
        Sample the next (area, level) for this cat. The level weights
        depend on the state we're *about to enter* (passed via
        ``for_state``); falling back to ``self.state`` would tag the
        new state's dwell time with the previous state's level, which
        was the source of the FLOOR over-share in validation runs.
        """
        target_state = for_state if for_state is not None else self.state
        if target_state == CatBehaviorState.OUT_OF_LOUNGE:
            return CafeArea.CAT_ROOM, None

        # Area 1 (main lounge) vs Area 2 (quieter side) split. Hirsch
        # 2025 Figure 3 left panel: in the in-lounge sample n=8557,
        # Area 1 n=5653 (66%), Area 2 n=2904 (34%). Stress-sensitive
        # cats at high occupancy invert toward the quieter Area 2.
        occupancy = classify_occupancy(seated_count)
        stress = self.personality.stress_sensitivity
        if occupancy == OccupancyLevel.HIGH and stress > 0.6:
            # Stressed + crowded: 70% Area 2 (retreat to quieter side).
            area = CafeArea.AREA_2 if rng.random() < 0.7 else CafeArea.AREA_1
        else:
            # Baseline Hirsch split: Area 1 66% / Area 2 34%.
            area = CafeArea.AREA_1 if rng.random() < 0.66 else CafeArea.AREA_2

        # Vertical: blend base preference with occupancy-driven shelf
        # preference. Active states (PLAYING / EXPLORING / MOVING) lean
        # toward FLOOR / FURNITURE; sedentary states lean SHELF.
        shelf_pref = shelf_preference_for_occupancy(occupancy)
        if target_state in (
            CatBehaviorState.PLAYING,
            CatBehaviorState.EXPLORING,
            CatBehaviorState.MOVING,
            CatBehaviorState.SOCIALIZING,
        ):
            # Active: FLOOR-heavy
            weights = {
                VerticalLevel.FLOOR: 0.5,
                VerticalLevel.FURNITURE: 0.35,
                VerticalLevel.SHELF: 0.15,
            }
        elif target_state in (CatBehaviorState.ALERT, CatBehaviorState.HIDDEN):
            # Defensive: shelf-heavy, scaled by occupancy. Hirsch Figure 4b
            # describes shelf-as-refuge climbing with crowding for stressed
            # cats specifically, so the uplift only applies here.
            weights = _apply_shelf_uplift(
                {
                    VerticalLevel.FLOOR: 0.1,
                    VerticalLevel.FURNITURE: 0.25,
                    VerticalLevel.SHELF: 0.65,
                },
                shelf_pref,
            )
        else:
            # RESTING / GROOMING use the empirical Figure 4 in-lounge mix
            # without occupancy uplift, otherwise SHELF time inflates past
            # the paper's 49.2% baseline.
            weights = dict(HIRSCH_VERTICAL_BASE)

        total = sum(weights.values())
        threshold = rng.random() * total
        running = 0.0
        for lvl, w in weights.items():
            running += w
            if running >= threshold:
                return area, lvl
        return area, VerticalLevel.FLOOR


def _apply_shelf_uplift(
    weights: dict[VerticalLevel, float],
    shelf_target: float,
) -> dict[VerticalLevel, float]:
    """Pull SHELF up to shelf_target and proportionally squeeze FLOOR /
    FURNITURE so the three weights still sum to 1.0. Without the squeeze
    the previous max() approach left the distribution un-normalized and
    SHELF time over-shot the empirical share."""
    cur_shelf = weights[VerticalLevel.SHELF]
    if shelf_target <= cur_shelf:
        return weights
    rest_budget = max(0.0, 1.0 - shelf_target)
    cur_rest = weights[VerticalLevel.FLOOR] + weights[VerticalLevel.FURNITURE]
    if cur_rest <= 0:
        return weights
    scale = rest_budget / cur_rest
    return {
        VerticalLevel.FLOOR: weights[VerticalLevel.FLOOR] * scale,
        VerticalLevel.FURNITURE: weights[VerticalLevel.FURNITURE] * scale,
        VerticalLevel.SHELF: shelf_target,
    }


OnStateChange = Callable[[CatBehaviorState, CatBehaviorState], None]
"""Callback signature: (from_state, to_state) -> None, for emitting events."""
