/**
 * Client-side helpers for demo API routes.
 */
export async function improveListing(payload) {
  const res = await fetch("/api/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Improve failed (${res.status})`);
  }

  return res.json();
}
