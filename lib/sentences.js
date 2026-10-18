/** Sentence boundaries for TTS (handoff §6–§7, prototype lesson: chunk long lines). */

const MAX_CHARS = 260;
const CUT_AT = 240;

export function toSentences(text) {
  const paras = String(text || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  paras.forEach((p, pi) => {
    const parts = p.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)\s*/g) || [p];
    parts.forEach((part) => {
      let s = part.trim();
      if (!s) return;
      while (s.length > MAX_CHARS) {
        let cut = s.lastIndexOf(', ', CUT_AT);
        if (cut < 80) cut = s.lastIndexOf(' ', CUT_AT);
        if (cut < 1) cut = CUT_AT;
        out.push({ p: pi, s: s.slice(0, cut + 1).trim() });
        s = s.slice(cut + 1).trim();
      }
      if (s) out.push({ p: pi, s });
    });
  });
  return out;
}

export function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
