/**
 * Saved listing templates / brand defaults for the demo form.
 *
 * Stored in localStorage separately from inventory. Templates capture
 * reusable field values (condition, flaws, measurements, tags, optimizeFor)
 * but not item-specific data like title, description, price, or images.
 */

const STORAGE_KEY = "second-skin-templates";

export function loadTemplates() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function createTemplate(name, draft) {
  return {
    id: `tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled template",
    createdAt: new Date().toISOString(),
    fields: {
      condition: draft.condition || "",
      flaws: Array.isArray(draft.flaws) ? draft.flaws : [],
      measurements: draft.measurements || "",
      tags: typeof draft.tags === "string" ? draft.tags : draft.tags?.join(", ") || "",
      optimizeFor: draft.optimizeFor || "grailed",
    },
  };
}

export function applyTemplate(template, setters) {
  if (!template?.fields) return;
  const { fields } = template;
  if (fields.condition !== undefined) setters.setCondition(fields.condition);
  if (fields.flaws !== undefined) setters.setFlaws(fields.flaws);
  if (fields.measurements !== undefined) setters.setMeasurements(fields.measurements);
  if (fields.tags !== undefined) setters.setTags(fields.tags);
  if (fields.optimizeFor !== undefined) setters.setOptimizeFor(fields.optimizeFor);
}
