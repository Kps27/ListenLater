import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { buildTextPayload, classifyExtracted } from '../../../lib/cleanup.js';
import { canonicalUrl } from '../../../lib/model.js';
import { textFromArticle } from './article-text.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseHtmlArticle(html, httpStatus) {
  const { document } = parseHTML(html);
  const article = new Readability(document, { charThreshold: 100 }).parse();
  const raw = textFromArticle(article);
  const title = article?.title || '';
  const byline = article?.byline || '';
  const classified = classifyExtracted(raw, httpStatus);
  if (classified.status !== 'ready') return { ...classified, title, author: byline };
  const payload = buildTextPayload(classified.text);
  return {
    status: 'ready',
    fail_reason: null,
    title,
    author: byline,
    ...payload,
    lang: 'en',
  };
}

async function fetchStatic(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    return classifyExtracted('', res.status);
  }
  const html = await res.text();
  return parseHtmlArticle(html, res.status);
}

function wordCountResult(r) {
  return r?.word_count ?? (r?.text ? r.text.split(/\s+/).length : 0);
}

export async function fetchAndExtract(url) {
  let result = await fetchStatic(url);
  const needsFallback =
    process.env.LL_PLAYWRIGHT !== '0' &&
    (result.status !== 'ready' || wordCountResult(result) < 150);
  if (!needsFallback) return result;

  try {
    const { fetchWithPlaywright } = await import('./extract-playwright.js');
    const pw = await fetchWithPlaywright(url);
    if (pw.status === 'ready' && wordCountResult(pw) >= wordCountResult(result)) {
      return pw;
    }
    if (result.status !== 'ready' && pw.status === 'ready') return pw;
  } catch (e) {
    console.warn('[extract] Playwright fallback unavailable:', e.message);
  }
  return result;
}

export function ingestClientText({ url, title, text }) {
  const payload = buildTextPayload(text);
  const classified = classifyExtracted(payload.text, 200);
  if (classified.status !== 'ready') {
    return { status: classified.status, fail_reason: classified.fail_reason, title, ...payload };
  }
  return {
    status: 'ready',
    fail_reason: null,
    title: title || '',
    source_url: url || null,
    canonical_url: url ? canonicalUrl(url) : null,
    ...payload,
    lang: 'en',
  };
}
