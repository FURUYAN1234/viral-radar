import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_OPENAI_MODEL_ID,
  OPENAI_MODEL_OPTIONS,
  OPENAI_MODEL_PRICE_SNAPSHOT_DATE,
  formatOpenAIModelPrice,
  getOpenAIModelOption,
  getOpenAIModelRoute,
  normalizeOpenAIModelId,
  resolveDefaultOpenAIModelId,
} from '../src/lib/openaiModels.js';
import { NANO_BANANA_FALLBACK_SNAPSHOT } from '../src/lib/nanoBananaFallbackSnapshot.js';

test('OpenAI model catalog defaults to 6.1 Sol and keeps the synced display metadata', () => {
  assert.equal(DEFAULT_OPENAI_MODEL_ID, 'gpt-6.1-sol');
  assert.equal(OPENAI_MODEL_OPTIONS[0].id, 'gpt-6-astra');
  assert.equal(OPENAI_MODEL_OPTIONS[0].label, 'GPT-6 Astra');
  assert.equal(OPENAI_MODEL_PRICE_SNAPSHOT_DATE, NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.priceSnapshotDate);
  assert.equal(getOpenAIModelOption('gpt-6.1-sol').priceSnapshotDate, '2026-09-30');
  assert.match(formatOpenAIModelPrice(getOpenAIModelOption('gpt-6-luna')), /入力 \$0\.1 \/ 出力 \$0\.5/);
  assert.equal(
    OPENAI_MODEL_OPTIONS.every((model) => typeof model.comparisonNote === 'string' && model.comparisonNote.length > 0),
    true,
  );
});

test('development and production default to 6.1 Sol', () => {
  assert.equal(resolveDefaultOpenAIModelId(true), 'gpt-6.1-sol');
  assert.equal(resolveDefaultOpenAIModelId(false), 'gpt-6.1-sol');
});

test('model routing metadata is synced without importing Nano Banana product copy', () => {
  const syncedModels = NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models;
  assert.equal(
    syncedModels.every((model) => !('description' in model) && !('comparisonNote' in model)),
    true,
  );

  const visibleCopy = OPENAI_MODEL_OPTIONS.map(
    (model) => `${model.description} ${model.comparisonNote}`,
  ).join('\n');
  assert.doesNotMatch(visibleCopy, /4コマ|Nano Banana/i);
  assert.match(getOpenAIModelOption('gpt-6-astra').comparisonNote, /漫画・動画・小説/);
});

test('OpenAI model route starts at the selected model and only moves downward', () => {
  assert.deepEqual(getOpenAIModelRoute('gpt-6-astra').slice(0, 3), ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol']);
  assert.deepEqual(getOpenAIModelRoute().slice(0, 2), ['gpt-6.1-sol', 'gpt-6-sol']);
  assert.equal(getOpenAIModelRoute().includes('gpt-6-astra'), false);
  assert.equal(getOpenAIModelRoute('gpt-6-sol').includes('gpt-6.1-sol'), false);
  assert.deepEqual(getOpenAIModelRoute('gpt-6-luna'), [
    'gpt-6-luna',
    'gpt-5.6-luna',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
  ]);
});

test('unknown OpenAI model ids normalize to the 6.1 Sol default', () => {
  assert.equal(normalizeOpenAIModelId('unknown-model'), 'gpt-6.1-sol');
  assert.equal(getOpenAIModelOption('unknown-model').id, 'gpt-6.1-sol');
});
