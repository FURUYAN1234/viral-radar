import { NANO_BANANA_FALLBACK_SNAPSHOT } from './nanoBananaFallbackSnapshot.js';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const GEMINI_MODEL_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const SECRET_PATTERNS = [/sk-proj-[A-Za-z0-9_-]+/g, /sk-[A-Za-z0-9_-]+/g, /AIza[0-9A-Za-z_-]+/g];
const DRAFT_CORE_STOPWORDS = new Set([
  '主人公',
  '舞台',
  '最初',
  '事件',
  '対立',
  '読者',
  '視聴者',
  'こと',
  'もの',
  'ため',
  'よう',
  'する',
  'した',
  'ある',
  'いる',
  'ない',
  '自分',
  '相手',
  '周囲',
  '読後感',
  '社会',
  '日常',
  '現代',
  '日本',
  '現代日本',
  '界隈',
  'IT界隈',
  'SNS',
]);
const DRAFT_WEAK_CORE_TERMS = new Set(['夜', '座席', '学校', '先生', '生徒', '乗客', '答え', '完璧']);
const DRAFT_SINGLE_PLACE_TERMS = new Set(['庭', '駅', '店', '海', '山', '川', '森', '港', '島', '村', '町', '寮', '塾']);
const REQUIRED_PLAN_TEXT_FIELDS = ['audiencePromise', 'emotionalHook', 'premise', 'exampleDetail', 'opening', 'differentiation'];
const REQUIRED_CREATOR_BRIEF_FIELDS = ['protagonist', 'setting', 'incitingIncident', 'conflict', 'choice', 'payoff'];
const PLAN_TEXT_MIN_LENGTH = 6;
const PLAN_TITLE_MIN_LENGTH = 2;
const PLAN_LIST_ITEM_MIN_LENGTH = 4;
const CREATOR_BRIEF_MIN_LENGTH = 2;
const DESIGN_NOTE_DETAIL_MIN_LENGTH = 16;
const PLAN_TEXT_FIELD_ALIASES = {
  audiencePromise: ['audiencePromise', 'readerPromise', 'promise', '読者への約束', '読者に約束すること', '約束'],
  emotionalHook: ['emotionalHook', 'hook', 'emotion', '感情の引き', '感情フック', '読者感情'],
  premise: ['premise', 'core', 'storyCore', '作品本文の核', '作品の核', '前提'],
  exampleDetail: ['exampleDetail', 'firstExample', 'specificExample', '初回具体例', '具体例'],
  opening: ['opening', 'openingScene', 'firstScene', '冒頭例', '冒頭'],
  differentiation: ['differentiation', 'riskControl', 'safety', '安全・類似回避', '差別化', '類似回避'],
};
const CREATOR_BRIEF_ALIASES = {
  protagonist: ['protagonist', 'mainCharacter', 'hero', '主人公'],
  setting: ['setting', 'place', 'stage', '舞台'],
  incitingIncident: ['incitingIncident', 'firstEvent', 'incident', '最初の事件', '起点'],
  conflict: ['conflict', 'tension', '対立'],
  choice: ['choice', 'finalChoice', '最後に選ばせること', '選択'],
  payoff: ['payoff', 'aftertaste', 'readerPayoff', '読後感', '回収'],
};

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
    evidenceCards: report.evidenceCards?.map((card, index) => ({
      index,
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
    'Also return every visible non-plan generated section: deepAnalysis, categoryFitCards, beginnerGuide, evidenceCards.',
    'deepAnalysis must include categoryInsight, humanMotivation, narrativeMechanism.',
    'categoryFitCards must include title, whyThisMedium, creatorMove, example, evidenceAnchor.',
    'beginnerGuide must include headline, promise, firstOutput, steps, checklist, avoid.',
    'evidenceCards must include the exact zero-based index from the input evidenceCards array, claim, whyItMatters, meaningForCreator, creativeUse for each evidence card.',
    `The input has ${report.evidenceCards?.length ?? 0} evidenceCards. Return exactly one complete evidenceCards object for every input index from 0 to ${(report.evidenceCards?.length ?? 0) - 1}. Missing or partial evidenceCards are invalid.`,
    'Do not return pending markers, blank fields, local templates, or word-swapped copies. If uncertain, generate a specific answer from the evidence.',
    'Do not use the word テンプレート in visible generated fields. Explain the concrete story function instead.',
    'Do not write broad unsupported cultural claims such as 日本特有, 現代社会において, 誰もが経験, or 誰もが持っている unless the evidence itself states that exact scope.',
    'Reject typo-like Japanese. In particular, do not output 安督, 走続ける, repeated words, or partial English inside Japanese words.',
    'JSON shape: {"summary":"specific review","strongest_signal":"specific signal","practical_revision":"specific revision","risk_note":"specific risk","next_actions":["specific action"],"deepAnalysis":{"categoryInsight":"specific insight","humanMotivation":["motive"],"narrativeMechanism":["mechanism"]},"categoryFitCards":[{"title":"specific title","whyThisMedium":"specific medium reason","creatorMove":"specific creator move","example":"specific example","evidenceAnchor":"specific evidence"}],"beginnerGuide":{"headline":"specific workflow title","promise":"specific promise","firstOutput":"specific first output","steps":[{"label":"short label","action":"specific action","output":"specific output"}],"checklist":["specific check"],"avoid":["specific pitfall"]},"evidenceCards":[{"index":0,"claim":"matching claim","whyItMatters":"specific reading","meaningForCreator":"specific creator reading","creativeUse":"specific creative use"}]}',
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
    evidenceCards: report.evidenceCards?.map((card, index) => ({
      index,
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
    'Return every visible generated plan field for each plan.',
    'Required per-plan fields: id, titleCandidates, audiencePromise, emotionalHook, creatorBrief, premise, exampleDetail, outline, opening, differentiation, craftNotes, storyArchitecture.',
    'creatorBrief must include protagonist, setting, incitingIncident, conflict, choice, payoff.',
    'Do not return pending markers, blank fields, local templates, or word-swapped copies. If uncertain, generate a specific answer from the evidence.',
    'Prefer the exact English JSON keys in the schema. If a field is concise but specific, still return it instead of omitting it.',
    'Do not omit id. If you cannot keep an id, keep the plans in the exact same order as input creativePlans.',
    'JSON shape: {"plans":[{"id":"creativePlans id","titleCandidates":["title"],"audiencePromise":"specific promise","emotionalHook":"specific emotion","creatorBrief":{"protagonist":"specific person","setting":"specific place","incitingIncident":"specific first event","conflict":"specific conflict","choice":"specific final choice","payoff":"specific payoff"},"premise":"specific premise","exampleDetail":"specific first concrete example","outline":["beat 1","beat 2","beat 3"],"opening":"specific opening scene","differentiation":"specific difference","craftNotes":[{"label":"short label","detail":"specific production note"}],"storyArchitecture":{"notes":[{"label":"short label","detail":"specific story design"}]}}]}',
    'あなたは日本語コンテンツの商業編集者兼脚本開発者です。',
    '必ずJSONだけを返してください。',
    '目的: 各企画案の見出し、案の要点、本文・台本の流れ、プロ向け設計メモ、物語・台本設計を、公開Web/RSS根拠と企画下書きから新規に生成する。',
    '禁止: 固定テンプレ、単語差し替え、全案で同じ文型、ラベルだけ違う同文、一般論の穴埋め、ダミーデータ、架空の外部根拠。',
    '可視テキストでは「テンプレート」という語を使わず、具体的な制作判断で書く。',
    '根拠にない「日本特有」「現代社会において」「誰もが経験」「誰もが持っている」のような範囲断定を書かない。',
    '誤字、重複語、半端な英単語混入を残さない。安督、走続ける、感情感情のような文字列は禁止。',
    '各noteは、その案の根拠語、場面、矛盾、媒体、制作上の判断を読み直して書く。別案にそのまま移植できる文は禁止。',
    '実在人物、企業、作品、クリエイター、既存キャラクターを物語の主役・黒幕・告発対象にしない。',
    'plans配列は入力creativePlansと同じ件数にし、idを完全一致させる。1件でも省略しない。',
    '各planは titleCandidates, audiencePromise, emotionalHook, creatorBrief, premise, exampleDetail, outline, opening, differentiation, craftNotes, storyArchitecture を必ず返す。',
    '返却JSON schema:',
    '{"plans":[{"id":"creativePlansのid","titleCandidates":["短い案名"],"audiencePromise":"読者への約束","emotionalHook":"感情の引き","creatorBrief":{"protagonist":"主人公","setting":"舞台","incitingIncident":"最初の事件","conflict":"対立","choice":"最後に選ばせること","payoff":"読後感"},"premise":"作品本文の核","exampleDetail":"初回具体例","outline":["本文・台本の流れ1","本文・台本の流れ2","本文・台本の流れ3"],"opening":"冒頭例","differentiation":"安全・類似回避","craftNotes":[{"label":"短い見出し","detail":"80〜180字の固有判断"}],"storyArchitecture":{"notes":[{"label":"短い見出し","detail":"80〜180字の固有設計"}]}}]}',
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
    failureMessage: `${provider}の詳細分析に失敗しました。`,
    createRequest: (model) => createProviderAnalysisRequest({ provider, report, model }),
    parsePayload: (payload) => parseProviderPayload(provider, payload, report),
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
    failureMessage: `${provider}の設計メモ生成に失敗しました。`,
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
    failureMessage: `${provider}の参考文章生成に失敗しました。`,
    createRequest: (model) => createDraftSampleRequest({ provider, draftPrompt, model }),
    parsePayload: (payload) => parseDraftSamplePayload(provider, payload, prepareDraftPromptForSample(draftPrompt)),
  });
}

function createDraftSampleRequest({ provider, draftPrompt, model = primaryModel(provider) }) {
  const preparedDraftPrompt = prepareDraftPromptForSample(draftPrompt);
  const selectedTitle = extractSelectedTitleFromPrompt(preparedDraftPrompt);
  const prompt = [
    'あなたは日本語コンテンツの商業創作者です。',
    '以下の企画プロンプトをもとに、実際に読者・視聴者が続きを見たくなる参考文章そのものを書いてください。',
    selectedTitle ? `使用タイトル: ${selectedTitle}` : '',
    '要件:',
    '1. 日本語で書く。',
    '2. 実在人物、実在企業、既存作品、実在クリエイターを物語の主役・黒幕・告発対象にしない。',
    '3. 企画の核、冒頭フック、感情の引きを必ず反映する。',
    '4. 解説、企画書、構成メモではなく、本文・台本として読める形にする。',
    '5. Markdown記法（##、**、---、箇条書き）を使わない。',
    '6. 「タイトル候補」「カテゴリ」「構成」「冒頭例」などの企画メモの項目名を本文に出さない。',
    '7. 1行目は使用タイトルだけにし、別タイトルを作らない。2行目以降は完成稿の本文または台本にする。',
    '8. 物語系は場面描写を必ず入れ、会話が自然な題材では発話も入れて、短くても読める一場面にする。',
    '9. 動画系はナレーション、画面指示、字幕を含む実用台本にする。',
    '10. 最低600字。短すぎる要約や章立てだけの出力は禁止。',
    '11. 入力にない実在の法律、条文番号、官公庁、警察組織、専門測定値を決め手にしない。',
    '12. SNS投稿やコメントから、相手の食生活、部屋、収入、健康、心理状態を断定しない。',
    '13. 選んだ企画の舞台・主人公・最初の事件を守り、別案の舞台へ混ぜない。',
    '14. 日本語の途中に半端な英単語を混ぜない。誤字、重複語、変な造語を残さない。',
    '15. 入力の「主人公」「舞台」「最初の事件」「対立」「最後に選ばせること」「読後感」を本文中の事実として使う。名前、年齢、職業、場所、事件を勝手に置き換えない。',
    '16. 「テンプレート」「日本特有」「誰もが経験」「現代社会において」のような範囲の広い説明語で埋めない。',
    '17. 本文には主人公名を必ず入れる。入力の主人公に固有名がない場合は、自然な架空名を1つ付ける。舞台と最初の事件が読める場面を少なくとも1つ書く。',
    '18. 動物、非言語、観察型の題材では無理に台詞を入れず、動作、表情、視線、リズム、周囲の反応で場面を成立させる。実在人物・企業・サービス名は本文に出さず、架空名や一般化した名称に置き換える。',
    '',
    preparedDraftPrompt,
  ].filter((line) => line !== '').join('\n');

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
  const connectivityHint = attempts.some((attempt) => isProviderConnectivityReason(attempt.reason))
    ? ' キー、クォータ、提供元の状態を確認してください。'
    : '';
  throw new Error(
    `${failureMessage}${connectivityHint} 試行モデル: ${attempts.map((attempt) => attempt.model).join(' → ')}。${reasons ? ` 理由: ${reasons}` : ''}`,
  );
}

function isProviderConnectivityReason(reason = '') {
  return /HTTP\s*(401|403|408|409|429|5\d\d)|Incorrect API key|invalid_api_key|quota|rate limit|Failed to fetch|NetworkError|認証|拒否/i.test(
    String(reason),
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
      const titleMatch = line.match(/^(\s*)(タイトル候補|仮タイトル)\s*[:：]\s*(.+)$/);
      if (titleMatch) return `${titleMatch[1]}使用タイトル: ${pickPrimaryTitle(titleMatch[3])}`;
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

function parseProviderPayload(provider, payload, report) {
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
    const normalized = normalizeProviderSummary(parsedSummary, report);
    ensureCompleteGeneratedEvidenceCards(normalized, report);
    return normalized;
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

function ensureCompleteGeneratedEvidenceCards(summary, report) {
  const expectedCount = report?.evidenceCards?.length ?? 0;
  if (expectedCount <= 0) return;
  if (!Array.isArray(summary.evidenceCards) || summary.evidenceCards.length !== expectedCount) {
    throw new Error('API応答に全取得根拠のAI読み取りとAI企画判断がありませんでした。');
  }
  const expectedIndexes = new Set(Array.from({ length: expectedCount }, (_, index) => index));
  for (const card of summary.evidenceCards) {
    if (!expectedIndexes.has(card.index) || !card.claim || !card.whyItMatters || !card.meaningForCreator || !card.creativeUse) {
      throw new Error('API応答に全取得根拠のAI読み取りとAI企画判断がありませんでした。');
    }
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
  const knownPlanIdList = (report.creativePlans ?? []).map((plan) => plan.id);
  const knownPlanIds = new Set(knownPlanIdList);
  const rawPlans = firstArray(payload.plans, payload.creativePlans, payload.planDesigns, payload.designs);
  const plans = rawPlans
    .map((plan, index) => normalizePlanDesign(plan, knownPlanIds, knownPlanIdList[index]))
    .filter(Boolean);

  if (plans.length !== knownPlanIds.size) {
    throw new Error('API応答に全企画案で利用できる制作案がありませんでした。');
  }

  return { plans };
}

function normalizePlanDesign(plan, knownPlanIds, fallbackId = '') {
  const id = stringifySummaryValue(pickPlanValue(plan, ['id', 'planId', 'creativePlanId', '案id', '企画案ID'])).trim() || fallbackId;
  if (!id || !knownPlanIds.has(id)) return null;

  const craftNotes = normalizeDesignNotes(
    pickPlanValue(plan, ['craftNotes', 'professionalNotes', 'productionNotes', 'professionalMemo', 'プロ向け設計メモ', '制作メモ']),
  ).slice(0, 5);
  const storySource = pickPlanValue(plan, ['storyArchitecture', 'storyDesign', 'scriptDesign', '物語・台本設計', '物語設計', '台本設計']);
  const storyNotes = normalizeDesignNotes(storySource?.notes ?? storySource).slice(0, 6);
  if (craftNotes.length < 2 || storyNotes.length < 2) return null;
  if (looksLikeTemplateSet([...craftNotes, ...storyNotes])) return null;

  const normalized = {
    id,
    craftNotes,
    storyArchitecture: {
      status: 'done',
      source: 'provider',
      notes: storyNotes,
    },
  };

  const titleCandidates = normalizePlanStringList(
    pickPlanValue(plan, ['titleCandidates', 'titles', 'title', '案名', 'タイトル候補', '使用タイトル']),
    PLAN_TITLE_MIN_LENGTH,
  ).slice(0, 4);
  if (titleCandidates.length > 0) normalized.titleCandidates = titleCandidates;

  for (const field of REQUIRED_PLAN_TEXT_FIELDS) {
    const value = normalizePlanText(pickPlanValue(plan, PLAN_TEXT_FIELD_ALIASES[field] ?? [field]), PLAN_TEXT_MIN_LENGTH);
    if (value) normalized[field] = value;
  }

  const creatorBrief = normalizeCreatorBrief(pickPlanValue(plan, ['creatorBrief', 'brief', 'planBrief', '案の要点', '企画要点']));
  if (Object.keys(creatorBrief).length > 0) normalized.creatorBrief = creatorBrief;

  const outline = normalizePlanStringList(
    pickPlanValue(plan, ['outline', 'flow', 'beats', 'scriptFlow', '本文・台本の流れ', '構成']),
    PLAN_LIST_ITEM_MIN_LENGTH,
  ).slice(0, 8);
  if (outline.length > 0) normalized.outline = outline;

  if (!hasCompleteGeneratedPlan(normalized)) return null;
  return normalized;
}

function hasCompleteGeneratedPlan(plan) {
  if (!Array.isArray(plan.titleCandidates) || !plan.titleCandidates[0]) return false;
  if (!REQUIRED_PLAN_TEXT_FIELDS.every((field) => Boolean(plan[field]))) return false;
  if (!REQUIRED_CREATOR_BRIEF_FIELDS.every((field) => Boolean(plan.creatorBrief?.[field]))) return false;
  if (!Array.isArray(plan.outline) || plan.outline.length < 3) return false;
  return true;
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
    .filter((note) => note.label.length >= 2 && note.detail.length >= DESIGN_NOTE_DETAIL_MIN_LENGTH)
    .filter((note) => !hasGeneratedTextQualityIssue(`${note.label} ${note.detail}`));
}

function normalizeCreatorBrief(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    REQUIRED_CREATOR_BRIEF_FIELDS
      .map((field) => [field, normalizePlanText(pickPlanValue(value, CREATOR_BRIEF_ALIASES[field] ?? [field]), CREATOR_BRIEF_MIN_LENGTH)])
      .filter(([, text]) => Boolean(text)),
  );
}

function normalizePlanStringList(value, minLength = PLAN_LIST_ITEM_MIN_LENGTH) {
  const rawItems = Array.isArray(value) ? value : value ? [value] : [];
  return rawItems
    .map((item) => normalizePlanText(item, minLength))
    .filter(Boolean);
}

function normalizePlanText(value, minLength = PLAN_TEXT_MIN_LENGTH) {
  const text = stringifySummaryValue(value).trim();
  if (text.length < minLength) return '';
  if (hasGeneratedTextQualityIssue(text)) return '';
  return text;
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) ?? [];
}

function pickPlanValue(value, keys) {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) {
    if (Object.hasOwn(value, key)) return value[key];
  }
  return undefined;
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
  const preparedDraftPrompt = prepareDraftPromptForSample(draftPrompt);
  const selectedTitle = extractSelectedTitleFromPrompt(preparedDraftPrompt);

  const text = cleanDraftSampleText(raw || '');
  if (!text) {
    throw new Error('参考文章として表示できる本文が返りませんでした。もう一度生成してください。');
  }
  const titledText = ensureDraftSampleTitle(text, selectedTitle);
  if (!isUsableDraftSample(titledText, preparedDraftPrompt)) {
    throw new Error('本文として使える具体的な場面や台詞が不足しています。もう一度生成してください。');
  }

  return { text: titledText };
}

function providerPayloadText(provider, payload) {
  return provider === 'gemini'
    ? payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n')
    : payload.output_text ??
        payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
}

function isUsableDraftSample(text, draftPrompt = '') {
  const normalized = text.replace(/\s+/g, '');
  if (normalized.length < 160) return false;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const outlineLikeLines = lines.filter((line) =>
    /^(第?\d+話|第?\d+章|\d+[.．、:：]|起|承|転|結|構成|概要|タイトル)/.test(line),
  );
  if (outlineLikeLines.length >= Math.max(3, Math.ceil(lines.length * 0.6))) return false;
  if (hasUnsupportedOfficialClaim(text)) return false;
  if (hasPrivateLifeProfiling(text)) return false;
  if (hasBrokenJapaneseArtifact(text)) return false;
  if (hasUnsupportedScopeClaim(text)) return false;
  if (hasDraftPromptLabelLeak(text)) return false;
  if (!matchesDraftPromptCore(text, draftPrompt)) return false;
  return hasDraftNarrativeSignal(text, draftPrompt);
}

function hasUnsupportedOfficialClaim(text) {
  return /第[一二三四五六七八九十百千0-9]+条|官公庁|厚生労働省|警察組織|警察隊|法律上|法的に|規則上|測定器|測定値|基準値/.test(
    text,
  );
}

function hasPrivateLifeProfiling(text) {
  return /投稿履歴|投稿を調べ|普段どんな投稿|食生活|収入|健康状態|心理状態|部屋が.*散ら|寂しい人|舌が.*慣れて|欲している/.test(
    text,
  );
}

function hasBrokenJapaneseArtifact(text) {
  return /安督|走続ける|感情感情|[ァ-ヶー]+[A-Za-z]+[ぁ-んァ-ヶー]*/.test(text);
}

function hasUnsupportedScopeClaim(text) {
  return /日本特有|現代社会において|誰もが経験|誰もが持っている|人々は[^。]{0,24}傾向/.test(text);
}

function hasDraftPromptLabelLeak(text) {
  return /(^|\n)\s*(タイトル候補|カテゴリ|案の要点|主人公|舞台|最初の事件|対立|最後に選ばせること|読後感|本文生成用プロンプト|プロ向け設計メモ|物語・台本設計)\s*[:：]|最初の事件が起きた/.test(
    text,
  );
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
  const firstLineLooksLikeWrongTitle =
    lines[0] &&
    lines[0].length <= 36 &&
    !/[。！？!?、，]/.test(lines[0]) &&
    !/^「/.test(lines[0]);
  const bodyLines = firstLineLooksLikeWrongTitle ? lines.slice(1) : lines;
  return `${cleanTitle}\n\n${bodyLines.join('\n')}`;
}

function extractSelectedTitleFromPrompt(prompt = '') {
  const match = String(prompt).match(/^使用タイトル\s*[:：]\s*(.+)$/m);
  return match?.[1]?.split('/')[0]?.trim() ?? '';
}

function matchesDraftPromptCore(text, draftPrompt = '') {
  const prompt = String(draftPrompt ?? '');
  const core = {
    protagonist: promptLineValue(prompt, '主人公'),
    setting: promptLineValue(prompt, '舞台'),
    incitingIncident: promptLineValue(prompt, '最初の事件'),
  };
  if (!core.protagonist || !core.setting || !core.incitingIncident) return true;

  const normalizedText = normalizeForCoreCompare(text);
  const protagonistNames = extractJapaneseNameTerms(core.protagonist);
  if (protagonistNames.length > 0 && !hasAnyCoreTerm(normalizedText, protagonistNames)) return false;

  const settingTerms = extractCoreTerms(core.setting);
  if (settingTerms.length > 0 && !hasEnoughCoreTerms(normalizedText, settingTerms, 1)) return false;

  const incidentTerms = extractCoreTerms(core.incitingIncident);
  if (incidentTerms.length > 0 && !hasEnoughCoreTerms(normalizedText, incidentTerms, 1)) return false;

  return true;
}

function promptLineValue(prompt, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(prompt).match(new RegExp(`^\\s*-?\\s*${escapedLabel}\\s*[:：]\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function extractJapaneseNameTerms(value) {
  const text = String(value ?? '');
  return [
    ...new Set(
      [
        ...text.matchAll(/(?:の|・|＆|&|、|,|／|\/)([ぁ-んァ-ヶー一-龯々]{2,8})(?=[（(]|$|、|。|\s|＆|&|／|\/|と)/g),
        ...text.matchAll(/^([ぁ-んァ-ヶー一-龯々]{2,8})(?:[（(]|$|、|。|\s)/g),
      ]
        .map((match) => match[1])
        .filter((term) => !DRAFT_CORE_STOPWORDS.has(term)),
    ),
  ];
}

function extractCoreTerms(value) {
  const text = normalizeForCoreCompare(value)
    .replace(/[（(][^）)]*[）)]/g, ' ')
    .replace(/(という|として|ながら|ため|こと|もの|よう|だけ|見事|始める|し始める|はじめる|始まる|し始まる)/g, ' ')
    .replace(/[「」『』【】、。,.]/g, ' ')
    .replace(/[はがをにでとやもへの]|から|まで|より/g, ' ');
  const shortPlaceTerms = [...new Set([...text].filter((char) => DRAFT_SINGLE_PLACE_TERMS.has(char)))];
  const baseTerms = [...(text.match(/[一-龯々ぁ-んァ-ヶーA-Za-z0-9]{2,18}/g) ?? []), ...shortPlaceTerms];
  return [
    ...new Set(
      baseTerms
        .flatMap((term) => [term, ...expandCoreTermFragments(term)])
        .map((term) => term.trim())
        .filter((term) => term.length >= 1 && !DRAFT_CORE_STOPWORDS.has(term) && !/^[0-9０-９]+$/.test(term)),
    ),
  ].slice(0, 14);
}

function expandCoreTermFragments(term) {
  const compact = String(term ?? '').replace(/\s+/g, '');
  if (!compact) return [];

  const fragments = new Set();
  const scriptRuns = compact.match(/[一-龯々]+|[ぁ-ん]+|[ァ-ヶー]+|[A-Za-z0-9]+/g) ?? [];
  for (const run of scriptRuns) {
    if (run.length >= 2 && !/^[ぁ-ん]+$/.test(run)) fragments.add(run);
  }

  const withoutLocationSuffix = compact.replace(/(?:内|外|上|下|中|前|後|横|側|沿い|周辺|付近|近く)$/, '');
  if (withoutLocationSuffix.length >= 2 && withoutLocationSuffix !== compact) fragments.add(withoutLocationSuffix);

  const maxSize = Math.min(8, compact.length);
  for (let size = maxSize; size >= 3; size -= 1) {
    for (let index = 0; index <= compact.length - size; index += 1) {
      const fragment = compact.slice(index, index + size);
      if (!/^[ぁ-ん]+$/.test(fragment)) fragments.add(fragment);
    }
  }

  return [...fragments].filter((fragment) => fragment && fragment !== compact && !DRAFT_CORE_STOPWORDS.has(fragment));
}

function normalizeForCoreCompare(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/X（旧Twitter）|X\(旧Twitter\)|旧Twitter|Twitter|ソーシャルメディア|SNS/g, 'ネット')
    .replace(/キャッシュバックキャンペーン/g, 'キャンペーン')
    .replace(/キャッシュバック|還元祭|還元/g, 'キャンペーン')
    .replace(/[一-龯々ぁ-んァ-ヶー]{0,3}臭|におい/g, '匂い')
    .replace(/話しかけ|声をかけ|絡まれ|絡み|絡む|呼びかけ/g, '接触')
    .replace(/尻尾|尾っぽ/g, 'しっぽ')
    .replace(/朝ごはん|朝御飯|朝ご飯/g, '朝食')
    .replace(/同じリズム|同調|ぴたり|ぴったり|そろ(?:う|い|っ|え|わ|って)|揃(?:う|い|っ|え|わ|って)/g, 'シンクロ')
    .replace(/\s+/g, '');
}

function hasAnyCoreTerm(normalizedText, terms) {
  return terms.some((term) => normalizedText.includes(normalizeForCoreCompare(term)));
}

function hasEnoughCoreTerms(normalizedText, terms, minimum) {
  const strongTerms = terms.filter((term) => !DRAFT_WEAK_CORE_TERMS.has(term));
  const targetTerms = strongTerms.length > 0 ? strongTerms : terms;
  const matches = targetTerms.filter((term) => normalizedText.includes(normalizeForCoreCompare(term)));
  return matches.length >= Math.min(minimum, targetTerms.length);
}

function hasDraftNarrativeSignal(text, draftPrompt = '') {
  if (/[「」『』]|セリフ|字幕|ナレーション|画面|主人公|彼|彼女|私|僕|俺/.test(text)) return true;
  const protagonistNames = extractJapaneseNameTerms(promptLineValue(String(draftPrompt ?? ''), '主人公'));
  const normalizedText = normalizeForCoreCompare(text);
  const sentenceCount = (String(text).match(/[。！？!?]/g) ?? []).length;
  if (protagonistNames.length > 0 && hasAnyCoreTerm(normalizedText, protagonistNames) && sentenceCount >= 3) return true;

  const settingTerms = extractCoreTerms(promptLineValue(String(draftPrompt ?? ''), '舞台'));
  const incidentTerms = extractCoreTerms(promptLineValue(String(draftPrompt ?? ''), '最初の事件'));
  const hasSceneCore =
    (settingTerms.length === 0 || hasEnoughCoreTerms(normalizedText, settingTerms, 1)) &&
    (incidentTerms.length === 0 || hasEnoughCoreTerms(normalizedText, incidentTerms, 1));
  return sentenceCount >= 4 && hasSceneCore && hasConcreteSceneMovement(text);
}

function hasConcreteSceneMovement(text) {
  const prose = String(text ?? '');
  const particlePhrases = prose.match(/[一-龯々ぁ-んァ-ヶーA-Za-z0-9]{2,18}[はがをにへでとからまで]/g) ?? [];
  const actionPhrases = prose.match(
    /[一-龯々ぁ-んァ-ヶー]{2,24}(?:した|して|する|している|していた|された|される|った|っている|っていた|めた|けた|えた|いた|いる|なる|なった|出す|戻る|戻った|止まる|止まった|動く|動いた|見る|見た|向く|向けた|入る|入った|開く|開いた|閉じる|閉じた)/g,
  ) ?? [];
  const sentenceCount = (prose.match(/[。！？!?]/g) ?? []).length;
  return sentenceCount >= 4 && particlePhrases.length >= 6 && actionPhrases.length >= 4;
}

function normalizeProviderSummary(summary, report) {
  const normalized = {
    ...summary,
    summary: stringifySummaryValue(summary.summary),
    strongest_signal: stringifySummaryValue(summary.strongest_signal),
    practical_revision: stringifySummaryValue(summary.practical_revision),
    risk_note: stringifySummaryValue(summary.risk_note),
    next_actions: normalizeActionList(summary.next_actions),
  };
  delete normalized.deepAnalysis;
  delete normalized.categoryFitCards;
  delete normalized.beginnerGuide;
  delete normalized.evidenceCards;

  const deepAnalysis = normalizeGeneratedDeepAnalysis(summary.deepAnalysis ?? summary);
  if (deepAnalysis) normalized.deepAnalysis = deepAnalysis;

  const categoryFitCards = normalizeGeneratedCategoryFitCards(summary.categoryFitCards);
  if (categoryFitCards.length > 0) normalized.categoryFitCards = categoryFitCards;

  const beginnerGuide = normalizeGeneratedBeginnerGuide(summary.beginnerGuide);
  if (beginnerGuide) normalized.beginnerGuide = beginnerGuide;

  const evidenceCards = normalizeGeneratedEvidenceCards(summary.evidenceCards, report?.evidenceCards?.length ?? 0);
  if (evidenceCards.length > 0) normalized.evidenceCards = evidenceCards;

  return normalized;
}

function normalizeGeneratedDeepAnalysis(value) {
  if (!value || typeof value !== 'object') return null;
  const categoryInsight = normalizeGeneratedText(value.categoryInsight ?? value.insight ?? value.summary, 12);
  const humanMotivation = normalizeGeneratedStringList(value.humanMotivation ?? value.motivations).slice(0, 6);
  const narrativeMechanism = normalizeGeneratedStringList(value.narrativeMechanism ?? value.mechanisms).slice(0, 6);
  if (!categoryInsight && humanMotivation.length === 0 && narrativeMechanism.length === 0) return null;
  return {
    status: 'done',
    source: 'provider',
    categoryInsight,
    humanMotivation,
    narrativeMechanism,
  };
}

function normalizeActionList(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.map(stringifySummaryValue).filter(Boolean);
}

function normalizeGeneratedCategoryFitCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card) => ({
      title: normalizeGeneratedText(card?.title ?? card?.label, 4),
      whyThisMedium: normalizeGeneratedText(card?.whyThisMedium ?? card?.reason, 12),
      creatorMove: normalizeGeneratedText(card?.creatorMove ?? card?.move, 12),
      example: normalizeGeneratedText(card?.example ?? card?.detail, 8),
      evidenceAnchor: normalizeGeneratedText(card?.evidenceAnchor ?? card?.anchor, 4),
    }))
    .filter((card) => card.title && card.whyThisMedium && card.creatorMove)
    .slice(0, 6);
}

function normalizeGeneratedBeginnerGuide(guide) {
  if (!guide || typeof guide !== 'object') return null;
  const steps = Array.isArray(guide.steps)
    ? guide.steps
        .map((step) => ({
          label: normalizeGeneratedText(step?.label ?? step?.title, 2),
          action: normalizeGeneratedText(step?.action ?? step?.detail ?? step?.description, 8),
          output: normalizeGeneratedText(step?.output ?? step?.result, 4),
        }))
        .filter((step) => step.label && step.action)
        .slice(0, 6)
    : [];
  const normalized = {
    headline: normalizeGeneratedText(guide.headline ?? guide.title, 6),
    promise: normalizeGeneratedText(guide.promise ?? guide.description, 10),
    firstOutput: normalizeGeneratedText(guide.firstOutput ?? guide.output, 6),
    steps,
    checklist: normalizeGeneratedStringList(guide.checklist).slice(0, 8),
    avoid: normalizeGeneratedStringList(guide.avoid ?? guide.pitfalls).slice(0, 8),
  };
  if (!normalized.headline || !normalized.promise || !normalized.firstOutput || normalized.steps.length === 0) return null;
  return normalized;
}

function normalizeGeneratedEvidenceCards(cards, expectedCount = 0) {
  if (!Array.isArray(cards)) return [];
  const normalizedCards = cards
    .map((card) => {
      const index = Number(card?.index);
      const normalized = {
        claim: normalizeGeneratedText(card?.claim ?? card?.title, 4),
        whyItMatters: normalizeGeneratedText(card?.whyItMatters ?? card?.why, 10),
        meaningForCreator: normalizeGeneratedText(card?.meaningForCreator ?? card?.meaning, 10),
        creativeUse: normalizeGeneratedText(card?.creativeUse ?? card?.use, 10),
      };
      if (Number.isInteger(index) && index >= 0) normalized.index = index;
      return normalized;
    })
    .filter((card) => card.claim && card.whyItMatters && card.meaningForCreator && card.creativeUse)
    .slice(0, 12);
  return rebaseOneBasedEvidenceIndexes(normalizedCards, expectedCount);
}

function rebaseOneBasedEvidenceIndexes(cards, expectedCount) {
  if (!expectedCount || cards.length === 0) return cards;
  const indexes = cards.map((card) => card.index).filter(Number.isInteger);
  if (indexes.length === 0 || indexes.includes(0)) return cards;
  const minIndex = Math.min(...indexes);
  const maxIndex = Math.max(...indexes);
  if (minIndex !== 1 || maxIndex > expectedCount) return cards;
  return cards.map((card) => (Number.isInteger(card.index) ? { ...card, index: card.index - 1 } : card));
}

function normalizeGeneratedStringList(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\n|\/|、/) : [];
  return raw.map((item) => normalizeGeneratedText(item, 4)).filter(Boolean);
}

function normalizeGeneratedText(value, minLength = 1) {
  const text = stringifySummaryValue(value).trim();
  if (text.length < minLength || hasPendingMarker(text)) return '';
  if (hasGeneratedTextQualityIssue(text)) return '';
  return text;
}

function hasGeneratedTextQualityIssue(text) {
  const value = String(text ?? '');
  return (
    looksLikeTemplateDetail(value) ||
    hasUnsupportedOfficialClaim(value) ||
    hasPrivateLifeProfiling(value) ||
    hasBrokenJapaneseArtifact(value) ||
    hasUnsupportedScopeClaim(value)
  );
}

function hasPendingMarker(value) {
  return /AI生成待ち|AI応答がまだない|API応答がまだない|未生成|ローカル定型文/.test(String(value ?? ''));
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
  const text = collapseAdjacentDuplicateJapanesePhrase(String(value ?? '').trim());
  if (!text || looksGarbledJapanese(text)) return '';
  return text;
}

function collapseAdjacentDuplicateJapanesePhrase(value) {
  let text = String(value ?? '');
  for (let length = 8; length >= 2; length -= 1) {
    const pattern = new RegExp(`([一-龯ぁ-んァ-ヶー]{${length}})\\1`, 'g');
    text = text.replace(pattern, '$1');
  }
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
