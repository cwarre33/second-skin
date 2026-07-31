import { useEffect, useState } from "react";

const STORAGE_KEY = "second_skin_draft";
const SAVE_DELAY_MS = 600;

/**
 * Persist and restore an in-progress listing draft.
 *
 * This only covers the demo form. It does not replace explicit inventory saves;
 * it protects against accidental refresh/close while a user is typing.
 */
export function useDraftAutosave(draft) {
  const [restored, setRestored] = useState(false);

  // Restore once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.title?.trim() || saved?.description?.trim()) {
        draft.restore(saved);
      }
    } catch (err) {
      console.warn("[Second Skin] Failed to restore draft:", err);
    } finally {
      setRestored(true);
    }
  }, []);

  // Persist as the draft changes.
  useEffect(() => {
    if (typeof window === "undefined" || !restored) return;
    if (!draft.hasContent()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft.snapshot()));
      } catch (err) {
        console.warn("[Second Skin] Draft autosave failed:", err);
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft.snapshot, restored]);

  return { restored, clear: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } };
}
