import { writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { defineConfig } from 'vite';

const ALLOWED_EXTENSIONS = new Set(['.docx', '.json']);

export default defineConfig({
  plugins: [nativeSaveDialogPlugin(), trendSearchPlugin(), providerProxyPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
  preview: {
    host: '127.0.0.1',
    port: 5180,
  },
});

function trendSearchPlugin() {
  return {
    name: 'monogatari-trend-search',
    configureServer(server) {
      registerTrendSearchRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerTrendSearchRoute(server.middlewares);
    },
  };
}

function registerTrendSearchRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/trend-search')) {
      next();
      return;
    }

    try {
      if (request.method !== 'GET') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }

      const url = new URL(request.url, 'http://127.0.0.1');
      const categoryId = String(url.searchParams.get('categoryId') || 'story-manga');
      const timeWindow = String(url.searchParams.get('timeWindow') || '7d');
      const audience = String(url.searchParams.get('audience') || 'general');
      const searchSeed = Number(url.searchParams.get('searchSeed') || 0);
      const sources = trendSourcesFor(categoryId, searchSeed);
      const results = await Promise.allSettled(sources.map(fetchTrendSource));
      const succeeded = results
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);
      const categoryPool = enrichTrendMetrics(buildCategoryRelevantPool(succeeded, categoryId));
      const observations = selectDiverseTrendItems(categoryPool, searchSeed)
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
      if (observations.length === 0) throw new Error('公開Web/RSSから有効な結果を取得できませんでした。');

      sendJson(response, 200, {
        ok: true,
        query: [...new Set(sources.map((source) => source.query))].join(' / '),
        sourcesAttempted: sources.map((source) => source.label),
        sourcesSucceeded: [...new Set(observations.map((observation) => observation.source))],
        observations,
      });
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: error instanceof Error ? error.message : '公開Web/RSS取得に失敗しました。',
      });
    }
  });
}

// ブラウザから OpenAI / Gemini を直接叩くと OpenAI は CORS で遮断され「Failed to fetch」になる。
// ローカル dev サーバーを中継にして、プロバイダ呼び出しをサーバー側で行う（キーはログ・保存しない）。
function providerProxyPlugin() {
  return {
    name: 'monogatari-provider-proxy',
    configureServer(server) {
      registerProviderProxyRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerProviderProxyRoute(server.middlewares);
    },
  };
}

function registerProviderProxyRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/provider-generate')) {
      next();
      return;
    }
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }
      const payload = await readJsonBody(request);
      const provider = String(payload?.provider ?? '');
      const model = String(payload?.model ?? '');
      const apiKey = String(payload?.apiKey ?? '');
      const body = payload?.body;
      if ((provider !== 'openai' && provider !== 'gemini') || !model || !apiKey || !body) {
        sendJson(response, 400, { ok: false, error: '中継リクエストの内容が不正です。' });
        return;
      }

      const upstream =
        provider === 'gemini'
          ? await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              },
            )
          : await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify(body),
            });

      const text = await upstream.text();
      // プロバイダのステータスとJSONをそのまま返す（クライアント側の callProviderModel が解釈する）。
      response.statusCode = upstream.status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(text || '{}');
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: { message: error instanceof Error ? error.message : 'プロバイダ中継に失敗しました。' },
      });
    }
  });
}

function nativeSaveDialogPlugin() {
  return {
    name: 'monogatari-native-save-dialog',
    configureServer(server) {
      registerSaveDialogRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerSaveDialogRoute(server.middlewares);
    },
  };
}

async function fetchTrendSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'MonogatariBuzzMaker/0.1 local trend search',
    },
  });
  if (!response.ok) throw new Error(`${source.label}: HTTP ${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml).slice(0, source.limit).map((item, index) => ({
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

// このアプリは「世の中で今ウケている感情・共感・議論（＝作品のネタ）」を察知するためのもの。
// 漫画/小説/動画など業界名では検索しない（それは創作者の動静ニュースになり、ネタにならない）。
// カテゴリは「同じ社会トレンドを、その媒体で最もバズる感情の切り口で拾う」角度づけだけに使う。
function trendSourcesFor(categoryId, seed = 0) {
  const angleQueries = {
    'story-manga': [
      'モヤモヤ 共感 SNS 話題',
      '人間関係 すれ違い 共感 話題',
      '理不尽 あるある 共感 SNS',
      '日常 違和感 共感 話題',
      '言えなかった本音 共感 SNS',
      '家族 仕事 もやもや 共感 話題',
    ],
    'short-video': [
      '一瞬で 共感 あるある SNS 話題',
      '失敗 あるある 共感 SNS',
      '生活 工夫 時短 話題 SNS',
      'やってしまった あるある 共感',
      '思わず保存 役立つ 話題 SNS',
      'スカッと 共感 SNS 話題',
    ],
    'trend-explainer': [
      'なぜ 話題 SNS 議論 背景',
      '炎上 議論 背景 SNS',
      'ネット 現象 注目 議論',
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
  const list = angleQueries[categoryId] ?? angleQueries['story-manga'];
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
  // 世の中の生のトレンド（媒体非依存の社会共通シグナル）。これが「ネタ」の本体。
  const societalSources = [
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
      query: '暮らし・家族・お金・仕事の話題',
      url: 'https://news.yahoo.co.jp/rss/topics/life.xml',
      limit: 10,
      weight: 90,
    },
    {
      label: 'Yahoo 主要トピック',
      query: 'いまの主要トピック',
      url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
      limit: 10,
      weight: 82,
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
  return [...newsSearchSources, ...societalSources];
}

function parseRssItems(xml) {
  const itemBlocks = [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return itemBlocks.map((block) => ({
    title: decodeXml(readXmlTag(block, 'title')),
    link: decodeXml(readXmlTag(block, 'link')),
    source: decodeXml(readXmlTag(block, 'source')),
    pubDate: decodeXml(readXmlTag(block, 'pubDate')),
    description: stripHtml(decodeXml(readXmlTag(block, 'description'))),
  }));
}

function readXmlTag(block, tagName) {
  const match = String(block).match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1]?.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() ?? '';
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

// RSSタイトルは二重エンコード（&amp;#x...;）されることがあるため2パスで復号する。
export function decodeXml(value) {
  const once = decodeXmlOnce(value);
  return /&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/.test(once) ? decodeXmlOnce(once) : once;
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

// 「作品のネタになる」社会・感情シグナル語（媒体共通）。
// 世の中フィードには天気・株価・スポーツ結果など物語素材になりにくいニュースも混じるため、
// 人の感情・人間関係・生活・価値観・議論に触れる話題を優先素材として拾うために使う。
function storyMaterialTerms() {
  return [
    '共感', '感動', '泣け', 'モヤ', 'もや', '理不尽', '炎上', '議論', '賛否', '驚き', '衝撃', '後悔', '葛藤',
    'スカッと', 'あるある', '本音', '違和感', '不安', '悩み', '怒り', '嫉妬', '孤独',
    '家族', '夫婦', '親', '子育て', '恋愛', '友人', '職場', '上司', '同僚', '世代', '人間関係', 'すれ違い',
    '結婚', '離婚', '介護', '学校', '近所',
    '仕事', '転職', 'お金', '家計', '節約', '貧困', '格差', '生き方', '価値観', '世の中', '社会', '人生',
    '暮らし', '生活', '話題', 'sns', 'ネット', '世間', '変化', '注目',
  ];
}

function itemMatchesStoryMaterial(item) {
  const text = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  if (isEntertainmentWorkArticle(text)) return false;
  return storyMaterialTerms().some((term) => term && text.includes(term.toLowerCase()));
}

function isEntertainmentWorkArticle(text) {
  return /漫画|マンガ|コミック|読切|連載|原作|実写|ドラマ|映画|アニメ|脚本|作品|書評|読書|読後|新刊|文庫|本屋大賞|キャスト|声優|俳優|女優|主演|監督|興行|第[0-9０-９]+[話巻]|主人公|レビュー|配信開始|放送開始/.test(
    String(text ?? '').toLowerCase(),
  );
}

// テスト互換のため categoryId を受けるが、判定は媒体共通の「物語素材」語で行う。
export function itemMatchesCategory(item) {
  return itemMatchesStoryMaterial(item);
}

// カテゴリ角度づけ検索の記事と、世の中フィードのうち「物語素材になる」話題を優先プールにする。
// 天気・株価など素材になりにくいニュースは、件数が不足した場合のみ補助として末尾に加える。
export function buildCategoryRelevantPool(items, _categoryId, minimum = 6) {
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

export function enrichTrendMetrics(items) {
  const sourceDiversity = new Set(items.map((item) => item.sourceLabel || item.source || '公開Web/RSS')).size;
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
    matchedSources.add(other.sourceLabel || other.source || '公開Web/RSS');
  }
  return Math.min(100, matchedItems * 18 + matchedSources.size * 14);
}

function signalTokens(item) {
  const text = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  return storyMaterialTerms()
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 2 && text.includes(term));
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
  const sourceLabel = item.sourceLabel || item.source || '公開Web/RSS';
  return {
    id: `${categoryId}-web-${searchSeed}-${index}`,
    source: sourceLabel,
    sourceType: 'public-web-rss',
    title: item.title || item.query,
    snippet: item.description || item.title || item.query,
    tags,
    query: item.query,
    queryUsed: `${item.query} / ${timeWindow} / ${audience} / 公開Web/RSS取得${searchSeed + 1}`,
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
    'trend-explainer': ['解説', 'トレンド', '視聴習慣', '日本'],
    'long-novel': ['Web小説', '読者維持', '長編', '日本'],
  };
  const text = String(title ?? '');
  const inferred = [];
  if (/不安|生活|仕事|評価/.test(text)) inferred.push('生活不安');
  if (/AI|生成/.test(text)) inferred.push('AI');
  if (/漫画|マンガ|コミック/.test(text)) inferred.push('漫画');
  if (/小説|Web小説|なろう/.test(text)) inferred.push('Web小説');
  if (/動画|TikTok|YouTube|ショート/.test(text)) inferred.push('ショート動画');
  return [...new Set([...(baseTags[categoryId] ?? baseTags['story-manga']), ...inferred])];
}

function registerSaveDialogRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/save-file-dialog')) {
      next();
      return;
    }

    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }

      const payload = await readJsonBody(request);
      const fileName = sanitizeFileName(payload?.fileName);
      const contentBase64 = String(payload?.contentBase64 ?? '');
      if (!contentBase64) throw new Error('保存内容が空です。');

      const filePath = await askUserForSavePath(fileName);
      if (!filePath) {
        sendJson(response, 200, { ok: true, cancelled: true, fileName });
        return;
      }

      ensureAllowedExtension(filePath);
      await writeFile(filePath, Buffer.from(contentBase64, 'base64'));
      sendJson(response, 200, { ok: true, cancelled: false, fileName: basename(filePath) });
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : '保存に失敗しました。',
      });
    }
  });
}

function askUserForSavePath(fileName) {
  const extension = extname(fileName).toLowerCase().replace(/^\./, '');
  const filter =
    extension === 'docx'
      ? 'Word document (*.docx)|*.docx|All files (*.*)|*.*'
      : 'JSON file (*.json)|*.json|All files (*.*)|*.*';
  const script = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.SaveFileDialog',
    "$dialog.Title = '保存先を選択'",
    `$dialog.FileName = ${psQuote(fileName)}`,
    `$dialog.Filter = ${psQuote(filter)}`,
    `$dialog.DefaultExt = ${psQuote(extension)}`,
    '$dialog.AddExtension = $true',
    '$dialog.OverwritePrompt = $true',
    "$dialog.InitialDirectory = [Environment]::GetFolderPath('MyDocuments')",
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($dialog.FileName) }',
  ].join('; ');

  return new Promise((resolvePath, rejectPath) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8', windowsHide: true, timeout: 0 },
      (error, stdout, stderr) => {
        if (error) {
          rejectPath(new Error(stderr?.trim() || error.message));
          return;
        }
        resolvePath(stdout.trim());
      },
    );
  });
}

function sanitizeFileName(fileName) {
  const clean = basename(String(fileName ?? '')).replace(/[^A-Za-z0-9._-]/g, '_');
  ensureAllowedExtension(clean);
  if (!clean.startsWith('monogatari-buzz-maker-')) {
    throw new Error('このアプリの出力ファイル名ではありません。');
  }
  return clean;
}

function ensureAllowedExtension(fileName) {
  const extension = extname(String(fileName ?? '')).toLowerCase();
  if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('保存できるファイルはDOCXまたはJSONだけです。');
  }
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        rejectBody(new Error('保存内容が大きすぎます。'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body || '{}'));
      } catch {
        rejectBody(new Error('保存内容のJSONを解析できません。'));
      }
    });
    request.on('error', rejectBody);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}
