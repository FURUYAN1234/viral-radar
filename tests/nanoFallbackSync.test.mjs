import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('nano banana pro fallback snapshot is synced from source model arrays', async () => {
  const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
  const snapshotPath = resolve(appRoot, 'src/lib/nanoBananaFallbackSnapshot.js');
  const scriptPath = resolve(appRoot, 'scripts/sync-nano-fallback-chain.mjs');

  assert.equal(packageJson.scripts['sync:nano-fallback'], 'node scripts/sync-nano-fallback-chain.mjs');
  assert.equal(packageJson.scripts['check:nano-fallback'], 'node scripts/sync-nano-fallback-chain.mjs --check');
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(snapshotPath), true);

  const { NANO_BANANA_FALLBACK_SNAPSHOT } = await import(`../src/lib/nanoBananaFallbackSnapshot.js?test=${Date.now()}`);

  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.sourceApp, 'nano-banana-pro');
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.geminiText.models.map((model) => model.id),
    ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest', 'gemini-pro-latest'],
  );
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map((model) => model.id),
    ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o'],
  );
  assert.match(NANO_BANANA_FALLBACK_SNAPSHOT.updateWorkflow, /check:nano-fallback/);
});
