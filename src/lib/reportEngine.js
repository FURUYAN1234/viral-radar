import { CATEGORIES, getCategoryById } from './categories.js';
import { scoreCluster } from './scoring.js';

const AI_PENDING_MESSAGE = '未生成';
const AI_PROMPT_ONLY_MESSAGE = 'AIで新規生成してください。ここでは取得根拠だけを渡します。';

const CATEGORY_CLUSTER_MAP = {
  'story-manga': {
    label: '生活不安を可視化する逆転劇',
    tags: ['漫画', 'Web漫画', 'コミック', '読者反応', 'ページ上の異常表示', '生活不安', '評価不安'],
  },
  'short-video': {
    label: '1秒で不便を見せる生活改善ショート',
    tags: ['ショート動画', '短尺動画', '縦動画', '冒頭1秒', '字幕', '保存したい', 'コメント'],
  },
  'trend-explainer': {
    label: '短尺ドラマと推薦システムの視聴習慣',
    tags: ['解説', 'トレンド', '視聴習慣', '推薦システム', '短尺動画', '炎上回避'],
  },
  'long-novel': {
    label: '不可視の評価制度を読み解く長編連載',
    tags: ['Web小説', '小説', '読者維持', '長編', '伏線', '章末', '評価制度'],
  },
};

function selectObservationsForCategory(categoryId, observations) {
  const cluster = CATEGORY_CLUSTER_MAP[categoryId];
  if (!cluster) return observations.slice(0, 4);
  const strictMatches = observations.filter((observation) => observationBelongsToCategory(observation, categoryId));
  const matches =
    strictMatches.length >= 2
      ? strictMatches
      : observations.filter((observation) => observation.tags.some((tag) => cluster.tags.includes(tag)));
  return (matches.length > 0 ? matches : observations).slice(0, 5);
}

function isAcquiredObservation(observation) {
  return observation?.sourceType === 'public-web-rss';
}

function reportProviderMode(mode) {
  return mode === 'openai' || mode === 'gemini' ? mode : 'public-web-rss';
}

function observationBelongsToCategory(observation, categoryId) {
  if (observation.categoryId === categoryId) return true;
  const text = `${observation.title ?? ''} ${observation.snippet ?? ''} ${observation.query ?? ''} ${observation.queryUsed ?? ''} ${(observation.tags ?? []).join(' ')}`;
  const categoryPatterns = {
    'story-manga': /漫画|マンガ|コミック|縦読み|読み切り|連載第1話|Web漫画/,
    'short-video': /ショート動画|短尺動画|縦動画|TikTok|YouTube Shorts|冒頭1秒|字幕|保存/,
    'trend-explainer': /解説|視聴習慣|推薦システム|アルゴリズム|炎上回避|ショートドラマ/,
    'long-novel': /Web小説|小説|ライトノベル|なろう|読者維持|伏線|長編/,
  };
  return categoryPatterns[categoryId]?.test(text) ?? false;
}

function buildCluster(categoryId, observations) {
  const base = CATEGORY_CLUSTER_MAP[categoryId] ?? {
    label: '創作トレンド',
    tags: ['創作'],
  };
  const rawTags = [...new Set(observations.flatMap((item) => item.tags))].slice(0, 8);
  const topTags = displayTopTagsForCategory(categoryId, rawTags, observations);
  const label = buildEvidenceClusterLabel(categoryId, topTags, observations, base.label);
  const cluster = {
    id: `${categoryId}-cluster-1`,
    label,
    categoryId,
    evidenceCount: observations.length,
    sourceCount: new Set(observations.map((item) => item.source)).size,
    topQueries: observations.map((item) => item.queryUsed).slice(0, 4),
    topTags,
    creatorSignals: buildCreatorSignals(categoryId, observations, topTags),
    sourceSignals: buildSourceSignals(observations, rawTags, categoryId),
    tags: base.tags,
    observations,
    risks: [
      '実在の人物・企業・作品は取得根拠としてのみ表示し、本文・台本化はAI生成時に確認してください。',
      '公開RSS/検索フィードの取得結果は、制作前に人間が出典と時刻を確認してください。',
    ],
  };
  return {
    ...cluster,
    ...scoreCluster(cluster),
  };
}

function displayTopTagsForCategory(categoryId, rawTags, observations = []) {
  const evidenceTerms = observations.flatMap((observation) => evidenceTermsForObservation(observation));
  const filteredTags = (rawTags ?? [])
    .map(cleanFocusTerm)
    .filter((tag) => isUsableEvidenceTerm(tag))
    .filter((tag) => !isSourceTag(tag));
  const terms = uniqueList([...filteredTags, ...evidenceTerms]).slice(0, 6);
  return terms.length ? terms : ['取得語未確定'];
}

function buildEvidenceClusterLabel(categoryId, topTags, observations, fallbackLabel) {
  const focus = uniqueList([
    ...(topTags ?? []),
    ...observations.flatMap((observation) => evidenceTermsForObservation(observation)),
  ]).slice(0, 2);
  const categoryLabel = getCategoryById(categoryId)?.label ?? fallbackLabel;
  if (focus.length === 0) return `${categoryLabel} / 取得語未確定`;
  return `${categoryLabel} / 取得語: ${focus.join(' / ')}`;
}

function buildCreatorSignals(categoryId, observations = [], topTags = []) {
  const evidenceItems = planObservationsForCluster(observations, 3);
  if (evidenceItems.length === 0) {
    return (topTags.length ? topTags : ['取得語未確定']).slice(0, 3).map((tag, index) => ({
      label: `取得候補 ${index + 1}`,
      detail: `抽出語: ${tag} / AI判断: ${AI_PENDING_MESSAGE}`,
    }));
  }

  return evidenceItems.map((observation, index) => ({
    label: `取得根拠 ${index + 1}`,
    detail: evidenceDigestLine(observation, categoryId),
  }));
}

function buildSourceSignals(observations, topTags, categoryId) {
  if (!observations.length) return [];
  const grouped = new Map();
  for (const observation of observations) {
    const source = normalizeSourceName(observation.source);
    const current = grouped.get(source) ?? { count: 0, titles: [], queries: [] };
    current.count += 1;
    if (observation.title) current.titles.push(topicExcerpt(observation));
    if (observation.queryUsed || observation.query) current.queries.push(safeQueryForPlan(observation.queryUsed ?? observation.query));
    grouped.set(source, current);
  }
  return [...grouped.entries()].slice(0, 6).map(([label, data]) => ({
    label,
    detail: [
      `取得件数 ${data.count}`,
      `見出し ${uniqueList(data.titles).slice(0, 2).join(' / ') || '未取得'}`,
      `検索語 ${uniqueList(data.queries).slice(0, 2).join(' / ') || '未取得'}`,
    ].join(' / '),
  }));
}

function normalizeSourceName(value = '') {
  if (value.includes('Google Trends')) return 'Google Trends RSS';
  if (value.includes('Google News')) return 'Google News RSS';
  if (value.includes('はてな')) return value;
  if (value.includes('TikTok')) return 'TikTok';
  if (value.includes('YouTube')) return 'YouTube';
  if (value.includes('LINE')) return 'LINE';
  if (value.includes('Netflix')) return 'Netflix';
  if (value.includes('検索API')) return '検索API';
  return value.trim();
}

function isSourceTag(tag) {
  return /TikTok|YouTube|Google Trends|LINE|Netflix|検索API/.test(tag);
}


function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildEvidenceCards(cluster) {
  return cluster.observations.map((observation) => ({
    claim: topicExcerpt(observation),
    sourceUrls: [observation.sourceUrl],
    source: evidenceSourceForCategory(observation, cluster.categoryId),
    metricsSummary: summarizeMetrics(observation.metrics),
    timeWindow: observation.observedAt,
    whyItMatters: AI_PENDING_MESSAGE,
    ...interpretObservation(observation, cluster.categoryId),
    limitations: observation.sourceType === 'public-web-rss' ? '公開RSS/検索フィード由来です。制作前にリンク先を確認してください。' : '',
  }));
}


function evidenceSourceForCategory(observation, categoryId) {
  return normalizeSourceName(observation.source);
}


function interpretObservation(observation, categoryId) {
  return {
    observation: summarizeObservationForDisplay(observation),
    meaningForCreator: AI_PENDING_MESSAGE,
    creativeUse: AI_PENDING_MESSAGE,
  };
}

// 取得タイトルから、出典サフィックスや記号を落とした短い話題見出しを作る。
function topicExcerpt(observation) {
  let text = String(observation.title ?? observation.snippet ?? '').trim();
  text = text.replace(/\s*[-|｜–—]\s*[^-|｜–—]{1,24}$/u, ''); // 末尾の「 - 媒体名」を除去
  text = text.replace(/[【】「」『』（）()[\]"”“]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 28) text = `${text.slice(0, 28)}…`;
  return text || '世の中で動いた感情';
}

function summarizeObservationForDisplay(observation) {
  const title = String(observation.title ?? '').trim();
  const snippet = String(observation.snippet ?? '').trim();
  const tags = Array.isArray(observation.tags) ? observation.tags.slice(0, 4).join(' / ') : '';
  const parts = [
    title ? `見出し: ${title}` : '',
    snippet ? `概要: ${snippet}` : '',
    tags ? `タグ: ${tags}` : '',
    observation.queryUsed || observation.query ? `検索語: ${safeQueryForPlan(observation.queryUsed ?? observation.query)}` : '',
  ].filter(Boolean);
  return parts.join(' / ') || '取得した公開Web/RSSの話題';
}


function summarizeMetrics(metrics = {}) {
  const parts = [];
  if (metrics.views) parts.push(`再生 ${metrics.views.toLocaleString('ja-JP')}`);
  if (metrics.likes) parts.push(`高評価 ${metrics.likes.toLocaleString('ja-JP')}`);
  if (metrics.comments) parts.push(`コメント ${metrics.comments.toLocaleString('ja-JP')}`);
  if (metrics.shares) parts.push(`共有 ${metrics.shares.toLocaleString('ja-JP')}`);
  if (metrics.rank) parts.push(`取得順位 ${metrics.rank}`);
  if (metrics.recencyScore) parts.push(`新しさ指標 ${metrics.recencyScore}`);
  if (metrics.sourceWeight) parts.push(`取得元重み ${metrics.sourceWeight}`);
  if (metrics.coOccurrenceScore) parts.push(`共起 ${metrics.coOccurrenceScore}`);
  if (metrics.categoryMatchScore) parts.push(`検索角度一致 ${metrics.categoryMatchScore}`);
  if (metrics.hatenaHotEntryScore) parts.push(`はてな反応 ${metrics.hatenaHotEntryScore}`);
  if (metrics.sourceDiversity) parts.push(`取得元数 ${metrics.sourceDiversity}`);
  return parts.join(' / ') || '公開RSS取得';
}

function buildDeepAnalysis(categoryId, cluster, variantSeed = 0) {
  return {
    status: 'awaiting-ai',
    source: 'provider-required',
    surfacePattern: [],
    humanMotivation: [],
    narrativeMechanism: [],
    productionMechanism: [],
    opportunityGap: [],
    categoryInsight: AI_PENDING_MESSAGE,
  };
}

function buildCategoryReasons(categoryId, cluster = null) {
  return [];
}

const PLAN_BATCH_SIZE = 3;

function addDraftPrompt(plan, categoryId, cluster) {
  const creatorBrief = buildCreatorBrief(plan, categoryId);
  const retentionDesign = null;
  const storyArchitecture = buildAiDesignPlaceholder('storyArchitecture');
  const craftNotes = [];

  const enrichedPlan = {
    ...plan,
    creatorBrief,
    storyArchitecture,
    craftNotes,
    retentionDesign,
    aiDraftPrompt: buildPlanDraftPrompt(plan, categoryId, cluster),
  };
  return enrichedPlan;
}

export function buildPlanDraftPrompt(plan, categoryId, cluster = {}) {
  const primaryTitle = plan.titleCandidates?.[0] ?? '';
  const brief = plan.creatorBrief ?? {};
  const promptLines = [
    'あなたは日本語コンテンツの商業創作者です。',
    `以下の取得根拠と案の要点を読み、${plan.formatLabel}として読者・視聴者が続きを見たくなる本文または台本をAIで新規生成してください。`,
    `カテゴリ: ${getCategoryById(categoryId)?.label ?? categoryId}`,
    `使用タイトル: ${primaryTitle}`,
    '取得根拠:',
    ...evidencePromptLines(plan.evidenceAnchor),
    '案の要点:',
    `- 主人公: ${brief.protagonist ?? ''}`,
    `- 舞台: ${brief.setting ?? ''}`,
    `- 最初の事件: ${brief.incitingIncident ?? ''}`,
    `- 対立: ${brief.conflict ?? ''}`,
    `- 最後に選ばせること: ${brief.choice ?? ''}`,
    `- 読後感: ${brief.payoff ?? ''}`,
    plan.premise ? `- 前提: ${plan.premise}` : '',
    plan.exampleDetail ? `- 初回具体例: ${plan.exampleDetail}` : '',
    plan.opening ? `- 冒頭例: ${plan.opening}` : '',
    Array.isArray(plan.outline) && plan.outline.length ? `- 本文・台本の流れ: ${plan.outline.join(' / ')}` : '',
    '生成してほしいもの:',
    '- 使用タイトルから始まる本文または台本',
    '- 案の主人公または語り手を中心にした場面',
    '- 案の舞台、最初の出来事、対立、選択、結末または締め',
    '- プロ向け設計メモ',
    '- 物語・台本設計',
    '厳守:',
    '- 使用タイトル、主人公、舞台、最初の事件、対立、選択、読後感を別案へ置き換えない',
    '- 名前、年齢、職業、場所、事件を勝手に変更しない',
    '禁止:',
    '- 固定テンプレ、単語差し替え、全案で同じ文型、ラベルだけ違う同文',
    '- ローカル下書きの丸写し',
    '- 実在人物、企業、作品、クリエイター、既存キャラクターを物語の主役・黒幕・告発対象・続編対象にすること',
    `外部根拠の扱い: ${externalSignalInstruction(categoryId)}`,
    `安全条件: ${(plan.riskNotes ?? []).join(' / ')}`,
    `取得クラスタ: ${cluster.label ?? ''}`,
  ];
  return promptLines.filter(Boolean).join('\n');
}

function buildAiDesignPlaceholder(section) {
  return {
    status: 'awaiting-ai',
    source: 'provider-required',
    section,
    notes: [],
  };
}

function externalSignalInstruction(categoryId) {
  return '実在の人物・企業・作品・サービス名は取得根拠としてのみ扱う。本文・台本では主役、黒幕、告発対象、続編対象にせず、必要な場合はAI生成時に架空名へ置き換える。';
}


function buildCreatorBrief(plan, categoryId) {
  if (plan.creatorBrief) return plan.creatorBrief;
  return {
    protagonist: AI_PENDING_MESSAGE,
    setting: AI_PENDING_MESSAGE,
    incitingIncident: AI_PENDING_MESSAGE,
    conflict: AI_PENDING_MESSAGE,
    choice: AI_PENDING_MESSAGE,
    payoff: AI_PENDING_MESSAGE,
  };
}


function buildBeginnerGuide(categoryId, primaryPlan, cluster) {
  return null;
}


function buildCategoryFitCards(categoryId, cluster) {
  return [];
}

function regeneratePlans(plans, seed = 1, cluster = null) {
  if (!Array.isArray(plans) || plans.length === 0) return [];
  const categoryId = plans[0]?.id?.split('-').slice(0, 2).join('-') ?? 'story-manga';
  const numericSeed = Number(seed) || 0;
  const observations = planObservationsForCluster(cluster?.observations, PLAN_BATCH_SIZE);
  if (observations.length === 0) return [];
  const searchFrames = Array.from({ length: PLAN_BATCH_SIZE }).map((_, index) =>
    buildSearchDrivenFrame(categoryId, observations[index], numericSeed, index),
  );

  return Array.from({ length: PLAN_BATCH_SIZE }).map((_, index) => {
    const basePlan = plans[index % plans.length];
    const frame = searchFrames[index];
    return {
      ...basePlan,
      id: `${categoryId}-search-${seed}-${index + 1}-${slugForId(frame.titleCandidates[0])}`,
      titleCandidates: frame.titleCandidates,
      reasonToWin: frame.reasonToWin,
      audiencePromise: frame.audiencePromise,
      emotionalHook: frame.emotionalHook,
      premise: frame.premise,
      exampleDetail: frame.exampleDetail,
      outline: frame.outline,
      opening: frame.opening,
      productionNotes: frame.productionNotes,
      differentiation: frame.differentiation,
      riskNotes: frame.riskNotes,
      draftInstructions: frame.draftInstructions,
      evidenceAnchor: frame.evidenceAnchor,
      creatorBrief: {
        protagonist: frame.protagonist,
        setting: frame.setting,
        incitingIncident: frame.incitingIncident,
        conflict: frame.conflict,
        choice: frame.choice,
        payoff: frame.payoff,
      },
    };
  });
}

function buildSearchDrivenFrame(categoryId, observation, seed, index) {
  const terms = evidenceTermsForObservation(observation ?? {}).slice(0, 5);
  const titleSeed = terms[0] || topicExcerpt(observation) || `取得根拠 ${index + 1}`;
  const titleCandidates = uniqueList([
    `制作案: ${titleSeed}`,
    `取得根拠 ${index + 1}`,
    getCategoryById(categoryId)?.label ?? categoryId,
  ]);
  const evidenceAnchor = buildEvidenceAnchorDigest(observation, categoryId, terms, index);
  return {
    titleCandidates,
    protagonist: AI_PENDING_MESSAGE,
    setting: AI_PENDING_MESSAGE,
    incitingIncident: AI_PENDING_MESSAGE,
    conflict: AI_PENDING_MESSAGE,
    choice: AI_PENDING_MESSAGE,
    payoff: AI_PENDING_MESSAGE,
    reasonToWin: [evidenceDigestLine(observation, categoryId)],
    audiencePromise: AI_PENDING_MESSAGE,
    emotionalHook: AI_PENDING_MESSAGE,
    premise: AI_PENDING_MESSAGE,
    exampleDetail: AI_PENDING_MESSAGE,
    outline: [AI_PENDING_MESSAGE],
    opening: AI_PENDING_MESSAGE,
    productionNotes: ['実在名は根拠としてのみ扱い、本文・台本の判断はAI応答で新規生成する。'],
    differentiation: AI_PENDING_MESSAGE,
    riskNotes: ['実在人物や企業への告発にしない', '固定テンプレや単語差し替えで埋めない'],
    draftInstructions: AI_PROMPT_ONLY_MESSAGE,
    evidenceAnchor,
  };
}


function uniqueList(items) {
  const seen = new Set();
  return (items ?? []).filter((item) => {
    const value = String(item ?? '').trim();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}


function compactEvidenceText(value, maxLength = 56) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function observationEvidenceText(observation) {
  return [
    observation?.title,
    observation?.snippet,
    observation?.queryUsed,
    observation?.query,
    ...(Array.isArray(observation?.tags) ? observation.tags : []),
  ]
    .filter(Boolean)
    .join(' ');
}

function planObservationsForCluster(observations, limit = PLAN_BATCH_SIZE) {
  const pool = Array.isArray(observations) ? observations.filter(Boolean) : [];
  if (pool.length === 0) return [];
  const seen = new Set();
  const stablePool = pool.filter((observation) => {
    const key = observation?.sourceUrl || observation?.id || observation?.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const source = stablePool.length > 0 ? stablePool : pool;
  return Array.from({ length: limit }).map((_, index) => source[index % source.length]);
}


function focusTermsFromValues(values) {
  return uniqueList(
    values
      .flatMap((value) => String(value ?? '').split(/[\s、,／/・]+/))
      .map(cleanFocusTerm)
      .filter((value) => isUsableEvidenceTerm(value)),
  ).slice(0, 2);
}

function cleanFocusTerm(value) {
  return compactEvidenceText(value, 14)
    .replace(/への反応|の反応|周辺の反応|反応/g, '')
    .replace(/\s*[-–—]\s*[^-–—]{1,24}$/u, '')
    .replace(/public Web\/RSS round \d+/gi, '')
    .replace(/公開Web\/RSS取得\d*/g, '')
    .replace(/[【】「」『』（）()[\]"”“]/g, '')
    .trim();
}

function isMetaFocusTerm(value) {
  const normalized = String(value ?? '').trim();
  return (
    /^(漫画|まんが|マンガ|小説|動画|ショート|ショート動画|縦読み|4コマ|企画|解説|トレンド|話題|カテゴリ|媒体|対象|読者|視聴者|公開Web|RSS|Web|検索|取得|分析|ニュース|SNS|note|GitHub|日本|国内|JP|JAPAN|public|general|round)$/i.test(
      normalized,
    ) || /^\d+d?$/.test(normalized)
  );
}

const EVIDENCE_TERM_STOPWORDS = new Set([
  'ニュース',
  '記事',
  '話題',
  '議論',
  '共感',
  '反応',
  '賛否',
  '公開',
  '取得',
  '検索',
  '根拠',
  '周辺',
  '不安',
  '理由',
  '方法',
  'まとめ',
  '速報',
  '公式',
  '今年',
  '今日',
  '明日',
  '昨日',
  '今回',
  '複数',
  '日本',
  '国内',
  '海外',
  '男性',
  '女性',
  '自分',
  '相手',
  '公開Web',
  'Web',
  'RSS',
]);


function evidenceTermsForObservation(observation = {}) {
  const tagTerms = focusTermsFromValues(Array.isArray(observation.tags) ? observation.tags : []);
  const textTerms = [
    observation.title,
    observation.snippet,
    observation.queryUsed,
    observation.query,
  ].flatMap(extractEvidenceTerms);
  return uniqueList([...tagTerms, ...textTerms])
    .filter(isUsableEvidenceTerm)
    .slice(0, 6);
}


function extractEvidenceTerms(value) {
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/\s*[-–—]\s*(ABEMA|Yahoo!ニュース|Google News|Bing News|ITmedia|NHK|朝日新聞|読売新聞|毎日新聞|産経ニュース|PR TIMES|ねとらぼ|Impress Watch|CNET Japan|THE ANSWER).*$/iu, ' ')
    .replace(/public Web\/RSS round \d+/gi, ' ')
    .replace(/公開Web\/RSS取得\d*/g, ' ')
    .replace(/\b\d+d\b/gi, ' ')
    .replace(/[「」『』【】（）()[\]"”“]/g, ' ');
  const alnumTerms = text.match(/[A-Za-z]*\d+[A-Za-z0-9０-９]*/g) ?? [];
  const compactTerms = text.match(/[一-龯々〆ヵヶァ-ヴーA-Za-z0-9０-９]{2,16}/g) ?? [];
  return uniqueList([...alnumTerms, ...compactTerms].map(cleanFocusTerm)).filter(isUsableEvidenceTerm);
}

function isUsableEvidenceTerm(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length < 2) return false;
  if (isMetaFocusTerm(normalized)) return false;
  if (isSourceTag(normalized)) return false;
  if (EVIDENCE_TERM_STOPWORDS.has(normalized)) return false;
  if (/^(Google|Bing|Yahoo|TikTok|YouTube|LINE|Netflix|RSS|Web)$/i.test(normalized)) return false;
  if (/^[\d０-９]+$/.test(normalized) && normalized.length < 3) return false;
  return true;
}


function buildEvidenceAnchorDigest(observation, categoryId, terms = [], index = 0) {
  return {
    id: observation?.id ?? `evidence-${index + 1}`,
    source: normalizeSourceName(observation?.source ?? '公開Web/RSS'),
    sourceUrl: observation?.sourceUrl ?? '',
    observedAt: observation?.observedAt ?? '',
    publishedAt: observation?.publishedAt ?? '',
    title: compactEvidenceText(observation?.title ?? observation?.snippet ?? `取得根拠 ${index + 1}`, 80),
    query: safeQueryForPlan(observation?.queryUsed ?? observation?.query),
    terms: terms.length ? terms : evidenceTermsForObservation(observation).slice(0, 5),
    metricsSummary: summarizeMetrics(observation?.metrics),
  };
}

function evidenceDigestLine(observation, categoryId) {
  const digest = buildEvidenceAnchorDigest(
    observation,
    categoryId,
    evidenceTermsForObservation(observation).slice(0, 5),
  );
  const observedAt = digest.observedAt ? formatShortDateTime(digest.observedAt) : '未取得';
  return [
    `出典: ${digest.source}`,
    `観測: ${observedAt}`,
    `抽出語: ${digest.terms.join(' / ') || 'なし'}`,
    `見出し: ${digest.title}`,
  ].join(' / ');
}

function evidencePromptLines(evidenceAnchor = {}) {
  const observedAt = evidenceAnchor.observedAt ? formatShortDateTime(evidenceAnchor.observedAt) : '未取得';
  return [
    `- 出典: ${evidenceAnchor.source ?? '公開Web/RSS'}`,
    `- 見出し: ${evidenceAnchor.title ?? '未設定'}`,
    `- 検索語: ${evidenceAnchor.query ?? '未設定'}`,
    `- 観測時刻: ${observedAt}`,
    `- 指標: ${evidenceAnchor.metricsSummary ?? '未設定'}`,
    `- 抽出語: ${(evidenceAnchor.terms ?? []).join(' / ') || 'なし'}`,
    evidenceAnchor.sourceUrl ? `- URL: ${evidenceAnchor.sourceUrl}` : '',
  ].filter(Boolean);
}


function safeQueryForPlan(query) {
  return String(query ?? '')
    .replace(/\s*\/\s*公開Web\/RSS取得\d*/g, '')
    .replace(/[【】「」『』（）()[\]"”“]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 36) || '公開Web/RSS';
}

function formatShortDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}/${byType.month}/${byType.day} ${byType.hour}:${byType.minute}`;
}


function slugForId(value) {
  return String(value ?? 'plan')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'plan';
}

function planForCategory(categoryId, cluster, variantSeed = 0) {
  const properNounUsage = properNounUsageForCategory(categoryId);
  const safeFlags = [
    {
      severity: 'safe',
      note: '実在サービス名は取得根拠としてのみ扱い、本文・台本の主役や告発対象にしない前提です。',
    },
  ];
  const categoryPlans = planSkeletonsForCategory(categoryId, properNounUsage, safeFlags);
  const acquiredObservations = (cluster?.observations ?? []).filter(isAcquiredObservation);
  return regeneratePlans(categoryPlans, variantSeed, {
    ...cluster,
    observations: acquiredObservations,
  }).map((plan) => addDraftPrompt({ ...plan, whyNow: cluster.label }, categoryId, cluster));
}

function planSkeletonsForCategory(categoryId, properNounUsage, sourceSimilarityFlags) {
  const skeletons = {
    'story-manga': [
      ['story-manga-frame-1', 'ストーリー漫画', '連載第1話'],
      ['story-manga-frame-2', 'ストーリー漫画', '読み切り'],
      ['story-manga-frame-3', 'ストーリー漫画', '縦読み漫画'],
    ],
    'short-video': [
      ['short-video-frame-1', '短尺動画', '30秒ショート'],
      ['short-video-frame-2', '短尺動画', '45秒ショート'],
      ['short-video-frame-3', '短尺動画', 'シリーズ初回'],
    ],
    'trend-explainer': [
      ['trend-explainer-frame-1', '解説動画', '7分解説'],
      ['trend-explainer-frame-2', '解説動画', '章立て解説'],
      ['trend-explainer-frame-3', '解説動画', '制作者向け分析'],
    ],
    'long-novel': [
      ['long-novel-frame-1', '長編小説', '第1章'],
      ['long-novel-frame-2', '中編小説', '中編小説'],
      ['long-novel-frame-3', '長編小説', '連作長編'],
    ],
  };
  return (skeletons[categoryId] ?? skeletons['story-manga']).map(([id, targetFormat, formatLabel]) => ({
    id,
    targetFormat,
    formatLabel,
    properNounUsage,
    sourceSimilarityFlags,
  }));
}

function properNounUsageForCategory(categoryId) {
  return [
    '実在の人物・企業・作品・サービス名は取得根拠としてのみ扱う',
    '本文・台本では主役、黒幕、告発対象、続編対象にしない',
    '本文・台本・制作判断は、取得根拠だけで確定扱いしない',
  ];
}

export function buildReport({
  categoryId,
  timeWindow = '7d',
  audience = 'general',
  observations = [],
  providerMode = 'public-web-rss',
  variantSeed = 0,
} = {}) {
  const category = getCategoryById(categoryId) ?? CATEGORIES[0];
  const acquiredObservations = (Array.isArray(observations) ? observations : []).filter(isAcquiredObservation);
  const selectedObservations = selectObservationsForCategory(category.id, acquiredObservations);
  const cluster = buildCluster(category.id, selectedObservations);
  const evidenceCards = buildEvidenceCards(cluster);
  const creativePlans = planForCategory(category.id, cluster, variantSeed);

  return {
    reportId: `vr-${category.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    locale: 'JP',
    timeWindow,
    audience,
    providerMode: reportProviderMode(providerMode),
    category,
    sourcesUsed: [...new Set(selectedObservations.map((item) => item.source))],
    trendClusters: [cluster],
    evidenceCards,
    deepAnalysis: buildDeepAnalysis(category.id, cluster, variantSeed),
    categoryFitCards: buildCategoryFitCards(category.id, cluster),
    categoryReasons: buildCategoryReasons(category.id, cluster),
    beginnerGuide: buildBeginnerGuide(category.id, creativePlans[0], cluster),
    creativePlans,
    confidenceSummary: {
      label: '取得根拠の確度',
      score: cluster.confidenceScore,
      explanation:
        selectedObservations.length > 0
          ? '公開Web/RSSの取得結果を表示しています。'
          : '公開Web/RSSの取得結果がまだありません。',
    },
    limitations: [
      '公開Web/RSSの取得結果は制作前に人間が出典確認してください。',
      '実在の人物・企業・作品を架空ストーリーの主役や告発対象にしない前提で、AI生成時に変換してください。',
    ],
  };
}
