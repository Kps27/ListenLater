# Listen Later

Web prototype and Sprint 0 API for the MVP in [docs/listen-later-dev-handoff.md](docs/listen-later-dev-handoff.md).

## Run locally (recommended)

Two terminals:

```bash
npm install
npm run dev:api    # http://127.0.0.1:3333 — Bearer dev-guest-token
npm run dev:web    # http://127.0.0.1:8765/
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). On localhost the player uses the API for queue, extraction, sync (SSE), and shares. Set `localStorage.setItem('ll-use-api', '0')` to force offline-only mode.

Web-only (no API, Jina client fetch):

```bash
python3 -m http.server 8765
```

ES modules need HTTP (not `file://`).

## Environment (API)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3333`) |
| `LL_DATA_DIR` | SQLite directory (default `apps/api/data` when run via workspace) |
| `LL_INBOUND_WEBHOOK_SECRET` | Optional secret for `POST /v1/webhooks/inbound-email` |

## In this repo

| Path | Purpose |
| --- | --- |
| `index.html` | Browser player (queue, TTS, follow-along) |
| `share.html` | Public share page (URL + title only, §4) |
| `lib/` | Model, cleanup, analytics, API client |
| `apps/api/` | Fastify REST + in-process extraction worker |
| `extensions/chrome/` | MV3 “Save to Listen Later” → `client_text` |
| `db/schema.sql` | Postgres schema for production |
| `docs/adr/` | Architecture decisions |

## Chrome extension (dev)

1. Open `chrome://extensions` → Developer mode → Load unpacked → `extensions/chrome/`.
2. With the API running, click the extension on an article tab.

## Tests

```bash
npm test
```
