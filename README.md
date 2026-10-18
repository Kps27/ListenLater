# Listen Later

Web prototype and Sprint 0 foundation for the MVP described in [docs/listen-later-dev-handoff.md](docs/listen-later-dev-handoff.md).

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). ES modules require a local server (not `file://`).

## In this repo

| Path | Purpose |
| --- | --- |
| `index.html` | Browser player prototype (queue, TTS, follow-along) |
| `share.html` | Public share stub (URL + title only, per handoff §4) |
| `lib/` | Shared item model, sentences, analytics (no PII) |
| `db/schema.sql` | Postgres schema for production API |

Production capture (mobile share, extension, email-in), extraction workers, and sync API are specified in the handoff but not implemented here yet.
