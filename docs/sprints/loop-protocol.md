# Sprint Loop Protocol

Canonical “best standard of looping” for Second Skin agent sessions. When a sprint brief is active, follow this protocol strictly. The GitHub Project board is the source of truth — not chat memory.

## Project constants

| Key | Value |
|-----|-------|
| Owner | `cwarre33` |
| Project number | `4` |
| Project title | Second Skin – SOP-CROSSLIST-001 |
| Status field id | `PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4` |
| Status · Todo | `f75ad846` |
| Status · In Progress | `47fc9ee4` |
| Status · Done | `98236657` |

Repo: `cwarre33/second-skin`

## Hard rules

1. **Single active issue** — at most one project item with Status = In Progress.
2. **Ordered queue** — process issues in the order given by the active sprint brief. Do not reorder unless the human explicitly changes the brief.
3. **Board before code** — set In Progress before editing files for that issue; set Done only after verification.
4. **No invented secrets** — use `.env` / env vars the human provided. Ask before adding deploy credentials, analytics IDs, or new third-party accounts.
5. **Never commit `.env`** — verify `git check-ignore -v .env` during preflight.
6. **Stretch gate** — do not start stretch issues until every must-ship issue in the brief is Done on the board.
7. **Honest Done** — do not mark Done for stubs unless the issue explicitly allows a stub.
8. **Done requires `master`** — set Status = Done **only after** the work is committed **and** that commit is merged to `master` (not left on a `feat/*` branch). Branch → implement → test/build → merge to `master` → verify gates pass → then Done. If you cannot merge yet, keep Status = In Progress.

## Per-issue cycle

```text
pick next → In Progress → read AC → implement → verify → commit → merge to master → re-verify → Done + comment → next
```

### Step detail

1. **Pick next**  
   From the sprint brief queue, take the first issue that is not Done on Project 4.

2. **Set In Progress**  
   Resolve the project item id (see recipes), then:

   ```bash
   gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOChtZ-s4Beuq9 --field-id PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4 --single-select-option-id 47fc9ee4
   ```

3. **Read acceptance criteria**  
   ```bash
   gh issue view <N> --repo cwarre33/second-skin
   ```
   Implement only what the issue requires for today’s DoD in the brief.

4. **Implement**  
   Smallest slice that meets DoD. Prefer existing patterns in the MV3 extension root. `demo/` is the Phase 1 public surface.

5. **Verify**  
   Run the issue’s verification commands / manual checklist from the brief. If verification fails, fix or leave In Progress with an issue comment explaining the blocker — do not mark Done.

6. **Commit**  
   ```bash
   git add <paths>
   git commit -m "feat: <summary> (#<N>)"
   ```
   Do not include `.env`. Prefer one focused commit per issue when practical.

7. **Merge to `master`**  
   If work is on a `feat/*` branch, merge it to `master` (fast-forward or `--no-ff`) and verify the commit lands on `master`. Re-run test/build gates on `master`. **Do not mark Done until this is true** (see Hard rule 8).

8. **Set Done + comment**  
   ```bash
   gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOChtZ-s4Beuq9 --field-id PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4 --single-select-option-id 98236657
   gh issue comment <N> --repo cwarre33/second-skin --body "<what shipped + how to verify>"
   ```

9. **Next**  
   Repeat until must-ship is clear, then enter stretch (if any), then EOD.

## Board recipes

### List items

```bash
gh project item-list 4 --owner cwarre33 --limit 100 --format json
```

### Find item id for an issue number

Use `item-list` JSON: match `content.number` == issue number; use top-level `id` (starts with `PVTI_`).

### Set Status = Todo

```bash
gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOChtZ-s4Beuq9 --field-id PVTSSF_lAHOChtZ-s4Beuq9zhZGtL4 --single-select-option-id f75ad846
```

### Re-discover Status options (if ids change)

```bash
gh project field-list 4 --owner cwarre33 --format json
```

Look at the field named `Status` → `options`.

### Auth check

```bash
gh auth status
```

Token must include `project` (and typically `repo`).

## Stop gates (ask the human)

- Missing or invalid `NVIDIA_API_KEY` for real NIM calls  
- Production deploy credentials / hosting account access  
- Analytics account IDs (GoatCounter, Clarity)  
- Any action that would publish secrets or force-push  

If blocked: leave a comment on the issue, keep Status = In Progress (or move back to Todo if abandoning), and ask clearly.

## End of day

Comment on epic **#7** with:

- Must-ship Done list  
- Stretch Done / not started  
- How to run demo + load extension  
- Open blockers  

Do not force-close #7 unless the human asks or all children that define the epic are Done.
