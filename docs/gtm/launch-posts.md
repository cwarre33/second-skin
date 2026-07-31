# Launch Posts — Indie Hackers + Show HN

> Issue **#11** — Indie Hackers / Show HN launch post.
> Autonomous artifact: **drafts only.** Do **not** post until the human approves.
> No accounts are created by this work.

## Product one-liner

> **Second Skin** is a free, no-signup browser extension that cross-lists a
> Depop listing to Grailed in one click — with AI-assisted title/description/
> tags and a fee/payout calculator. Local-first (Manifest V3); nothing leaves
> your browser except the listing you're already publishing.

Demo: https://second-skin-zeta.vercel.app · Repo: github.com/cwarre33/second-skin

---

## Indie Hackers — draft post

> **Title:** I built a free, no-signup browser extension to cross-list Depop → Grailed (one click + a fee calculator)
>
> Hey IH 👋
>
> I resell clothes on Depop and Grailed, and the most boring part is re-typing the same listing into both platforms. So I built **Second Skin** — a free Chrome extension (Manifest V3) that does the boring part in one click.
>
> What it does:
> - Pulls a Depop listing (title, description, price, photos, tags) and pre-fills the Grailed sell form — you review and submit.
> - A per-platform fee/payout calculator so you price to a real net (Grailed 6/9% + payment fee, Depop fees), with a target-net price suggester.
> - Measurement templates (tops/pants/outerwear) and an optional AI rewrite of title/description/tags tuned for the Grailed audience (NVIDIA NIM, key server-side, opt-in).
>
> What it deliberately doesn't do:
> - No signup, no cloud account, no credentials stored. It runs inside your own logged-in Depop/Grailed tabs and never auto-publishes — you always review before submitting.
>
> Why no-signup: the demo slice is the whole product — I want people to feel the value before any account. Inventory lives in `chrome.storage.local`.
>
> Tech: Chrome MV3 service worker + content scripts, Next.js demo site, server-side NIM proxy for the AI pass. Open source: https://github.com/cwarre33/second-skin
>
> Free demo (no signup): https://second-skin-zeta.vercel.app
>
> I'd love feedback from other resellers / indie hackers: would the no-signup wedge get you to try it? What's the next platform pair you'd want (Poshmark, eBay, Vinted)?
>
> — Cameron

### IH posting notes
- Post in **#launches** (or **#products** if your community uses it) with the launch tag.
- IH loves the business story: include MRR/pricing plans (Free → paid tiers planned for Phase 4, see roadmap) and what you learned. Add a short "What I learned" paragraph if you have data.
- Reply to every comment within 24h (feedback protocol). IH members give detailed product feedback — capture it in `docs/gtm/weekly-triage.md`.

---

## Show HN — draft post

> **Title:** Show HN: Second Skin – free MV3 extension to cross-list Depop → Grailed (no signup, local-first)
>
> **Body:**
> Hi HN — sharing a small browser extension I built for my own resale workflow.
>
> Second Skin cross-lists a Depop listing to Grailed in one click: it reads the listing from your Depop tab and pre-fills the Grailed sell form, so you're not re-typing title/description/price/photos/tags. You review and hit submit yourself — it never auto-publishes.
>
> It also has a fee/payout calculator (Grailed's 6/9% + payment fee vs Depop's fee) that suggests a list price for a target net, measurement templates, and an optional AI listing-variant pass (NVIDIA NIM, key kept server-side, opt-in).
>
> Design choices worth flagging for HN:
> - **No signup, no cloud, no credentials.** It's a Manifest V3 extension; inventory lives in `chrome.storage.local`. The demo site is a no-account Next.js app. The whole "demo slice" is the product — feel the value before any account.
> - **Externally connectable** messaging with strict `sender.url` origin checks between the demo site and the extension; the AI key never ships to the client bundle.
> - Content scripts do React-compatible synthetic input (Radix menu selection, DataTransfer file injection) to fill the Grailed sell form.
>
> It only supports Depop → Grailed right now (Poshmark/eBay/Vinted are next).
>
> Demo (no signup): https://second-skin-zeta.vercel.app
> Source: https://github.com/cwarre33/second-skin
>
> I'd value feedback on the architecture (especially the externally_connectable bridge) and the no-signup wedge. What would you do differently?

### Show HN posting notes
- **Title format:** must start with "Show HN:". Keep the title factual, no clickbait — HN downvotes marketing language.
- **Post timing:** Tuesday–Thursday, ~8–10am ET (US west-coast morning is the historical peak). Avoid weekends.
- **First paragraph:** lead with what it is and the interesting technical choice. HN rewards technical substance (the externally_connectable bridge, MV3 service worker, server-side-only AI key) over marketing.
- **No "we"** if it's a solo build — HN is fine with "I built".
- **Reply within 24h**, be technical, don't get defensive. Capture feedback in the weekly triage doc.
- **Don't ask for upvotes** anywhere (against HN rules and culture).

---

## Verification (for #11 DoD)

- [x] \`docs/gtm/launch-posts.md\` contains an Indie Hackers draft and a Show HN draft, each with title + body + posting notes.
- [x] No accounts created; nothing posted; no credentials invented.
- [ ] **Human step (stop-gate):** review, then post to IH and HN on the timing above.