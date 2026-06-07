"""
Thin wrappers around pyautogui that match how this bot drives NekoServe.

Why a wrapper layer:
- pyautogui's locateOnScreen returns None on miss (silently); we want a
  loud failure with the missing template name so demo-day debugging is
  one read away.
- Every UI action needs the NekoServe window in front first, otherwise
  clicks land on whatever else is focused. activate_window() is called
  in front of every action that costs a click or a keystroke.
- Field editing uses "find a label image, click to the right of it",
  not raw pixel coords. Layouts shift across resolutions; labels are
  stable relative to their own input.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import pyautogui

try:
    import pygetwindow as gw
except ImportError:
    gw = None  # noqa: optional, we fall back to a manual focus reminder

# Where the templates live, relative to this file.
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# Image match confidence. 0.9 is strict, 0.8 more forgiving.
# 0.8 absorbs anti-aliasing + sub-pixel differences between the
# Retina capture (via webContents.capturePage) and what `screencapture`
# later snaps off the screen.
DEFAULT_CONFIDENCE = 0.8

# How many extra times to retry locateOnScreen on a miss, and how long
# to sleep between attempts. Helps with transient screen state (the
# RPA modal finishing its hide animation, focus animations, etc.).
LOCATE_RETRIES = 3
LOCATE_RETRY_DELAY = 0.4

# A small pause baked into every pyautogui action so the UI has time
# to react before the next action lands.
pyautogui.PAUSE = 0.15
# Failsafe: slamming the mouse into the top-left corner aborts the bot.
pyautogui.FAILSAFE = True


@dataclass
class Template:
    name: str  # e.g. "run_button"
    confidence: float = DEFAULT_CONFIDENCE

    @property
    def path(self) -> Path:
        return TEMPLATES_DIR / f"{self.name}.png"


# The 8 templates the bot needs, in the order the bot uses them.
# about_tab is a state-reset waypoint: each scenario detours through
# About first so that settings_tab is always in its un-activated form
# when the bot looks for it. Without this, scenario N ending on Settings
# leaves settings_tab in the orange-underlined "active" state which
# doesn't match our un-active capture.
ALL_TEMPLATES: list[Template] = [
    Template("about_tab"),
    Template("settings_tab"),
    Template("preset_paper_weekday"),
    Template("cat_count_label"),
    Template("staff_count_label"),
    Template("run_button"),
    Template("results_tab_enabled"),
    Template("export_csv_button"),
]


class TemplateNotFound(RuntimeError):
    pass


def activate_window(title_contains: str = "NekoServe") -> None:
    """Bring the NekoServe window to the front.

    macOS strategy:
      1. If launched by NekoServe (spawn'd from Electron main process),
         os.getppid() is the NekoServe main process PID. Use System
         Events to set frontmost by PID. This avoids the AppleScript
         name-lookup trap where `tell application "Electron" to activate`
         would launch some unrelated Electron-based app installed on
         the same machine.
      2. Fall back to `tell application "NekoServe"` for packaged builds
         where the bundle is registered under that name. We never fall
         back to "Electron" -- too easy to hit the wrong app.
      3. If both fail silently, that's fine: when the user clicks the
         RPA button inside NekoServe, NekoServe is already frontmost,
         and pyautogui's screen-relative clicks still hit it.

    Other platforms: best-effort pygetwindow, silent on failure.
    """
    if sys.platform == "darwin":
        parent_pid = os.getppid()
        # Activate by PID via System Events. This is exact; no name
        # collisions possible.
        script = (
            f'tell application "System Events" to '
            f'set frontmost of (first process whose unix id is {parent_pid}) to true'
        )
        try:
            subprocess.run(
                ["osascript", "-e", script],
                check=False, capture_output=True, timeout=1.5,
            )
        except Exception:
            pass
        # No name-based fallback on purpose: `tell application "X" to
        # activate` will LAUNCH X if it's not running, which is how the
        # previous version accidentally fired up an unrelated Electron
        # app. Better to silently no-op; the user is already inside
        # NekoServe when they trigger this anyway.

        time.sleep(0.15)
        return

    if gw is None or not hasattr(gw, "getAllWindows"):
        # Windows / Linux without pygetwindow installed properly; the
        # user has to keep NekoServe focused themselves.
        return
    try:
        wins = [w for w in gw.getAllWindows() if title_contains in (w.title or "")]
        if not wins:
            return
        w = wins[0]
        if w.isMinimized:
            w.restore()
        w.activate()
        time.sleep(0.2)
    except Exception:
        # pygetwindow throws all sorts of platform-specific errors.
        # Don't crash; just keep going.
        pass


def _locate_once(template: Template) -> tuple[int, int] | None:
    """One locate attempt. Translates pyautogui's mixed exception
    + None return types into a single tidy return."""
    try:
        box = pyautogui.locateOnScreen(
            str(template.path),
            confidence=template.confidence,
            grayscale=False,
        )
    except pyautogui.ImageNotFoundException:
        return None
    if box is None:
        return None
    return pyautogui.center(box)


def locate(template: Template, *, retries: int = LOCATE_RETRIES) -> tuple[int, int] | None:
    """Locate a template on screen, return its centre, or None on miss
    AFTER `retries` extra attempts spaced LOCATE_RETRY_DELAY apart.

    Why retry: screen state can wobble for ~half a second after the
    RPA modal animates out, after osascript activates the window, or
    after macOS draws focus rings. A single miss is normal; a miss
    after 3 retries is a real problem.

    Set retries=0 for calibrate-style "current frame only" probes.
    """
    if not template.path.is_file():
        raise TemplateNotFound(
            f"Template file missing: {template.path}. "
            f"Capture it via the 🤖 RPA modal -> Smart capture."
        )
    pt = _locate_once(template)
    if pt is not None:
        return pt
    for _ in range(retries):
        time.sleep(LOCATE_RETRY_DELAY)
        pt = _locate_once(template)
        if pt is not None:
            return pt
    return None


def save_debug_screenshot(reason: str) -> Path | None:
    """Dump the current screen to disk so the user can see what bot.py
    sees at the moment of failure. Most common cause is "wrong page on
    screen" or "modal still up" -- the screenshot tells us instantly.

    macOS: shell out to the system `screencapture` directly rather
    than going through pyautogui.screenshot, because the latter
    silently swallows permission errors when bot.py is spawned by
    Electron (different bundle = different Screen Recording grant).
    `screencapture` failures print to stderr and return non-zero,
    which we surface here.

    Lives at rpa/output/debug-<reason>-<ts>.png so they don't
    clobber each other across runs.
    """
    out = TEMPLATES_DIR.parent / "output"
    out.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    target = out / f"debug-{reason}-{ts}.png"

    if sys.platform == "darwin":
        # -x: no sound. -t png: force png format. -C: include cursor.
        proc = subprocess.run(
            ["screencapture", "-x", "-C", "-t", "png", str(target)],
            check=False, capture_output=True, text=True,
        )
        if proc.returncode != 0:
            err = (proc.stderr or "").strip() or f"exit code {proc.returncode}"
            print(f"  ! debug screenshot failed via screencapture: {err}")
            return None
        if not target.is_file() or target.stat().st_size == 0:
            print("  ! debug screenshot file empty -- "
                  "macOS Screen Recording permission may be denied for Electron. "
                  "Open System Settings -> Privacy & Security -> Screen Recording "
                  "and grant access to Electron / NekoServe.")
            if target.exists():
                target.unlink()
            return None
        return target

    # Other platforms: fall back to pyautogui.
    try:
        pyautogui.screenshot(str(target))
        if not target.is_file() or target.stat().st_size == 0:
            return None
        return target
    except Exception as e:
        print(f"  ! debug screenshot failed: {e!r}")
        return None


def require(template: Template) -> tuple[int, int]:
    """Locate or raise. Use when missing the element means the bot can't
    proceed for this scenario. On miss, dumps a debug screenshot so
    the user can see what bot.py actually sees on the screen at the
    moment of failure (the most common cause is "wrong page on screen"
    or "modal still up")."""
    p = locate(template)
    if p is None:
        shot = save_debug_screenshot(f"miss-{template.name}")
        hint = f" Saved current screen to {shot}" if shot else ""
        raise TemplateNotFound(
            f"Could not see '{template.name}' on screen after "
            f"{LOCATE_RETRIES + 1} tries.{hint}"
        )
    return p


def click_template(template: Template, *, dx: int = 0, dy: int = 0) -> None:
    """Find a template, click its centre (plus optional offset).

    The offset is how we click "the input to the right of the label":
    find the label, then click at (label_x + dx, label_y + dy).
    """
    activate_window()
    x, y = require(template)
    pyautogui.click(x + dx, y + dy)
    time.sleep(0.1)


def type_value_after_label(
    label: Template, value: float | int, *, dx: int = 140, dy: int = 0
) -> None:
    """Click into the input that sits to the right of `label`, clear it,
    and type the new value.

    dx=140 is a reasonable default for NekoServe Settings page on a
    1440-wide window: labels and inputs are inside the same row, the
    label width is ~110px plus ~30px gap. If demo machine has a
    different layout, tune dx in scenarios where it matters.
    """
    activate_window()
    x, y = require(label)
    target = (x + dx, y + dy)
    # Triple-click to select existing number; some browsers treat it as
    # word-select but for a numeric input it grabs the whole value.
    pyautogui.click(target)
    time.sleep(0.08)
    pyautogui.click(target)
    time.sleep(0.05)
    pyautogui.click(target)
    time.sleep(0.05)
    # Belt-and-braces: also Cmd+A in case triple-click didn't catch.
    pyautogui.hotkey("command", "a")
    time.sleep(0.05)
    pyautogui.typewrite(str(value), interval=0.04)
    # Tab off the field to commit (NekoServe number inputs commit on blur).
    pyautogui.press("tab")
    time.sleep(0.1)


def force_scroll_to_top() -> None:
    """Belt-and-braces: nudge the scroll back to the top of the page.

    NekoServe should already reset its <main>'s scrollTop on tab change
    (an App.tsx useEffect does this). This is a safety net in case the
    timing is off, in case the bot is driving an older build, or just
    out of paranoia. Either way, an extra scroll-up at the page TOP is
    a no-op.

    We move the mouse over NekoServe's content first so the scroll
    events land on the right target, then send Cmd+Up (macOS scroll-
    to-top in most apps) followed by a flurry of mouse-wheel ticks.
    """
    activate_window()
    time.sleep(0.1)
    w, h = pyautogui.size()
    pyautogui.moveTo(w // 2, h // 2)
    time.sleep(0.05)
    if sys.platform == "darwin":
        pyautogui.hotkey("command", "up")
        time.sleep(0.15)
    else:
        pyautogui.press("home")
        time.sleep(0.1)
    # Mouse-wheel safety net regardless of OS.
    for _ in range(20):
        pyautogui.scroll(8)
        time.sleep(0.01)
    time.sleep(0.25)


def best_effort_navigate_to_about() -> None:
    """Click the About nav tab if it's visible in un-active state.

    This is the bot's "reset to known page" move at the start of each
    scenario. After running a scenario the bot is left on Results
    page; clicking About from there lands us on About, which means
    settings_tab on the next scenario click will be in its un-active
    form (matching our template).

    No-op if `about_tab` can't be located: either we're already on
    About (tab is active, template doesn't match) or NekoServe is in
    an unexpected state. Either way, the subsequent settings_tab
    require() will surface a clearer error than us throwing here.
    """
    activate_window()
    time.sleep(0.2)
    try:
        pt = locate(Template("about_tab"), retries=1)
    except TemplateNotFound:
        # PNG file genuinely missing; skip silently so the per-scenario
        # require(settings_tab) is the loud failure point.
        return
    if pt is None:
        return  # not visible -- probably already on About
    pyautogui.click(*pt)
    time.sleep(0.6)


def wait_for(template: Template, *, timeout_s: float = 90.0, poll_s: float = 0.5) -> bool:
    """Poll until the template is on screen, or timeout. Returns True on
    success, False on timeout. Doesn't raise -- the caller decides whether
    a timeout is a hard fail or a "skip this scenario" soft fail.

    retries=0 on the inner locate: wait_for IS the retry loop, no point
    nesting another."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if locate(template, retries=0) is not None:
            return True
        time.sleep(poll_s)
    return False


def calibrate(*, verbose: bool = True) -> bool:
    """Pre-flight check before the bot drives the UI.

    Two-stage strategy:

    1. **Files exist.** All 7 template PNGs must be on disk and non-empty.
       This is the hard requirement -- without these files, locateOnScreen
       has nothing to look for.

    2. **Pipeline works.** AT LEAST ONE input-side template must be
       locatable on screen right now. We don't require ALL of them because
       the templates live on DIFFERENT pages (preset is on Settings,
       results_tab is on Results, etc.) -- you literally can't see them
       at the same time. One successful match proves DPI / theme /
       window scale all line up; the bot will find the others when it
       navigates to their pages.

    Returns True iff both stages pass. Verbose mode prints why on
    failure so the user knows whether to re-capture or just navigate.
    """
    activate_window()
    time.sleep(0.5)

    # ── Stage 1: file existence ────────────────────────────────
    missing_files: list[str] = []
    for tpl in ALL_TEMPLATES:
        if not tpl.path.is_file() or tpl.path.stat().st_size == 0:
            missing_files.append(tpl.name)
    if missing_files:
        if verbose:
            for n in missing_files:
                p = next(t.path for t in ALL_TEMPLATES if t.name == n)
                print(f"  [FAIL] {n}: PNG missing or empty at {p}")
            print()
            print(
                "Capture templates first: open NekoServe -> 🤖 RPA -> "
                "click the green 'Smart capture' button."
            )
        return False

    # ── Stage 2: locate at least one input-side template ──────
    input_side = {
        "about_tab", "settings_tab", "preset_paper_weekday",
        "cat_count_label", "staff_count_label", "run_button",
    }
    any_found = False
    for tpl in ALL_TEMPLATES:
        if tpl.name not in input_side:
            continue
        # retries=0: calibrate is a snapshot probe, not a patient look.
        # The bot's per-step require() does the patient version.
        pt = locate(tpl, retries=0)
        if pt is not None:
            any_found = True
            if verbose:
                print(f"  [ ok ] {tpl.name}: found at {pt}")
        else:
            if verbose:
                print(f"  [----] {tpl.name}: not on this page (the bot will "
                      f"navigate to it during the run)")

    if verbose:
        for tpl in ALL_TEMPLATES:
            if tpl.name in input_side:
                continue
            # results_tab_enabled and export_csv_button -- only show up
            # after a simulation finishes. Don't try to locate them at
            # calibrate; just confirm the file is on disk.
            print(f"  [file] {tpl.name}: PNG present "
                  f"({tpl.path.stat().st_size} bytes); checked at run-time")

    if not any_found:
        if verbose:
            print()
            print(
                "Couldn't locate ANY input-side template on the current "
                "screen. Likely causes: wrong DPI / scale, theme switched "
                "since capture, window resized, or NekoServe is hidden "
                "behind another app. Re-capture templates and try again."
            )
        return False

    if verbose:
        print()
        print("OK. At least one template matched -- the pipeline is sound.")
    return True


def countdown(seconds: int, msg: str) -> None:
    """Print a small countdown so the user has time to lift hands off
    the keyboard before the bot grabs the screen."""
    print(msg)
    for i in range(seconds, 0, -1):
        sys.stdout.write(f"  starting in {i}...\r")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write(" " * 40 + "\r")
    sys.stdout.flush()
