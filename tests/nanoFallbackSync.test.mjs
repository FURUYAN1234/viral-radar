import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('nano banana pro fallback snapshot is synced from source model arrays', async () => {
  const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
  const snapshotPath = resolve(appRoot, 'src/lib/nanoBananaFallbackSnapshot.js');
  const scriptPath = resolve(appRoot, 'scripts/sync-nano-fallback-chain.mjs');

  assert.equal(packageJson.scripts['sync:nano-fallback'], 'node scripts/sync-nano-fallback-chain.mjs');
  assert.equal(packageJson.scripts['check:nano-fallback'], 'node scripts/sync-nano-fallback-chain.mjs --check --openai-only');
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(snapshotPath), true);

  const { NANO_BANANA_FALLBACK_SNAPSHOT } = await import(`../src/lib/nanoBananaFallbackSnapshot.js?test=${Date.now()}`);

  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.sourceApp, 'nano-banana-pro');
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.syncScope, 'openai-only');
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.geminiText.models.map((model) => model.id),
    ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest', 'gemini-pro-latest'],
  );
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map((model) => model.id),
    [
      'gpt-6-astra',
      'gpt-6.1-sol',
      'gpt-6-sol',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-6-luna',
      'gpt-5.6-luna',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
    ],
  );
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.priceSnapshotDate, '2026-09-28');
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models[0].label, 'GPT-6 Astra');
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models[5].inputPriceUsdPerM, 0.1);
  assert.match(NANO_BANANA_FALLBACK_SNAPSHOT.updateWorkflow, /check:nano-fallback/);
});

test('OpenAI-only synchronization preserves Gemini while ordinary synchronization updates both providers', async () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'viral-openai-sync-'));
  try {
    const copyAt = (source, destination) => {
      mkdirSync(resolve(destination, '..'), { recursive: true });
      copyFileSync(source, destination);
    };
    const fixtureApp = resolve(temporary, 'viral-radar');
    const fixtureScript = resolve(fixtureApp, 'scripts/sync-nano-fallback-chain.mjs');
    copyAt(resolve(appRoot, 'scripts/sync-nano-fallback-chain.mjs'), fixtureScript);
    const fixtureSnapshot = resolve(fixtureApp, 'src/lib/nanoBananaFallbackSnapshot.js');
    copyAt(resolve(appRoot, 'src/lib/nanoBananaFallbackSnapshot.js'), fixtureSnapshot);
    for (const file of ['package.json', 'src/lib/fallback-chain-history.js', 'src/lib/gemini-model-routes.js', 'src/config/openai-scenario-models.json']) {
      copyAt(resolve(appRoot, '../nano-banana-pro', file), resolve(temporary, 'nano-banana-pro', file));
    }
    const fixtureGeminiRoutes = resolve(temporary, 'nano-banana-pro/src/lib/gemini-model-routes.js');
    writeFileSync(fixtureGeminiRoutes, "const GEMINI_TEXT_MODEL_IDS = ['gemini-test-route'];\n");
    const readSnapshot = () => JSON.parse(readFileSync(fixtureSnapshot, 'utf8').match(/= ([\s\S]*);\s*$/)[1]);
    const originalGemini = readSnapshot().chains.geminiText;
    const scoped = spawnSync(process.execPath, [fixtureScript, '--openai-only'], { encoding: 'utf8' });
    assert.equal(scoped.status, 0, scoped.stderr);
    assert.deepEqual(readSnapshot().chains.geminiText, originalGemini);
    assert.equal(readSnapshot().syncScope, 'openai-only');
    assert.equal(readSnapshot().chains.openaiText.models[1].id, 'gpt-6.1-sol');
    const full = spawnSync(process.execPath, [fixtureScript], { encoding: 'utf8' });
    assert.equal(full.status, 0, full.stderr);
    assert.notDeepEqual(readSnapshot().chains.geminiText, originalGemini);
    assert.equal(readSnapshot().syncScope, 'all-providers');
    assert.equal(readSnapshot().chains.geminiText.models[0].id, 'gemini-test-route');
    rmSync(fixtureSnapshot);
    const missing = spawnSync(process.execPath, [fixtureScript, '--openai-only'], { encoding: 'utf8' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /requires an existing fallback snapshot/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
