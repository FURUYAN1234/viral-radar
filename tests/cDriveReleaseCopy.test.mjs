import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('deploy lifecycle uses common preflight and build without an app-specific C drive copy', () => {
  const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts['release:preflight'], 'powershell -ExecutionPolicy Bypass -File ..\\scripts\\release_app_preflight.ps1 -App viral-radar');
  assert.equal(packageJson.scripts.predeploy, 'npm run release:preflight && npm run build');
  assert.equal(packageJson.scripts.deploy, 'gh-pages -d dist');
  assert.equal(packageJson.scripts['copy:c-drive'], undefined);
});
