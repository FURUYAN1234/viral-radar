import assert from 'node:assert/strict';
import test from 'node:test';
import { saveBytesWithDialog } from '../src/lib/reportFileSave.js';

const contents = '{"title":"風の物語"}';
const input = {
  fileName: 'monogatari-buzz-maker-story-manga-20261128093000.json',
  mimeType: 'application/json;charset=utf-8',
  bytes: new TextEncoder().encode(contents),
  nativeDialog: true,
};

function useBrowser(t, { picker, response, activated = true } = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const link = { click: t.mock.fn() };
  globalThis.window = { showSaveFilePicker: picker, navigator: { userActivation: { isActive: activated } } };
  globalThis.document = {
    createElement: () => link,
    body: { appendChild: t.mock.fn(), removeChild: t.mock.fn() },
  };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });
  const native = t.mock.method(globalThis, 'fetch', async () => response);
  return { link, native };
}

test('a working browser picker opens at Downloads and writes the original UTF-8 bytes', async t => {
  const write = t.mock.fn();
  const close = t.mock.fn();
  const picker = t.mock.fn(async () => ({ createWritable: async () => ({ write, close }) }));
  const { link, native } = useBrowser(t, { picker });
  assert.deepEqual(await saveBytesWithDialog(input), { mode: 'picker', fileName: input.fileName });
  assert.deepEqual(picker.mock.calls[0].arguments[0], {
    id: 'monogatari-buzz-report',
    startIn: 'downloads',
    suggestedName: input.fileName,
    types: [{ description: 'JSONファイル', accept: { 'application/json': ['.json'] } }],
  });
  assert.equal(await write.mock.calls[0].arguments[0].text(), contents);
  assert.equal(close.mock.callCount(), 1);
  assert.equal(native.mock.callCount(), 0);
  assert.equal(link.click.mock.callCount(), 0);
});

test('a picker unavailable in this browser context falls back to the local save dialog', async t => {
  const { link, native } = useBrowser(t, {
    picker: async () => { throw new DOMException('This platform does not offer a picker', 'NotSupportedError'); },
    response: Response.json({ ok: true, fileName: 'selected.json' }),
  });
  assert.deepEqual(await saveBytesWithDialog(input), { mode: 'native', fileName: 'selected.json' });
  assert.equal(native.mock.callCount(), 1);
  const [url, request] = native.mock.calls[0].arguments;
  assert.equal(url, '/api/save-file-dialog');
  assert.equal(request.method, 'POST');
  const payload = JSON.parse(request.body);
  assert.equal(payload.fileName, input.fileName);
  assert.equal(Buffer.from(payload.contentBase64, 'base64').toString('utf8'), contents);
  assert.equal(link.click.mock.callCount(), 0);
});

test('an unavailable picker and unavailable native service use one ordinary browser download', async t => {
  const { link, native } = useBrowser(t, {
    response: Response.json({ ok: false }, { status: 501 }),
  });
  assert.deepEqual(await saveBytesWithDialog(input), { mode: 'download', fileName: input.fileName });
  assert.equal(native.mock.callCount(), 1);
  assert.equal(link.click.mock.callCount(), 1);
  assert.equal(link.download, input.fileName);
});

test('a published page can download when its picker cannot be opened', async t => {
  const { link, native } = useBrowser(t, {
    picker: async () => { throw new DOMException('Fallback needed', 'NotSupportedError'); },
  });
  const wordName = 'monogatari-buzz-maker-story-manga-20261128093000.docx';
  assert.deepEqual(await saveBytesWithDialog({
    ...input,
    fileName: wordName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    nativeDialog: false,
  }), { mode: 'download', fileName: wordName });
  assert.equal(native.mock.callCount(), 0);
  assert.equal(link.click.mock.callCount(), 1);
});

for (const name of ['AbortError', 'NotAllowedError', 'SecurityError']) {
  test('the picker ' + name + ' ends the save without a fallback', async t => {
    const failure = new DOMException('The user ended the picker operation', name);
    const { link, native } = useBrowser(t, { picker: async () => { throw failure; } });
    await assert.rejects(saveBytesWithDialog(input), error => error === failure);
    assert.equal(native.mock.callCount(), 0);
    assert.equal(link.click.mock.callCount(), 0);
  });
}

test('an error writing to a chosen browser file never starts a new save', async t => {
  const failure = new DOMException('Disk access failed', 'QuotaExceededError');
  const close = t.mock.fn();
  const { link, native } = useBrowser(t, {
    picker: async () => ({ createWritable: async () => ({
      write: async () => { throw failure; },
      close,
    }) }),
  });
  await assert.rejects(saveBytesWithDialog(input), error => error === failure);
  assert.equal(close.mock.callCount(), 0);
  assert.equal(native.mock.callCount(), 0);
  assert.equal(link.click.mock.callCount(), 0);
});

test('a native cancellation ends the save without a separate browser download', async t => {
  const { link, native } = useBrowser(t, { response: Response.json({ ok: true, cancelled: true }) });
  await assert.rejects(saveBytesWithDialog(input), { name: 'AbortError' });
  assert.equal(native.mock.callCount(), 1);
  assert.equal(link.click.mock.callCount(), 0);
});

test('a native write error reaches the app and avoids a second save', async t => {
  const { link, native } = useBrowser(t, {
    response: Response.json({ ok: false, error: 'Disk access failed' }, { status: 400 }),
  });
  await assert.rejects(saveBytesWithDialog(input), /Disk access failed/);
  assert.equal(native.mock.callCount(), 1);
  assert.equal(link.click.mock.callCount(), 0);
});

test('the app opens no save path when the browser explicitly reports missing user activation', async t => {
  const picker = t.mock.fn();
  const { link, native } = useBrowser(t, { picker, activated: false });
  await assert.rejects(saveBytesWithDialog(input), { name: 'SecurityError' });
  assert.equal(picker.mock.callCount(), 0);
  assert.equal(native.mock.callCount(), 0);
  assert.equal(link.click.mock.callCount(), 0);
});

test('a failure closing after a write does not start a second save, even when its name is NotSupportedError', async t => {
  const failure = new DOMException('The write could not be committed', 'NotSupportedError');
  const write = t.mock.fn();
  const { link, native } = useBrowser(t, {
    picker: async () => ({ createWritable: async () => ({
      write,
      close: async () => { throw failure; },
    }) }),
  });
  await assert.rejects(saveBytesWithDialog(input), error => error === failure);
  assert.equal(write.mock.callCount(), 1);
  assert.equal(native.mock.callCount(), 0);
  assert.equal(link.click.mock.callCount(), 0);
});

test('a lost native response is an error even if the write may already have happened', async t => {
  const failure = new TypeError('Failed to fetch');
  const { link, native } = useBrowser(t);
  native.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(saveBytesWithDialog(input), error => error === failure);
  assert.equal(native.mock.callCount(), 1);
  assert.equal(link.click.mock.callCount(), 0);
});
