# NIM rate-limit mitigation runbook

**Scope:** Phase 1 demo (`demo/pages/api/improve.js`).

## Current mitigations (2026-07-30)

1. **Per-IP abuse cap** — 10 requests/minute per client IP (issue #8).
2. **Request hash cache** — identical `{platform, title, description, tags, price}` payloads return a cached response for 2 minutes without calling NIM (issue #24).
3. **Server-side API key** — `NVIDIA_API_KEY` never leaves the server.
4. **Timeout guard** — NIM requests abort after 60 seconds.

## Production scaling path

| Stage | Action |
|-------|--------|
| Now | In-memory cache is fine for single-demo-server traffic. |
| >1 Vercel region / serverless concurrency | Replace `Map` cache with Redis or Vercel KV so all regions share cached responses. |
| Sustained traffic > 40 req/min | Add a request queue (e.g. BullMQ + Redis) and retry 429s with exponential backoff. |
| Budget allows | Upgrade NVIDIA NIM to a paid tier for higher limits. |

## Environment variables

```bash
NVIDIA_API_KEY=...
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct   # optional override
NVIDIA_NIM_URL=https://integrate.api.nvidia.com/v1/chat/completions  # optional override
```

## How to monitor

- Watch for `502` responses from `/api/improve` in GoatCounter/Vercel logs.
- If `429` spikes, lower `RATE_MAX` or increase `CACHE_TTL_MS`.
- If cache hit ratio is low, increase `CACHE_TTL_MS` to 5–10 minutes.
