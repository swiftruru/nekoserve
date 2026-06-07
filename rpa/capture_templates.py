"""
Interactive capture wizard for the 7 RPA UI template images.

macOS only. Each capture is: a dialog telling you what NekoServe
should look like, then the system crosshair (Cmd+Shift+4 style) for
you to drag the box. PNG drops into rpa/templates/ automatically.

Two modes:
- Terminal (TTY attached): uses stdin / stdout, prints colourful
  prompts.
- GUI (no TTY, e.g. spawned by NekoServe's main process): uses
  AppleScript `display dialog` so the user never has to touch a
  terminal. Triggered automatically when run from inside the Electron
  RPA modal.

Run directly:
    .venv/bin/python capture_templates.py

Or from NekoServe: 🤖 RPA modal -> 🖼 Capture templates button.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TPL_DIR = HERE / "templates"

GUI_MODE = not sys.stdin.isatty()


# (filename, what state NekoServe should be in, what to drag a box around)
STEPS: list[tuple[str, str, str]] = [
    (
        "about_tab",
        "Click 「⚙️ 模擬設定」 (or any tab other than ℹ️ 關於) so the "
        "About tab is in its UN-activated state.",
        "the 「ℹ️ 關於」 tab in the top nav (un-highlighted)",
    ),
    (
        "settings_tab",
        "Click any tab OTHER than 「⚙️ 模擬設定」 (e.g. 「ℹ️ 關於」) "
        "so the Settings tab is in its UN-activated state.",
        "the 「⚙️ 模擬設定」 tab in the top nav (the un-highlighted one)",
    ),
    (
        "preset_paper_weekday",
        "Navigate to the 「⚙️ 模擬設定」 page. Scroll to the top, find the "
        "「預設情境」 row.",
        "the 「論文樣本・平日白天」 preset button (NOT the Hirsch 2025 one)",
    ),
    (
        "cat_count_label",
        "Stay on Settings. Scroll to 「🏠 咖啡廳資源設定」.",
        "JUST the text 「貓咪數量」 (not the number input)",
    ),
    (
        "staff_count_label",
        "Same section, same page.",
        "JUST the text 「店員數量」 (not the number input)",
    ),
    (
        "run_button",
        "Scroll to the BOTTOM of Settings. Find the big orange Start button.",
        "the orange 「開始」 button (in its idle state, not while running)",
    ),
    (
        "results_tab_enabled",
        "Click 「開始」 once and let one simulation finish (5-30 seconds). "
        "The 「📊 統計結果」 tab will turn from grey to orange-bordered. "
        "DO NOT click it yet -- we want to capture it in this enabled-but-"
        "unselected state.",
        "the 「📊 統計結果」 tab in the top nav (now active)",
    ),
    (
        "export_csv_button",
        "Click into 「📊 統計結果」. Find the export button row near the top.",
        "the 「Export Metrics CSV」 button",
    ),
]


# ── osascript helpers ──────────────────────────────────────────

def _osa_escape(text: str) -> str:
    """Escape a Python string for embedding in an AppleScript literal."""
    return text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def gui_dialog(
    body: str,
    *,
    title: str = "NekoServe RPA Capture",
    buttons: tuple[str, ...] = ("Cancel", "OK"),
    default: str = "OK",
    timeout_s: int = 600,
) -> str | None:
    """Show a native macOS dialog. Returns the button text pressed, or
    None on Cancel / timeout.

    Long-running by default so the user can take their time setting
    NekoServe up between captures.

    Important: `cancel button "X"` is ONLY valid when "X" is in the
    buttons list. Setting `cancel button "Cancel"` while buttons are
    {Skip, OK} silently fires AppleScript error -50 ("Specified button
    does not exist"), the dialog never appears, and the script falls
    through as if the user dismissed it -- exactly the bug that made
    every capture get skipped on the first version of this wizard.
    """
    buttons_lit = "{" + ", ".join(f'"{b}"' for b in buttons) + "}"
    parts = [
        f'display dialog "{_osa_escape(body)}"',
        f'with title "{_osa_escape(title)}"',
        f'buttons {buttons_lit}',
        f'default button "{default}"',
    ]
    if "Cancel" in buttons:
        parts.append('cancel button "Cancel"')
    parts.append(f'giving up after {timeout_s}')
    script = " ".join(parts)
    proc = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        # Surface osascript errors loudly so they don't disappear into
        # a "silently skipped 7 captures" bug again.
        err = (proc.stderr or "").strip()
        if err:
            print(f"  ! osascript: {err}", file=sys.stderr)
        return None
    # stdout is like: "button returned:OK, gave up:false"
    out = (proc.stdout or "").strip()
    for chunk in out.split(", "):
        if chunk.startswith("button returned:"):
            return chunk.split(":", 1)[1]
    return None


# ── Prompt UI: TTY or GUI ──────────────────────────────────────

def prompt_proceed(name: str, state: str, what: str, *, idx: int, total: int) -> bool:
    """Show the per-step instructions and wait for the user to say go.
    Returns False if they want to skip / cancel this step."""
    if GUI_MODE:
        body = (
            f"[{idx}/{total}] {name}.png\n\n"
            f"Set NekoServe up:\n"
            f"{state}\n\n"
            f"Then click OK. The macOS crosshair will appear; drag a box "
            f"around:\n"
            f"{what}"
        )
        result = gui_dialog(body, buttons=("Skip", "OK"), default="OK")
        return result == "OK"
    # TTY
    print(f"\n  Set NekoServe up:")
    for line in state.split(". "):
        if line.strip():
            print(f"    - {line.strip().rstrip('.')}.")
    print(f"  Then drag a box around:")
    print(f"    {what}")
    print()
    try:
        raw = input("  Press Enter when ready (or type 'skip'): ").strip().lower()
    except EOFError:
        return False
    return raw != "skip"


def show_done(ok: int, skipped: int) -> None:
    msg = f"Done. {ok} captured, {skipped} skipped."
    if GUI_MODE:
        gui_dialog(msg, buttons=("OK",), default="OK", timeout_s=30)
    print(msg)


def show_error(msg: str) -> None:
    if GUI_MODE:
        gui_dialog(msg, buttons=("OK",), default="OK", timeout_s=30)
    print(msg, file=sys.stderr)


# ── Main ───────────────────────────────────────────────────────

def capture_one(name: str, state: str, what: str, *, idx: int, total: int) -> bool:
    target = TPL_DIR / f"{name}.png"
    # In GUI mode we silently overwrite; the user explicitly clicked
    # "capture templates" so they know what they're doing.
    if target.exists() and not GUI_MODE:
        try:
            raw = input(f"  {name}.png already exists. Re-capture? [y/N] ").strip().lower()
        except EOFError:
            raw = ""
        if raw not in ("y", "yes"):
            print(f"  kept existing {name}.png")
            return True

    print(f"\n[{idx}/{total}] {name}")
    if not prompt_proceed(name, state, what, idx=idx, total=total):
        print(f"  ⚠ skipped {name}.png")
        return False

    # `screencapture -i` opens the system crosshair. Pressing Esc aborts.
    proc = subprocess.run(
        ["screencapture", "-i", "-t", "png", str(target)],
        check=False,
    )
    if proc.returncode != 0 or not target.exists() or target.stat().st_size == 0:
        if target.exists() and target.stat().st_size == 0:
            target.unlink()
        print(f"  ⚠ no file saved for {name}.png")
        return False

    size_kb = target.stat().st_size // 1024
    print(f"  ✓ saved {name}.png ({size_kb} KB)")
    return True


def main() -> int:
    if sys.platform != "darwin":
        show_error("This wizard is macOS-only. See templates/README.md for "
                   "other platforms.")
        return 1
    if not shutil.which("screencapture"):
        show_error("`screencapture` not found on PATH (unexpected on macOS).")
        return 1

    TPL_DIR.mkdir(parents=True, exist_ok=True)

    if GUI_MODE:
        intro = (
            "NekoServe RPA template capture wizard\n\n"
            "You'll be guided through 7 captures. For each:\n"
            "  1. Set NekoServe up as instructed (switch tabs / scroll).\n"
            "  2. Click OK in the dialog.\n"
            "  3. Drag a rectangle around the UI element.\n\n"
            "Capture #6 needs you to click 「開始」 once and let one "
            "simulation finish first.\n\n"
            "Ready?"
        )
        if gui_dialog(intro, buttons=("Cancel", "Start"), default="Start") != "Start":
            print("cancelled before start")
            return 0
    else:
        print("NekoServe RPA template capture wizard")
        print("  - You'll drag 7 rectangles, one per UI element.")
        print("  - Press Esc inside the crosshair to skip a step.")

    ok, skipped = 0, 0
    for i, (name, state, what) in enumerate(STEPS, start=1):
        if capture_one(name, state, what, idx=i, total=len(STEPS)):
            ok += 1
        else:
            skipped += 1

    # Source-of-truth summary: scan the templates folder ourselves,
    # don't trust our own ok/skipped counters. If osascript silently
    # ate every dialog (the old bug), counters would say "ok!" but
    # the folder would still be empty. This catches that.
    expected = [f"{name}.png" for name, *_ in STEPS]
    present = [n for n in expected if (TPL_DIR / n).exists()]
    missing = [n for n in expected if not (TPL_DIR / n).exists()]
    print()
    print(f"Templates folder: {len(present)}/{len(expected)} present "
          f"({TPL_DIR})")
    if missing:
        print(f"  Still missing: {', '.join(missing)}")

    show_done(len(present), len(missing))

    # Non-zero exit when nothing got saved so the parent (NekoServe
    # main process) shows a clear failed status instead of a
    # misleading "templates captured" success message.
    return 0 if len(missing) == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
