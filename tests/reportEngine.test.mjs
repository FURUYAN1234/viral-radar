import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';

test('buildReport returns practical report sections for trend explainer', () => {
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
  assert.ok(report.deepAnalysis.humanMotivation.length >= 4);
  assert.ok(report.creativePlans[0].properNounUsage.length >= 1);
  assert.doesNotMatch(report.limitations.join(' '), /デモ|想定データ/);
});

test('fiction reports keep platform names out of story-facing analysis', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    timeWindow: '7d',
    audience: 'general',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const visibleText = JSON.stringify({
    topTags: report.trendClusters[0].topTags,
    creatorSignals: report.trendClusters[0].creatorSignals,
    sourceSignals: report.trendClusters[0].sourceSignals,
    evidenceCards: report.evidenceCards.map((card) => ({
      claim: card.claim,
      source: card.source,
      metricsSummary: card.metricsSummary,
      whyItMatters: card.whyItMatters,
      observation: card.observation,
      meaningForCreator: card.meaningForCreator,
      creativeUse: card.creativeUse,
    })),
    deepAnalysis: report.deepAnalysis,
    creativePlans: report.creativePlans,
  });
  assert.doesNotMatch(visibleText, /YouTube|TikTok|Google Trends|LINE|Netflix/);
  assert.doesNotMatch(visibleText, /Netflix社員の陰謀|TikTok社長が黒幕|実在クリエイターを主人公/);
  assert.ok(report.creativePlans[0].sourceSimilarityFlags.some((flag) => flag.severity === 'safe'));
});

test('buildReport regenerates alternate paste-ready concepts instead of only reordering them', () => {
  const firstBatch = buildReport({
    categoryId: 'long-novel',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 0,
  });
  const secondBatch = buildReport({
    categoryId: 'long-novel',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 1,
  });

  assert.ok(firstBatch.creativePlans.length >= 3);
  assert.notEqual(firstBatch.creativePlans[0].id, secondBatch.creativePlans[0].id);
  assert.equal(
    firstBatch.creativePlans.some((firstPlan) =>
      secondBatch.creativePlans.some((secondPlan) => secondPlan.id === firstPlan.id),
    ),
    false,
  );
  assert.equal(
    firstBatch.creativePlans.some((firstPlan) =>
      secondBatch.creativePlans.some((secondPlan) => secondPlan.titleCandidates[0] === firstPlan.titleCandidates[0]),
    ),
    false,
  );
  assert.notEqual(
    JSON.stringify(firstBatch.creativePlans.map((plan) => plan.creatorBrief)),
    JSON.stringify(secondBatch.creativePlans.map((plan) => plan.creatorBrief)),
  );
  assert.ok(secondBatch.creativePlans.every((plan) => plan.id.includes('-search-1-')));

  for (const plan of firstBatch.creativePlans) {
    assert.ok(plan.reasonToWin.length >= 2);
    assert.ok(plan.exampleDetail);
    assert.match(plan.aiDraftPrompt, /この企画をもとに/);
    assert.match(plan.aiDraftPrompt, /創作ブリーフ/);
    assert.match(plan.aiDraftPrompt, /使用タイトル/);
    assert.doesNotMatch(plan.aiDraftPrompt, /タイトル候補:/);
    assert.match(plan.aiDraftPrompt, new RegExp(plan.titleCandidates[0]));
  }
});

test('alternate concepts draw from the full plan pool instead of only reframing the first three', () => {
  const firstBatch = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 0,
  });
  const secondBatch = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
    variantSeed: 1,
  });

  assert.notDeepEqual(
    firstBatch.creativePlans.map((plan) => plan.id),
    secondBatch.creativePlans.map((plan) => plan.id),
  );
  assert.ok(firstBatch.creativePlans.every((plan) => plan.id.includes('-search-0-')));
  assert.ok(secondBatch.creativePlans.every((plan) => plan.id.includes('-search-1-')));
});

test('creative plans are actionable story briefs, not only analysis notes', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const plan = report.creativePlans[0];
  assert.ok(plan.creatorBrief);
  assert.match(plan.titleCandidates[0], /欄|通知|レシート|検索|時間|評価|説明書|ログ|街|夜|朝/);
  assert.doesNotMatch(plan.titleCandidates.join(' / '), /最低評価の理由だけが見える/);
  for (const key of ['protagonist', 'setting', 'incitingIncident', 'conflict', 'choice', 'payoff']) {
    assert.ok(plan.creatorBrief[key], `${key} should be present`);
  }
  assert.ok(plan.craftNotes.length >= 4);
  assert.deepEqual(
    plan.craftNotes.map((note) => note.label),
    ['編集者に通す一文', '主人公の欠落', '読者維持エンジン', '凡庸化を避ける手'],
  );
  assert.match(plan.aiDraftPrompt, /主人公:/);
  assert.match(plan.aiDraftPrompt, /最初の事件:/);
  assert.match(plan.aiDraftPrompt, /最後に選ばせること:/);
  assert.match(plan.aiDraftPrompt, /プロ向け設計メモ:/);
});

test('reports include a novice-ready production roadmap before writing', () => {
  const story = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const novel = buildReport({
    categoryId: 'long-novel',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  assert.equal(typeof story.beginnerGuide, 'object');
  assert.match(story.beginnerGuide.headline, /1ページ/);
  assert.match(story.beginnerGuide.firstOutput, /4コマ|引き/);
  assert.equal(story.beginnerGuide.steps.length, 4);
  assert.match(JSON.stringify(story.beginnerGuide), /コマ|通知|レシート|検索窓|架空/);
  assert.match(JSON.stringify(story.beginnerGuide), new RegExp(story.creativePlans[0].titleCandidates[0]));
  assert.equal(typeof novel.beginnerGuide, 'object');
  assert.match(JSON.stringify(novel.beginnerGuide), /短編|中編|長編|第1章|章末/);
  assert.equal(novel.beginnerGuide.steps.length, 4);
  assert.ok(novel.beginnerGuide.checklist.length >= 4);
  assert.ok(novel.beginnerGuide.avoid.length >= 3);
});

test('search-driven story plans transform noisy article titles into original fiction premises', () => {
  const noisyObservation = {
    id: 'story-noisy-title',
    categoryId: 'story-manga',
    source: 'ABEMA',
    sourceType: 'public-web-rss',
    title: '「気づけば1年が終わっている」ゲーム発売日“先すぎ”が一瞬…大人になると時間が早く感じるワケ - ABEMA',
    snippet: '予定が遠いはずなのに時間だけが早く過ぎる感覚に共感が集まっている。',
    tags: ['漫画', '後悔', '生活不安', '時間感覚'],
    query: '漫画 生活不安 時間感覚',
    queryUsed: '漫画 生活不安 時間感覚 / 公開Web/RSS取得1',
    metrics: { rank: 1, recencyScore: 80, sourceWeight: 90 },
    sourceUrl: 'https://example.com/noisy-title',
    observedAt: '2026-06-25T10:00:00+09:00',
    publishedAt: '2026-06-25T09:00:00+09:00',
  };
  const report = buildReport({
    categoryId: 'story-manga',
    observations: [noisyObservation, ...PUBLIC_OBSERVATIONS],
    providerMode: 'fixture',
  });
  const plan = report.creativePlans[0];
  const storyFacingText = JSON.stringify({
    titles: plan.titleCandidates,
    brief: plan.creatorBrief,
    premise: plan.premise,
    exampleDetail: plan.exampleDetail,
    opening: plan.opening,
  });

  assert.match(storyFacingText, /時間|予定|後悔|通知|暦|カレンダー|明日/);
  assert.doesNotMatch(storyFacingText, /ゲーム発売日|ABEMA|先すぎ|気づけば1年が終わっている/);
  assert.doesNotMatch(plan.titleCandidates[0], /第1ページ$/);
});

test('fiction writing prompts keep platform names out of the story body instructions', () => {
  const story = buildReport({ categoryId: 'story-manga', observations: PUBLIC_OBSERVATIONS });
  const novel = buildReport({ categoryId: 'long-novel', observations: PUBLIC_OBSERVATIONS });
  const explainer = buildReport({ categoryId: 'trend-explainer', observations: PUBLIC_OBSERVATIONS });

  assert.doesNotMatch(JSON.stringify(story.creativePlans), /YouTube|TikTok|LINE/);
  assert.doesNotMatch(JSON.stringify(novel.creativePlans), /YouTube|TikTok|LINE/);
  assert.doesNotMatch(story.creativePlans.map((plan) => plan.aiDraftPrompt).join('\n'), /YouTube|TikTok|LINE/);
  assert.doesNotMatch(novel.creativePlans.map((plan) => plan.aiDraftPrompt).join('\n'), /YouTube|TikTok|LINE/);
  assert.match(explainer.creativePlans.map((plan) => plan.aiDraftPrompt).join('\n'), /YouTube|TikTok|LINE/);
});

test('buildReport returns three distinct category-specific reasons to target the category', () => {
  const report = buildReport({
    categoryId: 'short-video',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'openai',
  });

  assert.equal(report.categoryReasons.length, 3);
  assert.equal(new Set(report.categoryReasons.map((reason) => reason.title)).size, 3);
  assert.equal(new Set(report.categoryReasons.map((reason) => reason.detail)).size, 3);
  assert.ok(report.categoryReasons.every((reason) => reason.example));
});

test('category fit cards explain why each medium can use the same signal differently', () => {
  const story = buildReport({ categoryId: 'story-manga', observations: PUBLIC_OBSERVATIONS }).categoryFitCards;
  const short = buildReport({ categoryId: 'short-video', observations: PUBLIC_OBSERVATIONS }).categoryFitCards;
  const explainer = buildReport({ categoryId: 'trend-explainer', observations: PUBLIC_OBSERVATIONS }).categoryFitCards;
  const novel = buildReport({ categoryId: 'long-novel', observations: PUBLIC_OBSERVATIONS }).categoryFitCards;

  const storyText = JSON.stringify(story);
  const shortText = JSON.stringify(short);
  const explainerText = JSON.stringify(explainer);
  const novelText = JSON.stringify(novel);

  assert.notEqual(storyText, shortText);
  assert.notEqual(storyText, explainerText);
  assert.notEqual(storyText, novelText);
  assert.match(storyText, /ページ|コマ|吹き出し|縦読み/);
  assert.match(shortText, /冒頭1秒|字幕|保存|コメント/);
  assert.match(explainerText, /解説|根拠|章立て|ナレーション/);
  assert.match(novelText, /章|伏線|読者維持|長期/);
});

test('evidence cards translate raw observations into useful creator decisions', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'openai',
  });

  for (const card of report.evidenceCards) {
    assert.ok(card.observation);
    assert.ok(card.meaningForCreator);
    assert.ok(card.creativeUse);
    assert.doesNotMatch(card.claim, /シグナルです/);
  }
});

test('trend cluster separates creator-facing signals from source and platform labels', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  const cluster = report.trendClusters[0];

  assert.ok(Array.isArray(cluster.creatorSignals));
  assert.ok(Array.isArray(cluster.sourceSignals));
  assert.ok(cluster.creatorSignals.length >= 3);
  assert.ok(cluster.sourceSignals.length >= 2);
  assert.doesNotMatch(JSON.stringify(cluster.creatorSignals), /TikTok|YouTube|Google Trends|LINE|Netflix/);
  assert.doesNotMatch(JSON.stringify(cluster.sourceSignals), /TikTok|Google Trends|LINE|YouTube|Netflix/);
  assert.notDeepEqual(
    cluster.creatorSignals.map((signal) => signal.label),
    cluster.topTags.slice(0, cluster.creatorSignals.length),
  );

  const explainer = buildReport({
    categoryId: 'trend-explainer',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });
  assert.match(JSON.stringify(explainer.trendClusters[0].sourceSignals), /Google News RSS|はてなブックマーク/);
});

test('deep analysis and evidence interpretation change by medium', () => {
  const story = buildReport({ categoryId: 'story-manga', observations: PUBLIC_OBSERVATIONS });
  const short = buildReport({ categoryId: 'short-video', observations: PUBLIC_OBSERVATIONS });
  const explainer = buildReport({ categoryId: 'trend-explainer', observations: PUBLIC_OBSERVATIONS });
  const novel = buildReport({ categoryId: 'long-novel', observations: PUBLIC_OBSERVATIONS });

  assert.notDeepEqual(story.deepAnalysis.surfacePattern, short.deepAnalysis.surfacePattern);
  assert.notDeepEqual(story.deepAnalysis.productionMechanism, short.deepAnalysis.productionMechanism);
  assert.notDeepEqual(story.deepAnalysis.narrativeMechanism, novel.deepAnalysis.narrativeMechanism);
  assert.notDeepEqual(short.deepAnalysis.productionMechanism, explainer.deepAnalysis.productionMechanism);

  assert.match(JSON.stringify(story.evidenceCards), /ページ|コマ|縦読み|吹き出し|架空UI/);
  assert.match(JSON.stringify(short.evidenceCards), /0秒|1秒|字幕|保存|コメント/);
  assert.match(JSON.stringify(explainer.evidenceCards), /解説|根拠|章立て|ナレーション|断定を避け/);
  assert.match(JSON.stringify(novel.evidenceCards), /章|伏線|読者維持|長期|世界観/);
});

test('novel plans expose concrete reader-retention design for short, medium, and long forms', () => {
  const report = buildReport({ categoryId: 'long-novel', observations: PUBLIC_OBSERVATIONS });
  const retentionText = JSON.stringify(report.creativePlans.map((plan) => plan.retentionDesign));

  assert.equal(report.creativePlans.every((plan) => plan.retentionDesign), true);
  assert.match(retentionText, /短編|中編|長編/);
  assert.match(retentionText, /冒頭|中盤|章末|回収|余韻/);
  assert.match(report.creativePlans.map((plan) => plan.aiDraftPrompt).join('\n'), /読者維持設計/);
});
