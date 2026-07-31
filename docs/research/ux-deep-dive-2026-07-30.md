# Second Skin UX Deep-Dive — 2026-07-30

Research window: 2-hour autonomous loop.
Goal: identify concrete UX features that make creating, listing, and selling fashion inventory faster and less error-prone across Depop, Grailed, and future platforms.

**Quick readout — top 5 features to build next:**

1. **Fee & payout calculator** (low effort, high value) — show net payout per platform before publishing.
2. **Draft auto-save** (low effort, medium value) — prevent lost work on long forms.
3. **Per-platform AI variants** (low–medium effort, high value) — extend `/api/improve` to generate Depop-, Grailed-, Poshmark-specific copy.
4. **Measurement templates** (medium effort, high value) — category-aware fields + overlay image, big conversion boost on Grailed.
5. **Mark-as-sold / delist helper** (low effort, high value) — one-click path to delist from every platform after a sale.

Full analysis and 16 proposed issues are below.

---

## 1. Executive summary

Second Skin has moved from a "Depop → Grailed cross-lister" to a "create once, publish everywhere" hub. The current demo already supports:

- In-app listing creation + localStorage inventory.
- AI copy improvement via NVIDIA NIM.
- Extension-driven publish to Depop and Grailed.
- Drag-drop photo reordering, bulk actions, and query-param prefill from the extension popup.

The biggest remaining UX opportunities cluster around **four moments**:

1. **Intake** — getting an item from "in-hand" to a structured draft with photos, measurements, and tags.
2. **Optimization** — turning a raw draft into platform-native copy, crops, pricing, and measurements.
3. **Publish** — reducing the number of manual fields still left on the target site.
4. **Management** — preventing double-sells, tracking sold-state, and surfacing which listings need attention.

Below is a ranked backlog of feature ideas, grouped by theme, with effort estimates and suggested issue mapping.

---

## 2. Current Second Skin flow audit

### What works well

- **Single source of truth**: localStorage-backed inventory hub with per-platform status badges.
- **Flexible origin model**: extension `externally_connectable` + storage-backed allow-list supports local dev and deployed demo.
- **Human-in-the-loop publish**: the extension fills forms but stops before submit, keeping the user in control.
- **AI copy loop**: NIM-powered "Improve with AI" generates platform-specific title/description/tags.
- **Bulk actions**: select multiple drafts and publish/delete in one go.

### Friction points observed in the code

| Area | Current behavior | Friction |
|---|---|---|
| **Photos** | Data-URIs uploaded via `<input type="file">`; drag-to-reorder in demo; first photo is thumbnail. | No crop/aspect-ratio guidance. Depop wants 1:1 square; Grailed tolerates mixed. No background cleanup. |
| **Measurements** | Free-text `measurements` field appended to description. | No template, no per-category prompts, no visual measurement overlay. Buyers on Grailed especially expect standardized measurements. |
| **Category / size / condition** | Grailed fills hard-coded defaults (Tops → T-Shirts → XL → Vintage). Depop leaves category/condition/size manual. | Seller must still complete most structured fields on the target site. |
| **Pricing** | Free-text price field; no fee or payout visibility. | Sellers can't see net payout per platform or compare fees before choosing where to list. |
| **Extension popup** | Only parses Depop listings; opens demo with query params. | No Grailed-initiated cross-list; no "publish from here" path. |
| **Sold-state sync** | Depop profile scraper marks items `sold` if URL disappears. | Grailed has no equivalent scraper. No proactive delist or quantity management. |
| **Mobile** | Demo is desktop-first Next.js app. | Most Depop/Grailed sellers list from phones; the demo form is not thumb-friendly. |
| **Onboarding** | Empty state says "Create or import." | No guided first-listing walkthrough, no template library, no example listing. |

---

## 3. Market research — what competitors and sellers actually need

### 3.1 Reseller pain points (cross-platform)

Based on 2025–2026 reseller guides, the top pain points are:

- **Double-selling / overselling**: an item sells on one platform while still live on another. This is the #1 operational fear. ([Closo inventory sync guide](https://closo.co/blogs/optimization-growth-strategies/inventory-sync-how-to-prevent-double-selling-in-2025))
- **Time per listing**: 10–15 minutes per item per platform; 4–5 platforms = 40–60 minutes per item. ([Snappyit cross-listing comparison](https://snappyit.ai/blog/best-cross-listing-tools-for-resellers-2026))
- **Platform-specific formatting**: title lengths, hashtags, category trees, description tone, photo aspect ratios differ everywhere. ([QuickList AI crosslisting guide](https://quicklistai.org/crosslisting-with-ai-guide/))
- **Photo formatting**: Depop displays square (1:1); Vinted prefers 3:4; Poshmark/Mercari 1:1. Using one crop across platforms wastes cover real estate. ([Snappyit image size guide](https://snappyit.ai/blog/best-image-size-for-each-marketplace))
- **Fee confusion**: Grailed ~13%, Poshmark 20%, Depop low processing fees, Vinted 0% seller fees — sellers misprice because they can't see net payout. ([Free Live Calculators fee comparison](https://freelivecalculators.com/grailed-fee-calculator/articles/grailed-vs-depop-vs-poshmark-fees/))
- **Stale listings**: visibility drops after days; platforms require relisting/sharing/bumping. ([QuickList AI Grailed guide](https://quicklistai.org/grailed-not-selling/))

### 3.2 Platform-specific findings

#### Depop

- Mobile-first listing flow: 4 photos + 1 video, square crop, 5 hashtags + 2 brand hashtags. ([Depop Help Centre](https://depophelp.zendesk.com/hc/en-gb/articles/360032716413-How-do-I-list-an-item))
- Web seller hub supports drafts, templates, drag-drop, CSV bulk upload. ([Depop web listing help](https://depophelp.zendesk.com/hc/en-gb/articles/8608273715217-Listing-on-web))
- 2025 added built-in Photoroom AI editor (background removal + shadows); background removal alone had low adoption, adding shadows lifted listings by ~1.5% (~6,000 extra listings/day). ([Photoroom Depop case study](https://www.photoroom.com/customer-stories/depop))
- Video slot increases sell-through ~2x; 4 photos vs fewer sells ~20% more. ([Photoroom Depop guide](https://www.photoroom.com/blog/sell-fast-on-depop))

#### Grailed

- 8–12 minutes per listing manually; 10 tags × 32 chars; measurements strongly correlate with conversion. ([QuickList AI Grailed guide](https://quicklistai.org/grailed-ai-listings-guide/))
- Requires min 3 photos, recommends 8–12; lacks built-in fee calculator. ([QuickList AI fixes](https://quicklistai.org/grailed-not-selling/))
- Buyers search by brand, era, silhouette, fit — title/tag SEO matters heavily. ([How to Sell on Grailed](https://howtosell.grailed.com/))
- No native inventory sync; Pro Seller Program exists but casual sellers use third-party tools. ([CLOSO Grailed guide](https://closo.co/blogs/blog/grailed-app-complete-guide-what-i-learned-selling-streetwear-for-5-years))

#### Poshmark / Mercari / Vinted

- Poshmark listing flow is criticized for cognitive overload: all fields at once, no progress, disruptive full-screen pickers. ([Medium Poshmark UX redesign case study](https://medium.com/@srini200249/how-i-redesigned-the-poshmark-listing-flow-to-reduce-cognitive-load-resulting-in-a-faster-listing-4c0eabcf8e32))
- Mercari is simpler but requires weight-based shipping decisions. ([Closo Poshmark vs Mercari](https://closo.co/blogs/platform-specific-guides/poshmark-vs-mercari-what-i-learned-after-selling-on-both-for-6-years))
- Vinted uses catalog tags + structured fields; zero seller fees in many markets but cross-listing reformatting is manual. ([QuickList AI crosslisting guide](https://quicklistai.org/crosslisting-with-ai-guide/))

### 3.3 Cross-listing / AI tools landscape

| Tool | Standout UX pattern |
|---|---|
| **Crosslist** | Photo-to-listing generation, AI background remover, unlimited photo editor, AI pricing. ([Crosslist AI listings](https://crosslist.com/features/create-listings-with-ai)) |
| **ResellerIO** | AR lifestyle photo generation, AI price research from sold comps, background removal. ([ResellerIO](https://resellerio.com/)) |
| **Storay** | Gemini Vision reads photos, batch process 30 photos, "Shelves" shareable curated links, WhatsApp buyer comms. ([Storay features](https://storay.app/features)) |
| **List Perfectly** | Measurement templates generate overlay images; category-specific fields. ([List Perfectly measurement templates](https://listperfectly.com/selling/new-list-perfectly-measurement-templates/)) |
| **Listed AI** | Bulk listings up to 15 at once, copy-paste marketplace-safe workflow. ([Listed AI](https://listedai.app/en/)) |
| **FeePilot / SellerFeeCalc** | Side-by-side fee comparison, reverse calculator, CSV export, verified fee-change dates. ([FeePilot](https://www.feepilot.app/), [SellerFeeCalc](https://sellerfeecalc.com/)) |

Common pattern: modern tools are moving from "form helpers" to **photo-first, AI-generated drafts with platform-specific outputs**.

---

## 4. Feature backlog — ranked by user value / effort

### Theme A: Faster intake (photo-first drafts)

#### A1. Photo-first listing creation
**Idea**: Upload photos first; AI (local Ollama vision + optional NIM) suggests title, description, brand, category, size, condition, tags, and price. User reviews and edits before publishing.
- **User value**: Cuts listing time from minutes to seconds; matches how sellers actually work (photos first).
- **Effort**: High. Requires vision model integration, prompt engineering, validation UI, and confidence scoring.
- **Fits roadmap**: Extends existing `dashboard.js` Ollama generation to the demo; could use NIM for higher-quality results.
- **Suggested issue**: #41 — Photo-first AI listing generation.

#### A2. Mobile-optimized capture flow
**Idea**: A mobile-first view with camera access, guided shot prompts (front, back, label, detail, flaw), and immediate draft creation.
- **User value**: Depop/Grailed are mobile-native; capturing on desktop is awkward.
- **Effort**: High. Needs camera API, PWA considerations, responsive redesign.
- **Suggested issue**: #42 — Mobile photo-capture listing flow.

#### A3. Measurement templates with auto-overlay
**Idea**: Choose category (top/pants/dress/shoes/bag) → input primary measurements → generate a clean measurement overlay image (like List Perfectly) and auto-format the description field.
- **User value**: Reduces buyer fit questions and returns; Grailed listings with measurements sell ~40% more. Standardized, photographed measurements are the #1 return-prevention tactic in resale. ([Thrift AI return-proof listings](https://www.thrifting.app/blog/return-proof-resale-listings-photos-measurements-disclosure-system))
- **Effort**: Medium. Canvas/DOM image generation; template JSON per category.
- **Suggested issue**: #43 — Category-aware measurement templates.

### Theme B: Platform-native optimization

#### B1. Platform-specific photo cropping
**Idea**: After upload, render variants per platform: Depop 1:1 square, Grailed 4:5, Poshmark 1:1, etc. Let user confirm or adjust crop per destination.
- **User value**: Stops auto-crop surprises; maximizes cover-photo impact.
- **Effort**: Medium. Canvas cropper UI + per-platform aspect map.
- **Suggested issue**: #44 — Per-platform photo crop/aspect ratio.

#### B2. Fee & payout calculator
**Idea**: When entering price, show estimated net payout for each connected platform side-by-side, plus a reverse calculator ("I want $X net → list at $Y").
- **User value**: Removes the #1 pricing confusion; helps sellers choose platforms strategically.
- **Effort**: Low–Medium. Static fee table + simple math; maintain fee-change dates for trust.
- **Evidence**: Tools like Strooply and FlowLister show real 90-day sold comps plus net profit after fees as a core UX pattern. ([Strooply](https://strooply.com/), [FlowLister sold-comp pricing](https://flowlister.com/features/sold-comp-pricing/))
- **Suggested issue**: #45 — Platform fee/payout calculator.

#### B3. Platform-specific AI optimization
**Idea**: Extend `/api/improve` to return platform-specific variants: Depop (hashtags, short vibe copy), Grailed (brand/era/spec-heavy, 10 tags), Poshmark (social tone), etc.
- **User value**: Copy-pasting identical descriptions across platforms underperforms.
- **Effort**: Low–Medium. Prompt variants + UI selector.
- **Suggested issue**: #46 — Per-platform AI listing variants.

#### B4. Saved templates / brand defaults
**Idea**: Save default category, size, condition, shipping, and tags per brand or item type; apply in one click.
- **User value**: Resellers often list similar items repeatedly.
- **Effort**: Low. localStorage templates + apply button.
- **Suggested issue**: #47 — Listing templates and brand defaults.

### Theme C: Smoother publish

#### C1. Grailed-initiated cross-list from extension popup
**Idea**: Extension popup currently only parses Depop. Add Grailed listing detection so users can cross-list from Grailed → Depop too.
- **User value**: Completes the "either side" vision.
- **Effort**: Medium. New content script parser for Grailed + popup branch.
- **Suggested issue**: #48 — Grailed-initiated cross-list via popup.

#### C2. Auto-fill Depop category/condition/brand/size
**Idea**: Currently Depop only gets description + price. Map structured fields from our draft into Depop's create form.
- **User value**: Fewer manual clicks on Depop.
- **Effort**: Medium. DOM inspection + chained selects (similar to Grailed work already done).
- **Suggested issue**: #49 — Depop structured-field autofill.

#### C3. Publish progress / stepper
**Idea**: When bulk publishing or publishing a single item, show a progress UI with per-platform status and any errors.
- **User value**: Bulk publish currently runs silently-ish; users need feedback.
- **Effort**: Low. UI state already exists; add progress panel.
- **Suggested issue**: #50 — Publish progress and error panel.

### Theme D: Inventory management & trust

#### D1. Sold-state sync for Grailed
**Idea**: Passive scrape Grailed seller profile/listings page to detect sold/removed items and mirror status in inventory, like Depop scraper does.
- **User value**: One step toward preventing double-sells.
- **Effort**: Medium. New content script + status mapping.
- **Suggested issue**: #51 — Grailed sold-state detection.

#### D2. Manual "Mark as sold / delist everywhere"
**Idea**: In the inventory card, a "Mark sold" button that opens each platform listing so the user can delist quickly; eventually automate delist.
- **User value**: Immediate response to sale = lower double-sell risk.
- **Effort**: Low. UI + open URLs in tabs.
- **Suggested issue**: #52 — One-click mark-as-sold / delist helper.

#### D3. Inventory analytics / stale listing alerts
**Idea**: Track listing age, last bump/share, platform status; surface "Needs refresh" or "Consider dropping price" suggestions.
- **User value**: Visibility on stale inventory and next best action.
- **Effort**: Medium. Date math + suggestion engine + UI badges.
- **Evidence**: 2025 reseller dashboards (Reseller Numbers, REPDASH, Underpriced AI) standardize inventory aging (30/60/90+ days), stale flags, and sell-through velocity. ([Reseller Numbers](https://resellernumbers.com/), [REPDASH](https://www.rep-dash.com/), [Underpriced AI analytics](https://underpricedai.com/features/analytics))
- **Suggested issue**: #53 — Stale-listing alerts and refresh suggestions.

#### D4. Condition grading & disclosure helper
**Idea**: Provide a 5-level condition scale, flaw-location fields, and a disclosure template that auto-formats copy like: "Good vintage condition. Pinhead snag on front left — see photo 9. Freshly laundered."
- **User value**: Prevents returns and "item not as described" disputes; vague condition language is a leading return magnet. ([Thrift AI return-proof listings](https://www.thrifting.app/blog/return-proof-resale-listings-photos-measurements-disclosure-system), [Robnu listing content that reduces returns](https://robnu.com/blog/listing-content-that-reduces-returns))
- **Effort**: Low–Medium. Structured inputs + description assembly.
- **Suggested issue**: #56 — Condition grading & disclosure helper.

### Theme E: Onboarding & polish

#### E1. Guided first-listing walkthrough
**Idea**: On empty state, a step-by-step guide: upload photo → AI fills fields → improve → publish. Include a sample listing users can play with.
- **User value**: Reduces first-use drop-off.
- **Effort**: Low. Tooltip/tour component + seed data.
- **Suggested issue**: #54 — First-listing onboarding tour.

#### E2. Draft auto-save & recovery
**Idea**: Save draft as user types; restore after refresh or accidental close.
- **User value**: Prevents lost work, especially on long descriptions.
- **Effort**: Low. Debounced localStorage save.
- **Suggested issue**: #55 — Form draft auto-save.

---

## 5. Recommended sequencing

For the next sprint or two, focus on **high user value, low-to-medium effort** items that build on existing architecture:

1. **B2 Fee & payout calculator** — quick win, high seller value.
2. **E2 Draft auto-save** — quick win, prevents frustration.
3. **B3 Platform-specific AI optimization** — extends existing NIM route.
4. **C3 Publish progress / error panel** — improves the bulk feature just shipped.
5. **A3 Measurement templates** — high conversion impact on Grailed.
6. **D2 Mark-as-sold / delist helper** — trust/safety win, low effort.
7. **D4 Condition grading & disclosure helper** — reduces returns, low effort.

Then move to larger bets:

8. **A1 Photo-first AI generation** — core differentiator.
9. **B1 Per-platform photo cropping** — conversion lift.
10. **C2 Depop structured-field autofill** — reduces publish friction.
11. **D1 Grailed sold-state detection** + unified sync → eventual auto-delist.
12. **A2 Mobile capture flow** — unlocks true mobile-first listing.

---

## 6. New issue proposals

| # | Issue title | Theme | Effort | Value | Note |
|---|---|---|---|---|---|
| 41 | Photo-first AI listing generation | A1 | High | Very High | Vision + NIM prompt pipeline |
| 42 | Mobile photo-capture listing flow | A2 | High | High | Camera API + responsive design |
| 43 | Category-aware measurement templates | A3 | Medium | High | Overlay image + auto-format |
| 44 | Per-platform photo crop/aspect ratio | B1 | Medium | High | Canvas cropper |
| 45 | Platform fee/payout calculator | B2 | Low | High | Quick win |
| 46 | Per-platform AI listing variants | B3 | Low–Medium | High | Extend `/api/improve` |
| 47 | Listing templates and brand defaults | B4 | Low | Medium | Saved presets |
| 48 | Grailed-initiated cross-list via popup | C1 | Medium | High | Complete "either side" flow |
| 49 | Depop structured-field autofill | C2 | Medium | High | Chained selectors |
| 50 | Publish progress and error panel | C3 | Low | Medium | Better bulk UX |
| 51 | Grailed sold-state detection | D1 | Medium | High | Mirror Depop scraper |
| 52 | One-click mark-as-sold / delist helper | D2 | Low | High | Trust/safety |
| 53 | Stale-listing alerts and refresh suggestions | D3 | Medium | Medium | Analytics-like |
| 54 | First-listing onboarding tour | E1 | Low | Medium | Reduce drop-off |
| 55 | Form draft auto-save | E2 | Low | Medium | Prevent lost work |
| 56 | Condition grading & disclosure helper | D4 | Low–Medium | High | Reduce returns/INAD disputes |

Existing issues (#9 analytics, #24 production scaling, #31 CWS packaging, custom domain) stay parallel; these UX issues are new user-facing backlog items.

---

## 7. Sources

- [How to Cross List on Multiple Platforms: Complete 2026 Guide — Secnd](https://www.secnd.ca/blog/how-to-cross-list-multiple-platforms)
- [How to Sell on Multiple Platforms Without Losing Your Mind — Sell The Flip](https://selltheflip.com/blog/how-to-sell-on-multiple-platforms)
- [Best Cross-Listing Tools for Resellers (2026) — Snappyit](https://snappyit.ai/blog/best-cross-listing-tools-for-resellers-2026)
- [Inventory Sync: How to Prevent Double Selling in 2025 — Closo](https://closo.co/blogs/optimization-growth-strategies/inventory-sync-how-to-prevent-double-selling-in-2025)
- [Depop Help Centre — How to list an item](https://depophelp.zendesk.com/hc/en-gb/articles/360032716413-How-do-I-list-an-item)
- [Depop Help Centre — Listing on web](https://depophelp.zendesk.com/hc/en-gb/articles/8608273715217-Listing-on-web)
- [How Depop improved listing quality with AI photo editing — Photoroom](https://www.photoroom.com/customer-stories/depop)
- [How to sell fast on Depop 2025 — Photoroom](https://www.photoroom.com/blog/sell-fast-on-depop)
- [Grailed How to Sell Guide](https://howtosell.grailed.com/)
- [Grailed Not Selling? 9 Fixes — QuickList AI](https://quicklistai.org/grailed-not-selling/)
- [Grailed AI Listings — QuickList AI](https://quicklistai.org/grailed-ai-listings-guide/)
- [Poshmark vs Mercari: 6 years selling — Closo](https://closo.co/blogs/platform-specific-guides/poshmark-vs-mercari-what-i-learned-after-selling-on-both-for-6-years)
- [How I redesigned the Poshmark Listing flow — Medium](https://medium.com/@srini200249/how-i-redesigned-the-poshmark-listing-flow-to-reduce-cognitive-load-resulting-in-a-faster-listing-4c0eabcf8e32)
- [Crosslist — Create Listings with AI](https://crosslist.com/features/create-listings-with-ai)
- [ResellerIO — AI Inventory for Resellers](https://resellerio.com/)
- [Storay features](https://storay.app/features)
- [List Perfectly Measurement Templates](https://listperfectly.com/selling/new-list-perfectly-measurement-templates/)
- [Listed AI](https://listedai.app/en/)
- [Strooply — snap a photo, list to eBay](https://strooply.com/)
- [FlowLister — sold-comp pricing](https://flowlister.com/features/sold-comp-pricing/)
- [FeePilot marketplace fee calculator](https://www.feepilot.app/)
- [SellerFeeCalc](https://sellerfeecalc.com/)
- [Grailed vs Depop vs Poshmark vs eBay fees 2026 — Free Live Calculators](https://freelivecalculators.com/grailed-fee-calculator/articles/grailed-vs-depop-vs-poshmark-fees/)
- [Reselling with precision: standardizing templates across channels — Closo](https://closo.co/blogs/ai-agents/reselling-with-precision-standardizing-listing-templates-across-channels-in-2026)
- [Snappyit — reseller photography guide](https://snappyit.ai/blog/how-to-photograph-thrifted-clothes-for-resale)
- [FlipSail — reseller photography routine](https://www.flipsail.io/blog/reseller-photography-guide)
- [Magic Eraser — Depop & Poshmark AI photo editing](https://magiceraser.live/en/blog/depop-poshmark-listing-photos-ai)
- [GOAT Alias product teardown 2025 — Medium](https://medium.com/@BrittanyDesigns/goat-alias-app-product-teardown-2025-seller-focus-ce629098ead9)
- [Fashion AI Daily — TheRealReal vs Fashionphile vs Vestiaire](https://fashionaidaily.com/blog/therealreal-vs-fashionphile-vs-vestiaire-2026/)
- [Lifehacker — Vestiaire Collective vs. The RealReal](https://lifehacker.com/tech/vestiaire-collective-vs-therealreal-which-is-the-better-luxury-resale-app)
- [AdoptKit — Chrome extension onboarding best practices](https://www.adoptkit.com/posts/chrome-extension-onboarding-best-practices)
- [Crxlytics — first 60 seconds decide retention](https://www.crxlytics.com/blog/chrome-extension-onboarding)
- [LogRocket — offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Parallel Loop — offline-first web apps with IndexedDB](https://www.parallelloop.io/blogs/building-offline-first-web-applications-with-indexeddb)
- [Reseller Numbers — analytics dashboard](https://resellernumbers.com/)
- [REPDASH — eBay & Vinted seller intelligence](https://www.rep-dash.com/)
- [Underpriced AI — business analytics](https://underpricedai.com/features/analytics)
- [Thrift AI — return-proof resale listings](https://www.thrifting.app/blog/return-proof-resale-listings-photos-measurements-disclosure-system)
- [Robnu — listing content that reduces returns](https://robnu.com/blog/listing-content-that-reduces-returns)
- [Fitit — AI garment measurement tools](https://fitit.ai/solutions/marketplaces/)
- [Kompassify — empty states UX guide](https://kompassify.com/blog/empty-states-guide)
- [Tolinku — first-time user experience](https://tolinku.com/blog/first-time-user-experience/)
- [Atticus Li — empty states as conversion tools](https://atticusli.com/blog/posts/empty-states-conversion-tools-design-users-nothing-yet/)
- [Mercari H2 2025 transparency report](https://pj.mercari.com/transparency-report/2025_2H_TransparencyReport_EN.pdf)
- [Mercari eKYC case study](https://careers.mercari.com/en/mercan/articles/58561/)
- [Proof.show — marketplace photo verification](https://proof.show/solutions/marketplaces)
- [LOW/CODE — build a luxury resale marketplace](https://www.lowcode.agency/blog/how-to-build-a-luxury-resale-marketplace)
- [Crosslist — CSV import guide](https://docs.crosslist.com/knowledge-base/listing-management/csv-import)
- [Restock.gg — CSV import](https://docs.restock.gg/features/inventory/csv-import)
- [Garnet Marketplace — CSV upload](https://garnetmarketplace.com/docs/listings/csv-upload.html)
- [Everlyst — common CSV upload errors](https://everlysthq.com/help/csv-workflows/common-csv-upload-errors/)

---

## 8. Additional research notes

### 8.1 Photo-capture UX best practices

Based on 2025 reseller photography guides, the ideal capture flow is **guided, platform-aware, and honest about condition**:

- **Shot checklist**: front full, back full, brand/size tag, fabric/detail, flaw, hem/cuff, on-model/lifestyle. Lock users into required shots before finishing. ([Snappyit reseller photography guide](https://snappyit.ai/blog/how-to-photograph-thrifted-clothes-for-resale))
- **Real-time feedback**: crooked horizon, blur, under/over-exposure, color cast, garment fill (~70% of frame). ([FlipSail reseller photography routine](https://www.flipsail.io/blog/reseller-photography-guide))
- **Display-method guidance**: flat lay for knits/accessories; hanger for blazers/coats/dresses; AI on-model for fit-critical pieces. ([Snappyit studio setup guide](https://snappyit.ai/blog/reseller-home-studio-setup))
- **AI guardrails**: allow background removal / color correction on display shots, but **disable retouching on flaw shots** or watermark them as actual condition. ([Magic Eraser Depop/Poshmark AI editing guide](https://magiceraser.live/en/blog/depop-poshmark-listing-photos-ai))
- **Batch mode**: full-time resellers shoot 15–20 items/session. Session settings should persist across items.

Implication for Second Skin: the long-term mobile capture flow should not just be a camera wrapper; it should be a **photography coach** with required shots, platform overlays, and AI cleanup scoped per shot type.

### 8.2 Luxury resale (GOAT/Alias, Vestiaire, The RealReal)

For higher-end fashion, the pain points shift from listing speed to **trust, payout transparency, and authentication**:

- **GOAT/Alias**: opaque authentication statuses, photo uploads that disappear, no pre-listing inventory dashboard, poor seller support. ([GOAT Alias product teardown 2025](https://medium.com/@BrittanyDesigns/goat-alias-app-product-teardown-2025-seller-focus-ce629098ead9))
- **Vestiaire Collective**: 15% total seller cost, unexplained listing removals, slow payouts (~6 weeks), authentication adds 10–14 days. ([Fashion AI Daily fee comparison](https://fashionaidaily.com/blog/therealreal-vs-fashionphile-vs-vestiaire-2026/))
- **The RealReal**: algorithmic markdowns erode payouts, 35–55% commission for standard sellers, 1–2 month payouts, authentication trust issues. ([Lifehacker Vestiaire vs TRR](https://lifehacker.com/tech/vestiaire-collective-vs-therealreal-which-is-the-better-luxury-resale-app))

Implication: if Second Skin expands into authenticated/luxury marketplaces, **payout projection** and **condition/photo evidence** become even more important than speed.

### 8.3 Extension popup onboarding gaps

Current popup (`popup.html`) is minimal: it detects Depop, parses, and opens the demo. It does not guide new users after install.

2025 extension UX best practices ([AdoptKit extension onboarding](https://www.adoptkit.com/posts/chrome-extension-onboarding-best-practices), [Crxlytics first 60 seconds](https://www.crxlytics.com/blog/chrome-extension-onboarding)):

- **Post-install welcome page**: open a bundled `welcome.html` via `chrome.runtime.onInstalled` with one clear CTA and a "pin to toolbar" guide.
- **Inline-action onboarding**: the highest-activation pattern. For Second Skin, that could be "click the icon on a Depop listing to see the magic."
- **Focused popup**: one primary action, 350–400px wide, explicit loading/success/error states.
- **Defaults over configuration**: pre-fill allowed origins; advanced config lives in the options page.

Opportunity: add a `welcome.html` + pin guide, and improve the popup's empty/error states (e.g., when not on a supported page, show "Open a Depop or Grailed listing" instead of just disabling the button).

### 8.4 Local-first storage architecture

Second Skin currently stores inventory in **localStorage** in the demo and `chrome.storage.local` in the extension. For the current POC this is fine, but it has limits:

- `localStorage` is synchronous, ~5 MB, string-only, and blocks the main thread.
- Photos as data-URIs will quickly consume quota.
- No schema versioning or migrations.
- Safari can wipe script-writable storage after 7 days of inactivity.

2025 best practice for local-first apps ([LogRocket offline-first guide](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/), [Parallel Loop IndexedDB guide](https://www.parallelloop.io/blogs/building-offline-first-web-applications-with-indexeddb)):

- Use **IndexedDB** (or OPFS for large blobs) for inventory and photos.
- Use a wrapper like `idb` or a higher-level local-first DB.
- Implement **schema versioning & migrations** from the start.
- Add durable sync status UI: "saved locally," "syncing," "up to date."
- Check storage quota proactively with `navigator.storage.estimate()`.

This is not urgent for the POC, but should be on the roadmap before adding bulk image uploads or cross-device sync.

### 8.5 Onboarding and empty-state gaps

Current Second Skin empty state: "No listings yet. Create your first listing, or import one from a Depop URL or the extension popup."

2025 onboarding best practices for listing/marketplace apps ([Kompassify empty states guide](https://kompassify.com/blog/empty-states-guide), [Tolinku first-time UX](https://tolinku.com/blog/first-time-user-experience/), [Atticus Li empty states](https://atticusli.com/blog/posts/empty-states-conversion-tools-design-users-nothing-yet/)):

- The empty state is the onboarding moment: confirm nothing is broken, name the space, explain value, offer one clear primary action.
- Reduce blank-canvas anxiety with **sample listing previews**, **templates**, and **pre-filled AI drafts**.
- Use endowed progress: "Account created ✓ → List first item → Make first sale."
- Celebrate the first listing completion.

Opportunity for Second Skin:
- Replace the generic empty state with a **playable sample listing** (e.g., the seed Vintage NIN tee from `dashboard.js`) that lets users experience upload → improve → publish without creating real inventory.
- Add a **progress checklist** for first-time sellers.
- Add a **template picker** (t-shirt, pants, jacket, dress, shoes, bag) that pre-fills the measurement template.

### 8.6 Trust, safety, and verification

2025 marketplaces are shifting from platform moderation to **seller-level verification** and **photo evidence**:

- **Mercari**: 78% of transactions by eKYC-verified users; mandatory eKYC for high-value items; passkeys, AI fraud monitoring, and an appraisal center. ([Mercari H2 2025 transparency report](https://pj.mercari.com/transparency-report/2025_2H_TransparencyReport_EN.pdf), [Mercari eKYC case study](https://careers.mercari.com/en/mercan/articles/58561/))
- **Proof.show**: cryptographic/live photo verification with an 8-character proof code and SHA-256 timestamp to fight AI/stolen photos. ([Proof.show marketplaces](https://proof.show/solutions/marketplaces))
- **Luxury resale**: authentication is the product; KYC for items $500+, escrow, 6–12 high-res photos, third-party authenticators. ([LOW/CODE luxury resale guide](https://www.lowcode.agency/blog/how-to-build-a-luxury-resale-marketplace))

Implication for Second Skin: as the tool expands, consider a **condition-photo evidence** requirement (especially for flaw shots) and optional **listing verification badges** to increase buyer trust. Not urgent for the POC, but important if moving into higher-value categories.

### 8.7 Bulk CSV import learnings

If Second Skin later supports importing inventory from spreadsheets (common in 2025 tools), the UX should:

- Provide a strict template with enumerated values (category, size, condition).
- Show a **preview + field mapping** step before import.
- Report errors **per row/field**, not reject the entire file.
- Allow re-importing only failed rows after fixes.
- Validate that referenced categories/sizes/shipping profiles exist.
- Match image filenames exactly to uploaded ZIP contents.

Sources: [Crosslist CSV import](https://docs.crosslist.com/knowledge-base/listing-management/csv-import), [Restock.gg CSV import](https://docs.restock.gg/features/inventory/csv-import), [Garnet Marketplace CSV upload](https://garnetmarketplace.com/docs/listings/csv-upload.html), [Everlyst CSV errors](https://everlysthq.com/help/csv-workflows/common-csv-upload-errors/)

---

*Document generated during the 2026-07-30 Second Skin UX research loop.*
