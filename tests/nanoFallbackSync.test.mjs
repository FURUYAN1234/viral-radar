import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('downloaded app validates its bundled models without another app, while release checks stay strict', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'viral-portable-check-'));
  try {
    for (const file of ['scripts/sync-nano-fallback-chain.mjs', 'src/lib/nanoBananaFallbackSnapshot.js']) {
      const target = resolve(temporary, 'app', file);
      mkdirSync(resolve(target, '..'), { recursive: true });
      copyFileSync(resolve(appRoot, file), target);
    }
    const script = resolve(temporary, 'app/scripts/sync-nano-fallback-chain.mjs');
    const check = () => spawnSync(process.execPath, [script, '--check-bundled'], { encoding: 'utf8' });
    const valid = check();
    assert.equal(valid.status, 0, valid.stderr);
    const releaseCheck = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    assert.notEqual(releaseCheck.status, 0, 'strict author-side upstream check must not skip missing sources');
    const file = resolve(temporary, 'app/src/lib/nanoBananaFallbackSnapshot.js');
    const original = readFileSync(file, 'utf8');
    const data = JSON.parse(original.match(/= ([\s\S]*);\s*$/)[1]);
    data.chains.openaiText.models = [];
    writeFileSync(file, 'export const NANO_BANANA_FALLBACK_SNAPSHOT = '+JSON.stringify(data)+';\n');
    assert.notEqual(check().status, 0, 'broken bundled model list must fail');
    writeFileSync(file, original);
    assert.equal(check().status, 0);
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
});


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
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.syncScope, 'all-providers');
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.geminiText.models.map((model) => model.id),
    ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
  );
  assert.deepEqual(
    NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map((model) => model.id),
    [
      'gpt-6-astra',
      'gpt-6.1-sol',
      'gpt-6.1-terra',
      'gpt-6-sol',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-6-luna',
      'gpt-5.6-luna',
    ],
  );
  assert.match(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.priceSnapshotDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models[0].label, 'GPT-6 Astra');
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models[2].inputPriceUsdPerM, 1);
  assert.equal(NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models[6].inputPriceUsdPerM, 0.1);
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
    const bundled = JSON.parse(readFileSync(fixtureSnapshot, 'utf8').match(/= ([\s\S]*);\s*$/)[1]);
    const fixtureSources = {
      'package.json': JSON.stringify({ version: '0.0.0' }),
      'src/lib/fallback-chain-history.js': '// Test fixture provenance\n',
      'src/lib/gemini-model-routes.js': `const GEMINI_TEXT_MODEL_IDS = ${JSON.stringify(bundled.chains.geminiText.models.map(model => model.id))};\n`,
      'src/config/openai-scenario-models.json': JSON.stringify(bundled.chains.openaiText),
    };
    for (const [file, content] of Object.entries(fixtureSources)) {
      const target = resolve(temporary, 'nano-banana-pro', file);
      mkdirSync(resolve(target, '..'), { recursive: true });
      writeFileSync(target, content);
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
    assert.equal(readSnapshot().chains.openaiText.models[2].id, 'gpt-6.1-terra');
    const stale = spawnSync(process.execPath, [fixtureScript, '--check'], { encoding: 'utf8' });
    assert.notEqual(stale.status, 0, 'normal upstream gate must reject a stale Gemini chain');
    const full = spawnSync(process.execPath, [fixtureScript], { encoding: 'utf8' });
    assert.equal(full.status, 0, full.stderr);
    assert.notDeepEqual(readSnapshot().chains.geminiText, originalGemini);
    assert.equal(readSnapshot().syncScope, 'all-providers');
    assert.equal(readSnapshot().chains.geminiText.models[0].id, 'gemini-test-route');
    const current = spawnSync(process.execPath, [fixtureScript, '--check'], { encoding: 'utf8' });
    assert.equal(current.status, 0, current.stderr);
    rmSync(fixtureSnapshot);
    const missing = spawnSync(process.execPath, [fixtureScript, '--openai-only'], { encoding: 'utf8' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /requires an existing fallback snapshot/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
