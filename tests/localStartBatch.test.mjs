import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('local start batch launches the app on the reserved 5180 port', () => {
  const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
  const batchPath = resolve(appRoot, 'start_monogatari_buzz_maker.bat');

  assert.equal(existsSync(batchPath), true);
  assert.match(packageJson.scripts.dev, /--port 5180/);
  assert.match(packageJson.scripts.dev, /--strictPort/);

  const batch = readFileSync(batchPath, 'utf8');
  assert.match(batch, /Monogatari Buzz Maker/);
  assert.match(batch, /http:\/\/127\.0\.0\.1:5180/);
  assert.doesNotMatch(batch, /check:upstreams|sync:nano-fallback/);
  assert.match(batch, /-NoProfile -ExecutionPolicy Bypass -File .*scripts\\start-local.ps1/);
  assert.match(batch, /exit \/b %launchResult%/);
  const bootstrap = readFileSync(resolve(appRoot, 'scripts/start-local.ps1'), 'utf8');
  assert.match(bootstrap, /npmCli ci --no-audit --no-fund/);
  assert.match(bootstrap, /npmCli run check:runtime/);
  assert.match(bootstrap, /'--port', '5180', '--strictPort'/);
  assert.match(bootstrap, /\$OpenBrowser.*'--open'/);
  assert.doesNotMatch(bootstrap, /check:upstreams|sync:nano-fallback/);
  assert.doesNotMatch(batch, /5173|5174|5175|5176|5177|5179/);
});
