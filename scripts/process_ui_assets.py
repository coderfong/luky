"""
Process raw UI assets in assets/ui/:
  1. Strip the duplicate `.png.png` extension.
  2. For background images: keep opaque, resize to spec.
  3. For card/button images: flood-fill the unwanted background (white or black)
     from each corner with a colour-distance tolerance so the design's interior
     stays intact, then trim transparent borders, then resize to spec.

Run from repo root:  python scripts/process_ui_assets.py
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "assets" / "ui"

# (filename_stem, target_w, target_h, mode)
#   mode = "bg"           : opaque, resize to fit (cover-ratio crop ok)
#          "white"        : flood-fill white from corners, trim, resize
#          "black"        : flood-fill black from corners, trim, resize
#          "passthrough"  : already has clean alpha — just trim and resize
ASSETS = [
    ("bg-app",                1242, 2688, "bg"),
    ("bg-draw",               1242, 2688, "bg"),
    ("bg-onboarding",         1242, 2688, "bg"),
    ("card-hero",             1050, 1500, "white"),
    ("card-surface",          1050,  900, "white"),
    ("card-premium",          1050, 1200, "white"),
    ("chip",                   600,  180, "white"),
    ("intention-cell",         360,  360, "passthrough"),
    ("intention-cell-active",  360,  360, "black"),
    ("count-btn",              180,  180, "passthrough"),
    ("count-btn-active",       180,  180, "white"),
    ("cta-gold",              1050,  240, "white"),
    ("cta-secondary",         1050,  240, "white"),
    ("time-box",               300,  300, "passthrough"),
]

WHITE_TOL = 28   # flood-fill stops when a pixel is more than this far from white
BLACK_TOL = 28


def colour_dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def flood_fill_transparent(img: Image.Image, target_rgb, tol: int) -> Image.Image:
    """BFS from each of the 4 corners. Any pixel within `tol` of `target_rgb`
    that is reachable from a corner via similar pixels becomes transparent.
    Interior pixels of the same colour are preserved (they're not corner-connected)."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    visited = bytearray(w * h)
    queue = deque()

    def maybe_seed(x, y):
        if 0 <= x < w and 0 <= y < h:
            r, g, b, _ = px[x, y]
            if colour_dist((r, g, b), target_rgb) <= tol:
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))

    for cx, cy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        maybe_seed(cx, cy)

    while queue:
        x, y = queue.popleft()
        # transparent
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    r, g, b, a = px[nx, ny]
                    if a > 0 and colour_dist((r, g, b), target_rgb) <= tol:
                        visited[idx] = 1
                        queue.append((nx, ny))
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    """Crop to the bounding box of any non-transparent pixels."""
    if img.mode != "RGBA":
        return img
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def resize_fit(img: Image.Image, w: int, h: int) -> Image.Image:
    """Preserve aspect; fit so the longer dimension matches its target."""
    sw, sh = img.size
    scale = min(w / sw, h / sh)
    new_w = max(1, round(sw * scale))
    new_h = max(1, round(sh * scale))
    return img.resize((new_w, new_h), Image.LANCZOS)


def resize_cover(img: Image.Image, w: int, h: int) -> Image.Image:
    """For backgrounds: scale to cover, then center-crop to exact size."""
    sw, sh = img.size
    scale = max(w / sw, h / sh)
    new_w = max(1, round(sw * scale))
    new_h = max(1, round(sh * scale))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    return img.crop((left, top, left + w, top + h))


def process_one(stem: str, w: int, h: int, mode: str):
    src = SRC / f"{stem}.png.png"
    if not src.exists():
        # Maybe already renamed
        src = SRC / f"{stem}.png"
        if not src.exists():
            print(f"  ! missing source for {stem}")
            return
    img = Image.open(src)

    if mode == "bg":
        img = img.convert("RGB")
        img = resize_cover(img, w, h)
    elif mode == "white":
        img = flood_fill_transparent(img, (255, 255, 255), WHITE_TOL)
        img = trim_alpha(img)
        img = resize_fit(img, w, h)
    elif mode == "black":
        img = flood_fill_transparent(img, (0, 0, 0), BLACK_TOL)
        img = trim_alpha(img)
        img = resize_fit(img, w, h)
    elif mode == "passthrough":
        img = img.convert("RGBA")
        img = trim_alpha(img)
        img = resize_fit(img, w, h)
    else:
        raise ValueError(mode)

    out = SRC / f"{stem}.png"
    img.save(out, optimize=True)

    # Remove the doubled-extension source if it was different from the output.
    if src != out and src.exists():
        src.unlink()

    print(f"  {stem:24s} -> {img.size[0]}x{img.size[1]} ({mode})")


def main():
    print(f"Processing {len(ASSETS)} assets in {SRC}")
    for spec in ASSETS:
        process_one(*spec)
    print("Done.")


if __name__ == "__main__":
    main()
