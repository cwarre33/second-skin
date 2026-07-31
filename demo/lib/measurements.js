/**
 * Category-aware measurement templates for resale listings.
 *
 * Provides field definitions per garment type, formatting helpers,
 * and a lightweight canvas overlay generator for measurement photos.
 */

export const MEASUREMENT_CATEGORIES = {
  top: {
    label: "Top / Shirt",
    fields: [
      { key: "pit_to_pit", label: "Pit to pit" },
      { key: "length", label: "Length" },
      { key: "shoulder", label: "Shoulder" },
      { key: "sleeve", label: "Sleeve length" },
    ],
  },
  pants: {
    label: "Pants / Bottoms",
    fields: [
      { key: "waist", label: "Waist" },
      { key: "inseam", label: "Inseam" },
      { key: "rise", label: "Rise" },
      { key: "leg_opening", label: "Leg opening" },
    ],
  },
  dress: {
    label: "Dress / Jumpsuit",
    fields: [
      { key: "bust", label: "Bust" },
      { key: "waist", label: "Waist" },
      { key: "length", label: "Length" },
      { key: "hip", label: "Hip" },
    ],
  },
  shoes: {
    label: "Shoes",
    fields: [
      { key: "size", label: "Size" },
      { key: "insole", label: "Insole length" },
      { key: "width", label: "Width" },
    ],
  },
  bag: {
    label: "Bag / Accessory",
    fields: [
      { key: "width", label: "Width" },
      { key: "height", label: "Height" },
      { key: "depth", label: "Depth" },
      { key: "strap_drop", label: "Strap drop" },
    ],
  },
};

/**
 * Format a flat measurements paragraph from category + values.
 * Values should be an object keyed by field key with optional units.
 */
export function formatMeasurements(category, values = {}) {
  const config = MEASUREMENT_CATEGORIES[category];
  if (!config) return "";

  const lines = config.fields
    .map((field) => {
      const raw = values[field.key];
      if (!raw || String(raw).trim() === "") return null;
      return `${field.label}: ${String(raw).trim()}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return "";
  return lines.join(", ");
}

/**
 * Draw a simple measurement overlay image and return a base64 PNG data URL.
 * Safe to call only in a browser environment (uses document.createElement).
 */
export function drawMeasurementOverlay(category, values = {}) {
  if (typeof document === "undefined") return null;

  const config = MEASUREMENT_CATEGORIES[category];
  if (!config) return null;

  const width = 600;
  const height = 400;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Title
  ctx.fillStyle = "#111";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Measurements — ${config.label}`, 32, 56);

  // Lines
  ctx.fillStyle = "#444";
  ctx.font = "18px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";
  let y = 100;
  config.fields.forEach((field) => {
    const raw = values[field.key];
    if (!raw || String(raw).trim() === "") return;
    ctx.fillText(`${field.label}: ${String(raw).trim()}`, 32, y);
    y += 36;
  });

  // Footer
  ctx.fillStyle = "#777";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Measured flat. Compare to a similar item you own.", 32, height - 32);

  return canvas.toDataURL("image/png");
}
