import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';
import { fromJson, toMarkdown, toJson } from '../src/lib/exporters.js';

const MOJIBAKE_RE = /縺|繧|譁|莨|譬|蜈|蟆|螳|隱|迚|繝|蜍|髯|鬆|蛻|邱|莠|驥|蜷/;
const OPENAI_KEY_PREFIX = `sk-${'proj'}-`;
const GEMINI_KEY_PREFIX = `AI${'za'}`;

test('markdown export includes evidence and proper noun policy', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    timeWindow: '7d',
    audience: 'general',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const markdown = toMarkdown(report);
  assert.match(markdown, /# 物語バズメーカー企画レポート/);
  assert.match(markdown, /## 根拠シグナル/);
  assert.match(markdown, /## 制作ロードマップ/);
  assert.match(markdown, /最初に作るもの/);
  assert.match(markdown, /## そのまま企画に使える案/);
  assert.match(markdown, /固有名詞は市場・配信形式・共有文脈の根拠として扱います/);
  assert.match(markdown, /他AIに貼る本文生成プロンプト/);
  assert.doesNotMatch(markdown, MOJIBAKE_RE);
  assert.doesNotMatch(markdown, /Story Maker|story-maker|連携|internalRoutineNotes/);
  assert.doesNotMatch(markdown, /Momentum|Saturation|Novelty|Confidence|Evidence|Production plan|Proper noun/);
  assert.doesNotMatch(markdown, new RegExp(`${OPENAI_KEY_PREFIX}|${GEMINI_KEY_PREFIX}`));
});

test('json export is parseable and omits secrets', () => {
  const report = buildReport({
    categoryId: 'short-video',
    timeWindow: '24h',
    audience: 'youth',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const parsed = JSON.parse(toJson(report));
  assert.equal(parsed.category.id, 'short-video');
  assert.equal(JSON.stringify(parsed).includes(OPENAI_KEY_PREFIX), false);
  assert.ok(parsed.creativePlans[0].aiDraftPrompt);
  assert.ok(parsed.creativePlans[0].storyArchitecture);
  assert.match(parsed.creativePlans[0].aiDraftPrompt, /物語設計/);
  assert.match(parsed.creativePlans[0].storyArchitecture.gmc.method, /GMC/);
  assert.ok(parsed.beginnerGuide);
  assert.match(parsed.beginnerGuide.headline, /台本|順番|ロードマップ|章|ページ|解説/);
  assert.equal(Object.hasOwn(parsed.creativePlans[0], 'storyMakerRoutineNotes'), false);
  assert.equal(Object.hasOwn(parsed.creativePlans[0], 'internalRoutineNotes'), false);
  assert.doesNotMatch(JSON.stringify(parsed), /Story Maker|story-maker|連携/);
});

test('json export can be loaded back as a report without API keys', () => {
  const report = buildReport({
    categoryId: 'long-novel',
    timeWindow: '7d',
    audience: 'web-fiction',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const openAiLeak = `${OPENAI_KEY_PREFIX}mask-test-token`;
  const geminiLeak = `${GEMINI_KEY_PREFIX}ShouldNotSurvive`;
  report.providerAnalysis = {
    summary: `API分析メモ ${openAiLeak} ${geminiLeak}`,
  };

  const loaded = fromJson(toJson(report));

  assert.equal(loaded.category.id, 'long-novel');
  assert.equal(loaded.audience, 'web-fiction');
  assert.equal(loaded.creativePlans.length, report.creativePlans.length);
  assert.doesNotMatch(loaded.creativePlans[0].aiDraftPrompt, /Story Maker|story-maker|連携/);
  assert.equal(JSON.stringify(loaded).includes(openAiLeak), false);
  assert.equal(JSON.stringify(loaded).includes(geminiLeak), false);
});
