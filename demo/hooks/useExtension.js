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

  const [lastError, setLastError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
      setStatus("missing");
      return;
    }

    ping().then((ok) => setStatus(ok ? "ready" : "missing")).catch((err) => {
      setLastError(err?.message || "Ping failed");
      setStatus("missing");
    });
  }, []);

  const send = useCallback(async (message) => {
    if (typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
      const err = "Extension bridge not available";
      setLastError(err);
      return { ok: false, error: err };
    }

    if (!EXTENSION_ID) {
      const err = "Extension ID not configured. Set NEXT_PUBLIC_EXTENSION_ID in demo/.env.local.";
      setLastError(err);
      return { ok: false, error: err };
    }

    return new Promise((resolve) => {
      window.chrome.runtime.sendMessage(
        EXTENSION_ID,
        { origin: DEMO_ORIGIN, ...message },
        (response) => {
          if (window.chrome.runtime.lastError) {
            const err = window.chrome.runtime.lastError.message;
            setLastError(err);
            resolve({ ok: false, error: err });
          } else {
            setLastError("");
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

  const publishDepop = useCallback(
    async (job) => send({ type: "PUBLISH_DEPOP", job }),
    [send]
  );

  const retry = useCallback(async () => {
    setStatus("unknown");
    setLastError("");
    const ok = await ping();
    setStatus(ok ? "ready" : "missing");
  }, [ping]);

  return { status, lastError, ping, retry, send, parseDepop, autofillGrailed, publishDepop };
}
