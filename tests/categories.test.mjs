import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategoryById } from '../src/lib/categories.js';

test('exposes only the four creative categories with manga first', () => {
  assert.deepEqual(CATEGORIES.map((category) => category.id), [
    'story-manga',
    'short-video',
    'trend-explainer',
    'long-novel',
  ]);
  assert.equal(getCategoryById('trend-explainer').label, 'トレンド解説動画');
});
