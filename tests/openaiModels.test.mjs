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
} from '../src/lib/openaiModels.js';
import { NANO_BANANA_FALLBACK_SNAPSHOT } from '../src/lib/nanoBananaFallbackSnapshot.js';

test('OpenAI model catalog defaults to Astra and keeps the synced display metadata', () => {
  assert.equal(DEFAULT_OPENAI_MODEL_ID, 'gpt-6-astra');
  assert.equal(OPENAI_MODEL_OPTIONS[0].id, 'gpt-6-astra');
  assert.equal(OPENAI_MODEL_OPTIONS[0].label, 'GPT-6 Astra');
  assert.equal(OPENAI_MODEL_PRICE_SNAPSHOT_DATE, '2026-09-23');
  assert.match(formatOpenAIModelPrice(getOpenAIModelOption('gpt-6-luna')), /入力 \$0\.1 \/ 出力 \$0\.5/);
  assert.equal(
    OPENAI_MODEL_OPTIONS.every((model) => typeof model.comparisonNote === 'string' && model.comparisonNote.length > 0),
    true,
  );
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
  assert.deepEqual(getOpenAIModelRoute('gpt-6-luna'), [
    'gpt-6-luna',
    'gpt-5.6-luna',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
  ]);
});

test('unknown OpenAI model ids normalize to the Astra default', () => {
  assert.equal(normalizeOpenAIModelId('unknown-model'), 'gpt-6-astra');
  assert.equal(getOpenAIModelOption('unknown-model').id, 'gpt-6-astra');
});
