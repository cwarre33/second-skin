# Second Skin — Demo

Phase 1 public surface for the Second Skin cross-listing tool.

## Run locally

```bash
cd demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No signup required. Paste a Depop URL or enter title/description/tags manually, then click **Improve** to call the local `/api/improve` route.

## Environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your NVIDIA_API_KEY for real NIM calls in issue #8.
```

## Extension bridge

The page attempts to detect the Second Skin Chrome extension via `chrome.runtime.sendMessage`. The extension must declare this demo origin in `externally_connectable` (issue #30).
