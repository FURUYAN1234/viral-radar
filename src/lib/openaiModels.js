import { NANO_BANANA_FALLBACK_SNAPSHOT } from './nanoBananaFallbackSnapshot.js';

export const DEFAULT_OPENAI_MODEL_ID = 'gpt-6-astra';

const VIRAL_RADAR_MODEL_COPY = Object.freeze({
  'gpt-6-astra': Object.freeze({
    description: '複雑な制約・複数媒体の企画設計を重視',
    comparisonNote:
      '複雑な題材や、漫画・動画・小説をまたぐ多条件の企画に向きます。単純な整理では処理量と料金が過剰になり得ます。',
  }),
  'gpt-6-sol': Object.freeze({
    description: '企画の深さと料金のバランスを重視',
    comparisonNote: 'Astraより単価を抑えつつ、根拠整理と複雑な構成の両方を求める場合に向きます。',
  }),
  'gpt-5.6-sol': Object.freeze({
    description: '複雑な企画設計を保ちつつAstraより節約',
    comparisonNote: 'Astraより料金を抑えながら、複数条件の構成や推論を重視したい場合に向きます。',
  }),
  'gpt-5.6-terra': Object.freeze({
    description: '品質と料金のバランスを重視',
    comparisonNote: 'GPT-4.1より出力単価は高めですが、題材解釈と媒体別の企画構成を推論で補強します。',
  }),
  'gpt-6-luna': Object.freeze({
    description: '料金を優先した軽量な企画設計',
    comparisonNote: '低コストでの根拠整理や企画案作成に向きます。複雑な制約や長い構成では結果を確認してください。',
  }),
  'gpt-5.6-luna': Object.freeze({
    description: '簡潔な題材を低コストで素早く整理',
    comparisonNote: '大きく節約したい場合の候補です。複雑な制約や多段の構成は上位モデルより弱くなります。',
  }),
  'gpt-4.1': Object.freeze({
    description: '高速な非推論モデルで安定した企画整理',
    comparisonNote: 'Terraより出力単価が低めです。定型に近い根拠整理や企画案を速く構成したい場合に向きます。',
  }),
  'gpt-4.1-mini': Object.freeze({
    description: '軽量・高速な非推論モデル',
    comparisonNote: '短い要約や単純な企画整理に向きます。複数条件を含む構成では結果を確認してください。',
  }),
  'gpt-4.1-nano': Object.freeze({
    description: '最小コストを優先した短い整理向け',
    comparisonNote: 'ごく短い要約や分類を低コストで処理する候補です。長文や複雑な企画設計には向きません。',
  }),
  'gpt-4o': Object.freeze({
    description: '互換性を優先する最終フォールバック',
    comparisonNote: '他の候補が利用できない場合の最終経路です。採用された場合は生成結果を十分に確認してください。',
  }),
});

export const OPENAI_MODEL_OPTIONS = Object.freeze(
  NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.models.map((model) => {
    const productCopy = VIRAL_RADAR_MODEL_COPY[model.id] || {
      description: '用途と料金を確認して選択',
      comparisonNote: '物語バズメーカーでの生成結果を確認して利用してください。',
    };
    return Object.freeze({ ...model, ...productCopy });
  }),
);
export const OPENAI_MODEL_PRICE_SNAPSHOT_DATE =
  NANO_BANANA_FALLBACK_SNAPSHOT.chains.openaiText.priceSnapshotDate;

export function normalizeOpenAIModelId(modelId) {
  const normalized = String(modelId || '').trim().toLowerCase();
  return OPENAI_MODEL_OPTIONS.some((model) => model.id === normalized)
    ? normalized
    : DEFAULT_OPENAI_MODEL_ID;
}

export function getOpenAIModelOption(modelId) {
  const normalized = normalizeOpenAIModelId(modelId);
  return OPENAI_MODEL_OPTIONS.find((model) => model.id === normalized);
}

export function getOpenAIModelRoute(modelId = DEFAULT_OPENAI_MODEL_ID) {
  const normalized = normalizeOpenAIModelId(modelId);
  const selectedIndex = OPENAI_MODEL_OPTIONS.findIndex((model) => model.id === normalized);
  return OPENAI_MODEL_OPTIONS.slice(selectedIndex).map((model) => model.id);
}

export function formatOpenAIModelPrice(model) {
  const option = model || getOpenAIModelOption(DEFAULT_OPENAI_MODEL_ID);
  return `入力 $${option.inputPriceUsdPerM} / 出力 $${option.outputPriceUsdPerM} USD / 100万トークン`;
}
