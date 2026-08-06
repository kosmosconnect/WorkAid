"""
Removes the generator's sparkle watermark from assets/img by cropping.

Every frame produced by the image tool carries a solid four-pointed star stamped
at a fixed inset — centred about 102px from the right edge and 102px from the
bottom, roughly 46px across — regardless of subject. It is in the same place on
every image, so no detection is needed.

Cropping, not inpainting. Inpainting the patch leaves a soft blurred square that
is more conspicuous than the watermark on any textured surface (wood grain,
paving, marble). Trimming the bottom edge past the mark is lossless for the rest
of the frame, and the site's containers use object-fit: cover, so a changed
aspect ratio costs nothing.

Run once:  python tools/remove_watermark.py
NOT idempotent — each run trims another strip. Restore from git before re-running.
"""

import glob
import os

from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(HERE, "assets", "img")

# The mark's outer edge reaches ~136px from the bottom. Trim past it with margin.
TRIM = 155


def clean(path):
    im = Image.open(path)
    w, h = im.size
    scale = max(w, h) / 1200.0
    trim = int(round(TRIM * scale))
    if h - trim < 200:
        print("skipped (too small)", os.path.basename(path))
        return False
    im.crop((0, 0, w, h - trim)).save(path, "JPEG", quality=86,
                                      optimize=True, progressive=True)
    return True


if __name__ == "__main__":
    n = 0
    for f in sorted(glob.glob(os.path.join(IMG, "*.jpg"))):
        if clean(f):
            n += 1
    print(n, "images cropped")
