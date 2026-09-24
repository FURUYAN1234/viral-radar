# OpenAI Model Selector Implementation Plan

> **Final UX adjustment:** API接続、モデル選択、開始確認は1つの設定パネルへ統合する。設定パネルは分析開始時に閉じるため、「選択・試行・採用」の一時表示欄は最終UIに置かない。内部の経路記録と下位フォールバックは維持する。

> **Execution:** Use superpowers:executing-plans for normal task-by-task implementation. Use superpowers:subagent-driven-development only when the user or applicable project instructions explicitly request per-task delegation and the tasks are genuinely independent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OpenAI-only model picker that recommends GPT-6 Astra without auto-selecting it, routes every OpenAI generation from the selected model downward, and proves GPT-6 Luna with one real in-app API analysis.

**Architecture:** Extend the existing Nano Banana snapshot sync to include current scenario-model metadata, expose a small local OpenAI catalog/router module, and pass the selected model through the existing provider fallback boundary. Keep the selected model in page memory only, invalidate stale generated results on change, and keep route telemetry internal while presenting one compact settings flow.

**Tech Stack:** Vanilla JavaScript, HTML template strings, CSS, Vite, Node.js test runner, OpenAI Responses API, existing local Vite provider proxy.

## Global Constraints

- Default OpenAI model is exactly `gpt-6-astra`.
- Real API verification explicitly selects exactly `gpt-6-luna`.
- OpenAI failures may fall only to models after the selected model in the configured order; never move upward.
- Gemini behavior remains unchanged and has no new selector.
- API keys remain runtime-only and must never be read, printed, persisted, exported, or exposed in UI/error text.
- Preserve all pre-existing uncommitted changes, especially `package.json`, `src/lib/nanoBananaFallbackSnapshot.js`, `tests/cDriveReleaseCopy.test.mjs`, and the removed copy script.
- Add no dependency.
- Do not commit, push, deploy, release, update note, or run backup; none is authorized.
- One real paid Luna analysis action is authorized. If it fails, diagnose locally and report before any additional paid attempt.

---

### Task 1: Synced OpenAI Model Catalog

**Files:**
- Modify: `scripts/sync-nano-fallback-chain.mjs`
- Modify: `src/lib/nanoBananaFallbackSnapshot.js`
- Create: `src/lib/openaiModels.js`
- Modify: `tests/nanoFallbackSync.test.mjs`
- Create: `tests/openaiModels.test.mjs`

**Interfaces:**
- Consumes: Nano Banana `src/config/openai-scenario-models.json` with `priceSnapshotDate` and `models`.
- Produces: `DEFAULT_OPENAI_MODEL_ID`, `OPENAI_MODEL_OPTIONS`, `OPENAI_MODEL_PRICE_SNAPSHOT_DATE`, `getOpenAIModelOption(modelId)`, `getOpenAIModelRoute(modelId)`, `normalizeOpenAIModelId(modelId)`, and `formatOpenAIModelPrice(model)`.

- [ ] **Step 1: Write failing snapshot and catalog tests**

```js
assert.deepEqual(
  NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map(model => model.id),
  ['gpt-6-astra', 'gpt-6-sol', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-6-luna', 'gpt-5.6-luna', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o'],
);
assert.equal(DEFAULT_OPENAI_MODEL_ID, 'gpt-6-astra');
assert.deepEqual(getOpenAIModelRoute('gpt-6-luna'), [
  'gpt-6-luna', 'gpt-5.6-luna', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o',
]);
assert.equal(normalizeOpenAIModelId('unknown-model'), 'gpt-6-astra');
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test tests/nanoFallbackSync.test.mjs tests/openaiModels.test.mjs`

Expected: FAIL because the snapshot still contains only the GPT-4.1 chain and `src/lib/openaiModels.js` does not exist.

- [ ] **Step 3: Extend the sync source and snapshot schema**

```js
const sourcePaths = {
  packageJson: resolve(nanoRoot, 'package.json'),
  fallbackHistory: resolve(nanoRoot, 'src/lib/fallback-chain-history.js'),
  gemini: resolve(nanoRoot, 'src/lib/gemini.js'),
  openaiScenarioModels: resolve(nanoRoot, 'src/config/openai-scenario-models.json'),
};

const openaiScenarioConfig = JSON.parse(readFileSync(sourcePaths.openaiScenarioModels, 'utf8'));

openaiText: {
  provider: 'openai',
  sourceFile: 'nano-banana-pro/src/config/openai-scenario-models.json',
  priceSnapshotDate: String(openaiScenarioConfig.priceSnapshotDate || ''),
  models: openaiScenarioConfig.models.map((model, index) => ({
    ...model,
    role: index === 0 ? 'Primary' : index === openaiScenarioConfig.models.length - 1 ? 'Fallback' : 'Backup',
    order: index + 1,
  })),
},
```

Regenerate only the snapshot with `npm.cmd run sync:nano-fallback`; do not revert its existing uncommitted version/fingerprint changes.

- [ ] **Step 4: Add the bounded catalog/router module**

```js
import { NANO_BANANA_FALLBACK_SNAPSHOT } from './nanoBananaFallbackSnapshot.js';

export const DEFAULT_OPENAI_MODEL_ID = 'gpt-6-astra';
export const OPENAI_MODEL_OPTIONS = Object.freeze(
  NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map(model => Object.freeze({ ...model })),
);
export const OPENAI_MODEL_PRICE_SNAPSHOT_DATE =
  NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.priceSnapshotDate;

export function normalizeOpenAIModelId(modelId) {
  const normalized = String(modelId || '').trim().toLowerCase();
  return OPENAI_MODEL_OPTIONS.some(model => model.id === normalized)
    ? normalized
    : DEFAULT_OPENAI_MODEL_ID;
}

export function getOpenAIModelOption(modelId) {
  const normalized = normalizeOpenAIModelId(modelId);
  return OPENAI_MODEL_OPTIONS.find(model => model.id === normalized);
}

export function getOpenAIModelRoute(modelId = DEFAULT_OPENAI_MODEL_ID) {
  const normalized = normalizeOpenAIModelId(modelId);
  const index = OPENAI_MODEL_OPTIONS.findIndex(model => model.id === normalized);
  return OPENAI_MODEL_OPTIONS.slice(index).map(model => model.id);
}

export function formatOpenAIModelPrice(model) {
  const option = model || getOpenAIModelOption(DEFAULT_OPENAI_MODEL_ID);
  return `入力 $${option.inputPriceUsdPerM} / 出力 $${option.outputPriceUsdPerM} USD / 100万トークン`;
}
```

- [ ] **Step 5: Run catalog checks and confirm GREEN**

Run: `node --test tests/nanoFallbackSync.test.mjs tests/openaiModels.test.mjs`

Expected: all tests PASS and the snapshot check reports the current scenario list and metadata.

### Task 2: Selected-Model Provider Routing

**Files:**
- Modify: `src/lib/providers.js`
- Modify: `tests/providers.test.mjs`

**Interfaces:**
- Consumes: `getOpenAIModelRoute(selectedModelId)` and `normalizeOpenAIModelId(selectedModelId)` from Task 1.
- Produces: every `runProviderAnalysis`, `runPlanDesignGeneration`, and `runDraftSample` call accepts `selectedModelId` and `onModelRoute`; route events have `{ phase: 'trying' | 'failed' | 'adopted', modelId, reason? }`.

- [ ] **Step 1: Write failing routing tests for all three entry points**

```js
const routeEvents = [];
const fetchImpl = async (url, init) => {
  assert.equal(JSON.parse(init.body).model, 'gpt-6-luna');
  return {
    ok: true,
    async json() {
      return { output_text: '{"summary":"luna ok"}' };
    },
  };
};
const result = await runProviderAnalysis({
  provider: 'openai',
  apiKey: OPENAI_SECRET_KEY,
  selectedModelId: 'gpt-6-luna',
  onModelRoute: event => routeEvents.push(event),
  report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
  fetchImpl,
});
assert.equal(result.used_model, 'gpt-6-luna');
assert.deepEqual(routeEvents.map(event => `${event.phase}:${event.modelId}`), [
  'trying:gpt-6-luna',
  'adopted:gpt-6-luna',
]);
```

Repeat request-body assertions for `runPlanDesignGeneration` and `runDraftSample`, and add a failed-Luna assertion that the next attempt is `gpt-5.6-luna`, never Astra/Sol/Terra.

- [ ] **Step 2: Write a failing auth-stop regression**

```js
const attemptedModels = [];
await assert.rejects(runProviderAnalysis({
  provider: 'openai',
  apiKey: OPENAI_SECRET_KEY,
  selectedModelId: 'gpt-6-luna',
  report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
  fetchImpl: async (url, init) => {
    attemptedModels.push(JSON.parse(init.body).model);
    return {
      ok: false,
      status: 401,
      async json() {
        return { error: { message: 'invalid_api_key' } };
      },
    };
  },
}));
assert.deepEqual(attemptedModels, ['gpt-6-luna']);
```

- [ ] **Step 3: Run focused provider tests and confirm RED**

Run: `node --test tests/providers.test.mjs`

Expected: FAIL because the public entry points ignore `selectedModelId` and expose no route callbacks.

- [ ] **Step 4: Pass selection and route events through the common fallback**

```js
export async function runProviderAnalysis({
  provider, apiKey, report, selectedModelId, onModelRoute, fetchImpl = fetch, proxyBase = '',
}) {
  return runProviderFallback({
    provider, apiKey, selectedModelId, onModelRoute, fetchImpl, proxyBase,
    failureMessage: `${provider}の詳細分析に失敗しました。`,
    createRequest: model => createProviderAnalysisRequest({ provider, report, model }),
    parsePayload: payload => parseProviderPayload(provider, payload, report),
  });
}

async function runProviderFallback({
  provider,
  apiKey,
  selectedModelId,
  onModelRoute,
  fetchImpl,
  proxyBase = '',
  failureMessage,
  createRequest,
  parsePayload,
}) {
  const attempts = [];
  for (const model of getProviderModelChain(provider, selectedModelId)) {
    onModelRoute?.({ phase: 'trying', modelId: model });
    try {
      const body = JSON.stringify(createRequest(model));
      const payload = await callProviderModel({ provider, apiKey, model, body, fetchImpl, proxyBase });
      onModelRoute?.({ phase: 'adopted', modelId: model });
      return { ...parsePayload(payload), used_model: model, fallback_chain: [...attempts, { model, status: 'success' }] };
    } catch (error) {
      const reason = sanitizeProviderError(error);
      attempts.push({ model, status: 'failed', reason });
      onModelRoute?.({ phase: 'failed', modelId: model, reason });
      if (isProviderAuthenticationReason(reason)) break;
    }
  }
  const reasons = [...new Set(attempts.map(attempt => attempt.reason).filter(Boolean))].join(' / ');
  throw new Error(
    `${failureMessage} 試行モデル: ${attempts.map(attempt => attempt.model).join(' → ')}。${reasons ? ` 理由: ${reasons}` : ''}`,
  );
}
```

Apply the same optional arguments to design and draft generation. Gemini ignores `selectedModelId` and retains its current chain.

- [ ] **Step 5: Run provider tests and confirm GREEN**

Run: `node --test tests/providers.test.mjs`

Expected: PASS with Luna-first routing, downward-only fallback, one-attempt auth failure, and unchanged Gemini assertions.

### Task 3: OpenAI-Only Selector and Stale-Result Protection

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Modify: `tests/browser-smoke.mjs`

**Interfaces:**
- Consumes: model catalog functions from Task 1 and `selectedModelId`/`onModelRoute` provider arguments from Task 2.
- Produces: state fields `openAiModelId` and `openAiModelRoute`, selector `#openai-model-select`, and visible status fields `selected`, `attempted`, `adopted`.

- [ ] **Step 1: Write failing static UI regressions**

```js
assert.match(main, /openAiModelId:\s*DEFAULT_OPENAI_MODEL_ID/);
assert.match(main, /id="openai-model-select"/);
assert.match(main, /選択/);
assert.match(main, /試行/);
assert.match(main, /採用/);
assert.match(main, /selectedModelId:\s*state\.openAiModelId/);
assert.match(main, /state\.analysisSessionId \+= 1/);
assert.match(styles, /\.openai-model-card/);
```

- [ ] **Step 2: Run browser smoke and confirm RED**

Run: `node tests/browser-smoke.mjs`

Expected: FAIL because the selector and route-status markup are absent.

- [ ] **Step 3: Add page-memory selection and model-aware provider status**

```js
const state = {
  openAiModelId: DEFAULT_OPENAI_MODEL_ID,
  openAiModelRoute: {
    selected: DEFAULT_OPENAI_MODEL_ID,
    attempted: '',
    adopted: '',
  },
  // existing fields remain unchanged
};

function currentProviderStatus(settings = state.settings) {
  return getProviderStatus({ ...settings, openaiModelId: state.openAiModelId });
}
```

Replace current runtime status reads with the helper, but keep draft-key detection independent of the selected model.

- [ ] **Step 4: Render and bind the OpenAI-only selector**

```js
function renderOpenAiModelControl(providerStatus, draftStatus, uiWorking) {
  if (providerStatus.mode !== 'openai' && draftStatus.mode !== 'openai') return '';
  const selected = getOpenAIModelOption(state.openAiModelId);
  const labelFor = modelId => modelId ? getOpenAIModelOption(modelId).label : '—';
  return `<section class="openai-model-card" aria-labelledby="openai-model-label">
    <label id="openai-model-label" for="openai-model-select">OpenAIモデル</label>
    <select id="openai-model-select" ${disabledAttr(uiWorking)}>
      ${OPENAI_MODEL_OPTIONS.map(model => option(model.id, `${model.label}（${model.description}）`, selected.id)).join('')}
    </select>
    <p>${escapeHtml(formatOpenAIModelPrice(selected))}（${escapeHtml(OPENAI_MODEL_PRICE_SNAPSHOT_DATE)}時点）</p>
    <div class="openai-model-route-status" aria-live="polite">
      <span>選択 <b>${escapeHtml(labelFor(state.openAiModelRoute.selected))}</b></span>
      <span>試行 <b>${escapeHtml(labelFor(state.openAiModelRoute.attempted))}</b></span>
      <span>採用 <b>${escapeHtml(labelFor(state.openAiModelRoute.adopted))}</b></span>
    </div>
  </section>`;
}
```

Bind changes before the API key is connected so Luna can be selected before the automatic first analysis. When the model changes, increment `analysisSessionId`, clear provider-generated summary/design/sample state, rebuild the report from the existing observations, and do not start a paid call automatically.

- [ ] **Step 5: Wire route state into analysis, design, and draft calls**

```js
function handleOpenAiModelRoute(event) {
  if (event.phase === 'trying') state.openAiModelRoute.attempted = event.modelId;
  if (event.phase === 'adopted') state.openAiModelRoute.adopted = event.modelId;
  render();
}

await runProviderAnalysis({
  provider,
  apiKey,
  report: state.report,
  selectedModelId: state.openAiModelId,
  onModelRoute: provider === 'openai' ? handleOpenAiModelRoute : undefined,
  proxyBase: PROVIDER_PROXY,
});
```

Apply the same arguments to plan design and reference draft generation. Include `state.openAiModelId` in `currentProviderRunSignature` so an old response cannot cross a model change.

- [ ] **Step 6: Add compact styling and run UI checks**

```css
.openai-model-card {
  display: grid;
  gap: 6px;
  width: min(520px, calc(100vw - 44px));
  border: 2px solid #0b7f78;
  background: #fff;
  padding: 10px;
}

.openai-model-route-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}
```

Run: `node tests/browser-smoke.mjs`

Expected: PASS; the selector is present, OpenAI-gated in source, disabled while busy, and the key remains runtime-only.

### Task 4: Documentation and Automated Verification

**Files:**
- Modify: `README.md`
- Modify only if needed by current checks: tests named in Tasks 1-3

**Interfaces:**
- Consumes: completed selector behavior.
- Produces: accurate public usage documentation and local verification evidence.

- [ ] **Step 1: Update only directly affected README sections**

```markdown
- OpenAI model selection: When an OpenAI-format key is detected, choose the starting model from the model selector. The default is GPT-6 Astra. If the selected model fails for a non-authentication reason, the app tries only lower entries in the displayed order.
- Gemini remains automatic and does not show the OpenAI selector.
- The screen keeps model selection and start confirmation clear without transient route-status boxes. Internal route telemetry remains available, and API keys remain in memory only.
```

- [ ] **Step 2: Run focused verification**

Run: `node --test tests/openaiModels.test.mjs tests/nanoFallbackSync.test.mjs tests/providers.test.mjs`

Expected: all focused model and provider tests PASS.

- [ ] **Step 3: Run browser smoke, upstream sync, full tests, and build**

Run, in order:

```powershell
node tests\browser-smoke.mjs
npm.cmd run check:upstreams
npm.cmd test
npm.cmd run build
```

Expected: browser smoke exits 0; sync check is current; all Node tests PASS; Vite production build exits 0.

- [ ] **Step 4: Inspect the final diff and secret-safety surface**

Run:

```powershell
git diff --check
git diff -- scripts/sync-nano-fallback-chain.mjs src/lib/nanoBananaFallbackSnapshot.js src/lib/openaiModels.js src/lib/providers.js src/main.js src/styles.css tests/nanoFallbackSync.test.mjs tests/openaiModels.test.mjs tests/providers.test.mjs tests/browser-smoke.mjs README.md
rg -n "sk-proj-|AIza" src README.md
```

Expected: no whitespace errors; only intended model-selector changes plus preserved pre-existing snapshot edits; no real key values.

### Task 5: One Real In-App GPT-6 Luna Verification

**Files:**
- No source files unless the first live run reveals a generic defect.

**Interfaces:**
- Consumes: completed local build and the user's API key entered only in the app UI.
- Produces: browser evidence that GPT-6 Luna is selected and the reported model is GPT-6 Luna, with no fallback to an upper model.

- [ ] **Step 1: Start the established local app route**

Run: `npm.cmd run dev`

Expected: Vite serves `http://127.0.0.1:5180/` without changing the port.

- [ ] **Step 2: Open the app in the Codex in-app browser and inspect API readiness**

Open `http://127.0.0.1:5180/` in the in-app browser. Inspect only whether an OpenAI key is configured; never retrieve its value. If entry is needed, leave the API field visible and ask the user to enter it there.

- [ ] **Step 3: Select Luna before the paid action**

Choose `GPT-6 Luna`. Confirm the visible state reads `選択 GPT-6 Luna`, and that no API request was triggered merely by changing the selector.

- [ ] **Step 4: Perform one normal real analysis action**

Use retrieved public Web/RSS evidence and run the normal analysis once. Do not use fixture, mock, or invented evidence.

Expected during execution: the first OpenAI request uses `gpt-6-luna`.

Expected after completion: the visible analysis reports `gpt-6-luna`; the fallback chain contains Luna success only; no API key fragment is visible.

- [ ] **Step 5: Verify reset behavior without another paid call**

Reload the page and confirm the model returns to `GPT-6 Astra`. Do not reconnect or trigger a second paid analysis.

- [ ] **Step 6: Report the delivery boundary accurately**

Report implementation, focused/full tests, build, and the one Luna API result separately. State that commit, push, deploy, release, note update, and backup were not performed.
