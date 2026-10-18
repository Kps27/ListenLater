import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { buildTextPayload, classifyExtracted } from '../../../lib/cleanup.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseArticleHtml(html) {
  const { document } = parseHTML(html);
  const article = new Readability(document, { charThreshold: 100 }).parse();
  const raw = article?.textContent || '';
  const title = article?.title || '';
  const byline = article?.byline || '';
  const classified = classifyExtracted(raw, 200);
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

/** Headless browser fallback (handoff §6). Requires `npx playwright install chromium`. */
export async function fetchWithPlaywright(url) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { timeout: 15_000, waitUntil: 'domcontentloaded' });
    const html = await page.content();
    return parseArticleHtml(html);
  } finally {
    await browser.close();
  }
}
