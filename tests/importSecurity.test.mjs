import {getOpenAIModelOption,OPENAI_MODEL_OPTIONS,OPENAI_MODEL_PRICE_SNAPSHOT_DATE,formatOpenAIModelPrice,DEFAULT_OPENAI_MODEL_ID} from '../src/lib/openaiModels.js';
import { createAiOperationManager } from '../src/lib/aiOperation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CATEGORIES } from '../src/lib/categories.js';
import { buildReport } from '../src/lib/reportEngine.js';
import { fromJson, toJson, toMarkdown } from '../src/lib/exporters.js';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { createXState, renderXPanel, canUseLocalApi } from '../src/lib/xPanel.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const fixture = () => structuredClone(buildReport({ categoryId: 'story-manga', observations: PUBLIC_OBSERVATIONS }));

// Execute the real import handler and renderer without a browser or network.
function harness(report = fixture()) {
  const app = { innerHTML: '' };
  const connection={connected:true,mode:'gemini'},bodyClasses=new Set();
  const state = { report, settings: {}, planSamples: {}, openAiModelId:DEFAULT_OPENAI_MODEL_ID, analysisStartConfirmed: true, x: createXState() };
  const context = vm.createContext({ aiOperations: createAiOperationManager(),
    app, state, CATEGORIES, fromJson, renderXPanel, canUseLocalApi, APP_VERSION: 'test', URL, getOpenAIModelOption,OPENAI_MODEL_OPTIONS,OPENAI_MODEL_PRICE_SNAPSHOT_DATE,formatOpenAIModelPrice, API_INPUT_AUTOFILL_CLEAR_MS:0,window:{requestAnimationFrame:callback=>callback(),setTimeout:()=>0},
    document: { querySelector: () => null,body:{classList:{toggle:(name,enabled)=>enabled?bodyClasses.add(name):bodyClasses.delete(name)}} },
    getProviderStatus: () => ({ mode: connection.mode, provider: { connected: connection.connected, label: 'test' } }),
    fetch: () => { throw new Error('Network forbidden in import test'); },
  });
  vm.runInContext(main.slice(main.indexOf('function bootstrapApp()')), context);
  vm.runInContext('bindEvents = () => {}; clearActionMessage = () => {};', context);
  return {
    state, app, context, connection, bodyClasses,
    async import(reportToLoad) {
      context.event = { target: { files: [{ text: async () => JSON.stringify(reportToLoad) }], value: 'fixture.json' } };
      await vm.runInContext('importJson(event)', context);
      assert.equal(context.event.target.value, '');
    },
  };
}

test('unsubmitted X token survives unrelated render without entering report or HTML attributes', () => {
  const h = harness();
  h.state.x.mode = 'both';
  h.context.location = new URL('http://127.0.0.1:5180/');
  const draft = 'fixture-only-unsubmitted-token';
  let input = { value: draft };
  let html = '';
  h.context.document = { querySelector: selector => selector === '#x-token' ? input : null };
  Object.defineProperty(h.app, 'innerHTML', {
    get: () => html,
    set: value => { html = value; input = value.includes('id="x-token"') ? { value: '' } : null; },
  });
  vm.runInContext('render()', h.context);
  assert.equal(input.value, draft);
  assert.equal(h.state.x.token, '');
  assert.doesNotMatch(html, new RegExp(draft));
  assert.doesNotMatch(toJson(h.state.report), new RegExp(draft));
  h.state.x.token = 'fixture-only-committed-token';
  vm.runInContext('render()', h.context);
  assert.equal(input, null, 'committed token must still render a blank disabled placeholder');
  assert.doesNotMatch(html, /fixture-only-/);
});

test('AI setup precedes optional local X setup; public mode has only the local-use guide', () => {
  const h = harness();
  h.state.apiPanelOpen = true;
  h.state.analysisStartConfirmed = false;
  h.context.location = new URL('http://127.0.0.1:5180/');
  vm.runInContext('render()', h.context);
  const ai = h.app.innerHTML.indexOf('aria-label="AI設定"');
  const x = h.app.innerHTML.indexOf('class="panel x-panel"');
  const start = h.app.innerHTML.indexOf('id="provider-start"');
  assert.ok(ai >= 0 && x > ai && start > x);
  h.context.location = new URL('https://furuyan1234.github.io/viral-radar/');
  vm.runInContext('render()', h.context);
  assert.doesNotMatch(h.app.innerHTML, /x-source-mode|class="panel x-panel"|id="x-token"/);
  assert.match(h.app.innerHTML, /このデモではX連携は利用できません/);
  assert.match(h.app.innerHTML, /id="provider-start"/);
});

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
test('API connection shows inactive stop before explicit start, without unlocking analysis, for both providers',()=>{
 for(const mode of ['openai','gemini']){
  const h=harness();h.connection.mode=mode;h.connection.connected=false;h.state.openAiModelConfirmed=true;h.state.analysisStartConfirmed=false;
  const render=()=>vm.runInContext('render()',h.context),button=()=>h.app.innerHTML.match(/<button id="stop-ai"[^>]*>/)[0];
  render();assert.match(button(),/\bhidden\b/);assert.equal(h.bodyClasses.has('ai-workspace-ready'),false);
  h.connection.connected=true;render();assert.doesNotMatch(button(),/\bhidden\b/);assert.match(button(),/\bdisabled\b/);assert.equal(h.bodyClasses.has('ai-workspace-ready'),true);
  assert.match(h.app.innerHTML,/<main class="app-shell locked-shell/);assert.match(h.app.innerHTML,/class="api-start-panel"/);assert.equal(h.state.analysisStartConfirmed,false);
  if(mode==='openai'){h.state.openAiModelConfirmed=false;render();assert.doesNotMatch(button(),/\bhidden\b/);h.state.openAiModelConfirmed=true;}
  h.state.analysisStartConfirmed=true;render();assert.doesNotMatch(button(),/\bhidden\b/);assert.match(button(),/\bdisabled\b/);assert.doesNotMatch(h.app.innerHTML,/<main class="app-shell locked-shell/);
  vm.runInContext('var operation=aiOperations.begin();state.providerBusy=true;render()',h.context);assert.doesNotMatch(button(),/\bdisabled\b|\bhidden\b/);assert.match(h.app.innerHTML,/<main class="app-shell locked-shell/);
  vm.runInContext('aiOperations.stop();operation.finish();state.providerBusy=false;render()',h.context);assert.match(button(),/\bdisabled\b/);assert.doesNotMatch(button(),/\bhidden\b/);
  vm.runInContext('operation=aiOperations.begin();state.providerBusy=true;render();operation.finish();state.providerBusy=false;render()',h.context);assert.match(button(),/\bdisabled\b/);assert.doesNotMatch(button(),/\bhidden\b/);
  h.connection.connected=false;render();assert.match(button(),/\bhidden\b/);assert.equal(h.bodyClasses.has('ai-workspace-ready'),false);
 }
});
test('active AI work remains stoppable above a lost connection gate and hides only after settling',()=>{
 const h=harness();h.connection.connected=false;h.state.analysisStartConfirmed=false;
 vm.runInContext('var operation=aiOperations.begin();state.providerBusy=true;render()',h.context);
 let button=h.app.innerHTML.match(/<button id="stop-ai"[^>]*>/)[0];assert.doesNotMatch(button,/\bhidden\b|\bdisabled\b/);assert.equal(h.bodyClasses.has('ai-workspace-ready'),true);
 assert.ok(h.app.innerHTML.indexOf('id="stop-ai"')<h.app.innerHTML.indexOf('<main class="app-shell'));
 vm.runInContext('aiOperations.stop();operation.finish();state.providerBusy=false;render()',h.context);button=h.app.innerHTML.match(/<button id="stop-ai"[^>]*>/)[0];assert.match(button,/\bhidden\b/);assert.match(button,/\bdisabled\b/);
});
