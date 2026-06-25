import test from 'node:test';
import assert from 'node:assert/strict';
import { exportTimestamp } from '../src/lib/fileNames.js';
import { docxFileName } from '../src/lib/docxExporter.js';
import { buildReport } from '../src/lib/reportEngine.js';

test('export timestamp uses 14 local date-time digits', () => {
  const date = new Date(2026, 5, 24, 16, 37, 8);

  assert.equal(exportTimestamp(date), '20260624163708');
});

test('docx file name includes a 14-digit timestamp', () => {
  const report = buildReport({ categoryId: 'story-manga' });
  const fileName = docxFileName(report);

  assert.match(fileName, /^monogatari-buzz-maker-story-manga-\d{14}\.docx$/);
});
