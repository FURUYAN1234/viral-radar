import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const publicTrendSearch = readFileSync(new URL('../src/lib/publicTrendSearch.js', import.meta.url), 'utf8');
const productionSources = [
  '../src/main.js',
  '../src/lib/publicTrendSearch.js',
  '../src/lib/reportEngine.js',
  '../vite.config.js',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

test('trend search endpoint is implemented as a real network RSS fetcher', () => {
  assert.match(viteConfig, /registerTrendSearchRoute\(server\.middlewares\)/);
  assert.match(viteConfig, /request\.url\?\.startsWith\('\/api\/trend-search'\)/);
  assert.match(publicTrendSearch, /fetchTrendSource/);
  assert.match(publicTrendSearch, /news\.google\.com\/rss\/search/);
  assert.match(publicTrendSearch, /bing\.com\/news\/search/);
  assert.match(publicTrendSearch, /trends\.google\.co\.jp\/trending\/rss/);
  assert.match(publicTrendSearch, /b\.hatena\.ne\.jp/);
  assert.match(publicTrendSearch, /news\.yahoo\.co\.jp\/rss\/topics/);
  assert.match(publicTrendSearch, /sourceUrl: item\.sourceUrl \|\| item\.link/);
  assert.match(publicTrendSearch, /api\.allorigins\.win/);
  assert.match(publicTrendSearch, /api\.codetabs\.com/);
});

test('production source does not keep demo observation paths or fake search helpers', () => {
  const combined = productionSources.join('\n');
  assert.doesNotMatch(combined, /DEMO_OBSERVATIONS|想定データ|デモ観測/);
  assert.doesNotMatch(combined, /from '\.\/fixtures\.js'|from '\.\/trendSearch\.js'/);
});
