-- Listen Later MVP schema (from docs/listen-later-dev-handoff.md §4)

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  display_name  text,
  inbound_slug  text unique not null,
  plan          text not null default 'free',
  voice_pref    jsonb not null default '{}',
  rate_pref     numeric(3,2) not null default 1.00,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create type item_status as enum ('queued', 'extracting', 'ready', 'failed', 'blocked');
create type item_state  as enum ('up_next', 'in_progress', 'listened', 'archived');

create table items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  source_url      text,
  canonical_url   text,
  source_channel  text not null,
  title           text,
  site_name       text,
  author          text,
  lang            text,
  word_count      int,
  text_key        text,
  status          item_status not null default 'queued',
  fail_reason     text,
  state           item_state  not null default 'up_next',
  position        double precision not null,
  progress_sentence int not null default 0,
  progress_updated_at timestamptz,
  listened_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, canonical_url)
);
create index items_user_state_position on items (user_id, state, position);

create table audio_renditions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  voice_id    text not null,
  manifest_key text not null,
  duration_ms int,
  chars_billed int not null,
  created_at  timestamptz not null default now(),
  unique (item_id, voice_id)
);

create table shares (
  token       text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  item_id     uuid references items(id) on delete set null,
  source_url  text not null,
  title       text,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
