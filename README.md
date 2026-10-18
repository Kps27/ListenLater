# Listen Later

Enterprise audio queue for your reading list — handoff spec in [docs/listen-later-dev-handoff.md](docs/listen-later-dev-handoff.md). Build tracker: [docs/ENTERPRISE-BUILD.md](docs/ENTERPRISE-BUILD.md).

## Local URLs (test here)

Start all services:

```bash
npm install
npm run dev
```

| Service | URL |
| --- | --- |
| **Enterprise app (primary)** | [http://127.0.0.1:3000](http://127.0.0.1:3000) |
| **API** | [http://127.0.0.1:3333/health](http://127.0.0.1:3333/health) |
| **Classic player** | [http://127.0.0.1:8765](http://127.0.0.1:8765) |

### Auth

- **Guest (5 items):** `Authorization: Bearer dev-guest-token` — used by default in the classic player.
- **Enterprise (unlimited):** In the app at `:3000`, enter your work email and **Sign in** (creates a session via `POST /v1/auth/login`).

API only:

```bash
npm run dev:api
```

## Repo layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js enterprise UI |
| `apps/api` | Fastify REST + extraction worker |
| `index.html` | Original standalone player |
| `extensions/chrome` | MV3 capture → API |
| `lib/` | Shared model, cleanup, analytics |

## Tests

```bash
npm test
```

## Remotes

- GitHub: `Kps27/ListenLater` (when configured)
- Cursor Origin: `nhance/listen-later`
