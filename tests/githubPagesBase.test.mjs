import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import viteConfig from '../vite.config.js';

test('production build asset base matches the GitHub Pages project path', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const homepagePath = new URL(packageJson.homepage).pathname.replace(/\/?$/, '/');

  assert.equal(viteConfig.base, homepagePath);
});
