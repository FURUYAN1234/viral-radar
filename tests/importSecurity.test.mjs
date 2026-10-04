import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CATEGORIES } from '../src/lib/categories.js';
import { buildReport } from '../src/lib/reportEngine.js';
import { fromJson, toJson, toMarkdown } from '../src/lib/exporters.js';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const fixture = () => structuredClone(buildReport({ categoryId: 'story-manga', observations: PUBLIC_OBSERVATIONS }));

// Execute the real import handler and renderer without a browser or network.
function harness(report = fixture()) {
  const app = { innerHTML: '' };
  const state = { report, settings: {}, planSamples: {}, analysisStartConfirmed: true };
  const context = vm.createContext({
    app, state, CATEGORIES, fromJson, APP_VERSION: 'test', URL,
    getProviderStatus: () => ({ mode: 'gemini', provider: { connected: true, label: 'test' } }),
    fetch: () => { throw new Error('Network forbidden in import test'); },
  });
  vm.runInContext(main.slice(main.indexOf('function bootstrapApp()')), context);
  vm.runInContext('bindEvents = () => {}; clearActionMessage = () => {};', context);
  return {
    state, app, context,
    async import(reportToLoad) {
      context.event = { target: { files: [{ text: async () => JSON.stringify(reportToLoad) }], value: 'fixture.json' } };
      await vm.runInContext('importJson(event)', context);
      assert.equal(context.event.target.value, '');
    },
  };
}

test('imported labels render as text, including HTML and attribute payloads', async () => {
  const report = fixture();
  const payload = '<img src=x onerror="globalThis.importExecuted=true"> & \'quoted\'';
  report.category.label = payload;
  report.category.description = payload;
  report.trendClusters[0].label = payload;
  const h = harness();
  await h.import(report);
  assert.equal(h.state.report.category.label, payload, 'preserve source text for exports');
  assert.doesNotMatch(h.app.innerHTML, /<img\b/i);
  assert.ok(h.app.innerHTML.includes('&lt;img src=x onerror=&quot;globalThis.importExecuted=true&quot;&gt;'));
  assert.equal(h.context.importExecuted, undefined);
});

test('mixed-case textarea closing tags cannot escape the imported prompt', async () => {
  const report = fixture();
  const payload = '</TeXtArEa><img src=x onerror="globalThis.importExecuted=true">';
  report.creativePlans[0].aiDraftPrompt = payload;
  report.creativePlans[0].id = '\" onclick=\"globalThis.importExecuted=true';
  report.evidenceCards[0].sourceUrls = ['javascript:globalThis.importExecuted=true'];
  const h = harness();
  await h.import(report);
  assert.doesNotMatch(h.app.innerHTML, /<img\b|href="javascript:|" onclick="/i);
  assert.ok(h.app.innerHTML.includes('&lt;/TeXtArEa&gt;'));
  assert.equal(h.context.importExecuted, undefined);
});

const invalidCases = [
  ['empty clusters', r => { r.trendClusters = []; }],
  ['non-text category', r => { r.category.label = {}; }],
  ['missing analysis', r => { delete r.deepAnalysis; }],
  ['null observation', r => { r.trendClusters[0].observations = [null]; }],
  ['invalid observed timestamp', r => { r.trendClusters[0].observations[0].observedAt = {}; }],
  ['invalid observation metric', r => { r.trendClusters[0].observations[0].metrics.rank = {}; }],
  ['invalid signals', r => { r.trendClusters[0].creatorSignals = [null]; }],
  ['invalid score', r => { r.trendClusters[0].momentumScore = '<img>'; }],
  ['missing plan brief', r => { delete r.creativePlans[0].creatorBrief; }],
  ['invalid outline', r => { r.creativePlans[0].outline = {}; }],
  ['invalid guide', r => { r.beginnerGuide = { steps: 'bad' }; }],
  ['invalid design notes', r => { r.creativePlans[0].craftNotes = [null]; }],
];
for (const [name, mutate] of invalidCases) {
  test(`malformed import rejected before replacing report: ${name}`, async () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => fromJson(JSON.stringify(report)));
    const h = harness();
    const original = h.state.report;
    await h.import(report);
    assert.equal(h.state.report, original);
    assert.ok(h.app.innerHTML.includes('JSON'));
  });
}

test('ordinary and AI-enriched reports retain export/import content', async () => {
  const report = fixture();
  report.beginnerGuide = { headline: 'guide', promise: 'promise', firstOutput: 'output', steps: [{ label: 'step', action: 'act', output: 'result' }], checklist: ['check'], avoid: ['avoid'] };
  report.creativePlans[0].storyArchitecture.notes = [{ label: 'structure', detail: 'detail' }];
  report.creativePlans[0].craftNotes = [{ label: 'craft', detail: 'detail' }];
  report.creativePlans[0].retentionDesign = { lengthGoal: 'short', openingHook: 'hook', middleKeep: 'keep', payoff: 'end', continuationHook: 'next' };
  report.categoryFitCards = [{ title: 'fit', whyThisMedium: 'why', creatorMove: 'move', example: 'example', evidenceAnchor: 'anchor' }];
  report.categoryReasons = [{ title: 'reason', detail: 'detail', example: 'example' }];
  assert.deepEqual(fromJson(toJson(report)), report);
  assert.ok(toMarkdown(fromJson(toJson(report))).includes('structure'));
  const h = harness();
  await h.import(report);
  assert.ok(h.app.innerHTML.includes('guide'));
});
