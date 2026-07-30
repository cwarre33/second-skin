import { useCallback, useEffect } from "react";

const GOATCOUNTER_CODE = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE || null;
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || null;

/**
 * Minimal analytics hook for the public demo.
 *
 * Emits events to GoatCounter and Microsoft Clarity if configured.
 * Account setup is issue #9; this hook provides the wiring.
 */
export function useAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    loadGoatCounter();
    loadClarity();
  }, []);

  const track = useCallback((eventName, params = {}) => {
    if (typeof window === "undefined") return;

    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
      }
      if (typeof window.goatcounter?.count === "function") {
        window.goatcounter.count({ path: params.path || eventName, event: true });
      }
      if (typeof window.clarity === "function") {
        window.clarity("event", eventName, params);
      }
    } catch (err) {
      // Analytics must never break the demo.
      console.warn("[analytics] track failed:", err);
    }
  }, []);

  return { track };
}

function loadGoatCounter() {
  if (!GOATCOUNTER_CODE || document.getElementById("goatcounter-script")) return;
  if (typeof window === "undefined") return;

  const script = document.createElement("script");
  script.id = "goatcounter-script";
  script.setAttribute("data-goatcounter", `https://${GOATCOUNTER_CODE}.goatcounter.com/count`);
  script.src = "//gc.zgo.at/count.js";
  script.async = true;
  document.body.appendChild(script);
}

function loadClarity() {
  if (!CLARITY_PROJECT_ID || document.getElementById("clarity-script")) return;
  if (typeof window === "undefined") return;

  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.id = "clarity-script";
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
}
