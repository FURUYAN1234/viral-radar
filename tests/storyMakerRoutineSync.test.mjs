import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';

test('Story Maker routine sync assets are not part of the local generation workflow', () => {
  const snapshotUrl = new URL('../src/lib/storyMakerRoutineSnapshot.js', import.meta.url);
  const syncScriptUrl = new URL('../scripts/sync-story-maker-routines.mjs', import.meta.url);
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(existsSync(snapshotUrl), false, 'Story Maker routine snapshot should not be committed');
  assert.equal(existsSync(syncScriptUrl), false, 'Story Maker sync script should not be committed');
  assert.equal(Object.hasOwn(packageJson.scripts, 'sync:story-maker'), false);
  assert.equal(Object.hasOwn(packageJson.scripts, 'check:story-maker'), false);
  assert.equal(packageJson.scripts['check:upstreams'], 'npm run check:nano-fallback');
});

test('creative plans do not keep imported routine notes or local craft templates', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const plan = report.creativePlans[0];
  const internalNotes = Object.getOwnPropertyDescriptor(plan, 'internalRoutineNotes');
  assert.equal(internalNotes, undefined);
  assert.equal(Object.hasOwn(plan, 'internalRoutineNotes'), false);
  assert.ok(plan.storyArchitecture);
  assert.equal(plan.storyArchitecture.status, 'awaiting-ai');
  assert.deepEqual(plan.storyArchitecture.notes, []);
  assert.deepEqual(plan.craftNotes, []);
  assert.match(plan.aiDraftPrompt, /以下の取得根拠と案の要点を読み/);
  assert.match(plan.aiDraftPrompt, /固定テンプレ、単語差し替え/);
  assert.doesNotMatch(plan.aiDraftPrompt, /創作ルーチン/);
  assert.doesNotMatch(plan.aiDraftPrompt, /Setup-Payoff|GMC|Show Don't Tell/);
  assert.doesNotMatch(plan.aiDraftPrompt, /Character Knowledge Boundary/);
  assert.doesNotMatch(plan.aiDraftPrompt, /物語設計:|プロ向け設計メモ:/);
  assert.doesNotMatch(plan.aiDraftPrompt, /Story Maker|story-maker|連携|同期ハッシュ/);
  assert.doesNotMatch(JSON.stringify(plan), /Story Maker|story-maker|連携|internalRoutineNotes/);
});

test('advanced story architecture stays empty until provider generation for every medium', () => {
  const shortVideo = buildReport({
    categoryId: 'short-video',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  }).creativePlans[0];

  const novel = buildReport({
    categoryId: 'long-novel',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  }).creativePlans[0];

  assert.equal(shortVideo.storyArchitecture.status, 'awaiting-ai');
  assert.deepEqual(shortVideo.storyArchitecture.notes, []);
  assert.equal(novel.storyArchitecture.status, 'awaiting-ai');
  assert.deepEqual(novel.storyArchitecture.notes, []);
  assert.match(shortVideo.aiDraftPrompt, /固定テンプレ、単語差し替え/);
  assert.match(novel.aiDraftPrompt, /固定テンプレ、単語差し替え/);
});
