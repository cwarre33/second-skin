# Feedback Protocol — Phase 2

> Issue **#14** — Run feedback protocol: Clarity daily + 24h response SLA.
> Autonomous artifact: this is the protocol + checklist the operator follows.
> No accounts are created and no PII is published by this doc.

## Goal

Catch friction in the no-signup demo within 24 hours of it happening, using two
tools that are already wired into the demo (`demo/hooks/useAnalytics.js`):

- **Microsoft Clarity** — session replays + heatmaps (free, no event limits).
- **GoatCounter** — privacy-friendly pageview + event counts.

Both load only when their env vars are set (see `.env.example`), so the demo
degrades gracefully to "no analytics" until the operator opts in.

## Prerequisites (env vars — leave blank to disable)

```
NEXT_PUBLIC_GOATCOUNTER_CODE=<code>.goatcounter.com
NEXT_PUBLIC_CLARITY_PROJECT_ID=<clarity project id>
```

These are **not** secrets (they are public site ids), but they are still kept in
`.env` and surfaced via `NEXT_PUBLIC_*` so the build picks them up. The analytics
hook is already implemented (`demo/hooks/useAnalytics.js`); no client code needs
to change to enable the protocol. **Before enabling Clarity**, mask sensitive
fields (see "Sensitive-field masking" below) — the demo form accepts listing
text and image data URLs that may contain personal info.

**Status as of 2026-07-31:** analytics wiring exists; no analytics ids are
configured in env. Enabling is a human step (requires GoatCounter + Clarity
account creation, which is a stop-gate per CLAUDE.md). This doc is the runbook
for once those accounts exist.

## Daily Clarity checklist (≈10 min/day)

Run once per day, ideally in the morning so same-day fixes ship before the next
visit cohort.

1. **Open Clarity → Dashboard.** Note today's: sessions, dead-click %, rage-click
   count, pages with most rage clicks.
2. **Replays — filter by rage clicks OR dead clicks.** Watch 3–5 replays.
   For each, record:
   - URL + rough element ("Publish to Grailed button", "Pull from URL input").
   - What the user seemed to expect vs. what happened.
   - One-line hypothesis (e.g. "button looks disabled / no feedback on click").
3. **Heatmaps.** Check the `/` (demo form) click + scroll heatmap. Are people
   clicking things that aren't clickable? Are they dropping before the publish
   buttons?
4. **Log findings** in the weekly triage doc (`docs/gtm/weekly-triage.md`) under
   the current week's "From Clarity" section. Tag each finding
   `[friction]`, `[bug]`, or `[content]`.
5. **If a finding is a clear bug** → file a GitHub issue immediately (don't wait
   for weekly triage) and link it from the triage doc.

## 24h response SLA

Every user-visible signal gets a first response within **24 hours**:

| Signal source | Where it lands | First response within |
|---------------|----------------|-----------------------|
| Clarity rage/dead click pattern | weekly-triage doc + issue if bug | 24h (triaged + filed) |
| GoatCounter event spike/drop | weekly-triage doc | 24h (noted) |
| Reddit / IH / HN / community comment | the thread itself | 24h (public reply) |
| GitHub issue / email | the issue / email | 24h (acknowledgement) |

"First response" does **not** mean "fixed." It means: acknowledged, reproduced
(if a bug), and given a next step + ETA. Public replies (Reddit, IH, HN) must be
genuine and non-spammy — disclose the operator is the builder.

## Sensitive-field masking (before enabling Clarity)

Clarity records the DOM. The demo form contains free-text description, price,
and image data URLs. Before turning Clarity on for the live demo:

- [ ] Confirm Clarity's "Mask text" + "Mask keystrokes" settings are ON for the
      demo project (Clarity project settings → Privacy).
- [ ] Add `data-clarity-mask="true"` to any input we never want recorded. The
      fields most likely to carry personal info are the description textarea and
      image data URLs. (No code change shipped in this issue — tracked as a
      follow-up checklist item; masking at the Clarity-project level is the
      default safe path.)
- [ ] Verify on a test session that listing text is masked in the replay.

## Weekly close-out

Every Friday (or end of the operator's week): move the week's Clarity +
GoatCounter findings into `docs/gtm/weekly-triage.md`'s top-3 and file/resolve
issues. This closes the loop with the weekly triage loop (#27).

## Verification (for #14 DoD)

- [x] `docs/gtm/feedback-protocol.md` exists with a daily Clarity checklist and
      a 24h response SLA table.
- [x] Analytics env vars documented in `.env.example` (placeholders only).
- [x] No new client code required (hook already present in
      `demo/hooks/useAnalytics.js`); no analytics keys committed.
- [ ] **Human step (stop-gate):** create GoatCounter + Clarity accounts and fill
      the env vars. Documented here, not done autonomously per CLAUDE.md.