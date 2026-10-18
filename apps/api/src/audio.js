import { uid } from './db.js';

export function ensureAudioTable(db) {
  db.exec(`
    create table if not exists audio_renditions (
      id text primary key,
      item_id text not null,
      voice_id text not null,
      manifest_json text not null,
      duration_ms integer,
      chars_billed integer not null default 0,
      status text not null default 'stub',
      created_at text not null,
      unique (item_id, voice_id)
    );
  `);
}

/** Premium TTS stub (handoff §7) — manifest shape only until vendor bake-off. */
export function getOrCreateAudioStub(db, item, voiceId) {
  const existing = db
    .prepare('select * from audio_renditions where item_id = ? and voice_id = ?')
    .get(item.id, voiceId);
  if (existing) {
    return {
      voice_id: voiceId,
      status: existing.status,
      fallback: 'device',
      message:
        existing.status === 'stub'
          ? 'Premium neural TTS is not configured. Use on-device speech or Web Speech API.'
          : undefined,
      manifest: JSON.parse(existing.manifest_json),
      chars_billed: existing.chars_billed,
    };
  }

  const sentences = item.sentences_json ? JSON.parse(item.sentences_json) : [];
  const chars = (item.text_body || '').length;
  const manifest = {
    item_id: item.id,
    voice_id: voiceId,
    format: 'opus',
    bitrate_kbps: 64,
    duration_ms: null,
    chunks: sentences.slice(0, 3).map((s, i) => ({
      index: i,
      url: null,
      sentence_start: i,
      sentence_end: i,
      status: 'pending',
    })),
  };
  const now = new Date().toISOString();
  db.prepare(
    `insert into audio_renditions (id, item_id, voice_id, manifest_json, chars_billed, status, created_at)
     values (?, ?, ?, ?, ?, 'stub', ?)`
  ).run(uid(), item.id, voiceId, JSON.stringify(manifest), chars, now);

  return {
    voice_id: voiceId,
    status: 'stub',
    fallback: 'device',
    message: 'Premium neural TTS is not configured. Use on-device speech or Web Speech API.',
    manifest,
    chars_billed: chars,
  };
}
