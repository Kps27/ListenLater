import { Readability } from '@mozilla/readability';

function extractPage() {
  const clone = document.cloneNode(true);
  const article = new Readability(clone, { charThreshold: 100 }).parse();
  const text = (article?.textContent || '').trim();
  return {
    url: location.href,
    title: article?.title || document.title,
    text: text.slice(0, 500000),
  };
}

globalThis.__llExtract = extractPage;
