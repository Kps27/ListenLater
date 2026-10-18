import { fetchAndExtract } from './extract.js';
import { rowToItem, uid } from './db.js';

export function startWorker(db, emit) {
  setInterval(() => tick(db, emit), 800);
}

function tick(db, emit) {
  const job = db
    .prepare(
      `select j.id as job_id, j.item_id, i.source_url
       from jobs j join items i on i.id = j.item_id
       where j.started_at is null and j.kind = 'extract'
       order by j.created_at limit 1`
    )
    .get();
  if (!job) return;

  const now = new Date().toISOString();
  db.prepare('update jobs set started_at = ? where id = ?').run(now, job.job_id);
  db.prepare(`update items set status = 'extracting', updated_at = ? where id = ?`).run(now, job.item_id);

  runExtract(db, job, emit).catch((err) => {
    console.error('extract failed', job.item_id, err);
    const t = new Date().toISOString();
    db.prepare(`update items set status = 'failed', fail_reason = ?, updated_at = ? where id = ?`).run(
      'network_error',
      t,
      job.item_id
    );
    db.prepare('update jobs set done_at = ? where id = ?').run(t, job.job_id);
    emit('item', rowToItem(db.prepare('select * from items where id = ?').get(job.item_id)));
  });
}

async function runExtract(db, job, emit) {
  const started = Date.now();
  let result;
  try {
    result = await fetchAndExtract(job.source_url);
  } catch (e) {
    result = { status: 'failed', fail_reason: e.name === 'AbortError' ? 'timeout' : 'network_error' };
  }
  const t = new Date().toISOString();
  if (result.status === 'ready') {
    db.prepare(
      `update items set status = 'ready', fail_reason = null, title = coalesce(?, title),
       author = ?, lang = ?, word_count = ?, text_body = ?, sentences_json = ?, updated_at = ?
       where id = ?`
    ).run(
      result.title || null,
      result.author || null,
      result.lang || 'en',
      result.word_count,
      result.text,
      JSON.stringify(result.sentences || []),
      t,
      job.item_id
    );
  } else {
    db.prepare(
      `update items set status = ?, fail_reason = ?, updated_at = ? where id = ?`
    ).run(result.status, result.fail_reason, t, job.item_id);
  }
  db.prepare('update jobs set done_at = ? where id = ?').run(t, job.job_id);
  const item = rowToItem(db.prepare('select * from items where id = ?').get(job.item_id));
  emit('item', { ...item, _latency_ms: Date.now() - started });
}

export function enqueueExtract(db, itemId) {
  db.prepare(
    `insert into jobs (id, item_id, kind, created_at) values (?, ?, 'extract', ?)`
  ).run(uid(), itemId, new Date().toISOString());
}
