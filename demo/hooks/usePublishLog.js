import { useState } from "react";

const MAX_ENTRIES = 50;

/**
 * In-memory log of per-listing publish outcomes (success/failure) across
 * platforms. Kept in component state — intentionally not persisted, since it is
 * a transient "what just happened" surface, not inventory of record.
 *
 * Extracted from demo/pages/index.js (#6 structure cleanup) without behavior
 * change: entries are newest-first, capped at MAX_ENTRIES.
 */
export function usePublishLog() {
  const [publishLog, setPublishLog] = useState([]);

  const logPublish = (item, platform, status, error = "") => {
    const ts = Date.now();
    setPublishLog((prev) => [
      {
        id: `${item.id}-${platform}-${ts}`,
        listingId: item.id,
        title: item.title || "Untitled",
        platform,
        status,
        error,
        ts,
      },
      ...prev.slice(0, MAX_ENTRIES - 1),
    ]);
  };

  const clearPublishLog = () => setPublishLog([]);

  return { publishLog, logPublish, clearPublishLog };
}