import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';
import { buildReport } from '../src/lib/reportEngine.js';

test('Story Maker routine sync assets are part of the update workflow', () => {
  const snapshotUrl = new URL('../src/lib/storyMakerRoutineSnapshot.js', import.meta.url);
  const syncScriptUrl = new URL('../scripts/sync-story-maker-routines.mjs', import.meta.url);
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(existsSync(snapshotUrl), true, 'Story Maker routine snapshot should be committed');
  assert.equal(existsSync(syncScriptUrl), true, 'Story Maker sync script should be committed');
  assert.equal(
    packageJson.scripts['sync:story-maker'],
    'node scripts/sync-story-maker-routines.mjs',
  );
});

test('creative plans use imported craft routines internally without exposing Story Maker branding', () => {
  const report = buildReport({
    categoryId: 'story-manga',
    observations: PUBLIC_OBSERVATIONS,
    providerMode: 'fixture',
  });

  const plan = report.creativePlans[0];
  const internalNotes = Object.getOwnPropertyDescriptor(plan, 'internalRoutineNotes');
  assert.ok(internalNotes);
  assert.equal(internalNotes.enumerable, false);
  assert.ok(Array.isArray(internalNotes.value));
  assert.ok(internalNotes.value.length >= 4);
  assert.match(internalNotes.value.join('\n'), /Setup-Payoff|GMC|Show Don't Tell/);
  assert.match(internalNotes.value.join('\n'), /Character Knowledge Boundary/);
  assert.ok(plan.storyArchitecture);
  assert.equal(plan.storyArchitecture.status, 'awaiting-ai');
  assert.deepEqual(plan.storyArchitecture.notes, []);
  assert.deepEqual(plan.craftNotes, []);
  assert.match(plan.aiDraftPrompt, /AI生成時の設計条件/);
  assert.match(plan.aiDraftPrompt, /固定テンプレ、単語差し替え/);
  assert.match(plan.aiDraftPrompt, /創作ルーチン/);
  assert.match(plan.aiDraftPrompt, /Setup-Payoff|GMC|Show Don't Tell/);
  assert.match(plan.aiDraftPrompt, /Character Knowledge Boundary/);
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
