"""
30-second proof that pyautogui actually drives the mouse.

Doesn't click, doesn't type, doesn't touch NekoServe. Just makes the
cursor move on its own so you can see the RPA mechanism is real.

bot.py does the same thing, except instead of drawing shapes it
clicks the Settings tab, types numbers into the cat/staff fields,
clicks Run, waits for the result, clicks Export CSV. Across 12
scenarios. Hands-off.

Run:
    .venv/bin/python demo_wiggle.py
"""

from __future__ import annotations

import math
import time

import pyautogui

# Safety: slam the mouse into the top-left corner to abort.
pyautogui.FAILSAFE = True


def countdown(n: int) -> None:
    for i in range(n, 0, -1):
        print(f"  starting in {i}...")
        time.sleep(1)


def square(center_x: int, center_y: int, side: int, duration: float) -> None:
    """Draw a square with the mouse, ending where it started."""
    half = side // 2
    corners = [
        (center_x - half, center_y - half),
        (center_x + half, center_y - half),
        (center_x + half, center_y + half),
        (center_x - half, center_y + half),
        (center_x - half, center_y - half),
    ]
    for x, y in corners:
        pyautogui.moveTo(x, y, duration=duration)


def spiral(center_x: int, center_y: int, max_radius: int, steps: int) -> None:
    """Inward spiral, just to show smooth motion."""
    for i in range(steps):
        t = i / steps
        r = max_radius * (1 - t)
        angle = t * 4 * math.pi
        x = center_x + r * math.cos(angle)
        y = center_y + r * math.sin(angle)
        pyautogui.moveTo(int(x), int(y), duration=0.02)


def main() -> None:
    w, h = pyautogui.size()
    cx, cy = w // 2, h // 2
    print(f"Screen: {w}x{h}, centre {cx},{cy}")
    print()
    print("In 3 seconds your mouse will start moving on its own.")
    print("It will NOT click anything. Move it to the top-left corner")
    print("at any time to abort.")
    print()
    start_pos = pyautogui.position()
    countdown(3)

    print("  drawing a square...")
    square(cx, cy, side=400, duration=0.6)

    print("  drawing a spiral...")
    spiral(cx, cy, max_radius=300, steps=160)

    print("  returning the cursor to where you left it...")
    pyautogui.moveTo(*start_pos, duration=0.5)
    print()
    print("That was pyautogui. bot.py uses the same mechanism, except it")
    print("clicks the right NekoServe buttons instead of drawing shapes.")


if __name__ == "__main__":
    main()
