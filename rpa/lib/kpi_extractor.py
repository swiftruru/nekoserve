"""
Read a NekoServe-exported metrics CSV and pull out the KPIs we report on.

NekoServe writes a 2-row CSV (header line + values line, snake_case
column names, prefixed with a UTF-8 BOM). The mapping below is the
contract between NekoServe's `src/renderer/src/utils/export.ts` and
this bot's `results.csv`. If NekoServe renames a column, update both
sides together.
"""

from __future__ import annotations

import csv
from pathlib import Path

# NekoServe snake_case column -> our camelCase output column.
# Keep the ordering used in results.csv for tidy diffs.
KPI_COLUMN_MAP: dict[str, str] = {
    "avg_wait_for_seat_min":            "avgWaitForSeat",
    "avg_wait_for_order_min":           "avgWaitForOrder",
    "avg_total_stay_time_min":          "avgTotalStayTime",
    "abandon_rate":                     "abandonRate",
    "total_customers_served":           "totalCustomersServed",
    "seat_utilization":                 "seatUtilization",
    "staff_utilization":                "staffUtilization",
    "cat_utilization":                  "catUtilization",
    "customer_satisfaction_score":      "customerSatisfactionScore",
    "cat_welfare_score_hirsch_2025":    "catWelfareScore",
}


class KpiExtractError(RuntimeError):
    pass


def extract_kpis(csv_path: Path) -> dict[str, str]:
    """Parse a `nekoserve-metrics-<ts>.csv` and return a flat dict of
    KPI values keyed by our camelCase names. Values stay as strings
    (no parsing to float) -- the report does its own coercion and we
    want to preserve the exact format NekoServe wrote.

    Raises KpiExtractError if the file isn't a 2-row CSV or is missing
    any expected column.
    """
    # NekoServe writes with a leading UTF-8 BOM. utf-8-sig strips it.
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise KpiExtractError(f"{csv_path.name}: no data rows")
    if len(rows) > 1:
        raise KpiExtractError(
            f"{csv_path.name}: expected 1 data row, got {len(rows)}"
        )
    row = rows[0]
    out: dict[str, str] = {}
    missing: list[str] = []
    for src, dst in KPI_COLUMN_MAP.items():
        if src not in row:
            missing.append(src)
        else:
            out[dst] = row[src]
    if missing:
        raise KpiExtractError(
            f"{csv_path.name}: missing columns {missing}. "
            f"Has NekoServe's export.ts changed?"
        )
    return out
