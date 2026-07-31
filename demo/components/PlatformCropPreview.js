// PlatformCropPreview.js — per-platform cover-crop preview (#44)
//
// Renders one uploaded photo cropped to a platform's display aspect ratio
// (Depop 1:1, Grailed 4:5) on a <canvas>, with a slider so the operator can
// adjust where the crop falls along the overflowing axis. Pure presentational
// component; crop math lives in @/lib/crop.

import { useEffect, useRef } from "react";
import { PLATFORM_ASPECTS, PLATFORM_CROP_LABELS, computeCoverCrop } from "@/lib/crop";

const CANVAS_W = 480; // long-edge pixel budget; height derives from aspect.

export default function PlatformCropPreview({ src, platform, offset, onOffsetChange }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const aspect = PLATFORM_ASPECTS[platform];
  const canvasW = CANVAS_W;
  const canvasH = Math.round(CANVAS_W / aspect);

  // Draw the cover-crop whenever the source or offset changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src || !aspect) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // no 2d context (e.g. jsdom) — silently skip.

    const img = imgRef.current || new Image();
    imgRef.current = img;
    img.onload = () => {
      const rect = computeCoverCrop(img.naturalWidth, img.naturalHeight, aspect, offset);
      if (!rect) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
    };
    // If the image is already cached, onload may not fire — draw immediately.
    if (img.src !== src) {
      img.src = src;
    } else if (img.complete && img.naturalWidth) {
      img.onload();
    }
  }, [src, aspect, offset]);

  if (!src || !aspect) return null;

  return (
    <div className="platformCrop">
      <div className="platformCropLabel">{PLATFORM_CROP_LABELS[platform]}</div>
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="platformCropCanvas"
        role="img"
        aria-label={`${platform} crop preview`}
      />
      <label className="platformCropSlider">
        <span className="platformCropSliderLabel">Crop position</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={offset}
          onChange={(e) => onOffsetChange(platform, parseFloat(e.target.value))}
          aria-label={`Crop position for ${platform}`}
        />
      </label>
    </div>
  );
}