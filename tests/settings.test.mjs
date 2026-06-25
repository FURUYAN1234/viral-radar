import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSettingsFromStorage, settingsForStorage } from '../src/lib/settings.js';

const LEGACY_GEMINI_KEY = `AI${'zaSy'}DUMMY1234567890`;

test('settings default to a runtime-only API key on startup', () => {
  const settings = loadSettingsFromStorage(null);

  assert.equal(settings.apiKey, '');
  assert.equal(settings.rememberKeys, false);
});

test('settings ignore old provider-specific keys instead of restoring secrets', () => {
  const settings = loadSettingsFromStorage(
    JSON.stringify({
      geminiKey: LEGACY_GEMINI_KEY,
      apiKey: LEGACY_GEMINI_KEY,
    }),
  );

  assert.equal(settings.apiKey, '');
  assert.equal(settings.rememberKeys, false);
});

test('settingsForStorage never serializes API keys', () => {
  const serialized = settingsForStorage({ apiKey: LEGACY_GEMINI_KEY, rememberKeys: true });

  assert.deepEqual(serialized, { rememberKeys: false });
  assert.equal(JSON.stringify(serialized).includes(LEGACY_GEMINI_KEY), false);
});
