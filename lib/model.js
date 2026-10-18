/** Web prototype item model aligned with handoff §4 (localStorage stand-in for API). */

export const GUEST_ITEM_LIMIT = 5;

export const ITEM_STATUS = ['queued', 'extracting', 'ready', 'failed', 'blocked'];
export const ITEM_STATE = ['up_next', 'in_progress', 'listened', 'archived'];

const LOGIN_WALL = /sign in|join now|log in to|subscribe to read|create an account/i;

export function canonicalUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    u.hash = '';
    u.search = '';
    return u.href.replace(/\/$/, '');
  } catch {
    return url.trim();
  }
}

export function migrateItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const source_url = raw.source_url ?? raw.url ?? '';
  const text = typeof raw.text === 'string' ? raw.text : '';
  const position = typeof raw.position === 'number' ? raw.position : (raw.order ?? 0);

  let state = raw.state;
  if (!ITEM_STATE.includes(state)) {
    if (raw.done || raw.state === 'listened') state = 'listened';
    else if ((raw.progress_sentence ?? raw.progress ?? 0) > 0) state = 'in_progress';
    else state = 'up_next';
  }

  let status = raw.status;
  if (!ITEM_STATUS.includes(status)) {
    if (text) status = 'ready';
    else if (raw.fail_reason) status = raw.fail_reason.includes('403') ? 'blocked' : 'failed';
    else status = 'queued';
  }

  return {
    id: raw.id || '',
    source_url,
    canonical_url: raw.canonical_url ?? canonicalUrl(source_url),
    source_channel: raw.source_channel || (source_url ? 'web' : 'paste'),
    title: typeof raw.title === 'string' ? raw.title.slice(0, 180) : '',
    site_name: raw.site_name || '',
    text,
    status,
    fail_reason: raw.fail_reason || null,
    state,
    position,
    progress_sentence: Math.max(0, raw.progress_sentence ?? raw.progress ?? 0),
    listened_at: raw.listened_at || null,
    addedAt: raw.addedAt || raw.created_at || Date.now(),
  };
}

export function migrateAll(items) {
  return (items || []).map(migrateItem).filter(Boolean);
}

export function activeItemCount(items) {
  return items.filter((i) => i.state !== 'archived').length;
}

export function canAddMore(items, { guest = true } = {}) {
  if (!guest) return true;
  return activeItemCount(items) < GUEST_ITEM_LIMIT;
}

export function positionBetween(before, after) {
  if (before == null && after == null) return 1;
  if (before == null) return after - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}

export function classifyFetchError(message, status, textPreview) {
  if (status === 403) return { status: 'blocked', fail_reason: 'http_403' };
  if (LOGIN_WALL.test(textPreview || '') || /sign-in wall/i.test(message || '')) {
    return { status: 'blocked', fail_reason: 'login_wall' };
  }
  if (status && status >= 400) return { status: 'failed', fail_reason: `http_${status}` };
  return { status: 'failed', fail_reason: 'network_error' };
}

export function blockedMessage(fail_reason) {
  switch (fail_reason) {
    case 'http_403':
    case 'login_wall':
      return {
        title: 'This page needs you signed in',
        body: 'Sites like LinkedIn block automatic readers. Open the page in your browser, then share or paste the text here.',
      };
    case 'paywall':
      return {
        title: 'Paywalled article',
        body: 'We do not bypass paywalls. Open the publisher site or paste the text you can access.',
      };
    default:
      return {
        title: 'Could not prepare this link',
        body: 'Try again, or paste the article text under Paste text.',
      };
  }
}
