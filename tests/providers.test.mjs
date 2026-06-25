import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProviderStatus,
  createProviderAnalysisRequest,
  getProviderModelChain,
  runProviderAnalysis,
  runDraftSample,
} from '../src/lib/providers.js';

const USABLE_STORY_SAMPLE = [
  '夜の通知音で、真白は目を覚ました。「また評価の日か」と彼女はつぶやく。',
  '画面には、誰にも見えない灰色の査定欄が浮かんでいた。そこには仕事の出来ではなく、会議で誰かが残した曖昧な印象だけが並んでいる。',
  '真白はスマートフォンを握りしめ、昨日助けてくれた先輩の名前にも同じ灰色の欄がついていることに気づいた。「これ、私だけの問題じゃない」。',
  '出勤カードをかざした瞬間、端末の奥で次の評価がゆっくり書き換わり始めた。主人公は息をのみ、まず自分の評価ではなく、先輩の欄を開く。',
  '欄の下には、彼女が昨日飲み込んだ一言まで、他人の評価材料として保存されていた。',
].join('');
const OPENAI_TEST_KEY = `sk-${'proj'}-abcdefghijklmnopqrstuvwxyz`;
const OPENAI_SECRET_KEY = `sk-${'proj'}-secret`;
const GEMINI_TEST_KEY = `AI${'zaSy'}DUMMY1234567890`;

test('getProviderStatus detects provider from a single API key field', () => {
  const openaiStatus = getProviderStatus({ apiKey: OPENAI_TEST_KEY });
  const geminiStatus = getProviderStatus({ apiKey: GEMINI_TEST_KEY });
  assert.equal(openaiStatus.mode, 'openai');
  assert.equal(geminiStatus.mode, 'gemini');
  assert.equal(getProviderStatus({ apiKey: '' }).mode, 'fixture');
  assert.equal(getProviderStatus({ apiKey: 'not-a-real-provider-key' }).mode, 'unknown');
  assert.equal(openaiStatus.provider.label, 'OpenAI gpt-4.1');
  assert.equal(geminiStatus.provider.label, 'Gemini gemini-3.5-flash');
  assert.equal(openaiStatus.provider.label.includes('sk-'), false);
  assert.equal(geminiStatus.provider.label.includes('AIza'), false);
});

test('provider request includes report schema instructions and excludes API keys', () => {
  const request = createProviderAnalysisRequest({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: {
      category: { label: 'ストーリー漫画' },
      evidenceCards: [
        {
          claim: '生活不安をページ上の異常表示に変換できる',
          source: '短尺反応データ',
          sourceUrls: ['https://ads.tiktok.com/example'],
          timeWindow: '2026-06-24T00:00:00Z',
          metricsSummary: '反応大',
        },
      ],
    },
  });
  assert.match(JSON.stringify(request), /JSON/);
  assert.match(JSON.stringify(request), /短尺反応データ/);
  assert.equal(JSON.stringify(request).includes(OPENAI_SECRET_KEY), false);
  assert.doesNotMatch(JSON.stringify(request), /ads\.tiktok|2026-06-24/);
});

test('provider model chains follow the Nano Banana Pro text fallback order', () => {
  assert.deepEqual(getProviderModelChain('gemini'), [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
  ]);
  assert.deepEqual(getProviderModelChain('openai'), ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o']);
});

test('runProviderAnalysis uses Authorization header without exposing key in body', async () => {
  let captured;
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return {
            output_text: '{"summary":"ok"}',
          };
        },
      };
    },
  });

  assert.equal(result.summary, 'ok');
  assert.equal(captured.init.headers.Authorization, `Bearer ${OPENAI_SECRET_KEY}`);
  assert.equal(captured.init.body.includes(OPENAI_SECRET_KEY), false);
  assert.equal(result.used_model, 'gpt-4.1');
});

test('runProviderAnalysis sends Gemini keys in a header without URL query exposure', async () => {
  let captured;
  const result = await runProviderAnalysis({
    provider: 'gemini',
    apiKey: GEMINI_TEST_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return {
            candidates: [{ content: { parts: [{ text: '{"summary":"gemini ok"}' }] } }],
          };
        },
      };
    },
  });

  assert.equal(result.summary, 'gemini ok');
  assert.doesNotMatch(captured.url, /\?key=/);
  assert.equal(captured.init.headers['x-goog-api-key'], GEMINI_TEST_KEY);
  assert.equal(captured.init.body.includes(GEMINI_TEST_KEY), false);
  assert.equal(result.used_model, 'gemini-3.5-flash');
});

test('runProviderAnalysis falls back to the next Nano Banana Pro model on provider failure', async () => {
  const attemptedModels = [];
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      attemptedModels.push(body.model);
      if (attemptedModels.length === 1) {
        return {
          ok: false,
          status: 429,
          async json() {
            return { error: { message: `quota for ${OPENAI_SECRET_KEY}` } };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return {
            output_text: '{"summary":"fallback ok"}',
          };
        },
      };
    },
  });

  assert.deepEqual(attemptedModels, ['gpt-4.1', 'gpt-4.1-mini']);
  assert.equal(result.summary, 'fallback ok');
  assert.equal(result.used_model, 'gpt-4.1-mini');
  assert.deepEqual(
    result.fallback_chain.map((attempt) => `${attempt.model}:${attempt.status}`),
    ['gpt-4.1:failed', 'gpt-4.1-mini:success'],
  );
  assert.equal(JSON.stringify(result).includes(OPENAI_SECRET_KEY), false);
});

test('runProviderAnalysis converts object next actions into readable text', async () => {
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            summary: 'ok',
            next_actions: [
              { title: '冒頭', detail: '1ページ目で損失を見せる' },
              { action: '保存理由を企画ごとに追加する' },
              '文字列の行動',
            ],
          }),
        };
      },
    }),
  });

  assert.deepEqual(result.next_actions, [
    '冒頭: 1ページ目で損失を見せる',
    '保存理由を企画ごとに追加する',
    '文字列の行動',
  ]);
  assert.doesNotMatch(result.next_actions.join('\n'), /\[object Object\]/);
});

test('runProviderAnalysis removes markdown decoration from display fields', async () => {
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            summary: '**生活不安**を扱う',
            strongest_signal: '1. **「可視化」** のギミック',
            practical_revision: '- **感情フック**: 冒頭で損失を示す',
            risk_note: '**固有名詞**を主役にしない',
            next_actions: [{ title: '**冒頭**', detail: '**損失**を見せる' }],
          }),
        };
      },
    }),
  });

  assert.equal(result.summary, '生活不安を扱う');
  assert.equal(result.strongest_signal, '1. 「可視化」 のギミック');
  assert.equal(result.practical_revision, '感情フック: 冒頭で損失を示す');
  assert.equal(result.risk_note, '固有名詞を主役にしない');
  assert.deepEqual(result.next_actions, ['冒頭: 損失を見せる']);
  assert.doesNotMatch(JSON.stringify(result), /\*\*/);
});

test('runProviderAnalysis extracts Gemini fenced JSON before display normalization', async () => {
  const result = await runProviderAnalysis({
    provider: 'gemini',
    apiKey: GEMINI_TEST_KEY,
    report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: [
                      '```json',
                      JSON.stringify({
                        summary: '日常の理不尽を小道具で見せる',
                        strongest_signal: '読者が自分ごと化できる違和感',
                        practical_revision: '冒頭に異常な通知欄を置く',
                        risk_note: '実在企業を黒幕化しない',
                        next_actions: [{ title: '1ページ目', detail: '損失を絵で見せる' }],
                      }),
                      '```',
                    ].join('\n'),
                  },
                ],
              },
            },
          ],
        };
      },
    }),
  });

  assert.equal(result.summary, '日常の理不尽を小道具で見せる');
  assert.equal(result.strongest_signal, '読者が自分ごと化できる違和感');
  assert.deepEqual(result.next_actions, ['1ページ目: 損失を絵で見せる']);
  assert.doesNotMatch(result.summary, /\{\s*"summary"/);
  assert.doesNotMatch([result.summary, result.strongest_signal, result.practical_revision, result.risk_note].join('\n'), /```|\{\s*"summary"/);
});

test('runDraftSample sends a paste-ready prompt without exposing the key in the body', async () => {
  let captured;
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      'タイトル候補: 灰色の査定欄 / きみの評価は嘘をつく',
      '創作ブリーフ:',
      '主人公: 契約社員の女性',
      '最初の事件: 評価欄に誰にも見えない灰色の理由が浮かぶ',
    ].join('\n'),
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return {
            output_text: USABLE_STORY_SAMPLE,
          };
        },
      };
    },
  });

  assert.match(result.text, /夜の通知音/);
  assert.equal(captured.init.headers.Authorization, `Bearer ${OPENAI_SECRET_KEY}`);
  assert.match(captured.init.body, /使用タイトル: 灰色の査定欄/);
  assert.match(captured.init.body, /主人公: 契約社員の女性/);
  assert.doesNotMatch(captured.init.body, /タイトル候補:/);
  assert.equal(captured.init.body.includes(OPENAI_SECRET_KEY), false);
});

test('runDraftSample routes through the local proxy when proxyBase is set (fixes OpenAI browser CORS)', async () => {
  let captured;
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: ['カテゴリ: ストーリー漫画', '使用タイトル: 灰色の査定欄', '主人公: 真白'].join('\n'),
    proxyBase: '/api/provider-generate',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, async json() { return { output_text: USABLE_STORY_SAMPLE }; } };
    },
  });

  assert.match(result.text, /夜の通知音/);
  // 直接プロバイダURLではなく、ローカル中継へPOSTしている。
  assert.equal(captured.url, '/api/provider-generate');
  const proxyBody = JSON.parse(captured.init.body);
  assert.equal(proxyBody.provider, 'openai');
  assert.equal(proxyBody.model, 'gpt-4.1');
  assert.equal(proxyBody.apiKey, OPENAI_SECRET_KEY);
  assert.equal(typeof proxyBody.body, 'object');
  // Authorizationヘッダにキーを載せない（中継先がサーバー側で付与する）。
  assert.equal(captured.init.headers.Authorization, undefined);
});

test('runDraftSample cleans markdown labels from reference drafts', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      'タイトル候補: 灰色の査定欄 / きみの評価は嘘をつく',
      '創作ブリーフ:',
      '主人公: 契約社員の女性',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: [
            '## ストーリー漫画 第1話 台本',
            '**タイトル候補:** 灰色の査定欄',
            '---',
            '### 第1話',
            USABLE_STORY_SAMPLE,
          ].join('\n'),
        };
      },
    }),
  });

  assert.match(result.text, /夜の通知音/);
  assert.match(result.text, /灰色の査定欄/);
  assert.doesNotMatch(result.text, /タイトル候補|##|###|\*\*|---|台本/);
});

test('runDraftSample keeps the selected title at the top of the reference draft', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 灰色の査定欄',
      '主人公: 契約社員の真白',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: USABLE_STORY_SAMPLE,
        };
      },
    }),
  });

  assert.match(result.text, /^灰色の査定欄\n/);
});

test('runDraftSample does not duplicate the title when provider already starts with it', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 灰色の査定欄',
      '主人公: 契約社員の真白',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: `灰色の査定欄\n${USABLE_STORY_SAMPLE}`,
        };
      },
    }),
  });

  assert.equal(result.text.split('\n').filter((line) => line.trim() === '灰色の査定欄').length, 1);
});

test('runDraftSample separates the selected title when the provider attaches prose to it', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 灰色の査定欄',
      '主人公: 契約社員の真白',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: `灰色の査定欄${USABLE_STORY_SAMPLE}`,
        };
      },
    }),
  });

  assert.match(result.text, /^灰色の査定欄\n\n/);
  assert.equal(result.text.split('\n').filter((line) => line.trim() === '灰色の査定欄').length, 1);
});

test('runDraftSample treats blank cleaned drafts as provider failure instead of blank output', async () => {
  await assert.rejects(
    () =>
      runDraftSample({
        provider: 'openai',
        apiKey: OPENAI_SECRET_KEY,
        draftPrompt: [
          'カテゴリ: ストーリー漫画',
          '使用タイトル: 灰色の査定欄',
          '創作ブリーフ:',
          '主人公: 契約社員の女性',
        ].join('\n'),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              output_text: [
                '## ストーリー漫画 第1話 台本',
                '**タイトル候補:** 灰色の査定欄',
                '---',
              ].join('\n'),
            };
          },
        }),
      }),
    /参考文章として表示できる本文が返りませんでした/,
  );
});

test('runDraftSample rejects outline-only drafts that are not usable reference prose', async () => {
  await assert.rejects(
    () =>
      runDraftSample({
        provider: 'openai',
        apiKey: OPENAI_SECRET_KEY,
        draftPrompt: [
          'カテゴリ: ストーリー漫画',
          '使用タイトル: 灰色の査定欄',
          '主人公: 契約社員の真白',
        ].join('\n'),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              output_text: [
                '第1話: 最低評価の通知',
                '第2話: 先輩の評価',
                '第3話: 会議で告発',
              ].join('\n'),
            };
          },
        }),
      }),
    /本文として使える具体的な場面や台詞が不足しています/,
  );
});
