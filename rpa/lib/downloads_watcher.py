"""
Watch ~/Downloads for the most recent `nekoserve-metrics-*.csv` file.

NekoServe exports via the browser blob -> <a download> path, so files
just appear in the Downloads folder without a save dialog. The bot
clicks Export, then waits for a new file to show up.

We don't use watchdog; a simple poll is enough for the cadence here
(~one new file every minute) and keeps the dep list small.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

DOWNLOADS = Path.home() / "Downloads"
PREFIX = "nekoserve-metrics-"
SUFFIX = ".csv"


def list_metrics_files() -> list[Path]:
    if not DOWNLOADS.is_dir():
        return []
    return sorted(
        (p for p in DOWNLOADS.iterdir()
         if p.name.startswith(PREFIX) and p.name.endswith(SUFFIX)),
        key=lambda p: p.stat().st_mtime,
    )


def latest_metrics_file() -> Path | None:
    files = list_metrics_files()
    return files[-1] if files else None


def snapshot_existing() -> set[Path]:
    """Take a snapshot of existing metrics files. Use this *before*
    clicking Export, so wait_for_new_metrics() can tell what's new."""
    return set(list_metrics_files())


def wait_for_new_metrics(
    before: set[Path],
    *,
    timeout_s: float = 30.0,
    poll_s: float = 0.3,
) -> Path | None:
    """Block until a Downloads file appears that wasn't in `before`.

    Returns the new file's Path, or None on timeout.

    Why poll mtime rather than fire on first-detection: the browser
    writes the file in two steps (create empty -> write contents), so
    a tight detector can pick the file up before it has any bytes. We
    wait until size is stable across two consecutive polls before
    returning.
    """
    deadline = time.time() + timeout_s
    candidate: Path | None = None
    last_size = -1
    while time.time() < deadline:
        now = set(list_metrics_files())
        new_ones = sorted(now - before, key=lambda p: p.stat().st_mtime)
        if new_ones:
            candidate = new_ones[-1]
            try:
                cur_size = candidate.stat().st_size
            except FileNotFoundError:
                cur_size = -1
            if cur_size > 0 and cur_size == last_size:
                return candidate
            last_size = cur_size
        time.sleep(poll_s)
    return candidate  # may be None or may be a still-growing file
