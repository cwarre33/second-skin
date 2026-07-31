# Product Hunt Launch Prep

> Issue **#13** — Prepare Product Hunt launch (end of Phase 2).
> Autonomous artifact: **prep checklist + draft copy only.** Do **not** create a
> Product Hunt account or schedule a launch until the human approves. Per the
> brief, no PH account creation happens here.

## Product one-liner

> **Second Skin** is a free, no-signup browser extension that cross-lists a
> Depop listing to Grailed in one click — with AI-assisted title/description/
> tags and a fee/payout calculator. Local-first (Manifest V3); nothing leaves
> your browser except the listing you're already publishing.

Demo: https://second-skin-zeta.vercel.app · Repo: github.com/cwarre33/second-skin

## Positioning for PH

- **Category:** Productivity / Developer Tools (browser extension), with a
  strong "makers/resellers" angle. PH responds well to "I built this for my own
  workflow" + a real free demo.
- **Wedge:** the **no-signup, local-first** angle. "Try the whole thing in 30
  seconds, no account" is the hook that differentiates from marketplace SaaS.
- **Free.** Launch as free; paid tiers are a Phase 4 roadmap item, not launch.

## Pre-launch checklist (T-minus)

### T-2 weeks
- [ ] Product: demo is stable on master; `npm test` + `npm run build` green;
      the one-click Depop → Grailed flow works on a fresh load-unpacked install.
- [ ] Demo URL (second-skin-zeta.vercel.app) is live and fast; no required
      signup; analytics (GoatCounter/Clarity) enabled only if env vars set.
- [ ] Assets drafted (see below): tagline, description, maker comment, gallery,
      first comment. Reviewed by the human.
- [ ] Line up a hunter (optional) — a known PH hunter can feature the launch;
      reach out at least a week ahead. Not required (self-launch is fine).

### T-1 week
- [ ] Soft-launch elsewhere first (Reddit r/Depop, IH, Show HN — see
      `docs/gtm/launch-posts.md` and `docs/gtm/reddit/`) so there's social proof
      and any rough edges are fixed. PH after these, not before.
- [ ] Recruit a small group of real users/supporters to upvote + comment
      **genuinely** on launch day (no coordinated "upvote at exactly X" — that
      breaks PH rules and gets the launch buried). Tell them the date only.
- [ ] Prepare an email/DM to supporters (draft below).

### T-1 day
- [ ] Final build green; demo redeployed.
- [ ] All launch-day copy finalized in this doc.
- [ ] Confirm the launch is **not** on a weekend/holiday (Tue–Wed PT is the
      historical peak; avoid Mon/Fri edges and US holidays).

### Launch day
- [ ] Submit at 12:01am PT (PH day starts then; earliest posts get the most
      visibility runway).
- [ ] Post the **maker's first comment** immediately (draft below) — tell the
      build story + technical choices.
- [ ] Reply to **every** comment within a few hours; 24h SLA max (feedback
      protocol). Be technical and genuine, don't get defensive.
- [ ] Cross-post to Reddit/IH/HN **only if** the PH launch is already live and
      you're not double-posting the same audience same-day (stagger).
- [ ] Capture all feedback in `docs/gtm/weekly-triage.md`.

## Draft copy

### Tagline (≤60 chars)
> Cross-list Depop → Grailed in one click — free, no signup.

### Name
> Second Skin

### Description (PH gallery/description, ≤260 chars for the short blurb)
> A free, no-signup Chrome extension that cross-lists a Depop listing to Grailed
> in one click — with AI-assisted title/description/tags and a per-platform
> fee/payout calculator. Local-first (Manifest V3); nothing leaves your browser
> except the listing you're already publishing.

### Topics
Productivity, Developer Tools, Reselling, Fashion, Browser Extension

### Maker's first comment (post immediately after launch)
> Hey Product Hunt 👋 Cameron here, builder of Second Skin.
>
> I resell clothes on Depop and Grailed, and the most boring part is re-typing
> the same listing into both platforms. Second Skin does that in one click: it
> reads a Depop listing and pre-fills the Grailed sell form — you review and
> submit. It also has a fee/payout calculator so you price to a real net, and an
> optional AI listing-variant pass.
>
> A few choices I made that I'd love feedback on:
> - **No signup, no cloud, no credentials.** It's a Manifest V3 extension;
>   inventory lives in `chrome.storage.local`. The demo site is a no-account
>   Next.js app. I wanted people to feel the value before any account.
> - **Externally connectable** messaging with strict `sender.url` origin checks
>   between the demo site and the extension; the AI key (NVIDIA NIM) is kept
>   server-side and never ships to the client bundle.
> - Content scripts do React-compatible synthetic input (Radix menu selection,
>   DataTransfer file injection) to fill the Grailed sell form.
>
> It's Depop → Grailed for now (Poshmark/eBay/Vinted next). Free demo, no signup:
> https://second-skin-zeta.vercel.app · Source: https://github.com/cwarre33/second-skin
>
> What would make this actually useful for your resale workflow?

### Gallery assets (to produce before launch)
- [ ] 1 hero image (1280×800) — the one-click flow with the fee calculator visible.
- [ ] 1 short GIF/screen recording (<30s) of Depop listing → pre-filled Grailed form.
- [ ] 2–3 supporting screenshots (fee/payout calculator, measurement templates, AI variants).

### Supporter outreach email/DM (draft — send ~T-1 day, no exact-time coordination)
> Hey — I'm launching Second Skin (the free Depop→Grailed cross-listing
> extension) on Product Hunt [date]. If you've found it useful, an honest upvote
> + comment whenever you're on the site that day would mean a lot. No pressure,
> and please only if you genuinely like it. Link goes live at 12:01am PT; I'll
> send it then. Thanks!

## Compliance / PH rules

- **No coordinated voting.** Don't tell supporters an exact time or "upvote
  now." PH's algorithm penalizes suspicious voting patterns and can bury the
  launch. Genuine, scattered engagement only.
- **Don't ask for upvotes in the title of off-platform posts.** Share the
  product, not the ask.
- **Disclose you're the maker** (PH has a "Maker" badge — use it).
- **One launch per product.** Don't relaunch the same product repeatedly.

## Verification (for #13 DoD)

- [x] \`docs/gtm/product-hunt.md\` contains a prep checklist (T-2wk → launch day),
      draft copy (tagline, description, topics, maker's first comment, gallery
      asset list, supporter outreach draft), and PH compliance notes.
- [x] No PH account created; nothing scheduled; no credentials invented.
- [ ] **Human step (stop-gate):** create the PH account, produce gallery assets,
      and schedule the launch on the checklist timing.