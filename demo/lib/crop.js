/**
 * Per-platform photo crop / aspect-ratio helpers (#44).
 *
 * Marketplaces display cover photos at different aspect ratios (Depop 1:1
 * square, Grailed 4:5 portrait). One crop does not fit all: a square crop of
 * a tall product shot wastes the garment, and a 4:5 crop of a wide flat-lay
 * chops the sides. This module computes the source sub-rectangle to draw for
 * a "cover" crop at a given aspect, with an adjustable offset along the
 * overflowing axis so the operator can choose what stays in frame.
 *
 * Pure math only — no canvas, no DOM — so it is unit-testable in Node.
 */

// Poshmark is out of scope for the current demo slice (CLAUDE.md: Grailed
// only), so only Depop and Grailed get crop variants here.
export const PLATFORM_ASPECTS = {
  depop: 1, // 1:1 square
  grailed: 4 / 5, // 4:5 portrait
};

export const PLATFORM_CROP_LABELS = {
  depop: "Depop · 1:1 square",
  grailed: "Grailed · 4:5 portrait",
};

export const CROP_PLATFORMS = Object.keys(PLATFORM_ASPECTS);

export function clampOffset(offset) {
  if (Number.isNaN(offset)) return 0.5;
  return Math.min(1, Math.max(0, offset));
}

/**
 * Largest source sub-rectangle with the given `aspect` (width/height) that
 * fits inside a source of srcW × srcH, positioned along the overflowing axis
 * by `offset` (0 = top/left, 0.5 = centered, 1 = bottom/right).
 *
 * Returns `{ sx, sy, sw, sh }` (source rect for drawImage) or null for a
 * degenerate source. When the source already matches the aspect exactly the
 * rect is the whole image and offset has no effect.
 */
export function computeCoverCrop(srcW, srcH, aspect, offset = 0.5) {
  if (!srcW || !srcH || !aspect) return null;
  const sourceAspect = srcW / srcH;
  const o = clampOffset(offset);

  let sw, sh, sx, sy;
  if (sourceAspect > aspect) {
    // Source is wider than the target → crop horizontally, height is full.
    sh = srcH;
    sw = srcH * aspect;
    sx = o * (srcW - sw);
    sy = 0;
  } else {
    // Source is taller than (or equal to) the target → crop vertically,
    // width is full.
    sw = srcW;
    sh = srcW / aspect;
    sx = 0;
    sy = o * (srcH - sh);
  }
  return { sx, sy, sw, sh };
}

// Default centered crop offset per platform, used when none is stored.
export function defaultCropOffsets() {
  const out = {};
  for (const p of CROP_PLATFORMS) out[p] = 0.5;
  return out;
}

// CommonJS shim for the Node test runner.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLATFORM_ASPECTS,
    PLATFORM_CROP_LABELS,
    CROP_PLATFORMS,
    clampOffset,
    computeCoverCrop,
    defaultCropOffsets,
  };
}