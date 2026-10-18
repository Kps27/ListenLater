# ADR 001: Node API and in-process extraction for local MVP

**Status:** Accepted · 2026-10-18

## Context

The handoff recommends Fastify or FastAPI for the API and Python (Trafilatura, Playwright) for extraction workers. Sprint 0 needs a working ingest → queue → extract → sync loop that the web app and Chrome extension can call.

## Decision

- Implement **`apps/api`** as Fastify (Node, ESM), SQLite for local dev, Postgres schema in `db/schema.sql` as the production target.
- Run extraction **in-process** with `@mozilla/readability` + `linkedom` for the first server path; keep the **`client_text`** path for extension and blocked pages (LinkedIn lesson from handoff §1).
- Defer Python workers and Playwright headless until the 500-URL CI fixture set is wired.

## Consequences

- One `npm run dev:api` gives ingest, worker, and REST from §5 for local testing.
- Production should swap SQLite for Postgres, move extraction to a worker process, and add object storage for `text.json` blobs.
