import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSettingsFromStorage } from '../src/lib/settings.js';

const LEGACY_GEMINI_KEY = `AI${'zaSy'}DUMMY1234567890`;

test('settings default to saving the API key on startup', () => {
  const settings = loadSettingsFromStorage(null);

  assert.equal(settings.apiKey, '');
  assert.equal(settings.rememberKeys, true);
});

test('settings migrate old provider-specific keys into the single API key field', () => {
  const settings = loadSettingsFromStorage(
    JSON.stringify({
      geminiKey: LEGACY_GEMINI_KEY,
    }),
  );

  assert.equal(settings.apiKey, LEGACY_GEMINI_KEY);
  assert.equal(settings.rememberKeys, true);
});
