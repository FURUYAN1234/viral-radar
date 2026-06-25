const CATEGORY_QUERIES = {
  'story-manga': [
    'モヤモヤ 共感 SNS 話題',
    '人間関係 すれ違い 共感 話題',
    '理不尽 あるある 共感 SNS',
    '日常 違和感 共感 話題',
    '言えなかった本音 共感 SNS',
    '家族 仕事 もやもや 共感 話題',
  ],
  'short-video': [
    '一瞬で共感 あるある SNS 話題',
    '失敗 あるある 共感 SNS',
    '生活 工夫 時短 話題 SNS',
    'やってしまった あるある 共感',
    '思わず保存 役立つ 話題 SNS',
    'スカッと 共感 SNS 話題',
  ],
  'trend-explainer': [
    'なぜ 話題 SNS 議論 背景',
    '炎上 議論 背景 SNS',
    'ネット現象 注目 議論',
    'モヤる 賛否 議論 SNS 話題',
    'みんな誤解 仕組み 話題',
    '実は 知らなかった 話題 議論',
  ],
  'long-novel': [
    '価値観 変化 議論 世の中',
    '人生 後悔 選択 共感 話題',
    '社会 不条理 議論 共感',
    '生き方 葛藤 共感 話題',
    '世代 ギャップ 議論 共感',
    '報われない 努力 共感 議論',
  ],
};

const STORY_MATERIAL_TERMS = [
  '共感',
  '感情',
  '泣い',
  'モヤ',
  'もや',
  '理不尽',
  '炎上',
  '議論',
  '賛否',
  '響',
  '衝突',
  '後悔',
  '葛藤',
  'スカッと',
  'あるある',
  '本音',
  '違和感',
  '不安',
  '悩み',
  '怒り',
  '嫉妬',
  '孤独',
  '家族',
  '夫婦',
  '親',
  '子育て',
  '恋愛',
  '友人',
  '職場',
  '上司',
  '同僚',
  '世代',
  '人間関係',
  'すれ違い',
  '結婚',
  '離婚',
  '介護',
  '学校',
  '近所',
  '仕事',
  '転職',
  'お金',
  '家計',
  '節約',
  '貧困',
  '格差',
  '生き方',
  '価値観',
  '世の中',
  '社会',
  '人生',
  '暮らし',
  '生活',
  '話題',
  'sns',
  'ネット',
  '人間',
  '変化',
  '注目',
];

const ENTERTAINMENT_WORK_TERMS = [
  '漫画',
  'マンガ',
  'コミック',
  'アニメ',
  '映画',
  'ドラマ',
  '小説',
  '書籍',
  '読書',
  '原作',
  '作品',
  '連載',
  '配信開始',
  '発売',
  'レビュー',
  '声優',
  '俳優',
  '女優',
  '主演',
  '監督',
  '舞台',
  'キャスト',
];

const PUBLIC_CORS_FETCHERS = [
  (url) => url,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
];

export function buildTrendSearchUrl({ categoryId, timeWindow, audience, searchSeed }) {
  const params = new URLSearchParams({
    categoryId,
    timeWindow,
    audience,
    searchSeed: String(searchSeed),
  });
  return `/api/trend-search?${params.toString()}`;
}

export async function searchTrendObservations({
  categoryId = 'story-manga',
  timeWindow = '7d',
  audience = 'general',
  searchSeed = 0,
  fetchImpl = fetch,
} = {}) {
  const sources = trendSourcesFor(categoryId, searchSeed);
  const results = await Promise.allSettled(sources.map((source) => fetchTrendSource(source, fetchImpl)));
  const succeeded = results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value);
  const pool = enrichTrendMetrics(buildCategoryRelevantPool(succeeded));
  const observations = selectDiverseTrendItems(pool, searchSeed)
    .slice(0, 8)
    .map((item, index) =>
      toTrendObservation(item, {
        audience,
        categoryId,
        index,
        searchSeed,
        timeWindow,
      }),
    );

  if (observations.length === 0) {
    throw new Error('public Web/RSS 取得に失敗しました。実データを取得できないため、分析結果は作成しません。');
  }

  return {
    ok: true,
    query: [...new Set(sources.map((source) => source.query))].join(' / '),
    sourcesAttempted: sources.map((source) => source.label),
    sourcesSucceeded: [...new Set(observations.map((observation) => observation.source))],
    observations,
  };
}

function trendSourcesFor(categoryId, seed = 0) {
  const list = CATEGORY_QUERIES[categoryId] ?? CATEGORY_QUERIES['story-manga'];
  const offset = Math.abs(Number(seed) || 0) % list.length;
  const rotatedQueries = [list[offset], list[(offset + 1) % list.length], list[(offset + 2) % list.length]];
  const newsSearchSources = rotatedQueries.flatMap((query) => [
    {
      label: 'Google News RSS',
      query,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`,
      limit: 8,
      weight: 92,
      categoryScoped: true,
    },
    {
      label: 'Bing News RSS',
      query,
      url: `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=ja-JP&cc=JP`,
      limit: 8,
      weight: 88,
      categoryScoped: true,
    },
  ]);
  return [
    ...newsSearchSources,
    {
      label: 'Google Trends 急上昇',
      query: '日本 日次急上昇ワード',
      url: 'https://trends.google.co.jp/trending/rss?geo=JP',
      limit: 12,
      weight: 95,
    },
    {
      label: 'Yahoo 国内トピック',
      query: 'いま国内で起きている話題',
      url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml',
      limit: 10,
      weight: 86,
    },
    {
      label: 'Yahoo ライフ',
      query: '暮らし 家族 お金 仕事の話題',
      url: 'https://news.yahoo.co.jp/rss/topics/life.xml',
      limit: 10,
      weight: 90,
    },
    {
      label: 'はてな 世の中',
      query: 'ネットで議論されている世の中の話題',
      url: 'https://b.hatena.ne.jp/hotentry/social.rss',
      limit: 10,
      weight: 90,
    },
    {
      label: 'はてな 暮らし',
      query: 'ネットで共感されている暮らしの話題',
      url: 'https://b.hatena.ne.jp/hotentry/life.rss',
      limit: 10,
      weight: 88,
    },
    {
      label: 'はてな 総合',
      query: 'ネットで注目されている話題',
      url: 'https://b.hatena.ne.jp/hotentry.rss',
      limit: 10,
      weight: 80,
    },
  ];
}

async function fetchTrendSource(source, fetchImpl) {
  const xml = await fetchTextWithCorsFallback(source.url, fetchImpl);
  return parseRssItems(xml)
    .slice(0, source.limit)
    .map((item, index) => ({
      ...item,
      source: item.source || source.label,
      sourceUrl: item.link || source.url,
      sourceLabel: source.label,
      query: source.query,
      sourceWeight: source.weight,
      categoryScoped: Boolean(source.categoryScoped),
      localRank: index + 1,
    }));
}

async function fetchTextWithCorsFallback(url, fetchImpl) {
  const errors = [];
  for (const createUrl of PUBLIC_CORS_FETCHERS) {
    const requestUrl = createUrl(url);
    try {
      const response = await fetchImpl(requestUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text || !/<(rss|feed|item|entry)\b/i.test(text)) {
        throw new Error('RSS body was empty or invalid');
      }
      return text;
    } catch (error) {
      errors.push(`${requestUrl}: ${error?.message ?? error}`);
    }
  }
  throw new Error(errors.join(' / '));
}

function parseRssItems(xml) {
  const itemBlocks = [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  const atomBlocks =
    itemBlocks.length === 0
      ? [...String(xml).matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)].map((match) => match[1])
      : [];
  const blocks = itemBlocks.length ? itemBlocks : atomBlocks;
  return blocks.map((block) => ({
    title: decodeXml(readXmlTag(block, 'title')),
    link: decodeXml(readLink(block)),
    source: decodeXml(readXmlTag(block, 'source')),
    pubDate: decodeXml(readXmlTag(block, 'pubDate') || readXmlTag(block, 'published') || readXmlTag(block, 'updated')),
    description: stripHtml(decodeXml(readXmlTag(block, 'description') || readXmlTag(block, 'summary'))),
  }));
}

function readXmlTag(block, tagName) {
  const match = String(block).match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1]?.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() ?? '';
}

function readLink(block) {
  const simple = readXmlTag(block, 'link');
  if (simple) return simple;
  const href = String(block).match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return href?.[1] ?? '';
}

function decodeXml(value) {
  const once = decodeXmlOnce(value);
  return /&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/.test(once) ? decodeXmlOnce(once) : once;
}

function decodeXmlOnce(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function safeFromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCategoryRelevantPool(items, minimum = 6) {
  const scoped = [];
  const material = [];
  const filler = [];
  for (const item of items) {
    const text = `${item.title ?? ''} ${item.description ?? ''}`;
    if (isEntertainmentWorkArticle(text)) continue;
    if (item.categoryScoped) {
      scoped.push({ ...item, relevance: 2 });
    } else if (itemMatchesStoryMaterial(item)) {
      material.push({ ...item, relevance: 1 });
    } else {
      filler.push({ ...item, relevance: 0 });
    }
  }
  const primary = [...scoped, ...material];
  if (primary.length >= minimum) return primary;
  return [...primary, ...filler];
}

function enrichTrendMetrics(items) {
  const sourceDiversity = new Set(items.map((item) => item.sourceLabel || item.source || 'public Web/RSS')).size;
  return items.map((item) => {
    const coOccurrenceScore = coOccurrenceScoreForItem(item, items);
    const hatenaHotEntryScore = /はてな|hatena|b\.hatena/i.test(`${item.sourceLabel ?? ''} ${item.source ?? ''} ${item.sourceUrl ?? ''}`)
      ? 100
      : 0;
    const categoryMatchScore = item.categoryScoped ? 100 : itemMatchesStoryMaterial(item) ? 65 : 0;
    return {
      ...item,
      coOccurrenceScore,
      hatenaHotEntryScore,
      categoryMatchScore,
      sourceDiversity,
      realSignalScore: Math.min(
        100,
        Math.round(coOccurrenceScore * 0.4 + sourceDiversity * 10 + categoryMatchScore * 0.3 + hatenaHotEntryScore * 0.2),
      ),
    };
  });
}

function itemMatchesStoryMaterial(item) {
  const text = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  if (isEntertainmentWorkArticle(text)) return false;
  return STORY_MATERIAL_TERMS.some((term) => term && text.includes(term.toLowerCase()));
}

function isEntertainmentWorkArticle(text) {
  const normalized = String(text ?? '').toLowerCase();
  return ENTERTAINMENT_WORK_TERMS.some((term) => normalized.includes(term.toLowerCase()));
}

function selectDiverseTrendItems(items, seed = 0, limit = 8) {
  const uniqueItems = rankTrendItems(items);
  const groups = new Map();
  for (const item of uniqueItems) {
    const groupKey = `${item.sourceLabel || item.source || 'source'}|${item.query || 'query'}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  }
  const groupList = [...groups.entries()]
    .map(([key, values]) => {
      const itemOffset = values.length ? Math.abs(Number(seed) || 0) % values.length : 0;
      return {
        key,
        values: [...values.slice(itemOffset), ...values.slice(0, itemOffset)],
        score: values.reduce((sum, item) => sum + itemScore(item), 0) / Math.max(1, values.length),
      };
    })
    .sort((left, right) => right.score - left.score);
  if (groupList.length === 0) return [];
  const groupOffset = Math.abs(Number(seed) || 0) % groupList.length;
  const orderedGroups = [...groupList.slice(groupOffset), ...groupList.slice(0, groupOffset)];
  const picked = [];
  let depth = 0;
  while (picked.length < limit && depth < 8) {
    for (const group of orderedGroups) {
      const item = group.values[depth];
      if (item) picked.push(item);
      if (picked.length >= limit) break;
    }
    depth += 1;
  }
  return picked;
}

function rankTrendItems(items) {
  const seen = new Set();
  const ranked = [];
  for (const item of items) {
    const key = normalizeTrendKey(item.title || item.link);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ranked.push(item);
  }
  return ranked.sort((left, right) => itemScore(right) - itemScore(left));
}

function normalizeTrendKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .slice(0, 80);
}

function itemScore(item) {
  return (
    Number(item.sourceWeight || 0) +
    recencyScore(item.pubDate) +
    Number(item.relevance || 0) * 60 -
    Number(item.localRank || 0) * 2 +
    Number(item.coOccurrenceScore || 0) * 0.7 +
    Number(item.categoryMatchScore || 0) * 0.25 +
    Number(item.hatenaHotEntryScore || 0) * 0.18
  );
}

function coOccurrenceScoreForItem(item, items) {
  const tokens = signalTokens(item);
  if (tokens.length === 0) return 0;
  const matchedSources = new Set();
  let matchedItems = 0;
  for (const other of items) {
    if (other === item) continue;
    const otherTokens = signalTokens(other);
    if (!tokens.some((token) => otherTokens.includes(token))) continue;
    matchedItems += 1;
    matchedSources.add(other.sourceLabel || other.source || 'public Web/RSS');
  }
  return Math.min(100, matchedItems * 18 + matchedSources.size * 14);
}

function signalTokens(item) {
  const text = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  return STORY_MATERIAL_TERMS.map((term) => term.toLowerCase()).filter((term) => term.length >= 2 && text.includes(term));
}

function recencyScore(pubDate) {
  const parsed = Date.parse(pubDate);
  if (Number.isNaN(parsed)) return 30;
  const ageHours = Math.max(0, (Date.now() - parsed) / 3_600_000);
  return Math.max(0, Math.round(72 - ageHours));
}

function toTrendObservation(item, { audience, categoryId, index, searchSeed, timeWindow }) {
  const tags = tagsForTrendObservation(categoryId, item.title);
  const publishedAt = Number.isNaN(Date.parse(item.pubDate)) ? new Date().toISOString() : new Date(item.pubDate).toISOString();
  const sourceLabel = item.sourceLabel || item.source || 'public Web/RSS';
  return {
    id: `${categoryId}-web-${searchSeed}-${index}`,
    source: sourceLabel,
    sourceType: 'public-web-rss',
    title: item.title || item.query,
    snippet: item.description || item.title || item.query,
    tags,
    query: item.query,
    queryUsed: `${item.query} / ${timeWindow} / ${audience} / public Web/RSS round ${searchSeed + 1}`,
    metrics: {
      rank: index + 1,
      sourceWeight: Number(item.sourceWeight || 0),
      recencyScore: recencyScore(item.pubDate),
      coOccurrenceScore: Number(item.coOccurrenceScore || 0),
      hatenaHotEntryScore: Number(item.hatenaHotEntryScore || 0),
      categoryMatchScore: Number(item.categoryMatchScore || 0),
      sourceDiversity: Number(item.sourceDiversity || 0),
      realSignalScore: Number(item.realSignalScore || 0),
    },
    locale: 'JP',
    sourceUrl: item.sourceUrl || item.link || 'https://news.google.com/',
    observedAt: new Date().toISOString(),
    publishedAt,
    authorOrChannel: sourceLabel,
    searchRound: searchSeed,
    searchVariant: searchSeed,
    categoryId,
  };
}

function tagsForTrendObservation(categoryId, title) {
  const baseTags = {
    'story-manga': ['漫画', '企画', '読者反応', '日本'],
    'short-video': ['ショート動画', '保存', 'コメント', '日本'],
    'trend-explainer': ['解説', 'トレンド', '視聴維持', '日本'],
    'long-novel': ['Web小説', '読者維持', '長編', '日本'],
  };
  const text = String(title ?? '');
  const inferred = [];
  if (/不安|生活|仕事|評価/.test(text)) inferred.push('生活不安');
  if (/AI|生成/.test(text)) inferred.push('AI');
  if (/動画|TikTok|YouTube|ショート/.test(text)) inferred.push('ショート動画');
  if (/家族|夫婦|親|子育て/.test(text)) inferred.push('家族');
  if (/職場|上司|同僚|仕事/.test(text)) inferred.push('職場');
  return [...new Set([...(baseTags[categoryId] ?? baseTags['story-manga']), ...inferred])];
}
