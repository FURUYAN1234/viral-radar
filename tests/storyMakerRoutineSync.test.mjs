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
  assert.equal(plan.storyArchitecture.setupPayoff.method, '伏線と回収');
  assert.equal(plan.storyArchitecture.gmc.method, 'GMC+S');
  assert.equal(plan.storyArchitecture.knowledgeBoundary.method, '知識境界');
  assert.match(plan.storyArchitecture.setupPayoff.setup, /冒頭|第1ページ|0秒|第1章/);
  assert.match(plan.storyArchitecture.setupPayoff.payoff, /結末|読後感|回収|救済/);
  assert.match(plan.storyArchitecture.knowledgeBoundary.readerKnows, /読者|画面|証拠/);
  assert.doesNotMatch(plan.storyArchitecture.notes.map((note) => note.detail).join('\n'), /今日はを|はを|がを|にはを/);
  assert.match(plan.aiDraftPrompt, /物語設計/);
  assert.match(plan.aiDraftPrompt, /伏線と回収/);
  assert.match(plan.aiDraftPrompt, /GMC\+S/);
  assert.match(plan.aiDraftPrompt, /知識境界/);
  assert.match(plan.aiDraftPrompt, /創作ルーチン/);
  assert.match(plan.aiDraftPrompt, /Setup-Payoff|GMC|Show Don't Tell/);
  assert.match(plan.aiDraftPrompt, /Character Knowledge Boundary/);
  assert.match(plan.aiDraftPrompt, /伏線|回収|人物が知り得ることの境界/);
  assert.doesNotMatch(plan.aiDraftPrompt, /Story Maker|story-maker|連携|同期ハッシュ/);
  assert.doesNotMatch(JSON.stringify(plan), /Story Maker|story-maker|連携|internalRoutineNotes/);
});

test('story architecture uses medium-specific audience language', () => {
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

  assert.match(shortVideo.storyArchitecture.setupPayoff.setup, /視聴者/);
  assert.match(shortVideo.storyArchitecture.knowledgeBoundary.readerKnows, /視聴者/);
  assert.doesNotMatch(shortVideo.storyArchitecture.notes.map((note) => note.detail).join('\n'), /読者の感情/);
  assert.match(novel.storyArchitecture.mediumExecution.detail ?? novel.storyArchitecture.notes.at(-1).detail, /第1章|章末/);
});
