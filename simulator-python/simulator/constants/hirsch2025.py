"""
Empirical constants from Hirsch, Navarro Rivero & Andersson (2025).

Source: Hirsch, E. N., Navarro Rivero, B., & Andersson, M. (2025).
Cats in a Cat Café: Individual Cat Behavior and Interactions with Humans.
Animals, 15(22), 3233. https://doi.org/10.3390/ani15223233

Study: 227 hours of direct observation, 70 days, 27 cats at a
Stockholm cat café. Figures 3, 5, and 6 provide the data tables below.
"""

from enum import Enum


# ─────────────────────────────────────────────────────────────────────
# Ethogram: nine-state taxonomy (Stanton et al. 2015 Felidae standard)
# mirrored in shared/contracts/types.ts CatBehaviorState.
# ─────────────────────────────────────────────────────────────────────

class CatBehaviorState(str, Enum):
    OUT_OF_LOUNGE = "OUT_OF_LOUNGE"
    RESTING = "RESTING"
    SOCIALIZING = "SOCIALIZING"
    HIDDEN = "HIDDEN"
    ALERT = "ALERT"
    GROOMING = "GROOMING"
    MOVING = "MOVING"
    EXPLORING = "EXPLORING"
    PLAYING = "PLAYING"


# Figure 3: base rate per state across all observation time.
# Must sum to approximately 1.0; deviation indicates data from discussion section.
HIRSCH_BASE_PROBABILITIES: dict[CatBehaviorState, float] = {
    CatBehaviorState.OUT_OF_LOUNGE: 0.316,
    CatBehaviorState.RESTING: 0.317,
    CatBehaviorState.SOCIALIZING: 0.128,
    CatBehaviorState.HIDDEN: 0.107,
    CatBehaviorState.ALERT: 0.049,
    CatBehaviorState.GROOMING: 0.045,
    CatBehaviorState.MOVING: 0.027,
    CatBehaviorState.EXPLORING: 0.008,
    CatBehaviorState.PLAYING: 0.003,
}


# ─────────────────────────────────────────────────────────────────────
# Figure 5: occupancy-level modifiers on state probability.
# Multipliers applied to the base rate before renormalization.
# Derived from the Pearson residual bands in the paper.
# ─────────────────────────────────────────────────────────────────────

class OccupancyLevel(str, Enum):
    LOW = "LOW"      # < 21 customers (< 0.35 customers/m²)
    MID = "MID"      # 21 to 29 customers
    HIGH = "HIGH"    # > 29 customers


OCCUPANCY_THRESHOLDS: dict[OccupancyLevel, tuple[int, int]] = {
    OccupancyLevel.LOW: (0, 20),
    OccupancyLevel.MID: (21, 29),
    OccupancyLevel.HIGH: (30, 10_000),
}


HIRSCH_OCCUPANCY_MODIFIERS: dict[CatBehaviorState, dict[OccupancyLevel, float]] = {
    CatBehaviorState.RESTING:       {OccupancyLevel.LOW: 1.3, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 0.7},
    CatBehaviorState.SOCIALIZING:   {OccupancyLevel.LOW: 0.7, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 1.4},
    CatBehaviorState.OUT_OF_LOUNGE: {OccupancyLevel.LOW: 1.3, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 0.6},
    CatBehaviorState.HIDDEN:        {OccupancyLevel.LOW: 0.9, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 1.3},
    CatBehaviorState.ALERT:         {OccupancyLevel.LOW: 0.9, OccupancyLevel.MID: 0.8, OccupancyLevel.HIGH: 1.6},
    CatBehaviorState.GROOMING:      {OccupancyLevel.LOW: 1.1, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 0.6},
    CatBehaviorState.MOVING:        {OccupancyLevel.LOW: 1.0, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 1.0},
    CatBehaviorState.EXPLORING:     {OccupancyLevel.LOW: 1.2, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 0.4},
    CatBehaviorState.PLAYING:       {OccupancyLevel.LOW: 1.2, OccupancyLevel.MID: 1.0, OccupancyLevel.HIGH: 0.3},
}


def classify_occupancy(seated_count: int) -> OccupancyLevel:
    """Map a current seated count to Hirsch 2025's 3-level occupancy scheme."""
    if seated_count <= 20:
        return OccupancyLevel.LOW
    if seated_count <= 29:
        return OccupancyLevel.MID
    return OccupancyLevel.HIGH


# ─────────────────────────────────────────────────────────────────────
# Typical time a cat spends inside each state before resampling (minutes).
# Not in Hirsch 2025 directly; derived from observation-scan cadence and
# state-duration estimates in the discussion. Adjust via personality.
# ─────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────
# Spatial model (Epic A): 3 areas × 3 vertical levels.
# Cat Room (OUT_OF_LOUNGE) is a separate horizontal area with no
# vertical subdivision. Hirsch 2025 Figure 4b: shelf preference rises
# from ~35% at low occupancy to ~65% at high occupancy.
# ─────────────────────────────────────────────────────────────────────

class CafeArea(str, Enum):
    AREA_1 = "AREA_1"
    AREA_2 = "AREA_2"
    CAT_ROOM = "CAT_ROOM"


class VerticalLevel(str, Enum):
    FLOOR = "FLOOR"
    FURNITURE = "FURNITURE"
    SHELF = "SHELF"


# Base vertical-level preference for an interactable cat (not OUT_OF_LOUNGE).
# Hirsch 2025 Figure 4 in-lounge subtotal (n = 8547 = 1560 + 2778 + 4209).
# Mirrors src/renderer/src/validation/benchmarks.ts so the simulator's
# baseline matches the validator's empirical target exactly.
HIRSCH_VERTICAL_BASE: dict[VerticalLevel, float] = {
    VerticalLevel.FLOOR: 0.182,
    VerticalLevel.FURNITURE: 0.325,
    VerticalLevel.SHELF: 0.492,
}


def shelf_preference_for_occupancy(occupancy: "OccupancyLevel") -> float:
    """Fraction of time a cat prefers SHELF at each occupancy level."""
    if occupancy == OccupancyLevel.LOW:
        return 0.35
    if occupancy == OccupancyLevel.MID:
        return 0.48
    return 0.65  # HIGH


# ─────────────────────────────────────────────────────────────────────
# Cat welfare baselines (Hirsch 2025 Discussion section).
# Score = sum over indicators of clamp(share / baseline, 0, 1) for the
# three positive indicators, and clamp(1 - share / baseline, 0, 1) for
# the two negative indicators. Max total = 5.
# ─────────────────────────────────────────────────────────────────────

CAT_WELFARE_BASELINE: dict[str, float] = {
    # Positive (higher is better) — normalized against Figure 3 base rates
    "play":        0.003,
    "exploration": 0.008,
    "maintenance": 0.045,
    # Negative (lower is better) — penalize when share exceeds baseline
    "hidden":      0.107,
    "alert":       0.049,
}


HIRSCH_STATE_MEAN_DURATION: dict[CatBehaviorState, float] = {
    CatBehaviorState.OUT_OF_LOUNGE: 18.0,
    CatBehaviorState.RESTING:       15.0,
    CatBehaviorState.SOCIALIZING:   10.0,
    CatBehaviorState.HIDDEN:        12.0,
    CatBehaviorState.ALERT:         3.0,
    CatBehaviorState.GROOMING:      5.0,
    CatBehaviorState.MOVING:        1.5,
    CatBehaviorState.EXPLORING:     4.0,
    CatBehaviorState.PLAYING:       2.5,
}


# ─────────────────────────────────────────────────────────────────────
# Figure 6: four customer archetypes and their default composition.
# Mirrored in shared/contracts/types.ts CustomerType.
# ─────────────────────────────────────────────────────────────────────

class CustomerType(str, Enum):
    WOMAN = "WOMAN"
    MAN = "MAN"
    GIRL = "GIRL"
    BOY = "BOY"


# Default daily mix derived from the paper's sample: Hirsch 2025 observed
# women dominating the sample (1911 / 3310 interactions).
CUSTOMER_TYPE_DEFAULT_MIX: dict[CustomerType, float] = {
    CustomerType.WOMAN: 0.58,
    CustomerType.MAN:   0.19,
    CustomerType.GIRL:  0.13,
    CustomerType.BOY:   0.10,
}


# Figure 6 Pearson-residual-derived behavior profile multipliers.
# Each tuple row: (approachCat, triggerCatAvoidance, interactionAttractiveness).
# - approachCat: how likely this customer is to initiate an interaction
# - triggerCatAvoidance: how likely the cat is to actively avoid them
# - interactionAttractiveness: weight when a cat is choosing a customer target
CUSTOMER_BEHAVIOR_PROFILE: dict[CustomerType, dict[str, float]] = {
    CustomerType.WOMAN: {"approachCat": 1.0, "triggerAvoidance": 1.0, "attractiveness": 1.0},
    CustomerType.MAN:   {"approachCat": 0.9, "triggerAvoidance": 0.7, "attractiveness": 1.3},  # cats prefer men in Hirsch 2025
    CustomerType.GIRL:  {"approachCat": 1.4, "triggerAvoidance": 1.2, "attractiveness": 0.9},
    CustomerType.BOY:   {"approachCat": 1.4, "triggerAvoidance": 1.5, "attractiveness": 0.7},  # highest active avoidance
}
