import { NANO_BANANA_FALLBACK_SNAPSHOT } from './nanoBananaFallbackSnapshot.js';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const GEMINI_MODEL_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const SECRET_PATTERNS = [/sk-proj-[A-Za-z0-9_-]+/g, /sk-[A-Za-z0-9_-]+/g, /AIza[0-9A-Za-z_-]+/g];

export function detectProvider(apiKey = '') {
  const normalized = apiKey.trim();
  if (!normalized) return 'fixture';
  if (/^sk-[A-Za-z0-9_-]{8,}/.test(normalized)) return 'openai';
  if (/^AIza[0-9A-Za-z_-]{8,}/.test(normalized)) return 'gemini';
  return 'unknown';
}

export function getProviderStatus({ apiKey = '', openaiKey = '', geminiKey = '' } = {}) {
  const normalized = (apiKey || openaiKey || geminiKey || '').trim();
  const mode = detectProvider(normalized);
  const providerName = mode === 'openai' ? 'OpenAI' : mode === 'gemini' ? 'Gemini' : '';
  const connected = mode === 'openai' || mode === 'gemini';
  const model = connected ? primaryModel(mode) : '';
  const label = connected ? `${providerName} ${model}` : mode === 'unknown' ? 'APIキー形式未判定' : 'API未設定';

  return {
    mode,
    apiKey: normalized,
    provider: {
      connected,
      name: providerName,
      model,
      label,
    },
    openai: {
      connected: mode === 'openai',
      model: mode === 'openai' ? model : '',
      label: mode === 'openai' ? label : 'OpenAI 未設定',
    },
    gemini: {
      connected: mode === 'gemini',
      model: mode === 'gemini' ? model : '',
      label: mode === 'gemini' ? label : 'Gemini 未設定',
    },
  };
}

export function getProviderModelChain(provider) {
  const chain =
    provider === 'gemini'
      ? NANO_BANANA_FALLBACK_SNAPSHOT.chains.geminiText
      : NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText;
  return chain.models.map((model) => model.id);
}

function primaryModel(provider) {
  return getProviderModelChain(provider)[0];
}

export function createProviderAnalysisRequest({ provider, report, model = primaryModel(provider) }) {
  const reportDigest = {
    category: report.category,
    evidenceCards: report.evidenceCards?.map((card) => ({
      claim: card.claim,
      source: card.source,
      metricsSummary: card.metricsSummary,
      whyItMatters: card.whyItMatters,
      observation: card.observation,
      meaningForCreator: card.meaningForCreator,
      creativeUse: card.creativeUse,
      limitations: card.limitations,
    })),
    trendClusters: report.trendClusters?.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      momentumScore: cluster.momentumScore,
      saturationScore: cluster.saturationScore,
      confidenceScore: cluster.confidenceScore,
      topTags: cluster.topTags,
      risks: cluster.risks,
    })),
    deepAnalysis: report.deepAnalysis,
    creativePlans: report.creativePlans,
    limitations: report.limitations,
  };

  const prompt = [
    'あなたは日本語コンテンツ専門の創作トレンド分析者「物語バズメーカー」です。',
    '必ずJSONだけを返してください。',
    'JSONには summary, strongest_signal, practical_revision, risk_note, next_actions を含めてください。',
    '全フィールドの値は日本語で書いてください。',
    '実在の固有名詞は根拠文脈では扱ってよいですが、実在人物、企業、クリエイター、既存作品を架空物語の主役・黒幕・告発対象・続編対象にしないでください。',
    `レポート要約: ${JSON.stringify(reportDigest)}`,
  ].join('\n');

  if (provider === 'gemini') {
    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };
  }

  return {
    model,
    input: prompt,
    text: {
      format: {
        type: 'json_object',
      },
    },
  };
}

export function createPlanDesignRequest({ provider, report, model = primaryModel(provider) }) {
  const reportDigest = {
    category: report.category,
    timeWindow: report.timeWindow,
    audience: report.audience,
    evidenceCards: report.evidenceCards?.map((card) => ({
      claim: card.claim,
      source: card.source,
      metricsSummary: card.metricsSummary,
      observation: card.observation,
      meaningForCreator: card.meaningForCreator,
      creativeUse: card.creativeUse,
      limitations: card.limitations,
    })),
    creativePlans: report.creativePlans?.map((plan) => ({
      id: plan.id,
      formatLabel: plan.formatLabel,
      titleCandidates: plan.titleCandidates,
      audiencePromise: plan.audiencePromise,
      emotionalHook: plan.emotionalHook,
      creatorBrief: plan.creatorBrief,
      premise: plan.premise,
      exampleDetail: plan.exampleDetail,
      outline: plan.outline,
      opening: plan.opening,
      reasonToWin: plan.reasonToWin,
      differentiation: plan.differentiation,
      productionNotes: plan.productionNotes,
      riskNotes: plan.riskNotes,
      evidenceAnchor: plan.evidenceAnchor,
    })),
    limitations: report.limitations,
  };

  const prompt = [
    'あなたは日本語コンテンツの商業編集者兼脚本開発者です。',
    '必ずJSONだけを返してください。',
    '目的: 各企画案の「プロ向け設計メモ」と「物語・台本設計」を、公開Web/RSS根拠と企画下書きから新規に生成する。',
    '禁止: 固定テンプレ、単語差し替え、全案で同じ文型、ラベルだけ違う同文、一般論の穴埋め、ダミーデータ、架空の外部根拠。',
    '各noteは、その案の根拠語、場面、矛盾、媒体、制作上の判断を読み直して書く。別案にそのまま移植できる文は禁止。',
    '実在人物、企業、作品、クリエイター、既存キャラクターを物語の主役・黒幕・告発対象にしない。',
    '返却JSON schema:',
    '{"plans":[{"id":"creativePlansのid","craftNotes":[{"label":"短い見出し","detail":"80〜180字の固有判断"}],"storyArchitecture":{"notes":[{"label":"短い見出し","detail":"80〜180字の固有設計"}]}}]}',
    'craftNotesは3〜5件。編集判断、ネーム/尺、演出、制作チェックなど、実制作で手が動く内容にする。',
    'storyArchitecture.notesは4〜6件。伏線、目的/動機/障害、感情変化、知識境界、回収などを、案ごとの出来事として書く。',
    `入力レポート: ${JSON.stringify(reportDigest)}`,
  ].join('\n');

  if (provider === 'gemini') {
    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };
  }

  return {
    model,
    input: prompt,
    text: {
      format: {
        type: 'json_object',
      },
    },
  };
}

export async function runProviderAnalysis({ provider, apiKey, report, fetchImpl = fetch, proxyBase = '' }) {
  if (!apiKey || apiKey.length < 12) {
    throw new Error(`${provider}のAPIキーが未設定です。`);
  }

  return runProviderFallback({
    provider,
    apiKey,
    fetchImpl,
    proxyBase,
    failureMessage: `${provider}の詳細分析に失敗しました。キー、クォータ、提供元の状態を確認してください。`,
    createRequest: (model) => createProviderAnalysisRequest({ provider, report, model }),
    parsePayload: (payload) => parseProviderPayload(provider, payload),
  });
}

export async function runPlanDesignGeneration({ provider, apiKey, report, fetchImpl = fetch, proxyBase = '' }) {
  if (!apiKey || apiKey.length < 12) {
    throw new Error(`${provider}のAPIキーが未設定です。`);
  }

  return runProviderFallback({
    provider,
    apiKey,
    fetchImpl,
    proxyBase,
    failureMessage: `${provider}の設計メモ生成に失敗しました。キー、クォータ、提供元の状態を確認してください。`,
    createRequest: (model) => createPlanDesignRequest({ provider, report, model }),
    parsePayload: (payload) => parsePlanDesignPayload(provider, payload, report),
  });
}

export async function runDraftSample({ provider, apiKey, draftPrompt, fetchImpl = fetch, proxyBase = '' }) {
  if (!apiKey || apiKey.length < 12) {
    throw new Error(`${provider}のAPIキーが未設定です。`);
  }
  if (!draftPrompt?.trim()) {
    throw new Error('本文生成プロンプトが空です。');
  }

  return runProviderFallback({
    provider,
    apiKey,
    fetchImpl,
    proxyBase,
    failureMessage: `${provider}の参考文章生成に失敗しました。キー、クォータ、提供元の状態を確認してください。`,
    createRequest: (model) => createDraftSampleRequest({ provider, draftPrompt, model }),
    parsePayload: (payload) => parseDraftSamplePayload(provider, payload, prepareDraftPromptForSample(draftPrompt)),
  });
}

function createDraftSampleRequest({ provider, draftPrompt, model = primaryModel(provider) }) {
  const preparedDraftPrompt = prepareDraftPromptForSample(draftPrompt);
  const prompt = [
    'あなたは日本語コンテンツの商業創作者です。',
    '以下の企画プロンプトをもとに、実際に読者・視聴者が続きを見たくなる参考文章そのものを書いてください。',
    '要件:',
    '1. 日本語で書く。',
    '2. 実在人物、実在企業、既存作品、実在クリエイターを物語の主役・黒幕・告発対象にしない。',
    '3. 企画の核、冒頭フック、感情の引きを必ず反映する。',
    '4. 解説、企画書、構成メモではなく、本文・台本として読める形にする。',
    '5. Markdown記法（##、**、---、箇条書き）を使わない。',
    '6. 「タイトル候補」「カテゴリ」「構成」「冒頭例」などの企画メモの項目名を本文に出さない。',
    '7. 1行目は自然な作品タイトルだけにし、2行目以降は完成稿の本文または台本にする。',
    '8. 物語系は場面描写と台詞を入れ、短くても読める一場面にする。',
    '9. 動画系はナレーション、画面指示、字幕を含む実用台本にする。',
    '10. 最低600字。短すぎる要約や章立てだけの出力は禁止。',
    '',
    preparedDraftPrompt,
  ].join('\n');

  if (provider === 'gemini') {
    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };
  }

  return {
    model,
    input: prompt,
  };
}

async function runProviderFallback({ provider, apiKey, fetchImpl, proxyBase = '', failureMessage, createRequest, parsePayload }) {
  const attempts = [];
  for (const model of getProviderModelChain(provider)) {
    try {
      const body = JSON.stringify(createRequest(model));
      const payload = await callProviderModel({ provider, apiKey, model, body, fetchImpl, proxyBase });
      return {
        ...parsePayload(payload),
        used_model: model,
        fallback_chain: [...attempts, { model, status: 'success' }],
      };
    } catch (error) {
      attempts.push({
        model,
        status: 'failed',
        reason: sanitizeProviderError(error),
      });
    }
  }

  const reasons = [...new Set(attempts.map((attempt) => attempt.reason).filter(Boolean))].join(' / ');
  throw new Error(
    `${failureMessage} 試行モデル: ${attempts.map((attempt) => attempt.model).join(' → ')}。${reasons ? ` 理由: ${reasons}` : ''}`,
  );
}

async function callProviderModel({ provider, apiKey, model, body, fetchImpl, proxyBase = '' }) {
  const response = proxyBase
    ? await fetchImpl(proxyBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // キーはローカル中継のbodyにのみ載せる（ログ・保存はしない）。CORSのない経路でプロバイダへ転送される。
        body: JSON.stringify({ provider, model, apiKey, body: JSON.parse(body) }),
      })
    : provider === 'gemini'
      ? await fetchImpl(`${GEMINI_MODEL_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
        })
      : await fetchImpl(OPENAI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body,
        });

  if (!response.ok) {
    let message = '';
    try {
      const payload = await response.json();
      message = payload.error?.message ?? payload.message ?? '';
    } catch {
      message = '';
    }
    throw new Error(`HTTP ${response.status ?? 'error'} ${message}`.trim());
  }

  return response.json();
}

function prepareDraftPromptForSample(draftPrompt) {
  return String(draftPrompt)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const titleMatch = line.match(/^(\s*)タイトル候補\s*[:：]\s*(.+)$/);
      if (titleMatch) return `${titleMatch[1]}使用タイトル: ${pickPrimaryTitle(titleMatch[2])}`;
      return line;
    })
    .join('\n');
}

function pickPrimaryTitle(value) {
  return (
    String(value)
      .split(/[／/|]/)
      .map((item) => item.trim())
      .find(Boolean) || String(value).trim()
  );
}

function parseProviderPayload(provider, payload) {
  const raw = providerPayloadText(provider, payload);

  if (!raw) {
    return {
      summary: 'APIから解析できる文章が返りませんでした。',
      strongest_signal: '',
      practical_revision: '',
      risk_note: 'API応答の形式が空でした。',
      next_actions: [],
    };
  }

  const parsedSummary = parseProviderJsonPayload(raw);
  if (parsedSummary) {
    return normalizeProviderSummary(parsedSummary);
  }

  {
    return {
      summary: stringifySummaryValue(raw),
      strongest_signal: '',
      practical_revision: '',
      risk_note: 'API応答をJSONとして解析できませんでした。',
      next_actions: [],
    };
  }
}

function parsePlanDesignPayload(provider, payload, report) {
  const raw = providerPayloadText(provider, payload);
  if (!raw) {
    throw new Error('APIから設計メモとして解析できる文章が返りませんでした。');
  }
  const parsed = parseProviderJsonPayload(raw);
  if (!parsed) {
    throw new Error('APIの設計メモ応答をJSONとして解析できませんでした。');
  }
  return normalizePlanDesignPayload(parsed, report);
}

function normalizePlanDesignPayload(payload, report) {
  const knownPlanIds = new Set((report.creativePlans ?? []).map((plan) => plan.id));
  const rawPlans = Array.isArray(payload.plans) ? payload.plans : [];
  const plans = rawPlans
    .map((plan) => normalizePlanDesign(plan, knownPlanIds))
    .filter(Boolean);

  if (plans.length === 0) {
    throw new Error('API応答に利用できる設計メモがありませんでした。');
  }

  return { plans };
}

function normalizePlanDesign(plan, knownPlanIds) {
  const id = stringifySummaryValue(plan?.id).trim();
  if (!id || !knownPlanIds.has(id)) return null;

  const craftNotes = normalizeDesignNotes(plan.craftNotes).slice(0, 5);
  const storyNotes = normalizeDesignNotes(plan.storyArchitecture?.notes ?? plan.storyArchitecture).slice(0, 6);
  if (craftNotes.length < 2 || storyNotes.length < 2) return null;
  if (looksLikeTemplateSet([...craftNotes, ...storyNotes])) return null;

  return {
    id,
    craftNotes,
    storyArchitecture: {
      status: 'done',
      source: 'provider',
      notes: storyNotes,
    },
  };
}

function normalizeDesignNotes(value) {
  const rawNotes = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).map(([label, detail]) => ({ label, detail }))
      : [];
  return rawNotes
    .map((note) => ({
      label: stringifySummaryValue(note?.label ?? note?.title ?? note?.heading ?? '').slice(0, 40),
      detail: stringifySummaryValue(note?.detail ?? note?.description ?? note?.text ?? note?.body ?? note?.content ?? ''),
    }))
    .filter((note) => note.label.length >= 2 && note.detail.length >= 28)
    .filter((note) => !looksLikeTemplateDetail(note.detail));
}

function looksLikeTemplateSet(notes) {
  const normalizedDetails = notes.map((note) => normalizeForTemplateCheck(note.detail)).filter(Boolean);
  if (new Set(normalizedDetails).size < Math.ceil(normalizedDetails.length * 0.75)) return true;
  const commonStarts = normalizedDetails.map((detail) => detail.slice(0, 18));
  return new Set(commonStarts).size < Math.ceil(commonStarts.length * 0.6);
}

function looksLikeTemplateDetail(detail) {
  const text = String(detail ?? '');
  if (/テンプレ|ダミー|サンプル|任意の|ここに/.test(text)) return true;
  if (/取得根拠の「[^」]+」を.+に置き換え/.test(text)) return true;
  if (/同じ根拠でも見せ方を変える/.test(text)) return true;
  return false;
}

function normalizeForTemplateCheck(value) {
  return String(value ?? '')
    .replace(/[「『][^」』]+[」』]/g, '「…」')
    .replace(/[0-9０-９]+/g, '0')
    .replace(/\s+/g, '')
    .trim();
}

function parseProviderJsonPayload(raw) {
  for (const candidate of buildJsonTextCandidates(raw)) {
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return null;
}

function buildJsonTextCandidates(raw) {
  const text = String(raw ?? '').trim();
  const withoutFence = stripMarkdownFence(text).trim();
  return [...new Set([text, withoutFence, extractBalancedJsonText(text), extractBalancedJsonText(withoutFence)].filter(Boolean))];
}

function tryParseJsonCandidate(candidate, depth = 0) {
  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed === 'string' && depth < 2) return tryParseJsonCandidate(parsed, depth + 1);
    return parsed;
  } catch {
    return null;
  }
}

function extractBalancedJsonText(value) {
  const text = String(value ?? '');
  const start = [...text].findIndex((char) => char === '{' || char === '[');
  if (start < 0) return '';
  const opener = text[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return '';
}

function parseDraftSamplePayload(provider, payload, draftPrompt = '') {
  const raw = providerPayloadText(provider, payload);

  const text = cleanDraftSampleText(raw || '');
  if (!text) {
    throw new Error('参考文章として表示できる本文が返りませんでした。もう一度生成してください。');
  }
  if (!isUsableDraftSample(text)) {
    throw new Error('本文として使える具体的な場面や台詞が不足しています。もう一度生成してください。');
  }

  return { text: ensureDraftSampleTitle(text, extractSelectedTitleFromPrompt(draftPrompt)) };
}

function providerPayloadText(provider, payload) {
  return provider === 'gemini'
    ? payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n')
    : payload.output_text ??
        payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
}

function isUsableDraftSample(text) {
  const normalized = text.replace(/\s+/g, '');
  if (normalized.length < 160) return false;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const outlineLikeLines = lines.filter((line) =>
    /^(第?\d+話|第?\d+章|\d+[.．、:：]|起|承|転|結|構成|概要|タイトル)/.test(line),
  );
  if (outlineLikeLines.length >= Math.max(3, Math.ceil(lines.length * 0.6))) return false;
  return /[「」『』]|セリフ|字幕|ナレーション|画面|主人公|彼|彼女|私|僕|俺/.test(text);
}

function ensureDraftSampleTitle(text, title) {
  const cleanTitle = title?.trim();
  if (!cleanTitle) return text;
  const cleanText = String(text ?? '').trim();
  if (!cleanText) return cleanTitle;
  const lines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines[0] === cleanTitle) {
    const body = lines.slice(1).join('\n');
    return body ? `${cleanTitle}\n\n${body}` : cleanTitle;
  }
  if (cleanText.startsWith(cleanTitle)) {
    const body = cleanText.slice(cleanTitle.length).replace(/^[\s:：\-—]+/, '').trim();
    return body ? `${cleanTitle}\n\n${body}` : cleanTitle;
  }
  return `${cleanTitle}\n\n${lines.join('\n')}`;
}

function extractSelectedTitleFromPrompt(prompt = '') {
  const match = String(prompt).match(/^使用タイトル\s*[:：]\s*(.+)$/m);
  return match?.[1]?.split('/')[0]?.trim() ?? '';
}

function normalizeProviderSummary(summary) {
  return {
    ...summary,
    summary: stringifySummaryValue(summary.summary),
    strongest_signal: stringifySummaryValue(summary.strongest_signal),
    practical_revision: stringifySummaryValue(summary.practical_revision),
    risk_note: stringifySummaryValue(summary.risk_note),
    next_actions: normalizeActionList(summary.next_actions),
  };
}

function normalizeActionList(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.map(stringifySummaryValue).filter(Boolean);
}

function stringifySummaryValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return readableDisplayText(stripMarkdownDecoration(value));
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifySummaryValue).filter(Boolean).join(' / ');
  if (typeof value === 'object') {
    const title = value.title ?? value.heading ?? value.label ?? value.name;
    const detail = value.detail ?? value.description ?? value.action ?? value.text ?? value.note ?? value.content;
    if (title && detail) return `${stringifySummaryValue(title)}: ${stringifySummaryValue(detail)}`;
    if (detail) return stringifySummaryValue(detail);
    if (title) return stringifySummaryValue(title);
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${stringifySummaryValue(entryValue)}`)
      .filter((item) => !item.endsWith(': '))
      .join(' / ');
  }
  return String(value);
}

function readableDisplayText(value) {
  const text = String(value ?? '').trim();
  if (!text || looksGarbledJapanese(text)) return '';
  return text;
}

function looksGarbledJapanese(value) {
  const text = String(value ?? '');
  const markers = text.match(/[縺繧譁荳莉蜿螂髯蠕鬆遘謗隕譟豁ｩ]/g) ?? [];
  return markers.length >= 3 && markers.length / Math.max(text.length, 1) > 0.08;
}

function stripMarkdownDecoration(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function sanitizeProviderError(error) {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, '[redacted-key]'),
    String(error?.message ?? error ?? 'API error'),
  )
    .replace(/Incorrect API key provided:\s*[^.。]+[.。]?/gi, 'Incorrect API key provided: [redacted-key].')
    .replace(/API key provided:\s*[^.。]+[.。]?/gi, 'API key provided: [redacted-key].')
    .replace(/You can find your API key at\s+\S+/gi, '')
    .replace(/\[redacted-key\][A-Za-z0-9_*.-]+/g, '[redacted-key]')
    .replace(/key=[^&\s)]+/g, 'key=[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted-key]')
    .slice(0, 160);
}

function cleanDraftSampleText(value) {
  const cleaned = stripMarkdownDecoration(stripMarkdownFence(value));
  return cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-ー—]{3,}$/.test(line))
    .filter((line) => !/^第?\d+(話|章)$/.test(line))
    .filter((line) => !/^(タイトル候補|カテゴリ|形式|構成|冒頭例|プロンプト|要件|使用タイトル|別タイトル案)\s*[:：]/.test(line))
    .filter((line) => !/^(ストーリー漫画|漫画|ショート動画|トレンド解説動画|解説動画|短編小説|中編小説|長編小説|小説).*(台本|プロット|本文|参考文章)$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkdownFence(value) {
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .trim();
}
