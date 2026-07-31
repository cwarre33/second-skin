# Extension Baseline (MV3) — Fashion-First Demo Bridge

> Audit artifact for **#6 — Establish Manifest V3 extension as fashion-first baseline.**
> Confirms the MV3 extension is ready to support the no-signup demo slice:
> Depop listing parse → demo bridge → Grailed sell-form autofill, all over
> `externally_connectable` messaging with strict origin checks.

Last audited: 2026-07-31.

## Surface

The extension lives at the **repo root** (no `extension/` subdirectory). Key files:

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest: service worker, content scripts, `externally_connectable` |
| `background.js` | Service worker: external message router, job mutex, tab orchestration |
| `shared.js` | `SECOND_SKIN` DOM-automation primitives (waitFor, injectFiles, selectRadixOption, fillAutocomplete…) |
| `content_depop.js` | Depop: form autofill + passive sold-state scraper + listing parser |
| `content_grailed.js` | Grailed: sell-form autofill |
| `popup.js` / `popup.html` | Action popup: "cross-list this Depop item" → opens demo with query params |
| `dashboard.js` / `dashboard.html` | Options page / inventory dashboard |
| `demo/` | Next.js public demo (pages router) — Phase 1 surface |

Permissions: `storage`, `tabs`, `scripting`, `activeTab`.
Host permissions: `*://*.depop.com/*`, `*://*.grailed.com/*`, `http://localhost:11434/*` (local Ollama only).

## 1. Depop listing parse → demo bridge

`background.js` `handleParseDepop` finds an open Depop tab and sends
`{ action: "parseDepopListing" }`. `content_depop.js` answers asynchronously:
it waits briefly for the SPA title to hydrate (`SECOND_SKIN.waitFor`, 2.5s cap)
then returns `{ url, title, description, price, images, tags }`.

- **Receiving-end-missing recovery** is handled in `background.js`: on
  `/receiving end does not exist/i` it re-injects `shared.js` + `content_depop.js`
  via `chrome.scripting.executeScript` and retries once.
- **Image collection** skips tiny icons, avatars/profile/placeholder URLs, and
  loaded images < 100px, capped at 8 (see `pickImages`).
- **Tags** come from meta keywords + a fashion-token pass over title/description.

The demo consumes these fields in `demo/pages/index.js` `handleParseDepop` and
the popup hands them off as query params (`popup.js` `buildDemoUrl`).

**Known limitation (deferred):** the parser does not yet extract structured
fashion fields (brand, category, condition, measurements) and the demo has no
state for brand/category. Enhancing the parser + demo wiring is tracked as
**Lane A / #49** (Depop structured-field autofill) and is intentionally out of
scope for the baseline audit.

## 2. Grailed sell-form autofill from demo job

`background.js` `AUTOFILL_GRAILED` → `handlePublish(job, "grailed")` stores the
job and opens/activates `https://www.grailed.com/sell`. The Grailed content
script's IIFE reads the job and calls `processGrailedForm(activeItem, { demo: true })`.

For **demo jobs**, the form fills `title`, `price`, `description`, and `tags`
only. Images, category, designer, size, and condition are intentionally left
manual (issue **#32**) — the demo proves the title/price/description/tags flow
end-to-end without pretending to automate Grailed's full structured form.

Helpers (`shared.js`, unit-tested in `test/test.js`): `waitFor`,
`waitForEnabled`, `selectRadixOption`, `fillAutocomplete`, `dispatchSyntheticInput`,
`injectFiles`. These are React-compatible (synthetic input events, Radix menu
selection) and are the reuse target for any new Grailed/Depop automation.

## 3. `externally_connectable` messaging

`manifest.json`:
```json
"externally_connectable": {
  "matches": [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://second-skin-zeta.vercel.app/*"
  ]
}
```

`background.js` mirrors these in `DEFAULT_ALLOWED_ORIGINS` (overridable via
`chrome.storage.local.allowedOrigins` — see **#34**). The external listener
validates `sender.url` with `isAllowedOrigin()` **before** any work and rejects
unknown senders with `{ ok:false, error:"Unauthorized origin" }`. Strict origin
validation is present and correct.

**Message types (external, demo → extension):** `PING`, `PARSE_DEPOP`,
`AUTOFILL_GRAILED`, `PUBLISH_DEPOP` — defined in `demo/hooks/useExtension.js`,
handled in `background.js`.

**Internal:** `parseDepopListing` (background/popup → Depop content),
`clearJobMutex` (content/dashboard → background). `getJob` is defined but has no
callers (left in place; harmless).

The demo bridge hook is `demo/hooks/useExtension.js` (reads
`NEXT_PUBLIC_EXTENSION_ID`). The improve path (`demo/api/improve`) keeps NVIDIA
NIM keys **server-side only**.

## Baseline verdict

The MV3 extension is a stable fashion-first baseline for the demo slice:

- ✅ Depop parse → demo → Grailed autofill bridge is wired end-to-end.
- ✅ `externally_connectable` origins are in sync across manifest + background,
  with strict `sender.url` validation.
- ✅ Receiving-end-missing recovery and SPA-hydration wait are in place.
- ✅ NIM keys stay server-side; no secrets in client bundles.

Fixed as part of this audit:
- `demo/pages/index.js` `bulkPublish` guard corrected (`extStatus !== "ready"`).
- `popup.js` `DEMO_DEV_ORIGIN` is now wired via `chrome.storage.local.demoDevMode`
  (was a dead both-branches-identical branch).
- `content_depop.js` parser now waits for SPA hydration and filters
  avatar/placeholder/thumbnail images.

Deferred to Lane A: structured-field parse + demo wiring (#49), Grailed
category/designer/condition mapping, Grailed measurements autofill.