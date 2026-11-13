// Public X data only. Missing metrics stay absent, not zero. No credentials here.
export const X_DEFAULTS = Object.freeze({ query: '', period: '24h', sortOrder: 'relevancy', maxResults: 10, includeAuthors: false, excludeReplies: true });
const QUERIES = {
  'story-manga': ['(人間関係 OR 日常の悩み)', '(仕事 OR 理不尽 OR 本音)', '(家族 OR すれ違い OR 後悔)', '(友情 OR 孤独 OR 助け合い)', '(生活 OR お金 OR 工夫)', '(世代 OR 違和感 OR 選択)'],
  'short-video': ['(生活の工夫 OR 時短)', '(あるある OR 失敗談)', '(発見 OR 驚き)'],
  'trend-explainer': ['(ニュース OR 議論)', '(社会 OR 制度 OR 疑問)', '(誤解 OR 仕組み)'],
  'long-novel': ['(価値観 OR 葛藤)', '(人生 OR 後悔 OR 選択)', '(家族 OR 秘密 OR 友情)'],
};
export function xSearchOptions(input = {}) {
  const options = { ...X_DEFAULTS, ...input };
  const categoryId = Object.hasOwn(QUERIES, options.categoryId) ? options.categoryId : 'story-manga';
  const variants = QUERIES[categoryId];
  const round = Math.max(0, Math.floor(Number(options.searchSeed) || 0));
  const query = String(options.query ?? '').trim() || variants[round % variants.length];
  if (query.length > 440 || /[\u0000-\u001f\u007f]/u.test(query)) throw new Error('Xの検索語は440文字以内の1行で入力してください。');
  if (!['24h', '7d'].includes(options.period)) throw new Error('X検索の期間は24時間または7日です。');
  if (!['relevancy', 'recency'].includes(options.sortOrder)) throw new Error('Xの並び順は関連度順または新着順です。');
  if (![10, 25, 50, 100].includes(Number(options.maxResults))) throw new Error('Xの取得上限は10・25・50・100件から選んでください。');
  return { categoryId, query, period: options.period, sortOrder: options.sortOrder, maxResults: Number(options.maxResults), includeAuthors: options.includeAuthors === true, excludeReplies: options.excludeReplies !== false };
}
export function xQuery(options) { return `(${options.query}) lang:ja -is:retweet${options.excludeReplies ? ' -is:reply' : ''}`; }
export function xCostEstimate(options) { return Number((options.maxResults * (0.005 + (options.includeAuthors ? 0.01 : 0))).toFixed(3)); }
const finiteCount = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function normalizeXResponse(payload, options, observedAt = new Date().toISOString()) {
  if (!payload || (!Array.isArray(payload.data) && payload.meta?.result_count !== 0)) throw new Error('X APIの投稿データを読み取れませんでした。');
  const users = new Map((payload.includes?.users ?? []).map(user => [user.id, user]));
  const posts = (payload.data ?? []).slice(0, options.maxResults);
  const seen = new Set();
  const observations = [];
  for (const post of posts) {
    if (!post || typeof post.id !== 'string' || !/^\d{1,20}$/.test(post.id) || typeof post.text !== 'string' || !post.text.trim() || seen.has(post.id)) continue;
    seen.add(post.id);
    const author = users.get(post.author_id);
    const metrics = {};
    for (const [key, target] of Object.entries({ like_count: 'likes', retweet_count: 'reposts', reply_count: 'replies', quote_count: 'quotes', impression_count: 'impressions', bookmark_count: 'bookmarks' })) {
      if (finiteCount(post.public_metrics?.[key])) metrics[target] = post.public_metrics[key];
    }
    if (finiteCount(author?.public_metrics?.followers_count)) metrics.followers = author.public_metrics.followers_count;
    if (['likes', 'reposts', 'replies', 'quotes'].every(key => Object.hasOwn(metrics, key))) {
      metrics.reactions = metrics.likes + metrics.reposts + metrics.replies + metrics.quotes;
      if (metrics.impressions > 0) metrics.reactionsPer100Views = 100 * metrics.reactions / metrics.impressions;
      if (metrics.followers > 0) metrics.reactionsPer1000Followers = 1000 * metrics.reactions / metrics.followers;
    }
    const published = Date.parse(post.created_at);
    if (Number.isFinite(published) && published <= Date.parse(observedAt)) metrics.ageHours = (Date.parse(observedAt) - published) / 3_600_000;
    observations.push({
      id: `x-${post.id}`, postId: post.id, source: 'X API', sourceType: 'x-api',
      title: post.text.slice(0, 100), snippet: post.note_tweet?.text || post.text,
      tags: ['X'], query: options.query, queryUsed: `${xQuery(options)} / ${options.period} / ${options.sortOrder}`,
      categoryId: options.categoryId, metrics, locale: 'ja', sourceUrl: `https://x.com/i/status/${post.id}`,
      authorOrChannel: author?.username ? `@${author.username}` : 'X投稿（投稿者情報未取得）',
      observedAt, publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : '',
    });
  }
  if (posts.length && !observations.length) throw new Error('X APIの応答に有効な投稿がありませんでした。');
  return { ok: true, observations, query: xQuery(options), observedAt, period: options.period, sortOrder: options.sortOrder,
    returnedCount: posts.length, usableCount: observations.length, maxResults: options.maxResults,
    estimatedMaximumUsd: xCostEstimate(options), hasMore: Boolean(payload.meta?.next_token),
    warning: payload.errors?.length ? 'X APIから一部データの取得エラーが返りました。未取得の項目は補完していません。' : '' };
}
export function applyXHistory(observations, history) {
  return observations.map(observation => {
    const current = { ...observation, metrics: { ...observation.metrics } };
    const prior = history.get(current.id);
    const elapsedHours = prior ? (Date.parse(current.observedAt) - Date.parse(prior.observedAt)) / 3_600_000 : 0;
    if (elapsedHours >= 1 / 60 && Number.isFinite(prior?.reactions) && Number.isFinite(current.metrics.reactions) && current.metrics.reactions >= prior.reactions) {
      current.metrics.reactionIncreasePerHour = (current.metrics.reactions - prior.reactions) / elapsedHours;
      current.metrics.observationIntervalHours = elapsedHours;
    }
    history.set(current.id, { observedAt: current.observedAt, reactions: current.metrics.reactions });
    if (history.size > 500) history.delete(history.keys().next().value);
    return current;
  });
}
export function formatXMetrics(metrics = {}) {
  const parts = [];
  for (const [key, label] of Object.entries({ likes: 'いいね', reposts: 'リポスト', replies: '返信', quotes: '引用', bookmarks: 'ブックマーク', impressions: '表示回数', followers: 'フォロワー' })) {
    if (Number.isFinite(metrics[key])) parts.push(`${label} ${metrics[key].toLocaleString('ja-JP')}`);
  }
  if (Number.isFinite(metrics.reactionsPer100Views)) parts.push(`表示100回あたり反応 ${metrics.reactionsPer100Views.toFixed(2)}（人数・確率ではありません）`);
  if (Number.isFinite(metrics.reactionIncreasePerHour)) parts.push(`反応の増加 ${metrics.reactionIncreasePerHour.toFixed(1)}/時（${(metrics.observationIntervalHours * 60).toFixed(0)}分間の観測差）`);
  else parts.push('増加速度は未計測');
  return parts.join(' / ');
}
export function xEvidenceScore(observation) {
  // Selection heuristic, not a probability or cross-platform popularity score.
  const m = observation.metrics ?? {};
  if (!Number.isFinite(m.reactions)) return 0;
  const volume = Math.min(1, Math.log1p(m.reactions) / Math.log1p(1000));
  const scale = m.followers > 0 ? Math.min(1, Math.log1p(m.reactions * 1000 / m.followers) / Math.log1p(100)) : volume;
  const age = Number.isFinite(m.ageHours) ? 1 / (1 + m.ageHours / 24) : 0;
  return Math.round(100 * (0.4 * volume + 0.4 * scale + 0.2 * age));
}
