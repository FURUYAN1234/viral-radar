import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildTrendSearchUrl,
  searchTrendObservations,
} from '../src/lib/publicTrendSearch.js';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('GitHub Pages runtime does not keep the static-preview hard failure', () => {
  assert.match(mainSource, /searchTrendObservations/);
  assert.doesNotMatch(mainSource, /GitHub Pages.*static|GitHub Pages.*静的|静的プレビュー/);
});

test('buildTrendSearchUrl keeps local API parameters stable', () => {
  assert.equal(
    buildTrendSearchUrl({
      categoryId: 'story-manga',
      timeWindow: '7d',
      audience: 'general',
      searchSeed: 3,
    }),
    '/api/trend-search?categoryId=story-manga&timeWindow=7d&audience=general&searchSeed=3',
  );
});

test('searchTrendObservations fails closed when no real RSS source can be fetched', async () => {
  const fetchImpl = async () => {
    throw new TypeError('cors blocked');
  };

  await assert.rejects(
    searchTrendObservations({
      categoryId: 'story-manga',
      timeWindow: '7d',
      audience: 'general',
      searchSeed: 0,
      fetchImpl,
    }),
    /public Web\/RSS|RSS|取得/,
  );
});

test('searchTrendObservations converts fetched RSS into linked observations', async () => {
  const rss = `<?xml version="1.0"?>
  <rss><channel>
    <item>
      <title><![CDATA[職場の理不尽に共感が集まる投稿]]></title>
      <link>https://example.com/work</link>
      <description><![CDATA[人間関係と生活不安の話題]]></description>
      <pubDate>Thu, 25 Jun 2026 01:00:00 GMT</pubDate>
    </item>
    <item>
      <title><![CDATA[家計と育児のすれ違いが議論に]]></title>
      <link>https://example.com/life</link>
      <description><![CDATA[SNSで共感が広がる生活の話]]></description>
      <pubDate>Thu, 25 Jun 2026 02:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;
  const fetchImpl = async () =>
    new Response(rss, {
      status: 200,
      headers: { 'Content-Type': 'application/rss+xml' },
    });

  const payload = await searchTrendObservations({
    categoryId: 'story-manga',
    timeWindow: '7d',
    audience: 'general',
    searchSeed: 0,
    fetchImpl,
  });

  assert.equal(payload.ok, true);
  assert.ok(payload.observations.length >= 2);
  assert.equal(payload.observations[0].sourceType, 'public-web-rss');
  assert.match(payload.observations[0].sourceUrl, /^https:\/\/example\.com\//);
  assert.ok(payload.sourcesAttempted.length > 0);
  assert.ok(payload.sourcesSucceeded.length > 0);
});
