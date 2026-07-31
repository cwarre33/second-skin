# Sprint brief — 2026-07-31 (C → B → A, autonomous)

**Runtime:** Claude Code (prefer `ollama launch claude --model kimi-k3:cloud` or your current Claude Code model)  
**Protocol:** [`loop-protocol.md`](./loop-protocol.md) + this brief  
**Standing orders:** [`CLAUDE.md`](../../CLAUDE.md)

## Mission

Finish lanes **C → B → A** with **no human intervention** until the final EOD comment on epic `#7` (or a new issue comment on `#6` if `#7` is already closed). Iterate until every in-scope item meets its Definition of Done **on `master`**.

When finished, leave the repo clean on `master` so the human can export this session transcript back to Cursor for review.

## Non-negotiable Done gate (learned from prior sprint)

**Status = Done ONLY when ALL are true:**

1. Code/docs for the issue are committed  
2. Commit is on **`master`** (merge feature branch; do not leave work only on `feat/*`)  
3. Verification passed (`npm test` in `test/`; `npm run build` in `demo/` when demo touched)  
4. Issue has a completion comment with verify steps  
5. Project 4 Status field set to Done  

If you cannot merge yet, keep Status = **In Progress** (never mark Done on an unmerged branch).

## Subagent policy (Claude Code best practices)

You are the **lead / parent agent**. Use the Task tool / subagents deliberately.

### When to parallelize (fan-out)

Parallel only when **all** are true:

- Independent domains / no shared write targets  
- Arguments already known (do not batch a gate with the action that depends on it)  
- Prefer **3–5** concurrent subagents max  

Good parallel uses:

- Read-only explore of extension vs demo vs GTM docs  
- Lint/test/research in parallel after a merge  
- Drafting independent GTM copy docs that land in different files  

### When to stay sequential

- Shared files (`demo/pages/index.js`, `background.js`, `manifest.json`, `content_*.js`)  
- Anything that depends on a prior merge  
- Board Status edits (parent owns Project 4 updates)  

### Patterns

1. **Explore → Plan → Implement → Review** per issue (or per small cluster).  
2. Subagents return **structured summaries** (files touched, risks, verify commands). Parent validates before merging.  
3. If two implementers must run in parallel, give each a **disjoint file ownership** list; parent edits shared files. Prefer git worktrees / separate branches if your Claude Code build supports `isolation: worktree`.  
4. After each merge to `master`: parent runs tests/build, then board Done.  
5. Do **not** ask the human questions. If blocked (missing analytics IDs, cannot post to Reddit), ship the best in-repo artifact + document the blocker in the issue comment, and continue.

## Lane order (fixed)

### Lane C — Stabilize (first)

| Issue | Intent | DoD |
|-------|--------|-----|
| **#6** | Fashion-first MV3 baseline for demo bridge | Audit extension against Depop parse, Grailed autofill, `externally_connectable` demo origins. Fix any real gaps. Add a short `docs/architecture/extension-baseline.md` (or section in README) confirming baseline. Merge to `master`. Close/Done `#6` with evidence. |
| **Process** | Done-gate hygiene | Ensure UX issues `#44,#48,#49,#51,#53` exist on Project 4 (add if missing). Update `docs/sprints/loop-protocol.md` or `CLAUDE.md` with one explicit rule: **Done requires merge to master**. |
| **Structure** | Reduce merge pain | If `demo/pages/index.js` is still a megafile, extract **at least one** cohesive module/hook (e.g. publish log, templates, or measurements UI) without behavior change. Tests + build green. |

### Lane B — Phase 2 GTM / feedback (second)

Do **not** invent social accounts or actually post publicly. Ship ready-to-use artifacts in-repo.

| Order | Issue | DoD (autonomous) |
|------|-------|------------------|
| 1 | **#14** | Feedback protocol doc: Clarity daily checklist + 24h response SLA template in `docs/gtm/feedback-protocol.md`; wire any missing analytics hooks only if keys already exist in env; else document env vars needed. |
| 2 | **#27** | Weekly top-3 triage loop template + script/checklist in `docs/gtm/weekly-triage.md`. |
| 3 | **#10** | Reddit GTM pack: `docs/gtm/reddit/` with 4 draft posts (r/Depop, r/Grailed, r/Flipping, r/Resell), posting cadence, compliance notes. |
| 4 | **#11** | Indie Hackers + Show HN drafts in `docs/gtm/launch-posts.md`. |
| 5 | **#12** | Facebook Groups + Discord outreach scripts in `docs/gtm/community-outreach.md`. |
| 6 | **#13** | Product Hunt prep checklist + draft copy in `docs/gtm/product-hunt.md` (no PH account creation). |
| 7 | **#15** | Phase 2 success metrics dashboard stub or markdown scorecard in `docs/gtm/phase-2-metrics.md` with current measurable baselines filled from repo/analytics if available. |

Parallelize **drafting** of `#10/#11/#12` only if each writes different files; parent reviews + merges sequentially onto `master`.

### Lane A — Remaining UX (third)

Add to Project 4 if missing, then implement in this order (dependencies / risk):

| Order | Issue | Notes |
|------|-------|-------|
| 1 | **#49** | Depop structured-field autofill — extension/demo bridge |
| 2 | **#48** | Grailed-initiated cross-list via popup |
| 3 | **#51** | Grailed sold-state detection (honest UX; don’t claim auto-delist) |
| 4 | **#53** | Stale-listing alerts / refresh suggestions |
| 5 | **#44** | Per-platform photo crop/aspect ratio |

For each: branch → implement → test/build → **merge to `master`** → Done on board → next.

Out of scope unless time remains after A: `#41`, `#42`, `#35`, `#36`, `#37`.

## Preflight

```bash
git checkout master
git pull origin master
git check-ignore -v .env
gh auth status
gh project field-list 4 --owner cwarre33 --format json
cd test && npm test
cd ../demo && npm run build
```

Confirm Status ids still: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Project id `PVT_kwHOChtZ-s4Beuq9`.

## Execution loop (parent)

```text
while lanes remain:
  pick next issue from C then B then A
  set In Progress on Project 4
  spawn explore subagent(s) if needed (parallel OK if read-only)
  implement (sequential on shared files; subagent OK with file ownership)
  spawn review subagent (fresh context) for the diff
  fix findings
  merge to master
  run test + build
  set Done + issue comment
EOD comment summarizing C/B/A outcomes
```

## EOD

Comment on `#7` if open, else `#6`, with:

- Lane C / B / A Done lists (issue numbers)  
- `master` HEAD SHA  
- How to run demo + reload extension  
- Any deferred blockers (no secrets printed)  

---

## First message (paste into Claude Code)

```text
You are the lead Claude Code agent for Second Skin. Work AUTONOMOUSLY until finished — do not wait for human approval between steps.

Read and obey:
1. CLAUDE.md
2. docs/sprints/loop-protocol.md
3. docs/sprints/2026-07-31-cba-autonomous-brief.md

Lane order is FIXED: C (stabilize) → B (Phase 2 GTM artifacts) → A (UX #49 #48 #51 #53 #44).

Subagent rules:
- Use Task/subagents for explore + review; parallelize ONLY independent read-only or disjoint-file work (max 3–5).
- Parent owns merges, shared files (especially demo/pages/index.js, background.js, manifest.json), and GitHub Project 4 Status updates.
- NEVER mark Project Status Done until the work is merged to master AND test/build gates pass.
- Do not ask the human questions. If blocked, document the blocker on the issue and continue.
- Do not invent credentials or actually post to Reddit/IH/PH — ship in-repo drafts/checklists for GTM issues.
- Never commit .env or print NVIDIA_API_KEY.

Start with preflight from the brief, then Lane C issue #6.
When all three lanes meet DoD, leave the EOD comment and stop.
```
