# Weekly Top-3 Triage Loop

> Issue **#27** — Weekly top-3 feature request triage loop.
> Autonomous artifact: a repeatable weekly template + checklist the operator
> runs to turn signal into shipped work. No external accounts required to use
> the template.

## Cadence

One triage pass per week (suggest Friday EOD or Monday AM). Goal: pick the
**top 3** items to act on next week from all the signal collected this week, and
close the loop publicly where the signal came in.

## Signal sources (collect)

Pull from, in rough order of weight:

1. **Clarity replays/heatmaps** — patterns from `docs/gtm/feedback-protocol.md`
   daily log (rage clicks, dead clicks, drop-off).
2. **GoatCounter events** — spikes/drops in `parse_depop_*`, `autofill_grailed_*`,
   `publish_*`, `improve_*` events (see `demo/hooks/useAnalytics.js` track calls
   in `demo/pages/index.js`).
3. **Community threads** — Reddit / Indie Hackers / Show HN / Facebook / Discord
   comments (see GTM packs in `docs/gtm/`).
4. **GitHub issues** — new issues, reactions, and comments on `cwarre33/second-skin`.
5. **Direct feedback** — email, DMs.

## Triage template (copy into the running log each week)

```markdown
## Week of YYYY-MM-DD

### Signal collected
- [Clarity] <pattern, count, replays watched>
- [GoatCounter] <event deltas>
- [Community] <thread + gist>
- [GitHub] <issue #s + reactions>
- [Direct] <source + gist>

### Raw candidates
| # | Source | Signal | Type | Effort | Impact | Score |
|---|--------|--------|------|--------|--------|-------|
| 1 | Clarity | rage-click on Publish button | bug | S | M |  |
| 2 | Reddit | "wish it filled category" | feature | M | L |  |
| 3 | GH #49 | structured-field autofill | feature | L | L |  |

### Top 3 for next week
1. **<title>** — owner, why now, done-when
2. **<title>** — owner, why now, done-when
3. **<title>** — owner, why now, done-when

### Closed loop (public replies sent)
- <thread + reply link>

### Deferred (with reason)
- <item> — why not now
```

## Scoring (quick rubric)

Score = Impact × Likelihood-it's-real × (1 / Effort). Use small numbers:

- **Impact**: S=1, M=2, L=3 (how many users / how painful)
- **Likelihood**: S=1, M=2, L=3 (is this one user or a pattern?)
- **Effort**: S=3, M=2, L=1 (small effort inverts to a higher score)

`Score = Impact × Likelihood × Effort-inverted`. Top 3 by score win. Ties broken
by "is it a bug" (bugs win) and by how recent the signal is.

## Checklist (each weekly pass)

- [ ] Collected signal from all 5 sources into the template.
- [ ] Scored every candidate; picked top 3.
- [ ] Filed a GitHub issue for any top-3 item that doesn't have one (or linked
      the existing one). Set Project 4 Status = Todo.
- [ ] Replied publicly on every community thread that produced a top-3 item
      (disclose the operator is the builder; no spam).
- [ ] Updated last week's top-3 with outcome (shipped / in-progress / deferred).
- [ ] Posted the week's top-3 summary as a comment on epic #7 (or #6) so the
      loop is visible.

## Script (optional, read-only)

A tiny helper to list the week's GitHub issue signal without leaving the
terminal. Read-only; safe to run anytime.

```bash
# Issues touched this week on the repo (created or commented in last 7 days).
gh issue list --repo cwarre33/second-skin --state all \
  --search "sort:updated-desc" --limit 20 \
  --json number,title,state,createdAt,updatedAt,comments \
  --jq '.[] | select(.updatedAt > (now - 604800 | todate)) | "#\(.number) [\(.state)] \(.title) (comments: \(.comments | length))"'
```

```bash
# Project 4 items not Done, sorted by recency — the backlog to pick from.
gh project item-list 4 --owner cwarre33 --limit 100 --format json \
  | python -c "import sys,json; d=json.load(sys.stdin); [print(i['id'],'|',(i.get('content') or {}).get('number'),'|',(i.get('content') or {}).get('title','')) for i in d['items']]"
```

## Verification (for #27 DoD)

- [x] \`docs/gtm/weekly-triage.md\` exists with a weekly template + checklist +
      a read-only helper script.
- [x] Template links to the feedback protocol (#14) and the GTM community packs.
- [x] No external accounts required to run the template; the script is read-only
      \`gh\` / \`python\` against the existing repo + Project 4.