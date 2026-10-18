# Enterprise build tracker

Full handoff MVP + enterprise delivery (no milestone gates). Status as of Oct 2026.

| Feature | Status | Location |
| --- | --- | --- |
| REST API §5 | Mostly done | `apps/api` — premium `/audio` pending |
| Enterprise email login (unlimited queue) | Done | `POST /v1/auth/login` |
| Guest token (5 items) | Done | `dev-guest-token` |
| Web enterprise app | In progress | `apps/web` (Next.js) |
| Classic web player | Done | `index.html` :8765 |
| Chrome extension | Basic | `extensions/chrome` — Readability upgrade next |
| Mobile iOS/Android | Planned | `apps/mobile` scaffold |
| Extraction Playwright/Trafilatura | Planned | ADR 001 defers; add Python worker next |
| Premium neural TTS | Not started | §7 bake-off |
| Postgres + object store | Schema only | `db/schema.sql` |
| 500-URL extraction CI | Not started | §6 |

Run everything locally: `npm run dev` from repo root.
