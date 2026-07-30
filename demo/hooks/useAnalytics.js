import { useCallback } from "react";

/**
 * Minimal analytics hook for the public demo.
 *
 * Events are emitted to the data layer if `window.gtag` or `window.goatcounter`
 * are configured, otherwise they are no-ops. Account setup is handled in
 * issue #9; this hook just provides the wiring.
 */
export function useAnalytics() {
  const track = useCallback((eventName, params = {}) => {
    if (typeof window === "undefined") return;

    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
      }
      if (typeof window.goatcounter?.count === "function") {
        window.goatcounter.count({ path: params.path || eventName, event: true });
      }
    } catch (err) {
      // Analytics must never break the demo.
      console.warn("[analytics] track failed:", err);
    }
  }, []);

  return { track };
}
