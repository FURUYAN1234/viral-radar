import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';

const AI_PENDING_MESSAGE = '未生成';
const AI_PROMPT_ONLY_MESSAGE = 'AIで新規生成してください。ここでは取得根拠だけを渡します。';

const ENTITY_LEAK_OBSERVATIONS = [
  {
    id: 'entity-leak-a',
    categoryId: 'story-manga',
    source: 'はてな 暮らし',
    sourceType: 'public-web-rss',
    title: 'ケンドーコバヤシが新幹線内の整列問題について説明',
    snippet: '整列の問題と確認欄の扱いについて、ケンドーコバヤシの発言が話題になっている。',
    tags: ['ケンドーコバヤシ', '新幹線内', '整列', '確認欄'],
    query: 'ケンドーコバヤシ 整列 確認欄',
    queryUsed: 'ケンドーコバヤシ 整列 確認欄 / public Web/RSS round 1',
    metrics: { rank: 1, recencyScore: 88, sourceWeight: 91, categoryMatchScore: 72 },
    sourceUrl: 'https://example.com/entity-leak-a',
    observedAt: '2026-06-26T13:48:07+09:00',
    publishedAt: '2026-06-26T12:30:00+09:00',
  },
  {
    id: 'entity-leak-b',
    categoryId: 'story-manga',
    source: 'Google News RSS',
    sourceType: 'public-web-rss',
    title: '乙武洋匡氏と渡辺直美の発言が確認欄の話題に',
    snippet: '乙武洋匡氏、渡辺直美の名前を含む話題が、説明不足や記録票の読み方として共有された。',
    tags: ['乙武洋匡氏', '渡辺直美', '説明不足', '記録票'],
    query: '乙武洋匡氏 渡辺直美 確認欄',
    queryUsed: '乙武洋匡氏 渡辺直美 確認欄 / public Web/RSS round 1',
    metrics: { rank: 2, recencyScore: 81, sourceWeight: 86, categoryMatchScore: 69 },
    sourceUrl: 'https://example.com/entity-leak-b',
    observedAt: '2026-06-26T13:49:07+09:00',
    publishedAt: '2026-06-26T12:10:00+09:00',
  },
  {
    id: 'entity-leak-c',
    categoryId: 'story-manga',
    source: 'Google News RSS',
    sourceType: 'public-web-rss',
    title: 'Amazonと任天堂作品ドラえもんの比較が受付票の比喩で語られる',
    snippet: 'Amazon、任天堂、ドラえもんなどの固有名詞を含む記事が、受付票や掲示板の比喩と一緒に言及された。',
    tags: ['Amazon', '任天堂', 'ドラえもん', '受付票', '掲示板'],
    query: 'Amazon 任天堂 ドラえもん 受付票',
    queryUsed: 'Amazon 任天堂 ドラえもん 受付票 / public Web/RSS round 1',
    metrics: { rank: 3, recencyScore: 76, sourceWeight: 84, categoryMatchScore: 65 },
    sourceUrl: 'https://example.com/entity-leak-c',
    observedAt: '2026-06-26T13:50:07+09:00',
    publishedAt: '2026-06-26T11:50:00+09:00',
  },
];

function pendingPlanFields(plan) {
  return {
    audiencePromise: plan.audiencePromise,
    emotionalHook: plan.emotionalHook,
    premise: plan.premise,
    exampleDetail: plan.exampleDetail,
    outline: plan.outline,
    opening: plan.opening,
    differentiation: plan.differentiation,
    creatorBrief: plan.creatorBrief,
    storyArchitecture: plan.storyArchitecture,
    craftNotes: plan.craftNotes,
    retentionDesign: plan.retentionDesign,
  };
}

test('buildReport returns evidence packs and keeps judgment prose provider-required', () => {
  const report = buildReport({
    categoryId: 'trend-explainer',
    timeWindow: '7d',
    audience: 'working-adults',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  assert.equal(report.category.id, 'trend-explainer');
  assert.ok(report.evidenceCards.length >= 3);
  assert.ok(report.trendClusters.every((cluster) => Number.isInteger(cluster.momentumScore)));
  assert.equal(report.deepAnalysis.status, 'awaiting-ai');
  assert.equal(report.deepAnalysis.source, 'provider-required');
  assert.deepEqual(report.deepAnalysis.humanMotivation, []);
  assert.deepEqual(report.deepAnalysis.narrativeMechanism, []);
  assert.deepEqual(report.categoryFitCards, []);
  assert.deepEqual(report.categoryReasons, []);
  assert.equal(report.beginnerGuide, null);
  assert.ok(report.creativePlans.every((plan) => plan.craftNotes.length === 0));
  assert.ok(report.creativePlans.every((plan) => plan.storyArchitecture.status === 'awaiting-ai'));
  assert.ok(report.creativePlans.every((plan) => plan.storyArchitecture.notes.length === 0));
  assert.ok(report.creativePlans.every((plan) => plan.retentionDesign === null));
  assert.doesNotMatch(report.limitations.join(' '), /デモ|想定データ|サンプル/);
});

test('evidence cards organize facts without local interpretation filler', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'public-web-rss',
  });

  for (const card of report.evidenceCards) {
    assert.ok(card.claim);
    assert.ok(card.source);
    assert.ok(card.observation);
    assert.equal(card.whyItMatters, AI_PENDING_MESSAGE);
    assert.equal(card.meaningForCreator, AI_PENDING_MESSAGE);
    assert.equal(card.creativeUse, AI_PENDING_MESSAGE);
    assert.doesNotMatch(card.observation, /漫画では|動画では|小説では|説明に頼らず|冒頭で見せる/);
  }
});

test('creative plans stay ungenerated until a provider supplies original prose', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  for (const plan of report.creativePlans) {
    assert.match(plan.titleCandidates[0], /^制作案:/);
    assert.equal(plan.audiencePromise, AI_PENDING_MESSAGE);
    assert.equal(plan.emotionalHook, AI_PENDING_MESSAGE);
    assert.equal(plan.premise, AI_PENDING_MESSAGE);
    assert.equal(plan.exampleDetail, AI_PENDING_MESSAGE);
    assert.deepEqual(plan.outline, [AI_PENDING_MESSAGE]);
    assert.equal(plan.opening, AI_PENDING_MESSAGE);
    assert.equal(plan.differentiation, AI_PENDING_MESSAGE);
    assert.deepEqual(Object.values(plan.creatorBrief), Array(6).fill(AI_PENDING_MESSAGE));
    assert.deepEqual(plan.craftNotes, []);
    assert.equal(plan.storyArchitecture.status, 'awaiting-ai');
    assert.deepEqual(plan.storyArchitecture.notes, []);
    assert.equal(plan.retentionDesign, null);
    assert.equal(plan.draftInstructions, AI_PROMPT_ONLY_MESSAGE);
  }
});

test('AI draft prompts pass evidence and ban template substitution', () => {
  const report = buildReport({
    categoryId: 'long-novel',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const promptText = report.creativePlans.map((plan) => plan.aiDraftPrompt).join('\n\n');

  assert.match(promptText, /以下の取得根拠と案の要点を読み/);
  assert.match(promptText, /生成してほしいもの/);
  assert.match(promptText, /使用タイトル:/);
  assert.match(promptText, /案の要点/);
  assert.match(promptText, /主人公:/);
  assert.match(promptText, /舞台:/);
  assert.match(promptText, /最初の事件:/);
  assert.match(promptText, /プロ向け設計メモ/);
  assert.match(promptText, /物語・台本設計/);
  assert.match(promptText, /固定テンプレ、単語差し替え/);
  assert.match(promptText, /実在人物、企業、作品、クリエイター、既存キャラクターを物語の主役・黒幕・告発対象・続編対象にすること/);
  assert.doesNotMatch(promptText, /AI生成時の設計条件|創作ルーチン|Setup-Payoff|GMC|Show Don't Tell|Character Knowledge Boundary/);
  assert.ok(report.creativePlans.every((plan) => !Object.hasOwn(plan, 'internalRoutineNotes')));
});

test('real entities remain evidence, not local story content', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: ENTITY_LEAK_OBSERVATIONS,
    providerMode: 'public-web-rss',
  });
  const realEntityPattern = /ケンドーコバヤシ|乙武洋匡|渡辺直美|Amazon|任天堂|ドラえもん/;
  const evidenceText = JSON.stringify({
    evidenceCards: report.evidenceCards,
    sourceSignals: report.trendClusters[0].sourceSignals,
    evidenceAnchors: report.creativePlans.map((plan) => plan.evidenceAnchor),
    prompts: report.creativePlans.map((plan) => plan.aiDraftPrompt),
  });
  const localGeneratedText = JSON.stringify(report.creativePlans.map(pendingPlanFields));

  assert.match(evidenceText, realEntityPattern);
  assert.doesNotMatch(localGeneratedText, realEntityPattern);
  assert.match(evidenceText, /主役・黒幕・告発対象・続編対象にすること/);
});

test('variant seed changes plan IDs but does not rotate the evidence queue or invent prose', () => {
  const first = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 0,
  });
  const salted = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 9,
  });

  assert.notDeepEqual(
    first.creativePlans.map((plan) => plan.id),
    salted.creativePlans.map((plan) => plan.id),
  );
  assert.deepEqual(
    first.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
    salted.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
  );
  assert.deepEqual(
    first.creativePlans.map(pendingPlanFields),
    salted.creativePlans.map(pendingPlanFields),
  );
});

test('non-household evidence does not collapse into old fixed concept banks', () => {
  const observations = [
    {
      id: 'hardcoded-a',
      categoryId: 'story-manga',
      source: 'Google News RSS',
      sourceType: 'public-web-rss',
      title: '携帯電話に060番号が追加され番号不足への不安が話題に',
      snippet: '複数回線、番号不足、本人確認の手間に反応が集まっている。',
      tags: ['番号不足', '本人確認', '複数回線'],
      query: '番号不足 本人確認 複数回線',
      queryUsed: '番号不足 本人確認 複数回線 / public Web/RSS round 1',
      metrics: { rank: 1, recencyScore: 90, sourceWeight: 92 },
      sourceUrl: 'https://example.com/hardcoded-a',
      observedAt: '2026-06-26T10:00:00+09:00',
      publishedAt: '2026-06-26T09:30:00+09:00',
    },
    {
      id: 'hardcoded-b',
      categoryId: 'story-manga',
      source: 'はてな 世の中',
      sourceType: 'public-web-rss',
      title: '医療記録で女性の痛みが軽視されがちという議論',
      snippet: '痛みの訴え、記録の偏り、診察で言い出せない不安が共有されている。',
      tags: ['医療記録', '痛み', '偏見'],
      query: '医療記録 痛み 偏見',
      queryUsed: '医療記録 痛み 偏見 / public Web/RSS round 1',
      metrics: { rank: 2, recencyScore: 88, sourceWeight: 90 },
      sourceUrl: 'https://example.com/hardcoded-b',
      observedAt: '2026-06-26T10:01:00+09:00',
      publishedAt: '2026-06-26T09:20:00+09:00',
    },
    {
      id: 'hardcoded-c',
      categoryId: 'story-manga',
      source: 'Bing News RSS',
      sourceType: 'public-web-rss',
      title: '追悼式の野次をめぐり言葉の重さが賛否に',
      snippet: '公的な場での発言、沈黙できない怒り、式典の空気に議論が起きている。',
      tags: ['式典', '野次', '言葉'],
      query: '式典 野次 言葉',
      queryUsed: '式典 野次 言葉 / public Web/RSS round 1',
      metrics: { rank: 3, recencyScore: 86, sourceWeight: 88 },
      sourceUrl: 'https://example.com/hardcoded-c',
      observedAt: '2026-06-26T10:02:00+09:00',
      publishedAt: '2026-06-26T09:10:00+09:00',
    },
  ];
  const report = buildReport({ categoryId: 'story-manga', observations, providerMode: 'public-web-rss' });
  const text = JSON.stringify({
    cluster: report.trendClusters[0],
    evidenceCards: report.evidenceCards,
    creativePlans: report.creativePlans.map((plan) => ({
      titleCandidates: plan.titleCandidates,
      evidenceAnchor: plan.evidenceAnchor,
      reasonToWin: plan.reasonToWin,
      aiDraftPrompt: plan.aiDraftPrompt,
    })),
  });

  assert.match(text, /060|番号不足|本人確認|医療記録|痛み|式典|野次|言葉/);
  assert.doesNotMatch(text, /買い物|冷蔵庫|レシート|家計簿|生活通知|未来の自分|明日の自分|生活メモ/);
});

test('fixture observations are excluded from production evidence packs', () => {
  const observations = [
    {
      id: 'fake-fixture-a',
      categoryId: 'story-manga',
      source: 'Fixture Source',
      sourceType: 'fixture',
      title: '架空テンプレの大成功サンプル',
      snippet: 'これは本番で根拠として扱ってはいけない固定サンプルです。',
      tags: ['架空テンプレ', '固定サンプル'],
      query: 'fixture',
      queryUsed: 'fixture',
      metrics: { rank: 1, recencyScore: 100, sourceWeight: 100 },
      sourceUrl: 'https://example.com/fixture',
      observedAt: '2026-06-26T10:00:00+09:00',
      publishedAt: '2026-06-26T09:30:00+09:00',
    },
    {
      id: 'real-public-a',
      categoryId: 'story-manga',
      source: 'Google News RSS',
      sourceType: 'public-web-rss',
      title: '地域の受付票をめぐる説明不足が話題に',
      snippet: '受付票の読み方、説明不足、掲示板の更新漏れに反応が集まっている。',
      tags: ['受付票', '説明不足', '掲示板'],
      query: '受付票 説明不足 掲示板',
      queryUsed: '受付票 説明不足 掲示板 / public Web/RSS round 1',
      metrics: { rank: 2, recencyScore: 61, sourceWeight: 70 },
      sourceUrl: 'https://example.com/public',
      observedAt: '2026-06-26T10:01:00+09:00',
      publishedAt: '2026-06-26T09:20:00+09:00',
    },
  ];
  const report = buildReport({ categoryId: 'story-manga', observations, providerMode: 'public-web-rss' });
  const text = JSON.stringify({
    trendClusters: report.trendClusters,
    evidenceCards: report.evidenceCards,
    creativePlans: report.creativePlans,
  });

  assert.match(text, /受付票|説明不足|掲示板/);
  assert.doesNotMatch(text, /架空テンプレ|固定サンプル|Fixture Source|fixture/);
});

test('all categories use the same honest provider-required boundary', () => {
  for (const categoryId of ['story-manga', 'short-video', 'trend-explainer', 'long-novel']) {
    const report = buildReport({
      categoryId,
      observations: PUBLIC_OBSERVATIONS,
      providerMode: 'fixture',
    });

    assert.equal(report.deepAnalysis.status, 'awaiting-ai');
    assert.equal(report.beginnerGuide, null);
    assert.deepEqual(report.categoryReasons, []);
    assert.deepEqual(report.categoryFitCards, []);
    assert.ok(report.creativePlans.every((plan) => plan.craftNotes.length === 0));
    assert.ok(report.creativePlans.every((plan) => plan.storyArchitecture.status === 'awaiting-ai'));
    assert.ok(report.creativePlans.every((plan) => plan.opening === AI_PENDING_MESSAGE));
  }
});
