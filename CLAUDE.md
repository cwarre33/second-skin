# CLAUDE.md — Second Skin standing orders

Instructions for Claude Code (including `ollama launch claude --model kimi-k3:cloud`) working in this repository.

## Product

**Second Skin** is a fashion-first cross-listing tool (Depop → Grailed demo slice). Planning lives on GitHub Project **4** (`Second Skin – SOP-CROSSLIST-001`), owner `cwarre33`.

## Repo shape

- The **Chrome Manifest V3 extension is the repo root** (`manifest.json`, `background.js`, `content_*.js`, `dashboard.*`, `shared.js`). There is no `extension/` subdirectory.
- Phase 1 public surface is **`demo/`** (scaffold if missing). No signup for the demo path.
- **Poshmark is out of scope** for the current demo slice (Grailed only).
- Local AI experiments may use Ollama; the **demo improve path uses NVIDIA NIM** via server-side env (`NVIDIA_API_KEY` in `.env`).

## Secrets

- Never commit `.env` or real API keys.
- Prefer `.env` + `.env.example` (placeholder only).
- Preflight: `git check-ignore -v .env` must show a match.

## When a sprint brief is active

1. Read and obey [`docs/sprints/loop-protocol.md`](docs/sprints/loop-protocol.md).
2. Read the active brief under `docs/sprints/` (e.g. `2026-07-30-brief.md`).
3. Process **one issue at a time** in the brief’s fixed order.
4. Update Project **4** Status (In Progress → Done) as you go via `gh`.
5. Do not start stretch work until all must-ship items are Done on the board.

### Board quick reference

| Key | Value |
|-----|-------|
| Owner | `cwarre33` |
| Project # | `4` |
| Project node id | `PVT_kwHOChtZ-s4Beuq9` |
| Status field | `PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4` |
| Todo / In Progress / Done | `f75ad846` / `47fc9ee4` / `98236657` |

## Engineering norms

- Prefer smallest change that meets the issue’s Definition of Done.
- Reuse existing Grailed/Depop helpers (`content_grailed.js`, `content_depop.js`, `shared.js`, `background.js`) instead of rewriting the inventory dashboard.
- For messaging: `externally_connectable` + external message types with strict origin checks.
- Keep NIM keys **server-side only** (demo API route), never in client bundles or extension code shipped to the browser as plaintext secrets.
- Run existing tests when touching covered files (`test/`); add focused tests when practical.
- Commit messages: concise, include `(#N)` for the issue.

## Stop and ask

Deploy accounts, analytics IDs, production secrets, or anything not in `.env` / the brief — ask the human. Do not invent credentials.
