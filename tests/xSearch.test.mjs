import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { searchX, xApiMiddleware, xApiPlugin } from '../server/xApi.mjs';
import { xSearchOptions, normalizeXResponse, applyXHistory, formatXMetrics, xEvidenceScore } from '../src/lib/xSearch.js';
import { renderXPanel, createXState, canUseLocalApi } from '../src/lib/xPanel.js';
import { runDraftSample } from '../src/lib/providers.js';

const now = Date.parse('2026-11-13T00:00:00Z');
const input = { query: '暮らし OR 工夫', categoryId: 'story-manga', period: '24h', maxResults: 10 };
const payload = { data: [{ id: '123', text: '家事を共有する小さな工夫', author_id: '42', created_at: new Date(now-3600000).toISOString(), public_metrics: { like_count: 0, retweet_count: 2, reply_count: 3, quote_count: 1, impression_count: 200, bookmark_count: 0 } }], meta: { result_count: 1, next_token: 'more' } };
const token = 'test-only-opaque-token';

test('Vite registration does not return middleware as a post-install callback', () => {
  const app = () => { throw new Error('must not invoke Connect without request'); };
  const server = { middlewares: { use(fn) { assert.equal(typeof fn, 'function'); return app; } } };
  assert.equal(xApiPlugin().configureServer(server), undefined);
  assert.equal(xApiPlugin().configurePreviewServer(server), undefined);
});

test('search makes one fixed-destination request and respects cost/period/field boundaries', async () => {
  let count = 0;
  const result = await searchX({ token, input, now, fetchImpl: async (url, options) => {
    count++;
    assert.equal(url.origin, 'https://api.x.com');
    assert.equal(url.pathname, '/2/tweets/search/recent');
    assert.equal(url.searchParams.get('max_results'), '10');
    assert.match(url.searchParams.get('query'), /lang:ja -is:retweet -is:reply$/);
    assert.equal(url.searchParams.get('start_time'), new Date(now-86400000).toISOString());
    assert.equal(url.searchParams.has('expansions'), false);
    assert.equal(url.searchParams.has('next_token'), false);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    return Response.json(payload);
  } });
  assert.equal(count, 1);
  assert.equal(result.estimatedMaximumUsd, 0.05);
  assert.equal(result.hasMore, true);
  assert.ok(!JSON.stringify(result).includes(token));
});

test('author expansions are opt in and missing data never become a fake zero', async () => {
  const result = await searchX({ token, input: { ...input, period: '7d', includeAuthors: true }, now, fetchImpl: async url => {
    assert.equal(url.searchParams.get('expansions'), 'author_id');
    assert.ok(Date.parse(url.searchParams.get('start_time')) > now - 7*86400000);
    return Response.json({ ...payload, includes: { users: [{ id: '42', username: 'example', public_metrics: { followers_count: 100 } }] } });
  } });
  assert.equal(result.estimatedMaximumUsd, 0.15);
  assert.equal(result.observations[0].metrics.reactionsPer1000Followers, 60);
  const missing = normalizeXResponse({ data: [{ id: '4', text: '本文', public_metrics: { like_count: 0, impression_count: null } }] }, xSearchOptions(input));
  assert.equal(missing.observations[0].metrics.likes, 0);
  assert.ok(!Object.hasOwn(missing.observations[0].metrics, 'impressions'));
  assert.ok(!Object.hasOwn(missing.observations[0].metrics, 'reactions'));
  assert.match(formatXMetrics(missing.observations[0].metrics), /いいね 0/);
  assert.equal(xEvidenceScore(missing.observations[0]), 0);
});

test('empty results, partial errors and invalid response are distinguished', () => {
  const opts = xSearchOptions(input);
  assert.deepEqual(normalizeXResponse({ meta: { result_count: 0 } }, opts).observations, []);
  assert.match(normalizeXResponse({ ...payload, errors: [{ detail: 'private upstream content' }] }, opts).warning, /一部/);
  assert.throws(() => normalizeXResponse({ errors: [] }, opts), /読み取れません/);
  assert.throws(() => normalizeXResponse({ data: [{ id: '<script>', text: 'bad' }] }, opts), /有効な投稿/);
});

test('invalid limits, credentials, and search periods never call X', async () => {
  const fetchImpl = () => { throw new Error('must not fetch'); };
  for (const bad of [{ maxResults: 9 }, { maxResults: 101 }, { period: '30d' }, { query: 'x'.repeat(441) }]) {
    await assert.rejects(searchX({ token, input: { ...input, ...bad }, fetchImpl }), e => e.status === 400);
  }
  await assert.rejects(searchX({ token: '', input, fetchImpl }), /Bearer Token/);
});

test('401, 402, 403, 429, server and network errors are bounded and secret-safe', async () => {
  for (const status of [400, 401, 402, 403, 429, 500]) {
    let calls = 0;
    await assert.rejects(searchX({ token, input, fetchImpl: async () => { calls++; return new Response(token, { status }); } }), error => error.status === status && !error.message.includes(token));
    assert.equal(calls, 1);
  }
  await assert.rejects(searchX({ token, input, fetchImpl: async () => { throw new Error(token); } }), error => error.status === 502 && !error.message.includes(token));
});

test('growth requires two observations at least one minute apart, and does not invent negative growth', () => {
  const history = new Map();
  const first = normalizeXResponse(payload, xSearchOptions(input), new Date(now).toISOString()).observations;
  assert.ok(!Object.hasOwn(applyXHistory(first, history)[0].metrics, 'reactionIncreasePerHour'));
  const second = [{ ...first[0], observedAt: new Date(now+3600000).toISOString(), metrics: { ...first[0].metrics, reactions: 16 } }];
  assert.equal(applyXHistory(second, history)[0].metrics.reactionIncreasePerHour, 10);
  assert.ok(!Object.hasOwn(applyXHistory(first, history)[0].metrics, 'reactionIncreasePerHour'));
});

test('X panel escapes posts, has no token value, and hosted mode cannot send secrets', () => {
  const x = createXState(); x.mode = 'both'; x.token = token; x.verified = true;
  x.result = normalizeXResponse({ data: [{ ...payload.data[0], text: '<script>alert(1)</script>' }] }, xSearchOptions(input));
  const html = renderXPanel(x, { local: true, busy: false, categoryId: 'story-manga' });
  assert.ok(!html.includes(token)); assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /接続確認済み/);
  const hosted = renderXPanel(createXState(), { local: false, busy: false, categoryId: 'story-manga' });
  assert.ok(!hosted.includes('id="x-token"'));
  assert.match(hosted, /このデモではX連携は利用できません/);
  assert.doesNotMatch(hosted, /x-panel|x-source-mode|<input|<select|<button/);
  assert.match(hosted, /archive\/refs\/heads\/main\.zip/);
  assert.match(hosted, /#local-setup/);
  const imported = renderXPanel(x, { local: false, busy: false, categoryId: 'story-manga' });
  assert.doesNotMatch(imported, /x-panel|x-source-mode|id="x-token"|fixture-only|test-only/);
  assert.match(html, /ローカル実行 · X利用可/);
});

test('local API availability requires a loopback HTTP origin, never a public or file URL', () => {
  for (const url of ['http://127.0.0.1:5180/viral-radar/', 'http://localhost:5180/', 'http://[::1]:5180/']) assert.equal(canUseLocalApi(new URL(url)), true);
  for (const url of ['https://furuyan1234.github.io/viral-radar/', 'https://example.com/', 'file:///C:/app/index.html', 'https://localhost.evil.example/', 'http://127.0.0.1.evil.example/']) assert.equal(canUseLocalApi(new URL(url)), false);
  assert.equal(canUseLocalApi({}), false);
});

test('X is explicitly optional and off by default, with settings only when enabled', () => {
  const x = createXState();
  const render = () => renderXPanel(x, { local:true, busy:false, categoryId:'story-manga' });
  assert.match(render(), /Xを使わない/);
  assert.match(render(), /X APIへの通信・料金は発生しません/);
  assert.doesNotMatch(render(), /id="x-token"|id="x-search-now"/);
  x.token = token;
  assert.doesNotMatch(render(), /id="x-search-now"/);
  x.mode = 'both';
  assert.match(render(), /Xを使う/);
  assert.match(render(), /id="x-sort"/);
  assert.doesNotMatch(render(), /value="x"|X投稿文|X検索だけ試す/);
  assert.equal(xSearchOptions({}).sortOrder, 'relevancy');
  assert.throws(() => xSearchOptions({sortOrder:'invalid'}), /並び順/);
});

test('local API rejects foreign origins and excessive body before upstream calls', async t => {
  let calls = 0;
  const middleware = xApiMiddleware({ fetchImpl: async () => { calls++; return Response.json(payload); } });
  const server = createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const foreign = await fetch(`${base}/api/x-search`, { method:'POST', headers:{...headers,Origin:'https://untrusted.example'}, body:JSON.stringify(input) });
  assert.equal(foreign.status,403); await foreign.text();
  const excessive = await fetch(`${base}/api/x-search`, { method:'POST', headers, body:JSON.stringify({query:'x'.repeat(20000)}) });
  assert.equal(excessive.status,413); await excessive.text();
  assert.equal(calls,0);
  const valid = await fetch(`${base}/api/x-search`, { method:'POST', headers:{...headers,Origin:base}, body:JSON.stringify(input) });
  assert.equal(valid.status,200); assert.equal(valid.headers.get('cache-control'),'no-store');
  assert.equal((await valid.json()).usableCount,1);
  assert.equal(calls,1);
});

