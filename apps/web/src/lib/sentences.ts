export function wordCount(text: string) {
  return (text.match(/\S+/g) || []).length;
}

export type Sentence = { s: string; p: number };

export function toSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let p = 0;
  for (const block of text.split(/\n\n+/)) {
    const parts = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    for (const part of parts) {
      const s = part.trim();
      if (s) out.push({ s, p });
    }
    p++;
  }
  return out;
}
