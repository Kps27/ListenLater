/** Listenability cleanup (handoff §6) — shared by API worker and clients. */

import { toSentences, wordCount } from './sentences.js';

const LOGIN_WALL = /sign in|log in to|join now|subscribe to read|create an account|members only/i;
const DROP_LINE =
  /^(by|photo|image|credit|illustration|caption|advertisement|share|comments?|menu|subscribe|sign in|log in|related|tags?|published|updated)\b/i;

function keepListeningLine(line) {
  if (!line) return true;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length >= 5 || /[.!?:]$/.test(line)) return true;
  if (DROP_LINE.test(line)) return false;
  return words.length >= 1 && words.length <= 14 && line.length >= 4;
}

export function cleanForListening(raw) {
  let t = String(raw || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_`>]{1,3}/g, '')
    .replace(/^\s*[=-]{3,}\s*$/gm, '')
    .replace(/\[\d+\]/g, '')
    .replace(/<table[\s\S]*?<\/table>/gi, ' (Table omitted for audio.) ')
    .split('\n')
    .map((l) => l.trim())
    .filter(keepListeningLine)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t;
}

export function sentenceOffsets(text) {
  const sents = toSentences(text);
  const offsets = [];
  let cursor = 0;
  for (const { s } of sents) {
    const start = text.indexOf(s, cursor);
    const end = start >= 0 ? start + s.length : cursor + s.length;
    offsets.push({ start: start >= 0 ? start : cursor, end });
    cursor = end;
  }
  return offsets;
}

export function buildTextPayload(text) {
  const cleaned = cleanForListening(text);
  return {
    text: cleaned,
    word_count: wordCount(cleaned),
    sentences: sentenceOffsets(cleaned),
  };
}

export function classifyExtracted(text, httpStatus) {
  const cleaned = cleanForListening(text);
  const wc = wordCount(cleaned);
  if (httpStatus === 403) return { status: 'blocked', fail_reason: 'http_403', text: '' };
  if (LOGIN_WALL.test(cleaned.slice(0, 400))) {
    return { status: 'blocked', fail_reason: 'login_wall', text: '' };
  }
  if (wc < 150) return { status: 'blocked', fail_reason: 'no_text', text: cleaned };
  return { status: 'ready', fail_reason: null, text: cleaned, word_count: wc };
}
