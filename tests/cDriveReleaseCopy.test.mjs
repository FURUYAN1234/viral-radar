import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_TARGET_DIR,
  buildCopyPlan,
  isSafeTargetDir,
  shouldCopyTrackedPath,
} from '../scripts/copy-release-to-c-drive.mjs';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('deploy lifecycle builds then prepares the C drive release copy', () => {
  const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
  const scriptPath = resolve(appRoot, 'scripts', 'copy-release-to-c-drive.mjs');

  assert.equal(existsSync(scriptPath), true);
  assert.equal(packageJson.scripts['copy:c-drive'], 'node scripts/copy-release-to-c-drive.mjs');
  assert.match(packageJson.scripts.predeploy, /npm run build/);
  assert.match(packageJson.scripts.predeploy, /npm run copy:c-drive/);
  assert.equal(DEFAULT_TARGET_DIR, 'C:\\viral-radar-main');
});

test('C drive release copy only targets the explicit viral-radar folder', () => {
  assert.equal(isSafeTargetDir('C:\\viral-radar-main'), true);
  assert.equal(isSafeTargetDir('C:\\viral-radar-main\\'), true);
  assert.equal(isSafeTargetDir('C:\\'), false);
  assert.equal(isSafeTargetDir('C:\\Users\\sx717\\Antigravity\\viral-radar'), false);
  assert.equal(isSafeTargetDir('C:\\short_movie-main'), false);
});

test('C drive release copy excludes generated folders, git data, and secrets', () => {
  assert.equal(shouldCopyTrackedPath('src/main.js'), true);
  assert.equal(shouldCopyTrackedPath('start_monogatari_buzz_maker.bat'), true);
  assert.equal(shouldCopyTrackedPath('README.md'), true);

  assert.equal(shouldCopyTrackedPath('.git/config'), false);
  assert.equal(shouldCopyTrackedPath('node_modules/vite/index.js'), false);
  assert.equal(shouldCopyTrackedPath('dist/assets/index.js'), false);
  assert.equal(shouldCopyTrackedPath('scratch/note.md'), false);
  assert.equal(shouldCopyTrackedPath('output/result.json'), false);
  assert.equal(shouldCopyTrackedPath('.env'), false);
  assert.equal(shouldCopyTrackedPath('.env.local'), false);
  assert.equal(shouldCopyTrackedPath('HANDOFF.md'), false);
});

test('copy plan preserves source-relative file paths', () => {
  const plan = buildCopyPlan({
    rootDir: 'C:\\repo',
    targetDir: 'C:\\viral-radar-main',
    trackedFiles: ['package.json', 'src/main.js', '.env.local', 'scratch/tmp.txt'],
  });

  assert.deepEqual(
    plan.map((entry) => entry.relativePath),
    ['package.json', 'src/main.js'],
  );
  assert.equal(plan[0].source, 'C:\\repo\\package.json');
  assert.equal(plan[0].destination, 'C:\\viral-radar-main\\package.json');
});
