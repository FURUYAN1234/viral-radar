import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getProviderStatus,
  createProviderAnalysisRequest,
  createPlanDesignRequest,
  getProviderModelChain,
  runPlanDesignGeneration,
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

test('provider production rules do not hardcode the current browser sample scenario', () => {
  const source = readFileSync(new URL('../src/lib/providers.js', import.meta.url), 'utf8');
  for (const sampleTerm of [
    'ケンドーコバヤシ',
    '乙武',
    '渡辺直美',
    '秋田犬',
    'ワオキツネザル',
    'チンアナゴ',
    '新幹線',
    'グリーン車',
    '悪臭',
  ]) {
    assert.doesNotMatch(source, new RegExp(sampleTerm), `${sampleTerm} must stay in fixtures, not production rules`);
  }
});

function providerDesignReport() {
  return {
    category: { id: 'story-manga', label: 'ストーリー漫画' },
    timeWindow: '7d',
    audience: 'general',
    limitations: ['公開Web/RSSの取得結果は制作前に確認する。'],
    evidenceCards: [
      {
        claim: '番号不足への不安が反応している',
        source: 'Google News RSS',
        metricsSummary: 'rank 1 / recency 90',
        observation: '携帯電話に060番号が追加され番号不足への不安が話題に',
        meaningForCreator: '番号不足を本人確認で止まる場面として読む。',
        creativeUse: '架空の受付票へ変換する。',
        limitations: '実在サービス名は出さない。',
      },
    ],
    creativePlans: [
      {
        id: 'creative-plan-1',
        formatLabel: '連載第1話',
        titleCandidates: ['060番目の受付票'],
        audiencePromise: '番号不足の不安を、本人確認で止まる小さな救済へ変える。',
        emotionalHook: '正しい番号を持っているはずなのに、画面だけが自分を認めない不安。',
        creatorBrief: {
          protagonist: '受付票の空欄を先に見つける新人記録係。',
          setting: '閉館前の受付窓口。',
          incitingIncident: '060欄だけが空白になる。',
          conflict: '通常処理に戻せば別人の記録が消える。',
          choice: '自分の欄だけを直すか、別人の欄も開くか。',
          payoff: '空欄が救済対象の名前へ変わる。',
        },
        premise: '番号不足を架空UIの空欄へ変換する。',
        exampleDetail: '受付票の空欄を見つける場面。',
        outline: ['空欄を見つける', '本人確認で止まる', '別人の欄を開く', '空欄の意味が変わる'],
        opening: '閉館前、受付票の060欄だけが白く残った。',
        reasonToWin: ['番号不足の不安を具体物にできる。'],
        differentiation: '実在制度の説明ではなく、架空UIの選択にする。',
        productionNotes: ['実在サービス名は出さない。'],
        riskNotes: ['制度批判にしない。'],
        evidenceAnchor: { focusTerm: '番号不足', artifact: '受付票', tension: '本人確認が止まる' },
      },
    ],
  };
}

function completeProviderPlan(id = 'creative-plan-1', overrides = {}) {
  return {
    id,
    titleCandidates: ['060番目の受付票'],
    audiencePromise: '番号不足の不安を、本人確認で止まる小さな救済へ変える。',
    emotionalHook: '正しい番号を持っているはずなのに、画面だけが自分を認めない不安。',
    creatorBrief: {
      protagonist: '受付票の空欄を誰より先に見つけてしまう新人記録係の女性。',
      setting: '閉館前で照明が落ちかけている市民窓口の受付カウンター。',
      incitingIncident: '本人確認端末の060欄だけが白く抜け、登録者名が消えている。',
      conflict: '通常処理に戻せば別人の記録まで消えると気づき、報告するか迷う。',
      choice: '自分の担当欄だけを直すか、隣の消えた記録まで開いて確認するか。',
      payoff: '空欄が救済対象の名前へ変わり、主人公が記録を守った意味に気づく。',
    },
    premise: '番号不足の不安を、受付端末に残った白い空欄として見せる。',
    exampleDetail: '閉館直前の窓口で、主人公だけが受付票の060欄の空白に気づく場面。',
    outline: ['空欄を見つける', '本人確認で止まる', '別人の欄を開く', '空欄の意味が変わる'],
    opening: '閉館前、受付票の060欄だけが白く残った。',
    differentiation: '実在制度の解説ではなく、架空UIの空欄を守る選択の物語にする。',
    craftNotes: [
      {
        label: '編集判断',
        detail: '番号不足の不安を説明で処理せず、受付票の空欄が増える場面を先に見せる。編集では冒頭の絵だけで損失が伝わるかを確認する。',
      },
      {
        label: 'ネーム確認',
        detail: '1コマ目は端末全景、2コマ目は060欄、3コマ目は本人確認で止まる手元に寄せる。会話より視線誘導を優先する。',
      },
    ],
    storyArchitecture: {
      notes: [
        {
          label: '選択の芯',
          detail: '主人公は自分の番号だけを直すか、同じ欄で止まった別人の記録を開くかで迷う。目的と代償を受付票に結びつける。',
        },
        {
          label: '回収',
          detail: '冒頭の空欄は結末で救済対象の名前が入る場所に変わる。読者が同じ小道具を違う意味で見直せる構成にする。',
        },
      ],
    },
    ...overrides,
  };
}

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
  assert.match(request.input, /JSON/);
  assert.match(request.input, /短尺反応データ/);
  assert.match(request.input, /"index":0/);
  assert.match(request.input, /Return exactly one complete evidenceCards object/);
  assert.match(request.input, /日本特有/);
  assert.match(request.input, /テンプレート/);
  assert.equal(JSON.stringify(request).includes(OPENAI_SECRET_KEY), false);
  assert.doesNotMatch(JSON.stringify(request), /ads\.tiktok|2026-06-24/);
});

test('plan design request asks the provider to generate non-template design sections', () => {
  const request = createPlanDesignRequest({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: providerDesignReport(),
  });
  const requestText = JSON.stringify(request);
  assert.match(requestText, /プロ向け設計メモ/);
  assert.match(requestText, /物語・台本設計/);
  assert.match(requestText, /固定テンプレ、単語差し替え/);
  assert.match(requestText, /安督/);
  assert.match(requestText, /日本特有/);
  assert.match(requestText, /creative-plan-1/);
  assert.equal(requestText.includes(OPENAI_SECRET_KEY), false);
});

test('runPlanDesignGeneration parses provider notes for plan cards', async () => {
  const report = providerDesignReport();
  const result = await runPlanDesignGeneration({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report,
    fetchImpl: async () => ({
      ok: true,
      async json() {
          return {
            output_text: JSON.stringify({
            plans: [completeProviderPlan()],
          }),
        };
      },
    }),
  });

  assert.equal(result.plans[0].id, 'creative-plan-1');
  assert.equal(result.plans[0].craftNotes.length, 2);
  assert.equal(result.plans[0].storyArchitecture.status, 'done');
  assert.match(result.plans[0].storyArchitecture.notes[0].detail, /受付票/);
});

test('runPlanDesignGeneration accepts concise OpenAI-style aliases for complete plans', async () => {
  const report = providerDesignReport();
  const result = await runPlanDesignGeneration({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            creativePlans: [
              {
                タイトル候補: ['余白の駅'],
                読者への約束: '小さな不安を選択でほどく',
                感情の引き: '空欄に気づいた瞬間のざわつき',
                案の要点: {
                  主人公: '記録係',
                  舞台: '夜の受付',
                  最初の事件: '060番が抜ける',
                  対立: '戻すか見逃すか',
                  最後に選ばせること: '他人の欄を開く',
                  読後感: '救いが残る',
                },
                作品本文の核: '番号の欠落を、誰かの存在を守る選択へ変える',
                初回具体例: '受付票の060番だけ白く残り、主人公が手を止める',
                '本文・台本の流れ': ['欠落を見つける', '確認で止まる', '他人の欄を開く'],
                冒頭例: '終電後の受付で、060番だけが白い',
                '安全・類似回避': '制度解説にせず、架空の受付票と記録係の選択に絞る',
                制作メモ: [
                  {
                    label: '視点',
                    detail: '受付の空欄を先に見せ、説明より手元の迷いで不安を立てる。',
                  },
                  {
                    label: '絵作り',
                    detail: '白い欄と鉛筆の止まる音を反復し、欠落の意味を画面で伝える。',
                  },
                ],
                '物語・台本設計': {
                  notes: [
                    {
                      label: '目的',
                      detail: '主人公は自分の作業を終えるより、抜けた欄の理由を確かめる。',
                    },
                    {
                      label: '回収',
                      detail: '最後に空欄へ名前ではなく小さな印を残し、救いを曖昧に置く。',
                    },
                  ],
                },
              },
            ],
          }),
        };
      },
    }),
  });

  assert.equal(result.plans[0].id, 'creative-plan-1');
  assert.equal(result.plans[0].titleCandidates[0], '余白の駅');
  assert.equal(result.plans[0].creatorBrief.protagonist, '記録係');
  assert.equal(result.plans[0].outline.length, 3);
  assert.equal(result.plans[0].craftNotes.length, 2);
  assert.equal(result.plans[0].storyArchitecture.notes.length, 2);
});

test('runPlanDesignGeneration rejects template-only design responses', async () => {
  await assert.rejects(
    runPlanDesignGeneration({
      provider: 'openai',
      apiKey: OPENAI_SECRET_KEY,
      report: providerDesignReport(),
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              plans: [
                {
                  id: 'creative-plan-1',
                  craftNotes: [
                    { label: '編集者に通す一文', detail: '取得根拠の「番号不足」を確認欄に置き換えるだけのテンプレ文です。' },
                    { label: '読者維持エンジン', detail: '取得根拠の「番号不足」を確認欄に置き換えるだけのテンプレ文です。' },
                  ],
                  storyArchitecture: {
                    notes: [
                      { label: '伏線と回収', detail: '同じ根拠でも見せ方を変えるだけのテンプレ文です。' },
                      { label: 'GMC+S', detail: '同じ根拠でも見せ方を変えるだけのテンプレ文です。' },
                    ],
                  },
                },
              ],
            }),
          };
        },
      }),
    }),
    /設計メモ/,
  );
});

test('runPlanDesignGeneration rejects incomplete visible plan responses instead of leaving 未生成 fields', async () => {
  await assert.rejects(
    runPlanDesignGeneration({
      provider: 'openai',
      apiKey: OPENAI_SECRET_KEY,
      report: providerDesignReport(),
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              plans: [
                {
                  id: 'creative-plan-1',
                  craftNotes: completeProviderPlan().craftNotes,
                  storyArchitecture: completeProviderPlan().storyArchitecture,
                },
              ],
            }),
          };
        },
      }),
    }),
    /制作案/,
  );
});

test('runPlanDesignGeneration drops typo-like provider notes instead of showing them', async () => {
  const report = providerDesignReport();
  const result = await runPlanDesignGeneration({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            plans: [
              completeProviderPlan('creative-plan-1', {
                craftNotes: [
                  {
                    label: '冒頭の手元',
                    detail: '受付票の空欄を最初に見せ、主人公がその欄だけを指で押さえる動作で違和感を作る。',
                  },
                  {
                    label: '誤字ノート',
                    detail: '周囲の乗客が安督の溜息をつくように描く、という誤字を含むため表示しない。',
                  },
                  {
                    label: '編集確認',
                    detail: '番号不足の説明に寄せすぎず、白い欄が誰のものなのかを読者に追わせる。',
                  },
                ],
                storyArchitecture: completeProviderPlan().storyArchitecture,
              }),
            ],
          }),
        };
      },
    }),
  });

  const visible = JSON.stringify(result);
  assert.doesNotMatch(visible, /安督/);
  assert.equal(result.plans[0].craftNotes.length, 2);
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

test('provider failures redact echoed API key fragments from error text', async () => {
  await assert.rejects(
    runProviderAnalysis({
      provider: 'openai',
      apiKey: OPENAI_SECRET_KEY,
      report: { category: { label: 'ストーリー漫画' }, evidenceCards: [] },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        async json() {
          return {
            error: {
              message: 'Incorrect API key provided: sk-proj-secret********************************7890. You can find your API key at https://platform.openai.com/account/api-keys.',
            },
          };
        },
      }),
    }),
    (error) => {
      const message = String(error?.message ?? '');
      assert.match(message, /Incorrect API key provided: \[redacted-key\]/);
      assert.doesNotMatch(message, /secret|\*{4,}7890|api-keys/);
      return true;
    },
  );
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

test('runDraftSample converts report prompts with 仮タイトル to the fixed selected title', async () => {
  let captured;
  await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '仮タイトル: 灰色の査定欄',
      '主人公: 契約社員の真白',
    ].join('\n'),
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return { output_text: USABLE_STORY_SAMPLE };
        },
      };
    },
  });

  assert.match(captured.init.body, /使用タイトル: 灰色の査定欄/);
  assert.doesNotMatch(captured.init.body, /仮タイトル:/);
  assert.doesNotMatch(captured.init.body, /会話文を最低2つ/);
  assert.match(captured.init.body, /無理に台詞を入れず/);
  assert.match(captured.init.body, /実在人物・企業・サービス名は本文に出さず/);
});

test('runDraftSample rejects unsupported official claims and private-life profiling', async () => {
  for (const outputText of [
    `${USABLE_STORY_SAMPLE}\n旅客営業規則第百二十条に該当するため、測定器の基準値を根拠に相手を退けた。`,
    `${USABLE_STORY_SAMPLE}\n投稿履歴を調べたら、相手の食生活や部屋が散らかっている寂しい人だと分かった。`,
    `${USABLE_STORY_SAMPLE}\nその行動のエキcentricさが読者の目を引く。`,
  ]) {
    await assert.rejects(
      () =>
        runDraftSample({
          provider: 'openai',
          apiKey: OPENAI_SECRET_KEY,
          draftPrompt: [
            'カテゴリ: ストーリー漫画',
            '使用タイトル: 灰色の査定欄',
            '主人公: 契約社員の女性',
          ].join('\n'),
          fetchImpl: async () => ({
            ok: true,
            async json() {
              return { output_text: outputText };
            },
          }),
        }),
      /本文として使える具体的な場面や台詞が不足しています/,
    );
  }
});

test('runDraftSample rejects drafts that drift away from the selected plan core', async () => {
  const prompt = [
    'カテゴリ: ストーリー漫画',
    '使用タイトル: 減点メソッドの夜',
    '案の要点:',
    '- 主人公: 算数の計算は誰よりも早いが、学校独自の途中式ルールに馴染めない小学3年生のハルト（9歳）',
    '- 舞台: 独自の採点基準で時折炎上する私立小学校と、ハルトの自宅',
    '- 最初の事件: テストで答えは合っているのに、筆算の引き線が短いという理由で20点も減点される。',
  ].join('\n');

  await assert.rejects(
    () =>
      runDraftSample({
        provider: 'openai',
        apiKey: OPENAI_SECRET_KEY,
        draftPrompt: prompt,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              output_text: [
                '減点方式の赤いペン',
                '夕暮れ時のオフィスで、相原蓮は企画書に書かれた赤字を見つめた。',
                '黒岩部長は「手順が違えば規則違反だ」と言い、会社のマニュアルを机に置く。',
                '蓮は小学校の算数のテストで減点された記憶を思い出しながら、古い集計手順に従うか迷う。',
                '同僚は黙ってキーボードを打ち、蓮だけが赤い企画書を握りしめていた。',
              ].join('\n'),
            };
          },
        }),
      }),
    /本文として使える具体的な場面や台詞が不足しています/,
  );
});

test('runDraftSample accepts drafts that keep the selected plan core', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 減点メソッドの夜',
      '案の要点:',
      '- 主人公: 算数の計算は誰よりも早いが、学校独自の途中式ルールに馴染めない小学3年生のハルト（9歳）',
      '- 舞台: 独自の採点基準で時折炎上する私立小学校と、ハルトの自宅',
      '- 最初の事件: テストで答えは合っているのに、筆算の引き線が短いという理由で20点も減点される。',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: [
            '別タイトル',
            '放課後の私立小学校で、ハルトは返された算数テストを机の端に置いた。「答え、合ってるのに」',
            '赤ペンは二十点を容赦なく削っていた。理由は、筆算の引き線が短いことと、途中式が学校の型と違うこと。',
            'ハルトは自宅に帰ってもランドセルを開けられない。数字を見るのは好きだったのに、紙の上では自分の考え方だけが悪者にされる。',
            '母は答案を見て眉を寄せるが、学校に言うべきか、ハルトが型を覚えるべきかで言葉を止める。',
            '翌朝、ハルトは同じ問題をもう一度解く。今度は先生の型を書くか、自分の早い解き方を残すか。鉛筆の先が止まった。',
          ].join('\n'),
        };
      },
    }),
  });

  assert.match(result.text, /^減点メソッドの夜\n\n放課後の私立小学校/);
  assert.doesNotMatch(result.text, /別タイトル/);
  assert.match(result.text, /ハルト/);
});

test('runDraftSample accepts fictionalized network-campaign drafts with synonym core terms', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 狂気のネットキャンペーン戦線',
      '案の要点:',
      '- 主人公: 大学生・尚人',
      '- 舞台: 現代日本のSNSとキャンペーンの嵐に沸くIT界隈',
      '- 最初の事件: 大規模キャッシュバックキャンペーンでバズる瞬間を目撃',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: [
            '狂気のネットキャンペーン戦線',
            '駅のホームで、尚人はスマホの画面を見たまま立ち止まった。架空決済アプリの大規模キャンペーンが、ネットの投稿欄を一気に埋めていた。',
            '「これ、参加しないと損じゃない？」隣の友人が笑う。',
            '尚人は画面を閉じかけて、また開いた。「でも、なんか全員が同じ方向に走ってるみたいで怖い」',
            '通知は次々に増え、知らない人の成功報告が波のように流れてくる。尚人はその熱に押されながら、自分も拡散する側へ回るのか、ホームの端で足を止めるのかを選べずにいた。',
          ].join('\n'),
        };
      },
    }),
  });

  assert.match(result.text, /^狂気のネットキャンペーン戦線/);
  assert.match(result.text, /尚人/);
  assert.doesNotMatch(result.text, /孫正義|PayPay/);
});

test('runDraftSample accepts nonverbal animal drafts with synonym core terms', async () => {
  let captured;
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: しっぽメトロノーム日和',
      '案の要点:',
      '- 主人公: 秋田犬姉妹・ココ＆モモ',
      '- 舞台: 郊外の静かな一軒家・庭',
      '- 最初の事件: 朝食後、しっぽだけが見事にシンクロし始める。',
    ].join('\n'),
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return {
            output_text: [
              'しっぽメトロノーム日和',
              '朝ごはんの器が空になった庭で、ココとモモは並んで腰を下ろした。家の縁側にはまだ湯気の残るマグカップがあり、家族のスマホだけがそっと二匹を見守っている。',
              '先に動いたのはココの尻尾だった。左、右、左。半拍遅れてモモの尻尾が追いかけ、やがて二本は同じリズムでそろいはじめる。',
              '落ち葉が一枚、二匹の間を転がった瞬間、モモだけがふいに逆へ揺れた。ココは耳だけをぴくりと動かし、まるで小さな合図を送るように尻尾の速さをゆるめる。',
              '次の風で、二本の尻尾はまたぴたりとそろった。家族が思わず同じ速さで指を振ると、二匹は得意げに胸を張り、庭の朝が少しだけ明るく跳ねた。',
            ].join('\n'),
          };
        },
      };
    },
  });

  assert.match(result.text, /^しっぽメトロノーム日和/);
  assert.match(result.text, /ココ/);
  assert.match(result.text, /モモ/);
  assert.doesNotMatch(captured.init.body, /会話文を最低2つ/);
});

test('runDraftSample accepts concrete scene prose for generic unnamed protagonists', async () => {
  const result = await runDraftSample({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    draftPrompt: [
      'カテゴリ: ストーリー漫画',
      '使用タイトル: 理不尽グリーン車マナー事件',
      '案の要点:',
      '- 主人公: ちょっとくたびれた出張帰りの30代男性',
      '- 舞台: 新幹線グリーン車車内',
      '- 最初の事件: 隣の席の乗客が強引に話しかけ、悪臭や理不尽な言動で不快な空気を巻き起こす。',
    ].join('\n'),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: [
            '理不尽グリーン車マナー事件',
            '新幹線グリーン車の窓に、夜の駅名表示が細く流れていた。出張帰りの啓介はコートを膝に置き、今日こそ誰とも話さず帰りたいと息を整える。',
            '発車してすぐ、隣の席の男が肘掛けを越えるほど身を寄せてきた。酒と汗の匂いが混じり、弁当のふたを開けたまま通路側へ足を投げ出す。',
            '男は座席の操作を乱暴に叩き、啓介の荷物を見て笑った。車内アナウンスの後に残る静けさが、周囲の乗客の伏せた視線でさらに重くなる。',
            '啓介は車掌を呼ぶボタンへ指を伸ばしかけ、いったん止めた。注意すれば余計に絡まれるかもしれないが、このまま我慢すれば自分の帰り道まで奪われる。',
            'テーブルの端で紙コップが小さく揺れた瞬間、啓介は声を荒げずに姿勢を直した。まず荷物を胸元へ引き寄せ、逃げ場のない一席分の空気を取り戻すために、隣の男へ体を向ける。',
          ].join('\n'),
        };
      },
    }),
  });

  assert.match(result.text, /^理不尽グリーン車マナー事件/);
  assert.match(result.text, /新幹線グリーン車/);
  assert.match(result.text, /隣の席/);
  assert.match(result.text, /啓介/);
});

test('runDraftSample rejects prompt field labels leaking into the finished body', async () => {
  await assert.rejects(
    () =>
      runDraftSample({
        provider: 'gemini',
        apiKey: GEMINI_TEST_KEY,
        draftPrompt: [
          'カテゴリ: ストーリー漫画',
          '使用タイトル: 見えない境界線',
          '案の要点:',
          '- 主人公: 時短勤務で働く会社員・みさと',
          '- 舞台: 都市型マンションの台所と職場',
          '- 最初の事件: 家族の発熱で大切な会議を抜けなければならなくなる。',
        ].join('\n'),
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
                          '見えない境界線',
                          '深夜、みさとは台所のテーブルに向かっていた。ノートパソコンの光が疲れた顔を照らし、シンクには夕食の皿が残っている。',
                          '最初の事件が起きたのは、その数日前のことだった。',
                          '保育園から娘の発熱を知らせる電話が入り、みさとは職場の会議資料を握ったまま立ち尽くした。',
                          '夫からの短い返信を読んだ瞬間、台所の境界線が足元まで迫ってくるように感じた。',
                        ].join('\n'),
                      },
                    ],
                  },
                },
              ],
            };
          },
        }),
      }),
    /本文として使える具体的な場面や台詞が不足しています/,
  );
});

test('runDraftSample does not blame keys or quota for draft quality rejection', async () => {
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
              output_text: ['第1話: 通知', '第2話: 会議', '第3話: 反論'].join('\n'),
            };
          },
        }),
      }),
    (error) => {
      assert.match(error.message, /参考文章生成に失敗しました/);
      assert.match(error.message, /本文として使える具体的な場面や台詞が不足しています/);
      assert.doesNotMatch(error.message, /キー、クォータ/);
      return true;
    },
  );
});

test('runProviderAnalysis drops generated fields with banned template words and unsupported scope claims', async () => {
  await assert.rejects(
    () =>
      runProviderAnalysis({
        provider: 'openai',
        apiKey: OPENAI_SECRET_KEY,
        report: {
          category: { label: 'ストーリー漫画' },
          evidenceCards: [{ claim: '整列する動物の話題' }],
        },
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              output_text: JSON.stringify({
                summary: '整列の映像を職場の息苦しさに置き換える。',
                evidenceCards: [
                  {
                    index: 0,
                    claim: '整列する動物の話題',
                    whyItMatters: '日本特有の同調圧力を示している。',
                    meaningForCreator: '職場の全員が同じ動きをする不気味さとして使う。',
                    creativeUse: '理不尽な悪役・事件のテンプレートとなる。',
                  },
                ],
              }),
            };
          },
        }),
      }),
    /全取得根拠のAI読み取りとAI企画判断/,
  );
});

test('provider analysis request asks for every visible non-plan generated section', () => {
  const request = createProviderAnalysisRequest({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: providerDesignReport(),
  });
  const requestText = JSON.stringify(request);

  for (const field of [
    'deepAnalysis',
    'categoryInsight',
    'humanMotivation',
    'narrativeMechanism',
    'categoryFitCards',
    'whyThisMedium',
    'creatorMove',
    'beginnerGuide',
    'firstOutput',
    'checklist',
    'avoid',
    'evidenceCards',
    'whyItMatters',
    'meaningForCreator',
    'creativeUse',
  ]) {
    assert.match(requestText, new RegExp(field), `${field} is missing from the provider analysis request`);
  }

  assert.match(requestText, /Do not return pending markers/);
});

test('runProviderAnalysis cleans adjacent duplicate Japanese phrases in generated fields', async () => {
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: {
      category: { label: 'ストーリー漫画' },
      evidenceCards: [{ claim: '理不尽な絡まれを扱う取得根拠' }],
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            summary: '読者の嫌な記憶に触れる題材です。',
            evidenceCards: [
              {
                index: 0,
                claim: '理不尽な絡まれを扱う取得根拠',
                whyItMatters: '感情感情移入しやすい密室の理不尽として読める。',
                meaningForCreator: '主人公の反撃を置く前に不快感を溜める材料になる。',
                creativeUse: '暴力ではなく言葉の選び方で場をひっくり返す。',
              },
            ],
          }),
        };
      },
    }),
  });

  assert.equal(result.evidenceCards[0].whyItMatters.includes('感情感情'), false);
  assert.match(result.evidenceCards[0].whyItMatters, /感情移入/);
});

test('runProviderAnalysis parses generated visible report sections', async () => {
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: providerDesignReport(),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            summary: '受付票の空欄が読者の不安を引っ張る。',
            strongest_signal: '060欄だけが残る違和感。',
            practical_revision: '受付窓口の小さな選択に寄せる。',
            risk_note: '実在制度の告発にしない。',
            next_actions: ['受付票を画面中央に置く'],
            deepAnalysis: {
              categoryInsight: '番号ではなく、消えかけた人の痕跡として扱う。',
              humanMotivation: ['自分が数にされる不安', '小さな記録を守りたい気持ち'],
              narrativeMechanism: ['空欄を謎にする', '処理速度と尊厳を衝突させる'],
            },
            categoryFitCards: [
              {
                title: '受付票ミステリー',
                whyThisMedium: '一枚の空欄をコマで繰り返せる。',
                creatorMove: '白い060欄を毎ページの視線誘導にする。',
                example: '閉館後も番号だけが消えない。',
                evidenceAnchor: 'Google News RSS / 060欄',
              },
            ],
            beginnerGuide: {
              headline: '受付票から1話を組む手順',
              promise: '空欄を事件ではなく選択として育てる。',
              firstOutput: '白い060欄を見つける1ページ目。',
              steps: [
                { label: '空欄を見る', action: '最初の違和感を絵で置く', output: '受付票のアップ' },
                { label: '消す圧を置く', action: '管理者の処理要求を出す', output: '対立の台詞' },
              ],
              checklist: ['実在名を主役にしない', '空欄の意味を後半で変える'],
              avoid: ['制度説明だけにする', '同じ減点構図に寄せる'],
            },
            evidenceCards: [
              {
                index: 0,
                claim: '番号不足への不安が反応している',
                whyItMatters: '数字ひとつの欠落が本人確認の怖さに直結する。',
                meaningForCreator: '受付票の空欄を主人公が見過ごせない傷として読む。',
                creativeUse: '消してよい空欄か、残すべき痕跡かを選ばせる。',
              },
            ],
          }),
        };
      },
    }),
  });

  assert.match(result.deepAnalysis.categoryInsight, /番号ではなく/);
  assert.deepEqual(result.deepAnalysis.humanMotivation, ['自分が数にされる不安', '小さな記録を守りたい気持ち']);
  assert.equal(result.categoryFitCards.length, 1);
  assert.match(result.categoryFitCards[0].creatorMove, /060欄/);
  assert.match(result.beginnerGuide.headline, /受付票/);
  assert.equal(result.beginnerGuide.steps.length, 2);
  assert.equal(result.evidenceCards.length, 1);
  assert.equal(result.evidenceCards[0].index, 0);
  assert.match(result.evidenceCards[0].creativeUse, /空欄/);
  assert.doesNotMatch(JSON.stringify(result), /AI生成待ち|未生成|ローカル定型文/);
});

test('runProviderAnalysis rebases one-based evidence card indexes from providers', async () => {
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: {
      category: { label: 'Story manga' },
      evidenceCards: [
        { claim: 'First visible evidence claim' },
        { claim: 'Second visible evidence claim' },
      ],
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            summary: 'Specific provider summary text',
            evidenceCards: [
              {
                index: 1,
                claim: 'First visible evidence claim',
                whyItMatters: 'First reading has enough concrete detail.',
                meaningForCreator: 'First creator meaning has enough detail.',
                creativeUse: 'First creative use has enough detail.',
              },
              {
                index: 2,
                claim: 'Second visible evidence claim',
                whyItMatters: 'Second reading has enough concrete detail.',
                meaningForCreator: 'Second creator meaning has enough detail.',
                creativeUse: 'Second creative use has enough detail.',
              },
            ],
          }),
        };
      },
    }),
  });

  assert.deepEqual(
    result.evidenceCards.map((card) => card.index),
    [0, 1],
  );
  assert.equal(result.evidenceCards[0].claim, 'First visible evidence claim');
  assert.match(result.evidenceCards[0].creativeUse, /First creative/);
});

test('runProviderAnalysis rejects incomplete evidence cards instead of leaving visible unread fields pending', async () => {
  await assert.rejects(
    () =>
      runProviderAnalysis({
        provider: 'openai',
        apiKey: OPENAI_SECRET_KEY,
        report: {
          category: { label: 'ストーリー漫画' },
          evidenceCards: [
            { claim: 'First visible evidence claim' },
            { claim: 'Second visible evidence claim' },
          ],
        },
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              output_text: JSON.stringify({
                summary: '取得根拠を読み取った。',
                evidenceCards: [
                  {
                    index: 0,
                    claim: 'First visible evidence claim',
                    whyItMatters: 'First reading has enough concrete detail.',
                    meaningForCreator: 'First creator meaning has enough detail.',
                    creativeUse: 'First creative use has enough detail.',
                  },
                  {
                    index: 1,
                    claim: 'Second visible evidence claim',
                    meaningForCreator: 'Second creator meaning has enough detail.',
                    creativeUse: 'Second creative use has enough detail.',
                  },
                ],
              }),
            };
          },
        }),
      }),
    (error) => {
      assert.match(error.message, /全取得根拠のAI読み取りとAI企画判断/);
      assert.doesNotMatch(error.message, /キー、クォータ/);
      return true;
    },
  );
});

test('runProviderAnalysis falls back when a model omits visible evidence-card readings', async () => {
  let calls = 0;
  const result = await runProviderAnalysis({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: {
      category: { label: 'ストーリー漫画' },
      evidenceCards: [
        { claim: 'First visible evidence claim' },
        { claim: 'Second visible evidence claim' },
      ],
    },
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              summary: '取得根拠を読み取った。',
              evidenceCards:
                calls === 1
                  ? [
                      {
                        index: 0,
                        claim: 'First visible evidence claim',
                        whyItMatters: 'First reading has enough concrete detail.',
                        meaningForCreator: 'First creator meaning has enough detail.',
                        creativeUse: 'First creative use has enough detail.',
                      },
                    ]
                  : [
                      {
                        index: 0,
                        claim: 'First visible evidence claim',
                        whyItMatters: 'First reading has enough concrete detail.',
                        meaningForCreator: 'First creator meaning has enough detail.',
                        creativeUse: 'First creative use has enough detail.',
                      },
                      {
                        index: 1,
                        claim: 'Second visible evidence claim',
                        whyItMatters: 'Second reading has enough concrete detail.',
                        meaningForCreator: 'Second creator meaning has enough detail.',
                        creativeUse: 'Second creative use has enough detail.',
                      },
                    ],
            }),
          };
        },
      };
    },
  });

  assert.equal(result.used_model, 'gpt-4.1-mini');
  assert.equal(result.evidenceCards.length, 2);
  assert.equal(result.fallback_chain[0].status, 'failed');
});

test('plan design request asks the provider for every visible generated plan field', () => {
  const request = createPlanDesignRequest({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: providerDesignReport(),
  });
  const requestText = JSON.stringify(request);

  for (const field of [
    'titleCandidates',
    'audiencePromise',
    'emotionalHook',
    'creatorBrief',
    'protagonist',
    'setting',
    'incitingIncident',
    'conflict',
    'choice',
    'payoff',
    'premise',
    'exampleDetail',
    'outline',
    'opening',
    'differentiation',
    'craftNotes',
    'storyArchitecture',
  ]) {
    assert.match(requestText, new RegExp(field), `${field} is missing from the provider request`);
  }
});

test('runPlanDesignGeneration parses provider prose for every visible plan field', async () => {
  const result = await runPlanDesignGeneration({
    provider: 'openai',
    apiKey: OPENAI_SECRET_KEY,
    report: providerDesignReport(),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            plans: [
              {
                id: 'creative-plan-1',
                titleCandidates: ['The Blank Receipt Window'],
                audiencePromise: 'A reader follows one clerk who learns why the empty receipt slot matters to another person.',
                emotionalHook: 'The hook is the sting of being treated as a missing number before anyone asks a name.',
                creatorBrief: {
                  protagonist: 'A new records clerk who notices the empty slot before anyone else on the night shift.',
                  setting: 'A closing reception counter where ticket number 060 is still glowing after everyone leaves.',
                  incitingIncident: 'The clerk finds one unchecked receipt and hears the printer start again in the dark.',
                  conflict: 'Fixing the queue quickly would erase the only trace of the person who never reached the desk.',
                  choice: 'She can close the system for the manager or keep the window open and look for the missing visitor.',
                  payoff: 'The blank slot becomes a name, and the clerk understands that speed can also be a kind of deletion.',
                },
                premise: 'One empty receipt slot turns routine queue work into a small mystery about who gets counted.',
                exampleDetail: 'The first panel holds on the white 060 box while the rest of the display has already gone gray.',
                outline: [
                  'The clerk notices the blank slot after closing.',
                  'A supervisor asks her to clear it as a system error.',
                  'She traces the ticket through the unused waiting room.',
                  'The missing visitor is found through what the system failed to print.',
                ],
                opening: 'At 9:03 p.m., the counter lights died one by one, but the little square marked 060 stayed white.',
                differentiation: 'The drama comes from one administrative blank instead of a speech about bureaucracy.',
                craftNotes: [
                  {
                    label: 'Queue close-up',
                    detail: 'Use the white 060 slot as a recurring panel anchor so the reader feels the missing person before hearing an explanation.',
                  },
                  {
                    label: 'Manager pressure',
                    detail: 'Keep the supervisor practical rather than cruel, which makes the deletion feel ordinary and more uncomfortable.',
                  },
                ],
                storyArchitecture: {
                  notes: [
                    {
                      label: 'Opening image',
                      detail: 'Start with the empty receipt box glowing after closing so the mystery is visual before it becomes dialogue.',
                    },
                    {
                      label: 'Moral turn',
                      detail: 'The protagonist realizes that clearing the queue would also clear the only proof that someone waited.',
                    },
                  ],
                },
              },
            ],
          }),
        };
      },
    }),
  });

  const plan = result.plans[0];
  assert.equal(plan.id, 'creative-plan-1');
  assert.equal(plan.titleCandidates[0], 'The Blank Receipt Window');
  assert.match(plan.audiencePromise, /reader follows/);
  assert.match(plan.emotionalHook, /missing number/);
  assert.match(plan.creatorBrief.protagonist, /records clerk/);
  assert.match(plan.creatorBrief.setting, /ticket number 060/);
  assert.match(plan.creatorBrief.incitingIncident, /printer/);
  assert.match(plan.creatorBrief.conflict, /erase/);
  assert.match(plan.creatorBrief.choice, /keep the window open/);
  assert.match(plan.creatorBrief.payoff, /blank slot becomes a name/);
  assert.match(plan.premise, /queue work/);
  assert.match(plan.exampleDetail, /first panel/);
  assert.equal(plan.outline.length, 4);
  assert.match(plan.opening, /9:03 p\.m\./);
  assert.match(plan.differentiation, /administrative blank/);
  assert.equal(plan.craftNotes.length, 2);
  assert.equal(plan.storyArchitecture.status, 'done');
  assert.equal(plan.storyArchitecture.notes.length, 2);
});
