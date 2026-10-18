/** Listenability cleanup (handoff §6) — shared by API worker and clients. */

import { toSentences, wordCount } from './sentences.js';

const LOGIN_WALL = /sign in|log in to|join now|subscribe to read|create an account|members only/i;

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
    .filter((l) => !l || l.split(/\s+/).length >= 5 || /[.!?:]$/.test(l))
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
