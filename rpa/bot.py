"""
NekoServe RPA driver.

Reads scenarios.csv, drives the NekoServe UI once per row, writes
output/results.csv. No NekoServe internals are imported; everything
goes through screen pixels and the existing Export CSV button.

Usage:
    python bot.py                       # run all scenarios
    python bot.py --only cats3_staff2   # run one scenario by id
    python bot.py --calibrate           # check templates, don't run
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

# Make `from lib import ...` work whether you run from rpa/ or elsewhere.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import ui_actions as ui  # noqa: E402
from lib.downloads_watcher import snapshot_existing, wait_for_new_metrics  # noqa: E402
from lib.kpi_extractor import KPI_COLUMN_MAP, extract_kpis, KpiExtractError  # noqa: E402

HERE = Path(__file__).resolve().parent
SCENARIOS_CSV = HERE / "scenarios.csv"
RESULTS_CSV = HERE / "output" / "results.csv"

# Hard cap on how long we wait for the Results tab to light up after
# clicking Run. NekoServe runs at ~720 sim-min in a few seconds; 120
# is generous slack for slower machines.
RUN_TIMEOUT_S = 120.0
# Hard cap on how long we wait for the Export CSV file to land in
# Downloads after clicking the button.
EXPORT_TIMEOUT_S = 15.0


RESULTS_HEADER = [
    "scenario_id",
    "catCount",
    "staffCount",
    *KPI_COLUMN_MAP.values(),
    "run_started_at_iso",
    "source_csv_filename",
    "status",
]


def load_scenarios() -> list[dict[str, str]]:
    with SCENARIOS_CSV.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ensure_results_file(*, fresh: bool) -> None:
    """Make sure RESULTS_CSV exists with the expected header.

    `fresh=True` truncates the file (full batch run) so the report
    doesn't show two batches stacked. `fresh=False` keeps existing
    rows (--only smoke tests append, leaving prior results intact).
    """
    RESULTS_CSV.parent.mkdir(parents=True, exist_ok=True)
    if fresh or not RESULTS_CSV.exists():
        with RESULTS_CSV.open("w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(RESULTS_HEADER)


def append_result(row: dict[str, str]) -> None:
    with RESULTS_CSV.open("a", encoding="utf-8", newline="") as f:
        csv.writer(f).writerow([row.get(col, "") for col in RESULTS_HEADER])


def run_one_scenario(scenario: dict[str, str]) -> dict[str, str]:
    """Drive NekoServe through one scenario and return a results row.

    On any failure, returns a row with status="failed" and as much
    context as we have. The caller writes the row regardless; the
    batch keeps going.
    """
    sid = scenario["scenario_id"]
    cat = int(scenario["catCount"])
    staff = int(scenario["staffCount"])
    started = datetime.now().isoformat(timespec="seconds")
    print(f"\n=== {sid}: catCount={cat}, staffCount={staff} ===")

    row: dict[str, str] = {
        "scenario_id": sid,
        "catCount": str(cat),
        "staffCount": str(staff),
        "run_started_at_iso": started,
        "source_csv_filename": "",
        "status": "failed",
    }

    try:
        # 1. Bring NekoServe to the front, then detour through the
        # About page so settings_tab is guaranteed un-active when we
        # try to click it next. Without this, the previous scenario
        # leaves us on Settings with settings_tab in its orange-active
        # state -- our template (captured un-active) wouldn't match.
        ui.activate_window()
        time.sleep(0.3)
        ui.best_effort_navigate_to_about()
        ui.click_template(ui.Template("settings_tab"))
        time.sleep(0.4)
        # NekoServe's tab-change scroll reset should fire here, but
        # we belt-and-braces an extra scroll-to-top so the preset row
        # is guaranteed visible before we hunt for the preset button.
        ui.force_scroll_to_top()

        # 2. Reset to a known baseline so the previous scenario's
        # catCount/staffCount don't leak in.
        ui.click_template(ui.Template("preset_paper_weekday"))
        time.sleep(0.5)

        # 3. Set catCount and staffCount. dx=140 is the default offset
        # from label centre to input centre; tune in ui_actions if the
        # demo machine's layout shifts.
        ui.type_value_after_label(ui.Template("cat_count_label"), cat)
        ui.type_value_after_label(ui.Template("staff_count_label"), staff)

        # 4. Click Run.
        downloads_before = snapshot_existing()
        ui.click_template(ui.Template("run_button"))

        # 5. Wait for Results tab to become enabled.
        ok = ui.wait_for(
            ui.Template("results_tab_enabled"),
            timeout_s=RUN_TIMEOUT_S,
        )
        if not ok:
            print(f"  [timeout] Results tab did not light up in {RUN_TIMEOUT_S}s")
            row["status"] = "failed"
            return row

        # 6. Click Results tab, then Export Metrics CSV.
        ui.click_template(ui.Template("results_tab_enabled"))
        time.sleep(0.6)
        ui.click_template(ui.Template("export_csv_button"))

        # 7. Wait for the new CSV to land in Downloads.
        new_file = wait_for_new_metrics(downloads_before, timeout_s=EXPORT_TIMEOUT_S)
        if new_file is None:
            print(f"  [timeout] Export CSV did not appear in {EXPORT_TIMEOUT_S}s")
            row["status"] = "failed"
            return row
        print(f"  -> got {new_file.name}")
        row["source_csv_filename"] = new_file.name

        # 8. Extract KPIs.
        kpis = extract_kpis(new_file)
        row.update(kpis)
        row["status"] = "ok"
        print(f"  -> ok (avgWaitForSeat={kpis['avgWaitForSeat']}, "
              f"abandonRate={kpis['abandonRate']})")

    except ui.TemplateNotFound as e:
        print(f"  [TemplateNotFound] {e}")
        row["status"] = "failed"
    except KpiExtractError as e:
        print(f"  [KpiExtractError] {e}")
        row["status"] = "failed"
    except Exception as e:
        print(f"  [Unexpected] {e!r}")
        traceback.print_exc()
        row["status"] = "failed"

    return row


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="run only this scenario_id")
    ap.add_argument("--calibrate", action="store_true",
                    help="check templates and exit")
    ap.add_argument("--no-countdown", action="store_true",
                    help="skip the 3-second hands-off countdown")
    args = ap.parse_args()

    if args.calibrate:
        print("Calibrating templates...")
        ok = ui.calibrate(verbose=True)
        return 0 if ok else 1

    scenarios = load_scenarios()
    if args.only:
        scenarios = [s for s in scenarios if s["scenario_id"] == args.only]
        if not scenarios:
            print(f"No scenario with id {args.only!r}; check scenarios.csv")
            return 2

    print(f"About to run {len(scenarios)} scenario(s).")
    if not args.no_countdown:
        ui.countdown(3, "Lift your hands off the keyboard / mouse.")

    # Sanity check: input-side templates must all be visible right now.
    if not ui.calibrate(verbose=True):
        print("\nCalibration failed; aborting. Re-capture missing templates.")
        return 3

    # Full batch (no --only) overwrites; --only smoke test appends.
    ensure_results_file(fresh=args.only is None)
    ok_count, fail_count = 0, 0
    for s in scenarios:
        row = run_one_scenario(s)
        append_result(row)
        if row["status"] == "ok":
            ok_count += 1
        else:
            fail_count += 1

    print(f"\nDone. {ok_count} ok, {fail_count} failed. "
          f"Results: {RESULTS_CSV}")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
