# NekoServe cursor sprites

Custom in-window cursor sprites used by
[`components/CustomCursor.tsx`](../../components/CustomCursor.tsx).

## Files

| File | Size | Purpose |
| --- | --- | --- |
| `neko-paw-arrow.png` | 48 x 48 | Default cursor. Pixel-art arrow with clear top-left tip. |
| `neko-paw-arrow-hover.png` | 64 x 64 | Hover cursor. Cute tabby cat holding a paw-print coffee cup. |
| `_source/paw-arrow-source-*.png` | 1000 x 903 | Archived original from Gemini. Not bundled by Vite. |

## Naming convention

`{theme}-{shape}[-{state}].png`, where:

- `theme` groups related sprites (`neko-paw`, future: `cream-cup`, `minimal`, etc.)
- `shape` is the silhouette family (`arrow`, `paw`, `cup`)
- `state` is optional (`hover`, `pressed`)

To add a new theme: drop sprites under this folder, add an entry to the
`THEMES` record in `components/CustomCursor.tsx`, and optionally flip
`ACTIVE_THEME` to preview it.

## Hotspot policy

The **hotspot** is the offset (in display-CSS-pixel space) from the
sprite's top-left corner to the exact point that should align with the
operating-system click coordinate. Rendering a custom cursor without
handling the hotspot is the classic "looks like it's pointing here but
clicks over there" bug.

### Current values

| Sprite | Display size | Hotspot | Reasoning |
| --- | --- | --- | --- |
| `neko-paw-arrow.png` | 48 x 48 | `(0, 0)` | Tight-bounding-box crop places the pixel-art arrow tip at the exact top-left opaque pixel. The click coordinate **is** the tip of the arrow. |
| `neko-paw-arrow-hover.png` | 64 x 64 | `(0, 0)` | Same tight bbox. The topmost-leftmost opaque pixel is the left-ear tip, which serves as a visually pointy anchor. Matching the arrow's `(0, 0)` means the click point does not jump when the sprite swaps on hover. |

### How the hotspots were measured

The source image was cropped with Pillow's `Image.getbbox()`, which
returns the minimal axis-aligned bounding box of the non-transparent
region. After that crop the sprite's top-left corner is literally the
topmost-leftmost opaque pixel, so `(0, 0)` is the tip by construction.
For non-pixel-art sprites you would normally eyeball the visual tip and
measure it in an image editor.

### Changing sprites

If you replace `neko-paw-arrow.png` with a different shape, verify the
hotspot before shipping:

1. Run `npm run dev`
2. Hover a known button (e.g. `Run simulation`)
3. Click on the button's **edge** (the pixel 1 px inside the border)
4. If the click fires, the hotspot is accurate
5. If it misses, open the sprite in an image editor, find the pixel
   that **should** be the click point, and update `HOTSPOT` in the
   theme entry inside `CustomCursor.tsx`

Hotspots must use display pixels (after CSS resize), not source pixels.
When display size is N and source size is M, a source-pixel offset
`(sx, sy)` translates to `(sx * N / M, sy * N / M)` in hotspot space.
