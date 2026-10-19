# Enterprise build tracker

Full handoff MVP + enterprise delivery (no milestone gates). Status as of Oct 2026.

| Feature | Status | Location |
| --- | --- | --- |
| REST API §5 | Mostly done | `apps/api` — premium `/audio` pending |
| Enterprise email login | Done | `POST /v1/auth/login` |
| Guest token (5 items) | Done | `dev-guest-token` |
| Web enterprise app | In progress | `apps/web` (Next.js) |
| Classic web player | Done | `index.html` :8765 |
| Chrome extension + Readability | Done | `npm run build:extension` → load `extensions/chrome` |
| Mobile iOS/Android | First-run app | `apps/mobile` — welcome, sign-in, Plus or free, Listen / Add / player |
| Extraction Playwright fallback | Done | `apps/api` when static fetch under 150 words; `LL_PLAYWRIGHT=0` to disable |
| Premium neural TTS | Stub | `GET /v1/items/:id/audio?voice=` manifest + `fallback: device` |
| Trafilatura / 500-URL CI | Planned | Python worker |
| Postgres + object store | Schema only | `db/schema.sql` |
| 500-URL extraction CI | Not started | §6 |

Run everything locally: `npm run dev` from repo root.
