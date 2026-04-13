"""
NekoServe Simulator — Data Models

Defines SimulationConfig with all parameters and their defaults.
Python dataclass mirrors the TypeScript SimulationConfig interface.
"""

from dataclasses import dataclass, asdict, field
from typing import Any


@dataclass
class SimulationConfig:
    """模擬設定參數，對應 TypeScript SimulationConfig 介面。"""
    seatCount: int = 10
    staffCount: int = 2
    catCount: int = 3
    customerArrivalInterval: float = 5.0   # Exponential mean (minutes)
    orderTime: float = 3.0                 # Normal mean (minutes)
    preparationTime: float = 8.0           # Normal mean (minutes)
    diningTime: float = 15.0               # Normal mean (minutes)
    catInteractionTime: float = 10.0       # Normal mean per visit (minutes)
    catIdleInterval: float = 4.0           # Exponential mean between visits (minutes)
    catRestProbability: float = 0.3        # 0–1
    catRestDuration: float = 15.0          # Normal mean (minutes)
    maxWaitTime: float = 20.0              # minutes
    simulationDuration: float = 240.0      # minutes
    randomSeed: int = 42

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SimulationConfig":
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        filtered = {k: v for k, v in d.items() if k in known_fields}
        return cls(**filtered)

    def validate(self) -> None:
        """Basic validation. Raises ValueError with descriptive message on failure."""
        if self.seatCount < 1:
            raise ValueError("seatCount 必須 >= 1")
        if self.staffCount < 1:
            raise ValueError("staffCount 必須 >= 1")
        if self.catCount < 1:
            raise ValueError("catCount 必須 >= 1")
        if self.customerArrivalInterval <= 0:
            raise ValueError("customerArrivalInterval 必須 > 0")
        if self.orderTime <= 0:
            raise ValueError("orderTime 必須 > 0")
        if self.preparationTime <= 0:
            raise ValueError("preparationTime 必須 > 0")
        if self.diningTime <= 0:
            raise ValueError("diningTime 必須 > 0")
        if self.catInteractionTime <= 0:
            raise ValueError("catInteractionTime 必須 > 0")
        if self.catIdleInterval <= 0:
            raise ValueError("catIdleInterval 必須 > 0")
        if not (0.0 <= self.catRestProbability <= 1.0):
            raise ValueError("catRestProbability 必須在 0–1 之間")
        if self.catRestDuration <= 0:
            raise ValueError("catRestDuration 必須 > 0")
        if self.maxWaitTime <= 0:
            raise ValueError("maxWaitTime 必須 > 0")
        if self.simulationDuration <= 0:
            raise ValueError("simulationDuration 必須 > 0")


# ──────────────────────────────────────────────────────────────
# Preset Scenarios — 三組預設情境
# ──────────────────────────────────────────────────────────────

SCENARIO_WEEKDAY = SimulationConfig(
    seatCount=10,
    staffCount=2,
    catCount=3,
    customerArrivalInterval=8.0,
    orderTime=3.0,
    preparationTime=8.0,
    diningTime=15.0,
    catInteractionTime=10.0,
    catIdleInterval=4.0,
    catRestProbability=0.2,
    catRestDuration=10.0,
    maxWaitTime=25.0,
    simulationDuration=240.0,
    randomSeed=42,
)

SCENARIO_HOLIDAY_RUSH = SimulationConfig(
    seatCount=10,
    staffCount=3,
    catCount=5,
    customerArrivalInterval=3.0,
    orderTime=2.0,
    preparationTime=10.0,
    diningTime=20.0,
    catInteractionTime=8.0,
    catIdleInterval=3.0,
    catRestProbability=0.3,
    catRestDuration=15.0,
    maxWaitTime=15.0,
    simulationDuration=360.0,
    randomSeed=42,
)

SCENARIO_CAT_NAP = SimulationConfig(
    seatCount=10,
    staffCount=2,
    catCount=3,
    customerArrivalInterval=6.0,
    orderTime=3.0,
    preparationTime=8.0,
    diningTime=15.0,
    catInteractionTime=10.0,
    catIdleInterval=6.0,
    catRestProbability=0.7,
    catRestDuration=25.0,
    maxWaitTime=20.0,
    simulationDuration=240.0,
    randomSeed=42,
)

DEFAULT_CONFIG = SimulationConfig()
