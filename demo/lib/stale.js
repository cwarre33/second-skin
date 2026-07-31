/**
 * Stale-listing alerts and refresh suggestions (#53).
 *
 * Tracks listing age and platform status to surface "Needs refresh" or
 * "Consider dropping price" suggestions, mirroring the inventory-aging
 * convention used by reseller dashboards (30 / 60 / 90+ days).
 *
 * Pure functions only — no DOM, no storage — so this is unit-testable and
 * safe to call from the dashboard render path.
 */

// A listing is "stale" once it has been live on a platform this many days
// without selling. Below this age we stay quiet.
export const STALE_DAYS = 30;

// Beyond this age a price drop is the higher-leverage next action, so we
// escalate the suggestion from "refresh" to "drop price".
export const PRICE_DROP_DAYS = 60;

// Platform statuses that represent a live listing (aging on the marketplace).
// "draft" / "publishing" / "sold" are excluded — drafts aren't live, in-flight
// listings haven't aged, and sold items don't need refreshing.
const LIVE_STATUSES = new Set(["published", "review", "active"]);

/**
 * Whole days between an ISO timestamp and `now`. Returns 0 for an empty or
 * unparseable timestamp, and is clamped at 0 so future timestamps (clock skew
 * or a freshly-bumped listing) never produce a negative age.
 */
export function ageDays(iso, now = new Date()) {
  if (!iso) return 0;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Per-platform refresh suggestions for a single listing.
 *
 * Returns an array of `{ platform, type, age, label }` where `type` is
 * "refresh" (STALE_DAYS..PRICE_DROP_DAYS) or "price_drop" (>= PRICE_DROP_DAYS).
 * Returns [] when the listing isn't stale on any live platform.
 *
 * Age is measured from the platform's `lastUpdated` (set on publish / bump /
 * status change), falling back to the listing's `createdAt` when the platform
 * timestamp is absent — so a freshly published listing never looks stale.
 */
export function getStaleSuggestions(listing, now = new Date()) {
  if (!listing || !listing.platforms) return [];
  const suggestions = [];
  for (const [platform, meta] of Object.entries(listing.platforms)) {
    if (!meta || !LIVE_STATUSES.has(meta.status)) continue;
    const age = ageDays(meta.lastUpdated || listing.createdAt, now);
    if (age >= PRICE_DROP_DAYS) {
      suggestions.push({
        platform,
        type: "price_drop",
        age,
        label: `Consider dropping price · ${age}d live on ${platform}`,
      });
    } else if (age >= STALE_DAYS) {
      suggestions.push({
        platform,
        type: "refresh",
        age,
        label: `Needs refresh · ${age}d live on ${platform}`,
      });
    }
  }
  return suggestions;
}

/**
 * Aggregate counts across an inventory for a summary banner.
 * Returns `{ refresh, price_drop }` counts.
 */
export function summarizeStale(inventory, now = new Date()) {
  const counts = { refresh: 0, price_drop: 0 };
  for (const listing of inventory || []) {
    for (const s of getStaleSuggestions(listing, now)) {
      counts[s.type] = (counts[s.type] || 0) + 1;
    }
  }
  return counts;
}

// CommonJS shim so the test runner (Node) can require this module.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STALE_DAYS,
    PRICE_DROP_DAYS,
    ageDays,
    getStaleSuggestions,
    summarizeStale,
  };
}