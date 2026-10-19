import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.LL_DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'listen-later.sqlite');

export function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    create table if not exists users (
      id text primary key,
      email text unique,
      display_name text,
      inbound_slug text unique not null,
      plan text not null default 'free',
      voice_pref text not null default '{}',
      rate_pref real not null default 1.0,
      created_at text not null,
      deleted_at text
    );
    create table if not exists items (
      id text primary key,
      user_id text not null references users(id),
      source_url text,
      canonical_url text,
      source_channel text not null,
      title text,
      site_name text,
      author text,
      lang text,
      word_count integer,
      text_body text,
      sentences_json text,
      status text not null default 'queued',
      fail_reason text,
      state text not null default 'up_next',
      position real not null,
      progress_sentence integer not null default 0,
      progress_updated_at text,
      listened_at text,
      created_at text not null,
      updated_at text not null,
      unique (user_id, canonical_url)
    );
    create index if not exists items_user_state_position on items (user_id, state, position);
    create table if not exists jobs (
      id text primary key,
      item_id text not null,
      kind text not null,
      created_at text not null,
      started_at text,
      done_at text
    );
    create table if not exists api_sessions (
      token text primary key,
      user_id text not null references users(id),
      label text,
      created_at text not null
    );
    create table if not exists shares (
      token text primary key,
      user_id text not null,
      item_id text,
      source_url text not null,
      title text,
      created_at text not null,
      revoked_at text
    );
  `);
  const userCols = db.prepare('pragma table_info(users)').all();
  if (!userCols.some((col) => col.name === 'password_hash')) {
    db.exec('alter table users add column password_hash text');
  }
  db.exec(`
    create table if not exists login_pins (
      email text primary key,
      pin_hash text not null,
      expires_at text not null
    );
  `);
  ensureDemoUser(db);
  return db;
}

function ensureDemoUser(db) {
  const row = db.prepare('select id from users where id = ?').get('user-guest');
  if (row) return;
  db.prepare(
    `insert into users (id, email, display_name, inbound_slug, plan, created_at)
     values (?, ?, ?, ?, ?, ?)`
  ).run('user-guest', null, 'Guest', 'guest-demo', 'free', new Date().toISOString());
}

export function uid() {
  return randomUUID();
}

export function rowToItem(row) {
  if (!row) return null;
  const { text_body, sentences_json, ...rest } = row;
  return {
    ...rest,
    text: text_body || '',
    sentences: sentences_json ? JSON.parse(sentences_json) : [],
  };
}
