import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanForListening, classifyExtracted, buildTextPayload } from './cleanup.js';

test('cleanForListening strips markdown noise', () => {
  const out = cleanForListening('# Title\n\nHello **world**. This is a longer sentence for the filter.');
  assert.match(out, /Hello world/);
  assert.doesNotMatch(out, /\*\*/);
});

test('classifyExtracted flags login walls', () => {
  const r = classifyExtracted('Sign in to continue reading this story.', 200);
  assert.equal(r.status, 'blocked');
  assert.equal(r.fail_reason, 'login_wall');
});

test('cleanForListening keeps paragraph breaks', () => {
  const out = cleanForListening(
    'This is the first paragraph of the article.\n\nThis is the second paragraph of the article.'
  );
  assert.match(out, /first paragraph[\s\S]*\n\n[\s\S]*second paragraph/);
});

test('buildTextPayload includes sentence offsets', () => {
  const p = buildTextPayload('First sentence here. Second sentence follows.');
  assert.ok(p.sentences.length >= 2);
  assert.ok(p.word_count > 5);
});
