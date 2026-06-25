import './styles.css';
import { CATEGORIES } from './lib/categories.js';
import { copyTextToClipboard } from './lib/clipboard.js';
import { DOCX_MIME, docxFileName, toDocxArrayBuffer } from './lib/docxExporter.js';
import { fromJson, toJson, toMarkdown } from './lib/exporters.js';
import { exportTimestamp } from './lib/fileNames.js';
import { buildReport } from './lib/reportEngine.js';
import { getProviderStatus, runDraftSample, runProviderAnalysis } from './lib/providers.js';
import { buildTrendSearchUrl, searchTrendObservations } from './lib/publicTrendSearch.js';
import { loadSettingsFromStorage, settingsForStorage } from './lib/settings.js';

const STORAGE_KEY = 'viral-radar-settings-v1';
const PROVIDER_PROXY = isStaticPagesRuntime() ? '' : '/api/provider-generate';
const ACTION_MESSAGE_TTL_MS = 3500;
const API_SAVE_BUSY_MS = 300;
const APP_VERSION = '1.1.9';
const app = document.querySelector('#app');
let actionMessageTimer = null;
let actionMessageVersion = 0;
const initialSettings = loadSettings();
const initialProviderStatus = getProviderStatus(initialSettings);

const state = {
  selectedCategoryId: 'story-manga',
  timeWindow: '7d',
  audience: 'general',
  searchSeed: 0,
  variantSeed: 0,
  observations: null,
  providerRunSignature: null,
  providerSummary: null,
  actionMessage: null,
  planSamples: {},
  apiGateMessage: '',
  apiSaving: false,
  providerBusy: false,
  draftBusy: false,
  searchBusy: false,
  settings: initialSettings,
  apiKeyDraft: '',
  apiPanelOpen: !initialProviderStatus.provider.connected,
  report: null,
};

state.observations = [];
state.report = createReport();
bootstrapApp();

function bootstrapApp() {
  const providerStatus = getProviderStatus(state.settings);
  state.apiPanelOpen = !providerStatus.provider.connected;
  render();
  if (!providerStatus.provider.connected) {
    focusApiInputSoon();
    return;
  }
  refreshTrendObservations({ runProvider: true });
}

function loadSettings() {
  return loadSettingsFromStorage(localStorage.getItem(STORAGE_KEY));
}

function persistSettings() {
  state.settings.rememberKeys = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsForStorage(state.settings)));
}

function clearActionMessage() {
  actionMessageVersion += 1;
  if (actionMessageTimer) {
    clearTimeout(actionMessageTimer);
    actionMessageTimer = null;
  }
  state.actionMessage = null;
}

function showActionMessage(message) {
  actionMessageVersion += 1;
  state.actionMessage = message;
  if (actionMessageTimer) clearTimeout(actionMessageTimer);
  const currentVersion = actionMessageVersion;
  actionMessageTimer = window.setTimeout(() => {
    if (currentVersion !== actionMessageVersion) return;
    state.actionMessage = null;
    actionMessageTimer = null;
    render();
  }, ACTION_MESSAGE_TTL_MS);
}

function isApiWorking() {
  return state.apiSaving || state.providerBusy || state.draftBusy;
}

function isUiWorking() {
  return isApiWorking() || state.searchBusy;
}

function isApiReady() {
  return getProviderStatus(state.settings).provider.connected;
}

function hasLiveObservations() {
  return Array.isArray(state.observations) && state.observations.length > 0;
}

function focusApiInputSoon() {
  window.requestAnimationFrame(() => {
    document.querySelector('#api-key')?.focus();
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createReport() {
  return buildReport({
    categoryId: state.selectedCategoryId,
    timeWindow: state.timeWindow,
    audience: state.audience,
    observations: state.observations ?? [],
    providerMode: getReportProviderMode(getProviderStatus(state.settings).mode),
    variantSeed: state.variantSeed,
  });
}

function render() {
  const providerStatus = getProviderStatus(state.settings);
  const draftStatus = getProviderStatus({ apiKey: state.apiKeyDraft });
  const showApiPanel = !isApiReady() || state.apiPanelOpen;
  const apiWorking = isApiWorking();
  const uiWorking = isUiWorking();
  const isLocked = !isApiReady() || uiWorking;

  const report = state.report;
  const cluster = report.trendClusters[0];
  const selectedCategory = report.category;
  const dataTimestamp = latestObservationTimestamp(report);
  const disabled = disabledAttr(isLocked);

  app.innerHTML = `
    <main class="app-shell ${isLocked ? 'locked-shell' : ''} ${uiWorking ? 'busy-shell' : ''}">
      <header class="topbar">
        <div class="brand-block">
          <p class="eyebrow">物語トレンド設計</p>
          <div class="brand-title-row">
            <h1>物語バズメーカー</h1>
            <span class="version-badge" aria-label="アプリバージョン">v${APP_VERSION}</span>
          </div>
          <p class="lead">根拠、ウケる理由、具体企画、他AIに貼る執筆プロンプトまでをカテゴリ別にまとめます。</p>
        </div>
        <div class="header-api-block">
          <div class="status-strip" aria-label="API接続状態">
            <span class="${providerStatus.provider.connected ? 'ok' : ''}">${providerStatus.provider.label}</span>
            <span>対象: 漫画・動画・小説</span>
            <button class="api-settings-button" id="api-settings" type="button" ${disabledAttr(uiWorking)}>API設定</button>
          </div>
          ${showApiPanel ? renderApiConnectPanel(draftStatus, uiWorking) : ''}
        </div>
        <div class="header-progress-slot">
          ${
            uiWorking
              ? renderAnalysisBusyBanner(report, providerStatus)
              : state.actionMessage
                ? renderActionMessage(state.actionMessage)
                : '<div class="header-separator" aria-hidden="true"></div>'
          }
        </div>
      </header>

      <section class="settings-row ${isLocked ? 'is-disabled' : ''}" aria-label="分析条件" ${isLocked ? 'aria-disabled="true"' : ''}>
        <label class="field-card">
          <span>分析期間</span>
          <select id="time-window" ${disabled}>
            ${option('24h', '直近24時間', state.timeWindow)}
            ${option('7d', '直近7日', state.timeWindow)}
            ${option('30d', '直近30日', state.timeWindow)}
          </select>
        </label>
        <label class="field-card">
          <span>想定読者</span>
          <select id="audience" ${disabled}>
            ${option('general', '一般向け', state.audience)}
            ${option('working-adults', '社会人向け', state.audience)}
            ${option('youth', '若年層向け', state.audience)}
            ${option('creator', '制作者向け', state.audience)}
            ${option('web-fiction', 'Web小説読者向け', state.audience)}
          </select>
        </label>
      </section>

      <section class="category-band ${isLocked ? 'is-disabled' : ''}" aria-label="カテゴリ選択" ${isLocked ? 'aria-disabled="true"' : ''}>
        ${CATEGORIES.map((category) => `
          <button class="category-button ${category.id === state.selectedCategoryId ? 'active' : ''}" type="button" data-category-id="${category.id}" ${disabled}>
            <strong>${category.label}</strong>
            <span>${category.description}</span>
          </button>
        `).join('')}
      </section>

      <section class="action-row ${isLocked ? 'is-disabled' : ''}" aria-label="操作" ${isLocked ? 'aria-disabled="true"' : ''}>
        <button class="secondary-action" id="run-provider" type="button" ${disabled}>API詳細分析を更新</button>
        <button class="secondary-action" id="copy-markdown" type="button" ${disabled}>レポートをコピー</button>
        <button class="secondary-action" id="download-docx" type="button" ${disabled}>企画書DOCX保存</button>
        <button class="secondary-action" id="download-json" type="button" ${disabled}>JSON保存</button>
        <button class="secondary-action" id="import-json" type="button" ${disabled}>JSON読み込み</button>
        <input id="json-file-input" class="visually-hidden" type="file" accept="application/json,.json" />
      </section>

      ${
        !isApiReady()
          ? renderApiStartGate()
          : `<div class="${isLocked ? 'is-disabled' : ''}" ${isLocked ? 'aria-disabled="true"' : ''}>
      ${renderInsightDashboard(report)}
      ${state.providerSummary && !uiWorking ? renderProviderSummary(state.providerSummary, dataTimestamp) : ''}
      ${renderBeginnerGuide(report, dataTimestamp)}

      <section class="report-layout" aria-live="polite">
        <aside class="panel summary-panel">
          ${renderDataLabel('現在の分析', dataTimestamp)}
          <h2>${selectedCategory.label}</h2>
          <p>${selectedCategory.description}</p>
          <div class="cluster-name">${cluster.label}</div>
          <h3>このカテゴリで決めること</h3>
          <div class="signal-list">${cluster.creatorSignals.map(renderCreatorSignal).join('')}</div>
          <h3>取得元</h3>
          <div class="tag-row">${cluster.sourceSignals.map((signal) => `<span>${escapeHtml(signal.label)}</span>`).join('')}</div>
          ${
            distinctSearchQueries(report).length
              ? `<h3>今回の検索クエリ</h3>
          <p class="query-note">再検索するとクエリと取得元が入れ替わり、別の取得結果から企画を作り直します。</p>
          <div class="tag-row query-tags">${distinctSearchQueries(report).map((query) => `<span>${escapeHtml(query)}</span>`).join('')}</div>`
              : ''
          }
          <h3>前提と制約</h3>
          <ul class="tight-list">${report.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </aside>

        <section class="analysis-column">
          <div class="panel">
            ${renderDataLabel('カテゴリ別の制作判断', dataTimestamp)}
            <h2>${selectedCategory.label}に落とすなら何を変えるか</h2>
            <div class="fit-grid">
              ${report.categoryFitCards.map(renderCategoryFitCard).join('')}
            </div>
          </div>

          <div class="panel">
            ${renderDataLabel('取得データの読み替え', dataTimestamp)}
            <h2>外部話題を作品材料に変換する</h2>
            <div class="evidence-list">
              ${report.evidenceCards.map(renderEvidenceCard).join('')}
            </div>
            <p class="category-insight">${escapeHtml(report.deepAnalysis.categoryInsight)}</p>
          </div>
        </section>
      </section>

      <section class="plan-section" aria-label="具体企画案">
        <div class="plan-toolbar">
          <div class="section-heading">
            ${renderDataLabel('具体例', dataTimestamp)}
            <h2>そのまま企画に使える案</h2>
            <p>各案の下に、他AIへ貼り付けるための本文生成プロンプトを付けています。</p>
          </div>
          <button class="secondary-action plan-refresh" id="suggest-more" type="button" ${disabled}>再検索して別案を出す</button>
        </div>
        <div class="plan-grid">
          ${report.creativePlans.map(renderCreativePlan).join('')}
        </div>
      </section>
      </div>
      `
      }
    </main>
  `;

  bindEvents(isLocked, showApiPanel);
  if (!isApiReady() && showApiPanel) focusApiInputSoon();
}

function renderApiStartGate() {
  return `
    <section class="panel api-start-gate" aria-live="polite">
      ${renderDataLabel('開始待機')}
      <h2>APIキーを入力すると公開Web/RSS検索を開始します。</h2>
      <p>OpenAIまたはGeminiのAPIキーを接続するまで、検索と分析は実行しません。</p>
      <p>キーはこのブラウザの保存領域にだけ保存し、レポートやDOCX/JSONには含めません。</p>
    </section>
  `;
}

function renderApiConnectPanel(draftStatus, uiWorking) {
  const currentStatus = getProviderStatus(state.settings);
  const isConnected = currentStatus.provider.connected;
  const draftKey = state.apiKeyDraft;
  const draftProviderHint =
    draftStatus.mode === 'openai'
      ? 'OpenAI形式（未検証）'
      : draftStatus.mode === 'gemini'
        ? 'Gemini形式（未検証）'
        : draftKey.trim()
          ? '形式を判定できません'
          : '入力待ち';
  const connectDisabled = disabledAttr(uiWorking || !draftStatus.provider.connected);
  const inputDisabled = disabledAttr(uiWorking);

  return `
    <section class="api-connect-panel" aria-label="APIキー入力">
      <div class="api-connect-copy">
        <p class="panel-label api-panel-meta">
          <span>${isConnected ? 'API設定' : '最初に設定'}</span>
          <span class="version-badge compact" aria-label="アプリバージョン">v${APP_VERSION}</span>
        </p>
        <h2>${isConnected ? 'AIエンジン設定' : 'AIエンジンを接続'}</h2>
        <p>${
          isConnected
            ? `現在の接続: ${escapeHtml(currentStatus.provider.label)}。別のキーを使う場合だけ、新しいキーをこの欄に入力して接続してください。`
            : 'OpenAIまたはGeminiのキーを1つ入力してください。形式から自動判定し、接続後はこの画面を閉じます。'
        }</p>
        ${state.apiGateMessage ? `<p class="gate-warning">${escapeHtml(state.apiGateMessage)}</p>` : ''}
      </div>
      <form class="api-connect-form" id="api-connect-form" autocomplete="off">
        <label for="api-key">APIキー</label>
        <div class="api-connect-row">
          <input id="api-key" type="password" value="${escapeAttr(draftKey)}" placeholder="OpenAI または Gemini のAPIキー" autocomplete="off" data-lpignore="true" ${inputDisabled} />
          <button class="primary-action compact" id="connect-api" type="submit" ${connectDisabled}>${state.apiSaving ? '接続中' : '接続'}</button>
        </div>
        <small class="${draftStatus.provider.connected ? 'ok' : ''}">${escapeHtml(draftProviderHint)}</small>
        ${
          isConnected
            ? `<button class="secondary-action compact" id="close-api-settings" type="button" ${inputDisabled}>閉じる</button>`
            : ''
        }
      </form>
    </section>
  `;
}

function bindEvents(isLocked = false, showApiPanel = false) {
  bindApiControls(showApiPanel);
  bindHeaderControls();
  if (isLocked) return;

  document.querySelectorAll('[data-category-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextCategoryId = button.dataset.categoryId;
      const isSameCategory = nextCategoryId === state.selectedCategoryId;
      state.selectedCategoryId = nextCategoryId;
      state.searchSeed = isSameCategory ? state.searchSeed + 1 : 0;
      state.variantSeed = state.searchSeed;
      state.providerRunSignature = null;
      refreshTrendObservations({ runProvider: true });
    });
  });
  document.querySelector('#suggest-more').addEventListener('click', suggestMore);
  document.querySelector('#run-provider').addEventListener('click', runProviderDeepening);
  document.querySelector('#copy-markdown').addEventListener('click', copyMarkdown);
  document.querySelector('#download-docx').addEventListener('click', () => saveExportFile('docx'));
  document.querySelector('#download-json').addEventListener('click', () => saveExportFile('json'));
  document.querySelector('#import-json').addEventListener('click', () => {
    document.querySelector('#json-file-input').click();
  });
  document.querySelector('#json-file-input').addEventListener('change', importJson);
  document.querySelectorAll('[data-copy-plan-id]').forEach((button) => {
    button.addEventListener('click', () => copyPlanPrompt(button.dataset.copyPlanId));
  });
  document.querySelectorAll('[data-generate-plan-id]').forEach((button) => {
    button.addEventListener('click', () => generatePlanSample(button.dataset.generatePlanId));
  });
  document.querySelectorAll('[data-copy-sample-id]').forEach((button) => {
    button.addEventListener('click', () => copyPlanSample(button.dataset.copySampleId));
  });
  document.querySelector('#time-window').addEventListener('change', (event) => {
    state.timeWindow = event.target.value;
    state.searchSeed = 0;
    state.variantSeed = 0;
    refreshTrendObservations({ runProvider: true });
  });
  document.querySelector('#audience').addEventListener('change', (event) => {
    state.audience = event.target.value;
    state.searchSeed = 0;
    state.variantSeed = 0;
    refreshTrendObservations({ runProvider: true });
  });
}

function bindHeaderControls() {
  const apiSettingsButton = document.querySelector('#api-settings');
  if (apiSettingsButton) apiSettingsButton.addEventListener('click', openApiSettings);
}

function bindApiControls(showApiPanel = false) {
  if (!showApiPanel) return;
  const apiInput = document.querySelector('#api-key');
  const connectButton = document.querySelector('#connect-api');
  const connectForm = document.querySelector('#api-connect-form');
  const closeButton = document.querySelector('#close-api-settings');
  if (closeButton) closeButton.addEventListener('click', closeApiSettings);
  if (!apiInput || !connectButton) return;
  apiInput.addEventListener('input', (event) => {
    state.apiKeyDraft = event.target.value;
    state.apiGateMessage = '';
    render();
  });
  apiInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') connectApiKey();
  });
  connectButton.addEventListener('click', connectApiKey);
  if (connectForm) {
    connectForm.addEventListener('submit', (event) => {
      event.preventDefault();
      connectApiKey();
    });
  }
}

function openApiSettings() {
  if (isUiWorking()) return;
  state.apiPanelOpen = true;
  state.apiKeyDraft = '';
  state.apiGateMessage = '';
  clearActionMessage();
  render();
}

function closeApiSettings() {
  if (isUiWorking() || !isApiReady()) return;
  state.apiPanelOpen = false;
  state.apiKeyDraft = '';
  state.apiGateMessage = '';
  render();
}

async function connectApiKey() {
  if (isUiWorking()) return;
  const cleanKey = normalizeEnteredApiKey(state.apiKeyDraft);
  const providerStatus = getProviderStatus({ apiKey: cleanKey });
  if (!providerStatus.provider.connected) {
    state.apiGateMessage = 'APIキーを確認できません。OpenAIまたはGeminiのキーを1つ入力してください。';
    render();
    return;
  }

  state.apiSaving = true;
  clearActionMessage();
  render();

  try {
    await wait(API_SAVE_BUSY_MS);
    state.settings.apiKey = cleanKey;
    persistSettings();
    state.apiKeyDraft = '';
    state.apiPanelOpen = false;
    state.apiGateMessage = '';
    state.providerRunSignature = null;
    state.report = createReport();
  } finally {
    state.apiSaving = false;
    showActionMessage({
      summary: 'APIキーを保存しました。公開Web/RSS検索を開始します。',
    });
    render();
  }
  refreshTrendObservations({ runProvider: true });
}

function normalizeEnteredApiKey(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');
}

function rebuildReport({ advanceSearch = false } = {}) {
  state.providerSummary = null;
  clearActionMessage();
  state.planSamples = {};
  if (advanceSearch) {
    state.searchSeed += 1;
    state.variantSeed = state.searchSeed;
  }
  state.report = createReport();
  render();
}

async function fetchTrendObservations() {
  const searchParams = {
    categoryId: state.selectedCategoryId,
    timeWindow: state.timeWindow,
    audience: state.audience,
    searchSeed: state.searchSeed,
  };
  if (!shouldUseLocalTrendApi()) {
    const payload = await searchTrendObservations(searchParams);
    return payload.observations;
  }
  const response = await fetch(buildTrendSearchUrl(searchParams));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || '公開Web/RSS取得に失敗しました。');
  }
  if (!Array.isArray(payload.observations) || payload.observations.length === 0) {
    throw new Error('公開Web/RSSの取得結果がありません。再検索してください。');
  }
  return payload.observations;
}

function isStaticPagesRuntime() {
  return globalThis.location?.hostname?.endsWith('github.io') ?? false;
}

function shouldUseLocalTrendApi() {
  const hostname = globalThis.location?.hostname ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

async function refreshTrendObservations({ runProvider = false, announce = false } = {}) {
  if (isUiWorking()) return;
  state.searchBusy = true;
  state.providerSummary = null;
  state.planSamples = {};
  state.observations = [];
  state.report = createReport();
  clearActionMessage();
  render();

  let didLoad = false;
  try {
    state.observations = await fetchTrendObservations();
    state.report = createReport();
    didLoad = true;
    if (announce) {
      showActionMessage({
        summary: `公開Web検索${state.searchSeed + 1}回目から別案を作りました。`,
      });
    }
  } catch (error) {
    state.observations = [];
    state.report = createReport();
    showActionMessage({
      summary: '公開Web検索に失敗しました。',
      risk_note: error instanceof Error ? error.message : '取得できませんでした。',
    });
  } finally {
    state.searchBusy = false;
    render();
  }

  if (didLoad && runProvider) {
    runProviderDeepening();
  }
}

function suggestMore() {
  state.searchSeed += 1;
  state.variantSeed = state.searchSeed;
  refreshTrendObservations({ runProvider: true, announce: true });
}

async function copyMarkdown() {
  const result = await copyTextToClipboard(toMarkdown(state.report));
  showActionMessage(copyMessage(result, 'レポートをコピーしました。'));
  render();
}

async function copyPlanPrompt(planId) {
  const plan = state.report.creativePlans.find((item) => item.id === planId);
  if (!plan) return;

  const result = await copyTextToClipboard(plan.aiDraftPrompt);
  showActionMessage(copyMessage(result, `「${plan.titleCandidates[0]}」のAI貼り付け用プロンプトをコピーしました。`));
  render();
}

async function generatePlanSample(planId) {
  if (isUiWorking()) return;
  const plan = state.report.creativePlans.find((item) => item.id === planId);
  if (!plan) return;

  const providerStatus = getProviderStatus(state.settings);
  if (!providerStatus.provider.connected) {
    state.planSamples = {
      ...state.planSamples,
      [planId]: {
        status: 'error',
        text: '参考文章を生成するには、最初にOpenAIまたはGeminiのAPIキーを入力してください。',
      },
    };
    render();
    return;
  }

  state.planSamples = {
    ...state.planSamples,
    [planId]: {
      status: 'loading',
      text: '参考文章を生成中です。',
    },
  };
  state.draftBusy = true;
  render();

  try {
    const result = await runDraftSample({
      provider: providerStatus.mode,
      apiKey: providerStatus.apiKey,
      draftPrompt: plan.aiDraftPrompt,
      proxyBase: PROVIDER_PROXY,
    });
    const sampleText = result.text?.trim();
    if (!sampleText) {
      throw new Error('参考文章として表示できる本文が返りませんでした。もう一度生成してください。');
    }
    state.planSamples = {
      ...state.planSamples,
      [planId]: {
        status: 'done',
        text: sampleText,
      },
    };
  } catch (error) {
    state.planSamples = {
      ...state.planSamples,
      [planId]: {
        status: 'error',
        text: error?.message ?? '参考文章生成に失敗しました。',
      },
    };
  } finally {
    state.draftBusy = false;
    render();
  }
}

async function copyPlanSample(planId) {
  const sample = state.planSamples[planId];
  if (!sample?.text || sample.status !== 'done') return;

  const result = await copyTextToClipboard(sample.text);
  showActionMessage(copyMessage(result, '参考文章をコピーしました。'));
  render();
}

function copyMessage(result, successSummary) {
  if (result.ok) {
    return {
      summary: successSummary,
      risk_note: 'APIキーはコピー内容に含めていません。',
      next_actions: ['他AIに貼り付けて本文生成に使えます。'],
    };
  }

  return {
    summary: 'ブラウザの権限でコピーできませんでした。',
    risk_note:
      result.reason === 'clipboard-denied'
        ? 'この内蔵ブラウザではクリップボード書き込みが拒否されています。'
        : 'クリップボード機能が利用できません。',
    next_actions: ['プロンプト欄の文章を選択してコピーしてください。'],
  };
}

function jsonFileName(report) {
  const category = report?.category?.id ?? 'report';
  return `monogatari-buzz-maker-${category}-${exportTimestamp()}.json`;
}

function disabledAttr(isDisabled) {
  return isDisabled ? 'disabled aria-disabled="true"' : '';
}

async function importJson(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  try {
    applyLoadedReport(fromJson(await file.text()));
    state.providerSummary = {
      summary: 'JSON企画書を読み込みました。',
      risk_note: 'APIキーは読み込み対象ではありません。キーらしい文字列は赤字化しています。',
      next_actions: ['必要ならAPI詳細分析を更新して、現在のキーで再レビューできます。'],
    };
    clearActionMessage();
  } catch (error) {
    state.providerSummary = {
      summary: 'JSONを読み込めませんでした。',
      risk_note: error instanceof Error ? error.message : 'ファイル形式を確認してください。',
      next_actions: ['物語バズメーカーで保存したJSONを選んでください。'],
    };
    clearActionMessage();
  }

  render();
}

function applyLoadedReport(loadedReport) {
  state.selectedCategoryId = loadedReport.category.id;
  state.timeWindow = loadedReport.timeWindow ?? state.timeWindow;
  state.audience = loadedReport.audience ?? state.audience;
  state.searchSeed = 0;
  state.variantSeed = 0;
  state.observations = loadedReport.trendClusters?.[0]?.observations ?? [];
  state.providerRunSignature = null;
  state.planSamples = {};
  state.report = loadedReport;
}

async function saveExportFile(kind) {
  const isDocx = kind === 'docx';
  const fileName = isDocx ? docxFileName(state.report) : jsonFileName(state.report);
  const mimeType = isDocx ? DOCX_MIME : 'application/json;charset=utf-8';
  const bytes = isDocx ? new Uint8Array(toDocxArrayBuffer(state.report)) : new TextEncoder().encode(toJson(state.report));

  showActionMessage({
    summary: `${isDocx ? '企画書DOCX' : 'JSON'}を保存中です。`,
  });
  render();

  try {
    const result = await saveBytesWithDialog({
      fileName,
      mimeType,
      bytes,
    });
    showActionMessage({
      summary:
        result.mode === 'download'
          ? `${isDocx ? '企画書DOCX' : 'JSON'}のダウンロードを開始しました。`
          : `${isDocx ? '企画書DOCX' : 'JSON'}を指定先に保存しました。`,
    });
  } catch (error) {
    const cancelled = error instanceof DOMException && error.name === 'AbortError';
    showActionMessage({
      summary: cancelled ? '保存をキャンセルしました。' : `${isDocx ? '企画書DOCX' : 'JSON'}を保存できませんでした。`,
      risk_note: cancelled
        ? 'ファイルは作成していません。'
        : error instanceof Error
          ? error.message
          : 'ブラウザの保存処理に失敗しました。',
      next_actions: ['もう一度保存ボタンを押すと、保存先を選び直せます。'],
    });
  }

  render();
}

async function saveBytesWithDialog({ fileName, mimeType, bytes }) {
  const blob = new Blob([bytes], { type: mimeType });
  if ('showSaveFilePicker' in window) {
    const extension = fileName.endsWith('.docx') ? '.docx' : '.json';
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: extension === '.docx' ? 'Word文書' : 'JSONファイル',
          accept: {
            [mimeType.split(';')[0]]: [extension],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { mode: 'picker', fileName };
  }

  try {
    const result = await saveViaNativeDialog({
      fileName,
      mimeType,
      contentBase64: bytesToBase64(bytes),
    });
    if (result.cancelled) throw new DOMException('Save cancelled', 'AbortError');
    return { mode: 'native', fileName: result.fileName ?? fileName };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }

  return saveWithBrowserDownload({ fileName, mimeType, bytes });
}

async function saveViaNativeDialog(payload) {
  const response = await fetch('/api/save-file-dialog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 404) throw new Error('Native save dialog is not available.');
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? `HTTP ${response.status}`);
  }
  return result;
}

function saveWithBrowserDownload({ fileName, mimeType, bytes }) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { mode: 'download', fileName };
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

async function runProviderDeepening() {
  if (isUiWorking()) return;
  const providerStatus = getProviderStatus(state.settings);
  if (providerStatus.mode === 'fixture' || providerStatus.mode === 'unknown') {
    state.providerSummary = {
      summary:
        providerStatus.mode === 'unknown'
          ? 'APIキー形式を判定できませんでした。'
          : 'APIキーを入力して開始してください。',
      risk_note: 'キーは入力欄とAPI送信以外には使いません。',
      next_actions: ['OpenAIまたはGeminiのキーを画面上で入力してください。'],
    };
    render();
    return;
  }
  if (!hasLiveObservations()) {
    refreshTrendObservations({ runProvider: true });
    return;
  }

  state.providerSummary = {
    summary: 'API稼働中',
    risk_note: `${providerStatus.provider.name}で分析を生成しています。`,
    next_actions: [],
  };
  state.providerBusy = true;
  render();

  try {
    const results = await Promise.allSettled([runOneProvider(providerStatus.mode, providerStatus.apiKey)]);
    state.providerSummary = ensureReadableProviderSummary(mergeProviderResults(results), state.report, providerStatus);
  } finally {
    state.providerBusy = false;
    render();
  }
}

async function runOneProvider(provider, apiKey) {
  const summary = await runProviderAnalysis({
    provider,
    apiKey,
    report: state.report,
    proxyBase: PROVIDER_PROXY,
  });
  return { provider, summary };
}

function mergeProviderResults(results) {
  const successes = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const failures = results.filter((result) => result.status === 'rejected');
  const riskNotes = successes.map((item) => item.summary.risk_note).filter(Boolean);

  if (successes.length === 0) {
    return {
      summary: 'API詳細分析に失敗しました。',
      risk_note: failures.map((result) => result.reason?.message ?? 'APIエラー').join(' / '),
      next_actions: ['キー、クォータ、ブラウザからのAPI到達性を確認してください。'],
    };
  }

  return {
    summary: successes.map((item) => stripProviderPrefix(item.summary.summary || 'レビュー完了')).join(' / '),
    used_model: successes
      .map((item) => `${providerName(item.provider)} ${item.summary.used_model ?? ''}`.trim())
      .filter(Boolean)
      .join(' / '),
    fallback_chain: successes.flatMap((item) =>
      (item.summary.fallback_chain ?? []).map((attempt) => ({
        ...attempt,
        provider: providerName(item.provider),
      })),
    ),
    strongest_signal: successes.map((item) => item.summary.strongest_signal).filter(Boolean).join(' / '),
    practical_revision: successes.map((item) => item.summary.practical_revision).filter(Boolean).join(' / '),
    risk_note: riskNotes.join(' / ') || 'APIキー全文は画面に表示していません。',
    next_actions: successes.flatMap((item) => item.summary.next_actions ?? []),
  };
}

function ensureReadableProviderSummary(summary, report, providerStatus) {
  const visibleText = [
    summary.summary,
    summary.strongest_signal,
    summary.practical_revision,
    summary.risk_note,
    ...(summary.next_actions ?? []),
  ].join(' ');
  const normalizedSummary = stripProviderPrefix(summary.summary ?? '').replace('レビュー完了', '').trim();
  const hasSubstantiveReview =
    normalizedSummary.length >= 80 ||
    [summary.strongest_signal, summary.practical_revision, ...(summary.next_actions ?? [])].some(
      (value) => String(value ?? '').trim().length >= 12,
    );
  if (visibleText.replace(`${providerName(providerStatus.mode)}: レビュー完了`, '').trim().length >= 20 && hasSubstantiveReview) {
    return {
      ...summary,
      summary: stripProviderPrefix(summary.summary ?? '追加分析'),
    };
  }

  const cluster = report.trendClusters[0];
  const plan = report.creativePlans[0];
  return {
    summary: `${report.category.label}では「${cluster.label}」を、${categoryFallbackAngle(report.category.id)}として使う方向が最も実用的です。`,
    strongest_signal: `${cluster.creatorSignals[0]?.label ?? cluster.label}: ${cluster.creatorSignals[0]?.detail ?? report.deepAnalysis.categoryInsight}`,
    practical_revision: `推奨企画「${plan.titleCandidates[0]}」は、冒頭で${plan.opening}を見せ、主人公の選択と読後感まで先に設計してください。`,
    risk_note: '実在の人物、企業、作品、サービス名は根拠欄に留め、作品内では架空の制度、UI、場所、人物へ変換してください。',
    next_actions: [
      `第1案「${plan.titleCandidates[0]}」を軸に、初回の見せ場を1つに絞る。`,
      `別案が必要な場合は「別案を出す」で別の企画ベースに切り替える。`,
    ],
  };
}

function stripProviderPrefix(value) {
  return String(value ?? '')
    .replace(/^\s*(Gemini|OpenAI)\s*[:：]\s*/i, '')
    .trim();
}

function categoryFallbackAngle(categoryId) {
  const angles = {
    'story-manga': 'ページ上の異常表示と連載の引き',
    'short-video': '冒頭1秒、字幕、保存理由',
    'trend-explainer': '根拠提示、章立て、断定回避',
    'long-novel': '章ごとの謎、伏線、長期的な救済アーク',
  };
  return angles[categoryId] ?? '読者が続きを見たくなる構造';
}

function renderAnalysisBusyBanner(report, providerStatus) {
  const label = state.searchBusy ? '公開Web検索中' : state.apiSaving ? 'API保存中' : state.draftBusy ? 'API稼働中' : 'API分析中';
  const detail = state.apiSaving
    ? 'APIキーを保存しています'
    : state.searchBusy
      ? `${report.category.label}の公開RSSを取得しています`
      : state.draftBusy
        ? 'AIで参考文章を生成しています'
        : `AIで${report.category.label}を分析しています`;

  return `
    <div class="analysis-busy-banner" role="status" aria-live="assertive">
      <span class="api-running-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function renderInsightDashboard(report) {
  const cluster = report.trendClusters[0];
  const dataTimestamp = latestObservationTimestamp(report);
  if (!cluster.evidenceCount) {
    return `
      <section class="insight-dashboard empty-dashboard" aria-label="分析チャート">
        <div class="dashboard-lead">
          <p class="panel-label">分析チャート</p>
          <h2>${state.searchBusy ? '公開Web検索中です。' : '公開Web検索の結果がありません。'}</h2>
          <p>${state.searchBusy ? '検索結果を取得してから、根拠量と狙い目を表示します。' : '取得できていない根拠を数値化しません。再検索してください。'}</p>
        </div>
      </section>
    `;
  }
  const decisionScores = buildDecisionScores(report);
  const opportunityScore = calculateOpportunityScore(cluster);

  return `
    <section class="insight-dashboard" aria-label="制作判断チャート">
      <div class="dashboard-lead">
        ${renderDataLabel('制作判断チャート', dataTimestamp)}
        <h2>${escapeHtml(report.category.label)}で先に決めること</h2>
        <p>${escapeHtml(decisionNarrative(report, decisionScores))}</p>
      </div>
      <div class="opportunity-meter" role="img" aria-label="総合狙い目 ${opportunityScore}点">
        <div class="meter-ring" style="--meter: ${opportunityScore * 3.6}deg">
          <span>${opportunityScore}</span>
          <small>狙い目</small>
        </div>
      </div>
      <div class="decision-chart-grid">
        ${renderRadarChart(decisionScores)}
        ${renderDecisionTable(report, decisionScores)}
      </div>
      <div class="chart-notes">
        <span>この数値で決めること: 題材、主人公、小道具、冒頭、差別化</span>
        <span>取得元: ${cluster.sourceSignals.map((signal) => signal.label).slice(0, 4).map(escapeHtml).join(' / ')}</span>
      </div>
    </section>
  `;
}

function buildDecisionScores(report) {
  const cluster = report.trendClusters[0];
  const text = JSON.stringify(cluster.observations);
  const metrics = cluster.observations.map((observation) => observation.metrics ?? {});
  const averageMetric = (key) =>
    metrics.reduce((sum, item) => sum + Number(item[key] || 0), 0) / Math.max(1, metrics.length);
  const painWords = ['不安', '悩み', '失敗', '評価', '生活', '仕事', 'お金', '家族', '読者', '保存', 'コメント'];
  const storyWords = ['漫画', '小説', '物語', 'ドラマ', '主人公', '章', '連載', '第1話', '読み切り', '動画'];
  const coOccurrence = averageMetric('coOccurrenceScore');
  const categoryMatch = averageMetric('categoryMatchScore');
  const hatenaSignal = averageMetric('hatenaHotEntryScore');
  const sourceDiversity = averageMetric('sourceDiversity');
  const painClarity = clampScore(38 + painWords.filter((word) => text.includes(word)).length * 6 + coOccurrence * 0.22 + cluster.evidenceCount * 2);
  const storyFit = clampScore(42 + storyWords.filter((word) => text.includes(word)).length * 5 + categoryMatch * 0.25 + cluster.confidenceScore * 0.18);
  const freshness = clampScore(cluster.noveltyScore * 0.44 + cluster.momentumScore * 0.36 + averageMetric('recencyScore') * 0.2);
  const competition = clampScore(30 + cluster.sourceCount * 7 + sourceDiversity * 4 + hatenaSignal * 0.1 + Math.max(0, 4 - cluster.evidenceCount) * 5);
  const mediumBonus = {
    'story-manga': text.includes('漫画') || text.includes('第1話') ? 16 : 8,
    'short-video': text.includes('動画') || text.includes('保存') ? 16 : 8,
    'trend-explainer': text.includes('解説') || text.includes('仕組み') ? 16 : 10,
    'long-novel': text.includes('小説') || text.includes('長編') || text.includes('章') ? 16 : 8,
  };
  const mediumFit = clampScore(storyFit * 0.55 + painClarity * 0.2 + categoryMatch * 0.12 + coOccurrence * 0.08 + (mediumBonus[report.category.id] ?? 8));
  return { freshness, storyFit, painClarity, competition, mediumFit };
}

function decisionNarrative(report, scores) {
  const categoryMoves = {
    'story-manga': '数値を見る目的は、1ページ目の小道具、主人公の欠落、最後の一コマの救済を決めることです。',
    'short-video': '数値を見る目的は、冒頭0秒の画、保存理由、コメント誘導を決めることです。',
    'trend-explainer': '数値を見る目的は、どの外部話題を根拠にし、どこから制作手順へ翻訳するかを決めることです。',
    'long-novel': '数値を見る目的は、第1章の痛み、章末の謎、長期アークの救済対象を決めることです。',
  };
  if (scores.competition >= 70) {
    return `${categoryMoves[report.category.id]} 競合が多いので、下の企画案では表層ワードを避け、小道具と主人公の選択で差別化します。`;
  }
  return `${categoryMoves[report.category.id]} 下の企画案は、この5項目をもとに題材から具体場面へ変換しています。`;
}

function mediumFitNote(categoryId) {
  const notes = {
    'story-manga': 'ページ上の発見と連載の引きに落とせる度合い',
    'short-video': '冒頭画、字幕、保存理由へ落とせる度合い',
    'trend-explainer': '根拠提示、章立て、安全な応用へ落とせる度合い',
    'long-novel': '章ごとの謎、伏線、長期救済へ落とせる度合い',
  };
  return notes[categoryId] ?? '作品形式へ落とせる度合い';
}

function renderRadarChart(scores) {
  const axes = radarAxes(scores);
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels
    .map((level) => `<polygon class="radar-grid-line" points="${radarPoints(axes.map(() => level))}" />`)
    .join('');
  const axisLines = axes
    .map((_, index) => {
      const point = radarPoint(index, axes.length, 100);
      return `<line class="radar-axis" x1="110" y1="110" x2="${point.x}" y2="${point.y}" />`;
    })
    .join('');
  const axisLabels = axes
    .map((axis, index) => {
      const point = radarPoint(index, axes.length, 116);
      return `<text class="radar-label" x="${point.x}" y="${point.y}">${escapeHtml(axis.shortLabel)}</text>`;
    })
    .join('');
  const dataPoints = radarPoints(axes.map((axis) => axis.value));
  const markers = axes
    .map((axis, index) => {
      const point = radarPoint(index, axes.length, axis.value);
      return `<circle class="radar-marker" cx="${point.x}" cy="${point.y}" r="3"><title>${escapeHtml(axis.label)} ${axis.value}</title></circle>`;
    })
    .join('');

  return `
    <div class="radar-panel" role="img" aria-label="${axes.map((axis) => `${axis.label} ${axis.value}`).join('、')}">
      <svg class="radar-chart" viewBox="0 0 220 220" aria-hidden="true">
        ${gridPolygons}
        ${axisLines}
        <polygon class="radar-shape" points="${dataPoints}" />
        ${markers}
        ${axisLabels}
      </svg>
    </div>
  `;
}

function renderDecisionTable(report, scores) {
  const axes = radarAxes(scores);
  return `
    <table class="decision-table">
      <thead>
        <tr>
          <th>見る項目</th>
          <th>点</th>
          <th>企画で決めること</th>
        </tr>
      </thead>
      <tbody>
        ${axes
          .map(
            (axis) => `
              <tr>
                <th>${escapeHtml(axis.label)}</th>
                <td>${axis.value}</td>
                <td>${escapeHtml(axis.decision)}</td>
              </tr>
            `,
          )
          .join('')}
        <tr>
          <th>カテゴリ適性</th>
          <td>${clampScore(scores.mediumFit)}</td>
          <td>${escapeHtml(mediumFitNote(report.category.id))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function radarAxes(scores) {
  const competitionRoom = clampScore(100 - scores.competition);
  return [
    {
      label: '題材の鮮度',
      shortLabel: '鮮度',
      value: clampScore(scores.freshness),
      decision: '今扱う理由を冒頭の題材にする。',
    },
    {
      label: '物語化しやすさ',
      shortLabel: '物語化',
      value: clampScore(scores.storyFit),
      decision: '主人公、事件、結末へ落とせるかを見る。',
    },
    {
      label: '読者の痛みの具体度',
      shortLabel: '痛み',
      value: clampScore(scores.painClarity),
      decision: '読者が自分ごとにできる損失や不安を選ぶ。',
    },
    {
      label: '差別化余地',
      shortLabel: '余地',
      value: competitionRoom,
      decision: '似た企画を避ける小道具、視点、結末を決める。',
    },
    {
      label: '媒体適性',
      shortLabel: '媒体',
      value: clampScore(scores.mediumFit),
      decision: '漫画、動画、小説の形式へ無理なく変換できるかを見る。',
    },
  ];
}

function radarPoints(values) {
  return values.map((value, index) => {
    const point = radarPoint(index, values.length, value);
    return `${point.x},${point.y}`;
  }).join(' ');
}

function radarPoint(index, total, value) {
  const radius = 82 * (clampScore(value) / 100);
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  return {
    x: Number((110 + Math.cos(angle) * radius).toFixed(2)),
    y: Number((110 + Math.sin(angle) * radius).toFixed(2)),
  };
}

function latestObservationTimestamp(report) {
  const timestamps = report.trendClusters
    .flatMap((cluster) => cluster.observations)
    .map((observation) => Date.parse(observation.observedAt))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return '';
  return formatDataTimestamp(new Date(Math.max(...timestamps)));
}

function formatDataTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function renderDataLabel(label, timestamp = '') {
  return `
    <p class="panel-label data-label">
      <span>${escapeHtml(label)}</span>
      ${timestamp ? `<small class="data-time">取得 ${escapeHtml(timestamp)}</small>` : ''}
    </p>
  `;
}

function renderCreatorSignal(signal) {
  return `
    <div class="signal-item">
      <strong>${escapeHtml(signal.label)}</strong>
      <span>${escapeHtml(signal.detail)}</span>
    </div>
  `;
}

function renderEvidenceCard(card) {
  const sourceUrl = safeUrl(card.sourceUrls?.[0]);
  return `
    <article class="evidence-card">
      <h3>${escapeHtml(card.claim)}</h3>
      <dl class="evidence-breakdown">
        <div>
          <dt>観測</dt>
          <dd>${escapeHtml(card.observation)}</dd>
        </div>
        <div>
          <dt>読み取り</dt>
          <dd>${escapeHtml(card.meaningForCreator)}</dd>
        </div>
        <div>
          <dt>企画への使い方</dt>
          <dd>${escapeHtml(card.creativeUse)}</dd>
        </div>
      </dl>
      <small>
        ${escapeHtml(card.source)} / ${escapeHtml(card.metricsSummary)}
        ${sourceUrl ? `<a class="evidence-link" href="${escapeAttr(sourceUrl)}" target="_blank" rel="noreferrer">取得元の記事を開く</a>` : ''}
      </small>
    </article>
  `;
}

function safeUrl(value) {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function distinctSearchQueries(report) {
  const observations = report.trendClusters?.[0]?.observations ?? [];
  return [...new Set(observations.map((item) => String(item.query ?? '').trim()).filter(Boolean))].slice(0, 6);
}

function renderCategoryFitCard(card) {
  return `
    <article class="fit-card">
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.whyThisMedium)}</p>
      <dl>
        <div>
          <dt>制作でやること</dt>
          <dd>${escapeHtml(card.creatorMove)}</dd>
        </div>
        <div>
          <dt>例</dt>
          <dd>${escapeHtml(card.example)}</dd>
        </div>
      </dl>
      <small>${escapeHtml(card.evidenceAnchor)}</small>
    </article>
  `;
}

function renderCreativePlan(plan, index) {
  const brief = plan.creatorBrief;
  const isLocked = !isApiReady() || isUiWorking();
  const disabled = disabledAttr(isLocked);
  return `
    <article class="plan-card">
      <div class="plan-card-head">
        <span class="plan-badge">案${index + 1} / ${escapeHtml(plan.formatLabel)}</span>
        <h3>${escapeHtml(plan.titleCandidates[0])}</h3>
      </div>
      <p class="promise">${escapeHtml(plan.audiencePromise)}</p>

      <div class="brief-panel">
        <h4>創作ブリーフ</h4>
        <dl>
          <div><dt>主人公</dt><dd>${escapeHtml(brief.protagonist)}</dd></div>
          <div><dt>舞台</dt><dd>${escapeHtml(brief.setting)}</dd></div>
          <div><dt>最初の事件</dt><dd>${escapeHtml(brief.incitingIncident)}</dd></div>
          <div><dt>対立</dt><dd>${escapeHtml(brief.conflict)}</dd></div>
          <div><dt>最後に選ばせること</dt><dd>${escapeHtml(brief.choice)}</dd></div>
          <div><dt>読後感</dt><dd>${escapeHtml(brief.payoff)}</dd></div>
        </dl>
      </div>

      <div class="craft-panel">
        <h4>プロ向け設計メモ</h4>
        <dl>
          ${plan.craftNotes.map((note) => `<div><dt>${escapeHtml(note.label)}</dt><dd>${escapeHtml(note.detail)}</dd></div>`).join('')}
        </dl>
      </div>

      ${renderStoryArchitecture(plan.storyArchitecture)}

      ${renderRetentionDesign(plan.retentionDesign)}

      <h4>この案で描く場面</h4>
      <p>${escapeHtml(plan.exampleDetail)}</p>

      <h4>ウケそうな理由</h4>
      <ul>${plan.reasonToWin.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>

      <h4>流れ</h4>
      <ol>${plan.outline.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>

      <h4>冒頭例</h4>
      <blockquote>${escapeHtml(plan.opening)}</blockquote>

      <div class="prompt-box">
        <div class="prompt-head">
          <h4>他AIに貼る本文生成プロンプト</h4>
          <button class="secondary-action compact" type="button" data-copy-plan-id="${escapeAttr(plan.id)}" ${disabled}>このプロンプトをコピー</button>
        </div>
        <textarea readonly>${escapeTextarea(plan.aiDraftPrompt)}</textarea>
      </div>

      ${renderPlanSample(plan)}
    </article>
  `;
}

function renderStoryArchitecture(architecture) {
  if (!architecture?.notes?.length) return '';

  return `
    <div class="architecture-panel">
      <h4>物語・台本設計</h4>
      <dl>
        ${architecture.notes
          .map((note) => `<div><dt>${escapeHtml(note.label)}</dt><dd>${escapeHtml(note.detail)}</dd></div>`)
          .join('')}
      </dl>
    </div>
  `;
}

function renderBeginnerGuide(report, timestamp = '') {
  const guide = report.beginnerGuide;
  if (!guide) return '';

  return `
    <section class="beginner-guide panel">
      ${renderDataLabel('制作ロードマップ', timestamp)}
      <div class="beginner-guide-head">
        <div>
          <h2>${escapeHtml(guide.headline)}</h2>
          <p>${escapeHtml(guide.promise)}</p>
        </div>
        <div class="beginner-output">
          <strong>最初に作るもの</strong>
          <span>${escapeHtml(guide.firstOutput)}</span>
        </div>
      </div>
      <div class="beginner-step-grid">
        ${guide.steps
          .map(
            (step, index) => `
          <article class="beginner-step">
            <span>${index + 1}</span>
            <h3>${escapeHtml(step.label)}</h3>
            <p>${escapeHtml(step.action)}</p>
            <small>${escapeHtml(step.output)}</small>
          </article>
        `,
          )
          .join('')}
      </div>
      <div class="beginner-check-grid">
        <div>
          <h3>書く前の確認</h3>
          <ul>${guide.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3>外すと弱くなる点</h3>
          <ul>${guide.avoid.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>
  `;
}

function renderRetentionDesign(retentionDesign) {
  if (!retentionDesign) return '';

  return `
    <div class="retention-panel">
      <h4>読者維持設計</h4>
      <dl>
        <div><dt>尺</dt><dd>${escapeHtml(retentionDesign.lengthGoal)}</dd></div>
        <div><dt>冒頭</dt><dd>${escapeHtml(retentionDesign.openingHook)}</dd></div>
        <div><dt>中盤</dt><dd>${escapeHtml(retentionDesign.middleKeep)}</dd></div>
        <div><dt>章末</dt><dd>${escapeHtml(retentionDesign.payoff)}</dd></div>
        <div><dt>次へ読ませる仕掛け</dt><dd>${escapeHtml(retentionDesign.continuationHook)}</dd></div>
      </dl>
    </div>
  `;
}

function renderPlanSample(plan) {
  const sample = state.planSamples[plan.id];
  const isLocked = !isApiReady() || isUiWorking();
  const text = sample?.text ?? 'この企画プロンプトを、このアプリに入れたAPIでも実際に参考文章へ変換できます。';
  const className = sample ? `sample-output ${sample.status}` : 'sample-output empty';
  return `
    <div class="sample-box">
      <div class="prompt-head">
        <h4>自AIの参考文章</h4>
        <div class="sample-actions">
          <button class="primary-action compact" type="button" data-generate-plan-id="${escapeAttr(plan.id)}" ${sample?.status === 'loading' || isLocked ? 'disabled' : ''}>
            ${sample?.status === 'loading' ? '生成中' : '参考文章を生成'}
          </button>
          ${
            sample?.status === 'done'
              ? `<button class="secondary-action compact" type="button" data-copy-sample-id="${escapeAttr(plan.id)}">参考文章をコピー</button>`
              : ''
          }
        </div>
      </div>
      <div class="${className}">${formatMultilineText(text)}</div>
    </div>
  `;
}

function renderActionMessage(message) {
  return `
    <div class="action-message" role="status" aria-live="polite">
      <strong>${escapeHtml(message.summary ?? '操作しました。')}</strong>
      ${message.risk_note ? `<span>${escapeHtml(message.risk_note)}</span>` : ''}
      ${Array.isArray(message.next_actions) ? message.next_actions.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : ''}
    </div>
  `;
}

function renderProviderSummary(summary, timestamp = '') {
  return `
    <section class="provider-summary panel">
      ${renderDataLabel('API詳細分析', timestamp)}
      <h2>${escapeHtml(summary.summary ?? '追加分析')}</h2>
      ${summary.used_model ? `<p><strong>使用モデル:</strong> ${escapeHtml(summary.used_model)}</p>` : ''}
      ${summary.strongest_signal ? `<p><strong>最も強いシグナル:</strong> ${escapeHtml(summary.strongest_signal)}</p>` : ''}
      ${summary.practical_revision ? `<p><strong>実用的な修正案:</strong> ${escapeHtml(summary.practical_revision)}</p>` : ''}
      ${summary.risk_note ? `<p><strong>注意点:</strong> ${escapeHtml(summary.risk_note)}</p>` : ''}
      ${Array.isArray(summary.next_actions) ? `<ul>${summary.next_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    </section>
  `;
}

function reasonBlock(title, items) {
  return `
    <div class="reason-card">
      <h3>${title}</h3>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function renderCategoryReason(reason) {
  return `
    <div class="reason-card">
      <h3>${escapeHtml(reason.title)}</h3>
      <p>${escapeHtml(reason.detail)}</p>
      <small>${escapeHtml(reason.example)}</small>
    </div>
  `;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;
}

function scoreItem(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function calculateOpportunityScore(cluster) {
  return clampScore(
    Math.round(
      (cluster.momentumScore + cluster.noveltyScore + cluster.confidenceScore + (100 - cluster.saturationScore)) / 4,
    ),
  );
}

function calculateEvidenceStrength(cluster) {
  return clampScore(Math.round(cluster.evidenceCount * 14 + cluster.sourceCount * 10));
}

function opportunityNarrative(opportunityScore, saturationRisk) {
  if (opportunityScore >= 78 && saturationRisk <= 58) {
    return '勢いと確度があり、まだ似た企画で埋まりきっていないため、早めに企画化する価値があります。';
  }
  if (saturationRisk >= 70) {
    return '反応はありますが似た見せ方が増えやすい状態です。下の企画案では切り口と設定の差別化を優先してください。';
  }
  return '大きな流行語を追うより、根拠を小さな具体場面へ落とすと企画化しやすい状態です。';
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function providerCaption(status) {
  if (status.mode === 'openai') return 'OpenAIキーを検出しました。このキーで詳細分析します。';
  if (status.mode === 'gemini') return 'Geminiキーを検出しました。このキーで詳細分析します。';
  if (status.mode === 'unknown') return 'APIキー形式を判定できません。OpenAIまたはGeminiのキーを1つ入力してください。';
  return 'APIキーを入力すると分析を開始できます。';
}

function providerName(provider) {
  return provider === 'gemini' ? 'Gemini' : 'OpenAI';
}

function getReportProviderMode(mode) {
  return mode === 'openai' || mode === 'gemini' ? mode : 'public-web-rss';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function escapeTextarea(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('</textarea', '&lt;/textarea');
}

function formatMultilineText(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}
