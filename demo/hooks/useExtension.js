import { useCallback, useEffect, useState } from "react";

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || null;
const DEMO_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

/**
 * Detect the Second Skin Chrome extension and send bridge messages.
 *
 * Issue #28 scaffolds the hook; issue #30 locks down externally_connectable
 * origins and message types (PING, PARSE_DEPOP, AUTOFILL_GRAILED).
 */
export function useExtension() {
  const [status, setStatus] = useState("unknown");

  useEffect(() => {
    if (typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
      setStatus("missing");
      return;
    }

    ping().then((ok) => setStatus(ok ? "ready" : "missing")).catch(() => {
      setStatus("missing");
    });
  }, []);

  const send = useCallback(async (message) => {
    if (typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
      return { ok: false, error: "Extension bridge not available" };
    }

    return new Promise((resolve) => {
      const target = EXTENSION_ID || undefined;
      window.chrome.runtime.sendMessage(
        target,
        { origin: DEMO_ORIGIN, ...message },
        (response) => {
          if (window.chrome.runtime.lastError) {
            resolve({
              ok: false,
              error: window.chrome.runtime.lastError.message,
            });
          } else {
            resolve(response || { ok: true });
          }
        }
      );
    });
  }, []);

  const ping = useCallback(async () => {
    const result = await send({ type: "PING" });
    return result?.ok === true;
  }, [send]);

  const parseDepop = useCallback(
    async (url) => send({ type: "PARSE_DEPOP", url }),
    [send]
  );

  const autofillGrailed = useCallback(
    async (job) => send({ type: "AUTOFILL_GRAILED", job }),
    [send]
  );

  return { status, ping, send, parseDepop, autofillGrailed };
}
