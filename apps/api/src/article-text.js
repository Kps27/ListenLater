import { parseHTML } from 'linkedom';

/** Keep the paragraph breaks Readability found, instead of one flat textContent blob. */
export function textFromArticle(article) {
  const html = article?.content || '';
  if (html) {
    const { document } = parseHTML(`<div id="ll-article">${html}</div>`);
    const root = document.getElementById('ll-article');
    const blocks = [...(root?.querySelectorAll('h2, h3, h4, p, li, blockquote') || [])].filter((el) => {
      const parent = el.parentElement;
      if (el.tagName === 'P' && parent?.closest('li, blockquote')) return false;
      if (el.tagName === 'LI' && parent?.closest('li')) return false;
      return true;
    });
    const parts = blocks
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((part) => part.length > 1 && !/^(advertisement|share|comments?)$/i.test(part));
    if (parts.length) return parts.join('\n\n');
  }
  return String(article?.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
