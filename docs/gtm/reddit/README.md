# Reddit GTM Pack

> Issue **#10** — Reddit GTM: r/Depop, r/Grailed, r/Flipping, r/Resell.
> Autonomous artifact: **draft posts + cadence + compliance notes only.**
> Do **not** post anything until the human approves. No Reddit accounts are
> created by this work.

## Product one-liner (use consistently)

> **Second Skin** is a free, no-signup browser extension that cross-lists a
> Depop listing to Grailed in one click — with AI-assisted title/description/
> tags and a fee/payout calculator. Local-first (Manifest V3); nothing leaves
> your browser except the listing you're already publishing.

Demo: https://second-skin-zeta.vercel.app · Repo: github.com/cwarre33/second-skin

## Subreddit plan

| Subreddit | Audience | Angle | First post |
|-----------|----------|-------|------------|
| r/Depop | Depop sellers | "I got tired of re-typing listings into Grailed" — builder story + free tool | Draft A |
| r/Grailed | Grailed sellers (fashion-forward) | Fashion-first cross-listing + fee math; measurements templates | Draft B |
| r/Flipping | General resellers | Cross-listing workflow + fee/payout calculator; works with existing Depop+Grailed sessions | Draft C |
| r/Resell | Resellers (broad) | Same as Flipping, broader framing; no signup | Draft D |

## Posting cadence (staggered, not spam)

- **Week 1:** r/Depop (Draft A) only. Wait ≥ 3 days, watch comments, reply within 24h (see `docs/gtm/feedback-protocol.md`).
- **Week 2:** r/Grailed (Draft B). Don't post to two subs the same day.
- **Week 3:** r/Flipping (Draft C).
- **Week 4:** r/Resell (Draft D). Cross-post only if a prior post landed well; otherwise fresh post tailored to the sub.
- **Rule:** never paste the same body into two subs on the same day. Tailor each title + first line to the sub. Space posts ≥ 7 days apart per sub.
- **Reply SLA:** 24h on every comment (per feedback protocol). Disclose you're the builder in the first reply if not in the post.

## Compliance notes (read before posting)

- **Self-promotion rules.** Each sub has its own rule on self-promotion (r/Flipping and r/Resell are stricter; some require a mod-approved promo post). Check the sub's wiki/rules page and message mods first if unsure. When in doubt, post a genuine question/story and mention the tool only if it's relevant, not as the lead.
- **9:1 rule of thumb.** Reddit culture rewards contributors. For every promotional post, have (or plan) several non-promotional contributions. Don't burn a brand-new account — use an account with real history.
- **Disclose affiliation.** Always disclose you built it. "I built this" is fine and respected; pretending not to is not.
- **No astroturfing.** One account, one voice. Don't ask friends to post positive comments.
- **Don't link-drop in comments** unless directly answering a request — link the demo only when it solves the asker's problem.
- **Respect each sub's format.** Some require a flair, a [Review] tag, or text-only (no link posts). Follow it.
- **Images.** Use a short screen recording/GIF of the one-click flow where images are allowed; it outperforms text-only.

## Draft A — r/Depop

**Title:** I got tired of re-typing my Depop listings into Grailed, so I built a free extension that does it in one click

**Body:**
> Hey r/Depop — I sell on Depop and Grailed and the worst part is re-entering the same listing twice. So I built **Second Skin**, a free Chrome extension (Manifest V3, no account, nothing stored in the cloud) that:
>
> - Pulls a Depop listing's title, description, price, photos, and tags.
> - Opens a Grailed sell form pre-filled so you just review and submit.
> - Has a fee/payout calculator so you know what you'll actually net on each platform before you list.
> - Optional AI pass that rewrites title/description/tags for the Grailed audience (key stays server-side; you can ignore it and use it as a plain cross-lister).
>
> It works inside your own logged-in Depop/Grailed sessions — it doesn't log in for you, store passwords, or post without you reviewing.
>
> Free demo (no signup): https://second-skin-zeta.vercel.app
> Source: https://github.com/cwarre33/second-skin
>
> I'm the builder — happy to answer questions or take feature requests. What's the most annoying part of cross-listing for you?

## Draft B — r/Grailed

**Title:** Cross-listing Depop → Grailed without re-typing (free, no-account extension) + a Grailed fee calculator

**Body:**
> r/Grailed — a lot of us source on Depop and sell on Grailed. Re-entering the listing is the friction. I built **Second Skin**, a free MV3 extension (no signup, local-first) that pre-fills the Grailed sell form from a Depop listing in one click, plus:
>
> - Per-platform fee/payout calculator (Grailed's 6/9% + payment fee, Depop's fee) so you can price to a target net.
> - Measurement templates (tops/pants/outerwear) so Grailed's measurement section isn't a blank stare.
> - Optional AI listing-variant pass tuned for the Grailed fashion audience (server-side key; off by default).
>
> It never auto-submits — you review on the Grailed sell page and hit publish yourself. No credentials leave your browser.
>
> Demo: https://second-skin-zeta.vercel.app
> Code: https://github.com/cwarre33/second-skin
>
> Builder here — what would make this actually useful for your Grailed workflow?

## Draft C — r/Flipping

**Title:** Free Chrome extension: cross-list Depop → Grailed in one click (+ fee/payout calculator). No account.

**Body:**
> r/Flipping — sharing a tool I built for my own flipping workflow. **Second Skin** is a free browser extension (no signup, no cloud, Manifest V3) that:
>
> - Reads a Depop listing and pre-fills the Grailed sell form so you're not retyping.
> - Shows real fee math per platform (Depop vs Grailed commission + payment fees) and suggests a list price for a target net.
> - Optional AI rewrite of title/description/tags (server-side key, opt-in).
>
> It runs inside your own logged-in sessions and never auto-publishes — you review before submitting. Nothing about your accounts leaves your browser.
>
> Free demo: https://second-skin-zeta.vercel.app
> Open source: https://github.com/cwarre33/second-skin
>
> I'm the dev. What cross-listing friction would you want solved next?

## Draft D — r/Resell

**Title:** No-account browser tool to cross-list Depop → Grailed (free, open source)

**Body:**
> r/Resell — built this for myself and figured others might want it. **Second Skin** is a free Chrome extension (Manifest V3, no signup, local-first) that cross-lists a Depop listing to Grailed in one click and includes a fee/payout calculator so you price to a real net.
>
> - One-click pull from Depop → pre-filled Grailed sell form (you review + submit).
> - Fee math for Depop and Grailed, plus a target-net price suggester.
> - Optional AI title/description/tag pass (opt-in; key server-side).
>
> No credentials stored, no auto-posting, no cloud account. Works in your own logged-in tabs.
>
> Demo: https://second-skin-zeta.vercel.app
> Repo: https://github.com/cwarre33/second-skin
>
> Builder here — happy to take requests. What platform pair do you wish this supported next?

## Verification (for #10 DoD)

- [x] \`docs/gtm/reddit/\` contains 4 draft posts (r/Depop, r/Grailed, r/Flipping, r/Resell).
- [x] Posting cadence + compliance notes included.
- [x] No Reddit account created; nothing posted; no credentials invented.
- [ ] **Human step (stop-gate):** review for sub-specific rules, then post on the cadence above.