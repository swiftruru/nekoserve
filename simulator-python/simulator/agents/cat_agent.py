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
    CatBehaviorState,
    HIRSCH_BASE_PROBABILITIES,
    HIRSCH_OCCUPANCY_MODIFIERS,
    HIRSCH_STATE_MEAN_DURATION,
    OccupancyLevel,
    classify_occupancy,
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
    """One cat's FSM state + personality. Stateless w.r.t. SimPy env;
    core.py owns the timing / yielding."""

    cat_id: int
    label: str
    personality: CatPersonality
    state: CatBehaviorState = CatBehaviorState.RESTING

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
            weight = base * occ_mod * pers_mod
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


OnStateChange = Callable[[CatBehaviorState, CatBehaviorState], None]
"""Callback signature: (from_state, to_state) -> None, for emitting events."""
