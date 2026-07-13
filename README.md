# Second Skin

A local-first, zero-server cross-listing browser extension for reselling clothes (and eventually other items) across Grailed and Depop.

Built as a Chrome Extension (Manifest V3). No external API keys, no cloud backend, no account credentials leave your browser. Inventory lives in `chrome.storage.local`; listing automation runs inside your authenticated platform sessions via content scripts.

> Named after the slightly uncanny feeling that one garment can exist in two places at once.

## Status

MVP. Currently scoped to manage 5 inventory items and cross-list between **Depop** and **Grailed**.

## Architecture

- **Control Center** — `dashboard.html` / `dashboard.js`: full-page CRUD app and inventory manager.
- **Local Persistence** — `chrome.storage.local`: isolated JSON store for inventory and job state.
- **Background Orchestrator** — `background.js`: service worker for tab lifecycle and state management.
- **Automation & Scrapers** — `content_depop.js` / `content_grailed.js`: target-specific DOM automation injected into each platform.

## Project Structure

```
second-skin/
├── README.md
├── manifest.json
├── dashboard.html
├── dashboard.html
├── dashboard.js
├── content_depop.js
├── content_grailed.js
└── background.js
```

## Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `second-skin` directory.
4. Open the extension options (or right-click the icon → **Options**) to launch the dashboard.

## Usage

1. Add inventory items in the dashboard.
2. Click the platform button for an item to open that platform's listing page in a new tab.
3. The content script detects the active job and fills the form fields.
4. Images, sizing, category, and subcategory fields currently require manual completion (see Roadmap).

## Roadmap / Known Gaps

- Image upload via `DataTransfer` / File injection (platform selectors needed).
- Grailed multi-step category and designer selection.
- MutationObserver-based passive sync for sold-state detection.
- Quantity / multi-platform status polling.
- Generalize beyond clothes.

## License

MIT
