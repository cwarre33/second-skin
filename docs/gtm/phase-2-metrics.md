# Phase 2 Success Metrics — Scorecard

> Issue **#15** — Hit Phase 2 success metrics.
> Autonomous artifact: a markdown scorecard defining the Phase 2 metrics, the
> current measurable baselines (filled from the repo + available analytics), and
> how to read them once analytics is enabled. No accounts created.

## Status of instrumentation (2026-07-31)

- **Analytics wiring exists** (`demo/hooks/useAnalytics.js`): GoatCounter
  (pageviews + events) and Microsoft Clarity (sessions + heatmaps) load only
  when `NEXT_PUBLIC_GOATCOUNTER_CODE` / `NEXT_PUBLIC_CLARITY_PROJECT_ID` are set.
- **Analytics ids are NOT configured** (no accounts yet — human stop-gate, see
  `docs/gtm/feedback-protocol.md`). So all *usage* baselines below are
  **"not yet measurable" (NYM)** until the human enables analytics.
- **Repo-measurable baselines** are filled from the current `master` build.

This scorecard is the dashboard stub. Once analytics is on, the operator fills
the NYM cells weekly (cadence in `docs/gtm/weekly-triage.md`).

## North-star and supporting metrics

**North star:** number of listings successfully cross-listed Depop → Grailed
through the extension per week (proxy for real value delivered). Tracked as
`autofill_grailed_succeeded` events.

| Metric | Definition | Source | Baseline (2026-07-31) | Target (Phase 2) |
|--------|------------|--------|------------------------|-------------------|
| **Weekly cross-lists completed** | `autofill_grailed_succeeded` events/wk | GoatCounter | NYM | ≥ 20/wk |
| **Cross-list success rate** | `succeeded / (succeeded+failed)` for `autofill_grailed_*` | GoatCounter | NYM | ≥ 80% |
| **Demo activation** | % of sessions that reach `parse_depop_succeeded` or `autofill_grailed_succeeded` | GoatCounter + Clarity | NYM | ≥ 30% |
| **AI improve adoption** | `improve_clicked` / activated sessions; `improve_succeeded` rate | GoatCounter | NYM | ≥ 25% try; ≥ 80% succeed |
| **Drop-off at publish** | sessions that parse but never click publish (Clarity replay + event gap) | Clarity + GoatCounter | NYM | < 50% drop |
| **24h feedback SLA hit** | % of public signals replied to within 24h | manual (triage doc) | NYM (protocol just shipped, #14) | ≥ 90% |
| **Weekly triage pass done** | 1 top-3 triage per week | manual | NYM (loop just shipped, #27) | 4/4 weeks |

## Event inventory (the instrumentation already in place)

All events are emitted via `track()` in `demo/pages/index.js` (and hooks).
These are the counters that populate the scorecard once GoatCounter is on.

**Acquisition / activation:**
- `prefill_from_query` (extension popup or shared link drove the visit)
- `sample_listing_loaded`
- `create_new_listing`, `edit_listing`

**Parse (Depop pull):**
- `parse_depop_clicked`, `parse_depop_succeeded`, `parse_depop_failed`

**AI improve:**
- `improve_clicked`, `improve_succeeded`, `improve_failed`

**Publish:**
- `autofill_grailed_clicked`, `autofill_grailed_succeeded`, `autofill_grailed_failed`
- `publish_depop_clicked`, `publish_depop_succeeded`, `publish_depop_failed`
- `bulk_publish_<platform>_clicked`

**Engagement / depth:**
- `images_uploaded`, `measurement_overlay_generated`, `template_applied`,
  `template_saved`, `template_deleted`, `mark_as_sold`

**Retention-adjacent (inventory):**
- `listing_saved`, `listing_deleted`, `bulk_deleted`

## Repo-measurable baselines (filled from current `master`)

These are measurable *today* without analytics accounts:

| Baseline | Value (2026-07-31) | How to re-measure |
|----------|--------------------|-------------------|
| Demo build status | ✅ `npm run build` green | `cd demo && npm run build` |
| Test suite | ✅ 24 passed, 0 failed | `cd test && npm test` |
| Demo route `/` first-load JS | 92.7 kB | `npm run build` output |
| Demo route `/` size | 12.6 kB | `npm run build` output |
| Supported cross-list pair | Depop → Grailed (1 pair) | `manifest.json` content scripts |
| Extension permissions | `storage, tabs, scripting, activeTab` | `manifest.json` |
| Externally connectable origins | 3 (localhost:3000, 127.0.0.1:3000, vercel demo) | `manifest.json` |
| Tracked event types | 25 (see inventory above) | `grep track\( demo/` |
| AI key exposure | ✅ server-side only (`demo/pages/api/improve.js`) | repo audit (#6 baseline doc) |
| Open Phase 2 GTM artifacts shipped | 7 docs (#14 #27 #10 #11 #12 #13 #15) | `docs/gtm/` |

## How to read this scorecard weekly

1. If analytics is on: pull the week's event counts from GoatCounter for each
   event above; compute the rates; fill the NYM cells in the top table.
2. Pull Clarity's rage-click / dead-click / drop-off for the activation and
   publish-drop metrics.
3. Record the 24h-SLA and weekly-triage pass manually from the triage doc.
4. Post the week's numbers as a comment on epic #7 (or #6) — same place as the
   weekly triage summary.

## Verification (for #15 DoD)

- [x] \`docs/gtm/phase-2-metrics.md\` defines north-star + supporting metrics with
      definitions, sources, baselines, and Phase 2 targets.
- [x] Current measurable baselines filled from the repo (build/test green, JS
      size, supported pair, permissions, event inventory, AI-key exposure).
- [x] Usage baselines marked NYM with the reason (analytics ids not configured —
      human stop-gate) and a clear "how to read weekly" section.
- [x] No accounts created; no secrets printed.