import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { toDocxArrayBuffer } from '../src/lib/docxExporter.js';
import { buildReport } from '../src/lib/reportEngine.js';

const MOJIBAKE_RE = /縺|繧|譁|莨|譬|蜈|蟆|螳|隱|迚|繝|蜍|髯|鬆|蛻|邱|莠|驥|蜷/;
const SECRET_OUTPUT_RE = new RegExp(`${`sk-${'proj'}-`}|${`AI${'za'}`}`);

test('docx export creates an editor meeting brief with tables instead of a JSON-like dump', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const bytes = Buffer.from(toDocxArrayBuffer(report));
  const raw = bytes.toString('utf8');

  assert.equal(bytes.subarray(0, 2).toString('utf8'), 'PK');
  assert.match(raw, /word\/document\.xml/);
  assert.match(raw, /制作案確認資料/);
  assert.match(raw, /取得根拠の要点/);
  assert.match(raw, /制作メモ/);
  assert.match(raw, /取得状況/);
  assert.match(raw, /制作案/);
  assert.match(raw, /媒体別の制作判断/);
  assert.match(raw, /未生成/);
  assert.doesNotMatch(raw, /AI生成手順|取得指標チャート|AI生成待ち項目|取得根拠パック|AI制作判断|AI未生成|ローカル定型文では埋めません|AI生成後の最初の作業/);
  assert.match(raw, /打ち合わせで決めたいこと/);
  assert.doesNotMatch(raw, /編集者打ち合わせ用企画書|最初に作るもの|編集判断チャート|企画比較表|推奨企画/);
  assert.ok((raw.match(/<w:tbl>/g) ?? []).length >= 3);
  assert.ok((raw.match(/<w:tblGrid>/g) ?? []).length >= 3);
  assert.doesNotMatch(raw, /<w:shd w:fill=/);
  assert.doesNotMatch(raw, MOJIBAKE_RE);
  assert.doesNotMatch(raw, /Story Maker|story-maker|連携|internalRoutineNotes/);
  assert.doesNotMatch(raw, /他AIに貼る本文生成プロンプト|aiDraftPrompt|API詳細分析/);
  assert.doesNotMatch(raw, SECRET_OUTPUT_RE);
});
