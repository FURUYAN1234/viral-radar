import test from 'node:test';
import assert from 'node:assert/strict';
import { copyTextToClipboard } from '../src/lib/clipboard.js';

test('copyTextToClipboard reports success when browser clipboard accepts text', async () => {
  const calls = [];
  const result = await copyTextToClipboard('prompt text', {
    writeText: async (value) => calls.push(value),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['prompt text']);
});

test('copyTextToClipboard returns a fallback result when permission is denied', async () => {
  const result = await copyTextToClipboard('prompt text', {
    writeText: async () => {
      throw new DOMException('Write permission denied.', 'NotAllowedError');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'clipboard-denied');
});

test('copyTextToClipboard returns a fallback result when clipboard is unavailable', async () => {
  const result = await copyTextToClipboard('prompt text', null);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'clipboard-unavailable');
});
