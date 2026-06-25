import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategoryById } from '../src/lib/categories.js';

test('MVP exposes the four approved category buttons', () => {
  assert.deepEqual(CATEGORIES.map((category) => category.id), [
    'story-manga',
    'short-video',
    'trend-explainer',
    'long-novel',
  ]);
  assert.equal(getCategoryById('trend-explainer').label, 'トレンド解説動画');
});
