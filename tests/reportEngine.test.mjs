import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';

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

function storyFacingText(report) {
  return JSON.stringify({
    topTags: report.trendClusters[0].topTags,
    creatorSignals: report.trendClusters[0].creatorSignals,
    sourceSignals: report.trendClusters[0].sourceSignals,
    deepAnalysis: report.deepAnalysis,
    beginnerGuide: report.beginnerGuide,
    categoryFitCards: report.categoryFitCards,
    categoryReasons: report.categoryReasons,
    creativePlans: report.creativePlans.map((plan) => ({
      titleCandidates: plan.titleCandidates,
      reasonToWin: plan.reasonToWin,
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
      aiDraftPrompt: plan.aiDraftPrompt,
    })),
  });
}

function countMatches(text, pattern) {
  return [...String(text).matchAll(pattern)].length;
}

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

test('fiction reports keep real entities as evidence only and rewrite story-facing copy', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    timeWindow: '7d',
    audience: 'general',
    observations: ENTITY_LEAK_OBSERVATIONS,
    providerMode: 'public-web-rss',
  });

  const evidenceText = JSON.stringify(report.evidenceCards);
  const visibleText = storyFacingText(report);
  const realEntityPattern = /ケンドーコバヤシ|乙武洋匡|渡辺直美|Amazon|任天堂|ドラえもん/;

  assert.match(evidenceText, realEntityPattern);
  assert.doesNotMatch(visibleText, realEntityPattern);
  assert.doesNotMatch(visibleText, /整列を整列が|補助視点は.+ケンドーコバヤシ|が[^。]{0,24}の問題として処理され/);
  assert.match(visibleText, /確認欄|記録票|受付票|掲示板|説明不足|整列/);
});

test('story manga creative briefs use distinct angles instead of one repeated sentence frame', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    timeWindow: '7d',
    audience: 'general',
    observations: ENTITY_LEAK_OBSERVATIONS,
    providerMode: 'public-web-rss',
  });

  const briefTexts = report.creativePlans.map((plan) => Object.values(plan.creatorBrief).join(' '));
  const joinedBriefs = briefTexts.join('\n');

  assert.equal(briefTexts.length, 3);
  assert.ok(countMatches(joinedBriefs, /主人公。最初は/g) <= 1);
  assert.ok(countMatches(joinedBriefs, /自分の弱さ/g) <= 1);
  assert.ok(countMatches(joinedBriefs, /小さな救済/g) <= 1);
  assert.ok(briefTexts.some((text) => /画面|視線|小道具|欄/.test(text)));
  assert.ok(briefTexts.some((text) => /証言|会話|沈黙|周囲/.test(text)));
  assert.ok(briefTexts.some((text) => /選択|返す|回収|余韻/.test(text)));
});

test('buildReport varies the creative angle without rotating the evidence queue', () => {
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
  assert.deepEqual(
    firstBatch.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
    secondBatch.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
  );
  assert.notEqual(
    JSON.stringify(firstBatch.creativePlans.map((plan) => plan.creatorBrief)),
    JSON.stringify(secondBatch.creativePlans.map((plan) => plan.creatorBrief)),
  );
  assert.notEqual(
    JSON.stringify(firstBatch.creativePlans.map((plan) => plan.opening)),
    JSON.stringify(secondBatch.creativePlans.map((plan) => plan.opening)),
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

test('deep analysis changes with the selected evidence round instead of staying category-static', () => {
  for (const categoryId of ['story-manga', 'short-video', 'trend-explainer', 'long-novel']) {
    const analyses = [0, 1, 2, 3].map((variantSeed) =>
      JSON.stringify(
        buildReport({
          categoryId,
          observations: PUBLIC_OBSERVATIONS,
          providerMode: 'fixture',
          variantSeed,
        }).deepAnalysis,
      ),
    );

    assert.ok(new Set(analyses).size >= 3, `${categoryId} should produce at least three analysis angles`);
  }
});

test('same evidence is not treated as a rotation queue when only the variation salt changes', () => {
  const observations = [
    {
      id: 'stable-a',
      categoryId: 'story-manga',
      source: 'Local RSS A',
      sourceType: 'public-web-rss',
      title: '携帯電話に060番号が追加され番号不足への不安が話題に',
      snippet: '複数回線、番号不足、本人確認の手間に反応が集まっている。',
      tags: ['番号不足', '本人確認', '複数回線'],
      query: '番号不足 本人確認 複数回線',
      queryUsed: '番号不足 本人確認 複数回線 / public Web/RSS round 1',
      metrics: { rank: 1, recencyScore: 90, sourceWeight: 92 },
      sourceUrl: 'https://example.com/stable-a',
      observedAt: '2026-06-26T10:00:00+09:00',
      publishedAt: '2026-06-26T09:30:00+09:00',
    },
    {
      id: 'stable-b',
      categoryId: 'story-manga',
      source: 'Local RSS B',
      sourceType: 'public-web-rss',
      title: '医療記録で女性の痛みが軽視されがちという議論',
      snippet: '痛みの訴え、記録の偏り、診察で言い出せない不安が共有されている。',
      tags: ['医療記録', '痛み', '偏見'],
      query: '医療記録 痛み 偏見',
      queryUsed: '医療記録 痛み 偏見 / public Web/RSS round 1',
      metrics: { rank: 2, recencyScore: 88, sourceWeight: 90 },
      sourceUrl: 'https://example.com/stable-b',
      observedAt: '2026-06-26T10:01:00+09:00',
      publishedAt: '2026-06-26T09:20:00+09:00',
    },
    {
      id: 'stable-c',
      categoryId: 'story-manga',
      source: 'Local RSS C',
      sourceType: 'public-web-rss',
      title: '追悼式の野次をめぐり言葉の重さが賛否に',
      snippet: '公的な場での発言、沈黙できない怒り、式典の空気に議論が起きている。',
      tags: ['式典', '野次', '言葉'],
      query: '式典 野次 言葉',
      queryUsed: '式典 野次 言葉 / public Web/RSS round 1',
      metrics: { rank: 3, recencyScore: 86, sourceWeight: 88 },
      sourceUrl: 'https://example.com/stable-c',
      observedAt: '2026-06-26T10:02:00+09:00',
      publishedAt: '2026-06-26T09:10:00+09:00',
    },
  ];
  const first = buildReport({ categoryId: 'story-manga', observations, variantSeed: 0 });
  const salted = buildReport({ categoryId: 'story-manga', observations, variantSeed: 9 });

  assert.deepEqual(
    first.creativePlans.map((plan) => plan.evidenceAnchor.sourceUrl),
    salted.creativePlans.map((plan) => plan.evidenceAnchor.sourceUrl),
  );
  assert.notDeepEqual(
    first.creativePlans.map((plan) => plan.storyArchitecture.mediumExecution.focus),
    salted.creativePlans.map((plan) => plan.storyArchitecture.mediumExecution.focus),
  );
});

test('non-household evidence does not collapse into shopping notification memo concepts', () => {
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
  const storyFacingText = JSON.stringify({
    label: report.trendClusters[0].label,
    topTags: report.trendClusters[0].topTags,
    creatorSignals: report.trendClusters[0].creatorSignals,
    deepAnalysis: report.deepAnalysis,
    beginnerGuide: report.beginnerGuide,
    creativePlans: report.creativePlans.map((plan) => ({
      titleCandidates: plan.titleCandidates,
      brief: plan.creatorBrief,
      craftNotes: plan.craftNotes,
      storyArchitecture: plan.storyArchitecture,
      reasonToWin: plan.reasonToWin,
      outline: plan.outline,
      opening: plan.opening,
      prompt: plan.aiDraftPrompt,
    })),
  });

  assert.match(storyFacingText, /060|番号不足|本人確認|医療記録|痛み|式典|野次|言葉/);
  assert.doesNotMatch(storyFacingText, /買い物|冷蔵庫|レシート|家計簿|生活通知|未来の自分|明日の自分|生活メモ/);
});

test('each plan changes brief, notes, architecture, scene, reason, flow, opening, and prompt wording', () => {
  const observations = [
    {
      id: 'distinct-a',
      categoryId: 'story-manga',
      source: 'Google News RSS',
      sourceType: 'public-web-rss',
      title: '携帯電話に060番号が追加され番号不足への不安が話題に',
      snippet: '複数回線、番号不足、本人確認の手間に反応が集まっている。',
      tags: ['番号不足', '本人確認', '複数回線'],
      query: '番号不足 本人確認 複数回線',
      queryUsed: '番号不足 本人確認 複数回線 / public Web/RSS round 1',
      metrics: { rank: 1, recencyScore: 90, sourceWeight: 92 },
      sourceUrl: 'https://example.com/distinct-a',
      observedAt: '2026-06-26T10:00:00+09:00',
      publishedAt: '2026-06-26T09:30:00+09:00',
    },
    {
      id: 'distinct-b',
      categoryId: 'story-manga',
      source: 'はてな 世の中',
      sourceType: 'public-web-rss',
      title: '医療記録で女性の痛みが軽視されがちという議論',
      snippet: '痛みの訴え、記録の偏り、診察で言い出せない不安が共有されている。',
      tags: ['医療記録', '痛み', '偏見'],
      query: '医療記録 痛み 偏見',
      queryUsed: '医療記録 痛み 偏見 / public Web/RSS round 1',
      metrics: { rank: 2, recencyScore: 88, sourceWeight: 90 },
      sourceUrl: 'https://example.com/distinct-b',
      observedAt: '2026-06-26T10:01:00+09:00',
      publishedAt: '2026-06-26T09:20:00+09:00',
    },
    {
      id: 'distinct-c',
      categoryId: 'story-manga',
      source: 'Bing News RSS',
      sourceType: 'public-web-rss',
      title: '追悼式の野次をめぐり言葉の重さが賛否に',
      snippet: '公的な場での発言、沈黙できない怒り、式典の空気に議論が起きている。',
      tags: ['式典', '野次', '言葉'],
      query: '式典 野次 言葉',
      queryUsed: '式典 野次 言葉 / public Web/RSS round 1',
      metrics: { rank: 3, recencyScore: 86, sourceWeight: 88 },
      sourceUrl: 'https://example.com/distinct-c',
      observedAt: '2026-06-26T10:02:00+09:00',
      publishedAt: '2026-06-26T09:10:00+09:00',
    },
  ];
  const report = buildReport({ categoryId: 'story-manga', observations, providerMode: 'public-web-rss', variantSeed: 4 });
  const valuesFor = (selector) => report.creativePlans.map(selector);

  assert.equal(new Set(valuesFor((plan) => plan.titleCandidates[0])).size, 3);
  assert.equal(new Set(valuesFor((plan) => JSON.stringify(plan.creatorBrief))).size, 3);
  assert.equal(new Set(valuesFor((plan) => JSON.stringify(plan.craftNotes))).size, 3);
  assert.equal(new Set(valuesFor((plan) => JSON.stringify(plan.storyArchitecture))).size, 3);
  assert.equal(new Set(valuesFor((plan) => plan.exampleDetail)).size, 3);
  assert.equal(new Set(valuesFor((plan) => plan.reasonToWin.join('\n'))).size, 3);
  assert.equal(new Set(valuesFor((plan) => plan.outline.join('\n'))).size, 3);
  assert.equal(new Set(valuesFor((plan) => plan.opening)).size, 3);
  assert.equal(new Set(valuesFor((plan) => plan.aiDraftPrompt)).size, 3);
  assert.doesNotMatch(report.creativePlans.map((plan) => plan.opening).join('\n'), /誰にも見えないはずの欄にだけ残っていた/);
});

test('regenerated plans bind visible briefs to distinct evidence anchors, not only concept rotations', () => {
  const evidenceSet = [
    {
      id: 'variation-1',
      categoryId: 'story-manga',
      source: 'Local RSS A',
      sourceType: 'public-web-rss',
      title: '冷蔵庫の買い忘れメモから家族の我慢が話題に',
      snippet: '家族の小さな我慢、節約疲れ、買い忘れの気まずさに共感が集まっている。',
      tags: ['生活', '家族', '我慢', '節約'],
      query: '生活 家族 我慢',
      queryUsed: '生活 家族 我慢 / 公開Web/RSS取得1',
      metrics: { rank: 1, recencyScore: 80, sourceWeight: 90 },
      sourceUrl: 'https://example.com/variation-1',
      observedAt: '2026-06-25T12:00:00+09:00',
      publishedAt: '2026-06-25T11:00:00+09:00',
    },
    {
      id: 'variation-2',
      categoryId: 'story-manga',
      source: 'Local RSS B',
      sourceType: 'public-web-rss',
      title: '駅の貼り紙ルール変更で通勤の不公平感が広がる',
      snippet: '通勤時の小さな不公平、見えない制度、言い返せない理不尽への反応が多い。',
      tags: ['仕事', '制度', '理不尽', '不公平'],
      query: '通勤 不公平 制度',
      queryUsed: '通勤 不公平 制度 / 公開Web/RSS取得2',
      metrics: { rank: 2, recencyScore: 77, sourceWeight: 88 },
      sourceUrl: 'https://example.com/variation-2',
      observedAt: '2026-06-25T12:05:00+09:00',
      publishedAt: '2026-06-25T10:30:00+09:00',
    },
    {
      id: 'variation-3',
      categoryId: 'story-manga',
      source: 'Local RSS C',
      sourceType: 'public-web-rss',
      title: '返信期限を過ぎた通知に後悔の声が集まる',
      snippet: '返せなかった一言、近い相手とのすれ違い、時間を戻したい後悔が読まれている。',
      tags: ['後悔', '人間関係', '未返信', '時間'],
      query: '未返信 後悔 関係',
      queryUsed: '未返信 後悔 関係 / 公開Web/RSS取得3',
      metrics: { rank: 3, recencyScore: 74, sourceWeight: 86 },
      sourceUrl: 'https://example.com/variation-3',
      observedAt: '2026-06-25T12:10:00+09:00',
      publishedAt: '2026-06-25T10:00:00+09:00',
    },
  ];
  const firstRound = buildReport({
    categoryId: 'story-manga',
    observations: evidenceSet,
    providerMode: 'fixture',
    variantSeed: 0,
  });
  const secondRound = buildReport({
    categoryId: 'story-manga',
    observations: evidenceSet,
    providerMode: 'fixture',
    variantSeed: 1,
  });

  assert.equal(firstRound.creativePlans.length, 3);
  assert.equal(new Set(firstRound.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl)).size, 3);
  assert.deepEqual(
    firstRound.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
    secondRound.creativePlans.map((plan) => plan.evidenceAnchor?.sourceUrl),
  );
  assert.notDeepEqual(
    firstRound.creativePlans.map((plan) => plan.opening),
    secondRound.creativePlans.map((plan) => plan.opening),
  );
  assert.equal(new Set(firstRound.creativePlans.map((plan) => plan.premise)).size, 3);
  assert.equal(new Set(firstRound.creativePlans.map((plan) => plan.creatorBrief.protagonist)).size, 3);
});

test('regenerated plans rebuild professional notes and story architecture per evidence anchor', () => {
  const evidenceSet = [
    {
      id: 'memo-1',
      categoryId: 'story-manga',
      source: 'Local RSS A',
      sourceType: 'public-web-rss',
      title: '冷蔵庫の買い忘れメモから家族の我慢が話題に',
      snippet: '家族の小さな我慢、節約疲れ、買い忘れの気まずさに共感が集まっている。',
      tags: ['生活', '家族', '我慢', '節約'],
      query: '生活 家族 我慢',
      queryUsed: '生活 家族 我慢 / 公開Web/RSS取得1',
      metrics: { rank: 1, recencyScore: 80, sourceWeight: 90 },
      sourceUrl: 'https://example.com/memo-1',
      observedAt: '2026-06-25T12:00:00+09:00',
      publishedAt: '2026-06-25T11:00:00+09:00',
    },
    {
      id: 'memo-2',
      categoryId: 'story-manga',
      source: 'Local RSS B',
      sourceType: 'public-web-rss',
      title: '駅の貼り紙ルール変更で通勤の不公平感が広がる',
      snippet: '通勤時の小さな不公平、見えない制度、言い返せない理不尽への反応が多い。',
      tags: ['仕事', '制度', '理不尽', '不公平'],
      query: '通勤 不公平 制度',
      queryUsed: '通勤 不公平 制度 / 公開Web/RSS取得2',
      metrics: { rank: 2, recencyScore: 77, sourceWeight: 88 },
      sourceUrl: 'https://example.com/memo-2',
      observedAt: '2026-06-25T12:05:00+09:00',
      publishedAt: '2026-06-25T10:30:00+09:00',
    },
    {
      id: 'memo-3',
      categoryId: 'story-manga',
      source: 'Local RSS C',
      sourceType: 'public-web-rss',
      title: '返信期限を過ぎた通知に後悔の声が集まる',
      snippet: '返せなかった一言、近い相手とのすれ違い、時間を戻したい後悔が読まれている。',
      tags: ['後悔', '人間関係', '未返信', '時間'],
      query: '未返信 後悔 関係',
      queryUsed: '未返信 後悔 関係 / 公開Web/RSS取得3',
      metrics: { rank: 3, recencyScore: 74, sourceWeight: 86 },
      sourceUrl: 'https://example.com/memo-3',
      observedAt: '2026-06-25T12:10:00+09:00',
      publishedAt: '2026-06-25T10:00:00+09:00',
    },
  ];
  const report = buildReport({
    categoryId: 'story-manga',
    observations: evidenceSet,
    providerMode: 'fixture',
    variantSeed: 0,
  });

  assert.equal(report.creativePlans.length, 3);
  assert.equal(
    new Set(
      report.creativePlans.map((plan) =>
        plan.craftNotes.find((note) => note.label === '読者維持エンジン')?.detail,
      ),
    ).size,
    3,
  );
  assert.equal(new Set(report.creativePlans.map((plan) => plan.storyArchitecture.gmc.goal)).size, 3);
  assert.equal(
    new Set(report.creativePlans.map((plan) => plan.storyArchitecture.mediumExecution.focus)).size,
    3,
  );
});

test('creative plans are actionable story briefs, not only analysis notes', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const plan = report.creativePlans[0];
  assert.ok(plan.creatorBrief);
  assert.match(plan.titleCandidates[0], new RegExp(plan.evidenceAnchor.focusTerm));
  assert.doesNotMatch(plan.titleCandidates[0], /分析|取得根拠|への反応/);
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

test('story and novel plans use emotional work titles instead of analysis labels', () => {
  const reactionObservation = {
    id: 'story-reaction-label-title',
    categoryId: 'story-manga',
    source: 'はてな 暮らし',
    sourceType: 'public-web-rss',
    title: '漫画・企画への反応の不安が広がる',
    snippet: 'SNSで漫画や企画への反応を見て、買い忘れと我慢が並ぶ冷蔵庫メモに共感が集まっている。',
    tags: ['漫画', '企画への反応', '買い忘れ', '我慢', '冷蔵庫メモ'],
    query: '漫画 企画への反応 買い忘れ 我慢',
    queryUsed: '漫画 企画への反応 買い忘れ 我慢 / 公開Web/RSS取得5',
    metrics: { rank: 1, recencyScore: 88, sourceWeight: 88, hatenaCount: 100 },
    sourceUrl: 'https://example.com/reaction-label',
    observedAt: '2026-06-25T18:13:24+09:00',
    publishedAt: '2026-06-25T18:00:00+09:00',
  };

  const story = buildReport({
    categoryId: 'story-manga',
    observations: [reactionObservation, ...PUBLIC_OBSERVATIONS],
    providerMode: 'fixture',
  });
  const novel = buildReport({
    categoryId: 'long-novel',
    observations: [reactionObservation, ...PUBLIC_OBSERVATIONS],
    providerMode: 'fixture',
  });
  const storyTitles = story.creativePlans.flatMap((plan) => plan.titleCandidates).join(' / ');
  const novelTitles = novel.creativePlans.flatMap((plan) => plan.titleCandidates).join(' / ');
  const combinedDeepAnalysis = JSON.stringify([story.deepAnalysis, novel.deepAnalysis]);

  assert.doesNotMatch(storyTitles, /漫画・企画|企画への反応|への反応|分析|取得根拠/);
  assert.doesNotMatch(novelTitles, /漫画・企画|企画への反応|への反応|分析|取得根拠/);
  assert.match(storyTitles, /冷蔵庫|買い忘れ|我慢|レシート|生活|メモ|棚|朝|夜/);
  assert.match(novelTitles, /冷蔵庫|買い忘れ|我慢|レシート|生活|メモ|棚|町|図書館|記録/);
  assert.doesNotMatch(combinedDeepAnalysis, /分析ラウンド\d/);
});

test('fiction focus terms ignore medium and region tags before choosing material words', () => {
  const metaTaggedObservation = {
    id: 'story-meta-tags',
    categoryId: 'story-manga',
    source: '公開Web/RSS',
    sourceType: 'public-web-rss',
    title: '暮らしの小さな我慢に共感が集まる',
    snippet: '冷蔵庫メモ、買い忘れ、我慢の回数など、生活の小さな違和感が話題になっている。',
    tags: ['漫画', '企画', '読者反応', '日本'],
    query: 'モヤモヤ 共感 SNS 話題',
    queryUsed: 'モヤモヤ 共感 SNS 話題 / 7d / general / public Web/RSS round 1',
    metrics: { rank: 1, recencyScore: 80, sourceWeight: 90 },
    sourceUrl: 'https://example.com/meta-tags',
    observedAt: '2026-06-25T18:52:33+09:00',
    publishedAt: '2026-06-25T18:00:00+09:00',
  };

  const report = buildReport({
    categoryId: 'story-manga',
    observations: [metaTaggedObservation, ...PUBLIC_OBSERVATIONS],
    providerMode: 'fixture',
  });

  assert.doesNotMatch(report.deepAnalysis.categoryInsight, /日本を|漫画を|企画を|読者反応/);
  assert.match(report.deepAnalysis.categoryInsight, /モヤモヤ|共感|我慢|生活|買い忘れ/);
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
