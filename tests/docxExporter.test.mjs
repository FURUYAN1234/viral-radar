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
  assert.match(raw, /編集者打ち合わせ用企画書/);
  assert.match(raw, /制作ロードマップ/);
  assert.match(raw, /最初に作るもの/);
  assert.match(raw, /編集判断チャート/);
  assert.match(raw, /企画比較表/);
  assert.match(raw, /推奨企画/);
  assert.match(raw, /AI未生成/);
  assert.match(raw, /ローカル定型文では埋めません/);
  assert.match(raw, /打ち合わせで決めたいこと/);
  assert.ok((raw.match(/<w:tbl>/g) ?? []).length >= 3);
  assert.ok((raw.match(/<w:tblGrid>/g) ?? []).length >= 3);
  assert.doesNotMatch(raw, /<w:shd w:fill=/);
  assert.doesNotMatch(raw, MOJIBAKE_RE);
  assert.doesNotMatch(raw, /Story Maker|story-maker|連携|internalRoutineNotes/);
  assert.doesNotMatch(raw, /他AIに貼る本文生成プロンプト|aiDraftPrompt|API詳細分析/);
  assert.doesNotMatch(raw, SECRET_OUTPUT_RE);
});
