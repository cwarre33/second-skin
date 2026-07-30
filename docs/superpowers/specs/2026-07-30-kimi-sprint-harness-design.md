# Design: Kimi-k3 Claude Code Sprint Harness (2026-07-30)

Approved via brainstorming (Approach B). This document records the design for a single-session Claude Code harness powered by `kimi-k3:cloud` that completes today’s Phase 1 must-ship work while updating GitHub Project 4.

## Goal

Give Claude Code (`ollama launch claude --model kimi-k3:cloud`) a paste-ready sprint brief and mandatory loop protocol so it finishes must-ship board work and keeps Project **4** (`Second Skin – SOP-CROSSLIST-001`) truthful as it goes.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Scope | **3 + stretch** — must-ship `#28 → #30 → #8 → #29 → #32`; stretch `#31 → #9 → #24` |
| Runtime | `ollama launch claude --model kimi-k3:cloud` |
| Orchestration | Single long Claude Code session; brief mandates standard issue loop |
| NIM | Real NVIDIA NIM; `NVIDIA_API_KEY` from `.env` |
| Board | Owner `cwarre33`, project number `4`; Status field `PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4` |
| Queue source of truth | GitHub Project board (no parallel JSON queue) |

## 1. Architecture

```text
You
  └─ ollama launch claude --model kimi-k3:cloud
        ├─ reads CLAUDE.md + sprint brief + loop-protocol.md
        ├─ gh project item-edit  →  GitHub Project 4
        ├─ commits / code        →  second-skin repo
        └─ loads NVIDIA_API_KEY  ←  .env (never committed)
```

### Artifacts

| Path | Role |
|------|------|
| `CLAUDE.md` | Repo standing orders |
| `docs/sprints/loop-protocol.md` | Canonical per-issue loop + `gh` recipes |
| `docs/sprints/2026-07-30-brief.md` | Today’s paste-at-launch brief |
| `.env.example` | Placeholder for `NVIDIA_API_KEY` |
| `.gitignore` | Ignores `.env` / `.env.*` (keeps `.env.example`) |

## 2. Loop protocol

One issue at a time. Board is authoritative.

1. Pick next issue from ordered queue  
2. Set Status = **In Progress** on Project 4  
3. Read issue body + acceptance criteria  
4. Implement smallest slice that meets Definition of Done  
5. Verify (tests / manual checklist for that issue)  
6. Commit with issue ref  
7. Set Status = **Done**; comment summary on the issue  
8. If must-ship remains → go to 1; else enter stretch queue  

### Hard rules

- Only one Status=In Progress at a time  
- Fixed must-ship order: `#28 → #30 → #8 → #29 → #32`  
- Stop gates (ask human, don’t invent): secrets already in `.env` are OK to use; ask for deploy credentials / analytics account IDs  
- Never mark Done on stubs unless the issue explicitly allows it  
- Stretch (`#31 → #9 → #24`) only after all five must-ship are Done  
- EOD: comment on epic `#7` with Done / leftover / run instructions  

## 3. Today’s issue order + DoD

### Preflight (before first In Progress)

- Ensure `.env` is gitignored (`git check-ignore -v .env`)  
- `gh auth status` includes `project` scope  
- Confirm Status option ids (Todo / In Progress / Done)  
- Confirm `NVIDIA_API_KEY` is available via `.env` for the demo API  

### Must-ship

| Order | Issue | DoD |
|------|-------|-----|
| 1 | **#28** Scaffold `demo/` | `demo/` boots locally; paste/manual title/description/tags; calls `/api/improve`; no auth; hooks ready for extension messages |
| 2 | **#30** Web ↔ extension messaging | `externally_connectable` for local demo origin(s); message types `PING`, `PARSE_DEPOP`, `AUTOFILL_GRAILED`; origin checks; graceful missing-extension |
| 3 | **#8** NIM integrate | Server route holds key from env (not client); `POST` `{platform,title,description,tags?}` → `{title,description,tags}`; basic abuse cap; works with no signup |
| 4 | **#29** Depop scrape for bridge | On request, parse listing fields into structured payload for demo; manual paste remains fallback |
| 5 | **#32** Grailed autofill from demo job | Accept demo job payload; open Grailed `/sell`; fill title/description/tags; images/sizing stay manual |

### Stretch (only after must-ship Done)

| Order | Issue | Minimum bar |
|------|-------|-------------|
| 6 | **#31** | Copy buttons + install-extension CTA on demo |
| 7 | **#9** | Public deploy URL; analytics if accounts exist, else comment blocker |
| 8 | **#24** | Queue/cache or documented rate-limit path on top of `#8`’s basic cap |

### Out of scope today

- Full `#6` fashion-baseline rewrite  
- Closing epic `#7` unless children warrant it (prefer EOD comment)  
- Poshmark (Grailed-only demo slice)

## 4. Success criteria + launch

### Must-ship success

- Project 4 shows `#28`, `#30`, `#8`, `#29`, `#32` as **Done**  
- Local path works: paste or Depop scrape → Improve (NIM) → Grailed autofill for title/description/tags  
- `.env` never committed  
- Epic `#7` has an EOD sprint comment  

### Stretch success

- `#31` and/or `#9` and/or `#24` Done in that order without breaking must-ship  

### Human launch

1. Confirm Ollama Pro/Max + `kimi-k3:cloud` access  
2. From repo root: `ollama launch claude --model kimi-k3:cloud`  
3. Paste the First message block from `docs/sprints/2026-07-30-brief.md`  
4. Ensure `.env` has `NVIDIA_API_KEY` and is ignored  
5. Be available for Chrome extension reload / deploy gates on stretch  

## Rejected alternatives

- **Approach A (brief-only):** too weak on loop discipline  
- **Approach C (JSON queue):** overkill; risks drifting from the board  
- **External issue-loop wrapper:** deferred; single session + hard protocol is enough for one day  
