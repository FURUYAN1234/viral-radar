import { webSecurity } from './scripts/web-security.mjs';
import { writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { defineConfig } from 'vite';
import { searchTrendObservations } from './src/lib/publicTrendSearch.js';
import { xApiPlugin } from './server/xApi.mjs';

const ALLOWED_EXTENSIONS = new Set(['.docx', '.json']);
const GITHUB_PAGES_BASE = '/viral-radar/';

export default defineConfig({
  base: GITHUB_PAGES_BASE,
  plugins: [webSecurity({ connectSources: ["https://api.openai.com","https://generativelanguage.googleapis.com","https://api.allorigins.win","https://api.codetabs.com","https://corsproxy.io","https://cors.isomorphic-git.org","https://news.google.com","https://www.bing.com","https://trends.google.co.jp","https://news.yahoo.co.jp","https://b.hatena.ne.jp"] }), nativeSaveDialogPlugin(), trendSearchPlugin(), providerProxyPlugin(), xApiPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
  preview: {
    host: '127.0.0.1',
    port: 5180,
  },
});

function trendSearchPlugin() {
  return {
    name: 'monogatari-trend-search',
    configureServer(server) {
      registerTrendSearchRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerTrendSearchRoute(server.middlewares);
    },
  };
}

function registerTrendSearchRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/trend-search')) {
      next();
      return;
    }

    try {
      if (request.method !== 'GET') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }

      const url = new URL(request.url, 'http://127.0.0.1');
      const payload = await searchTrendObservations({
        categoryId: String(url.searchParams.get('categoryId') || 'story-manga'),
        timeWindow: String(url.searchParams.get('timeWindow') || '24h'),
        audience: String(url.searchParams.get('audience') || 'general'),
        searchSeed: Number(url.searchParams.get('searchSeed') || 0),
        fetchImpl: fetch,
      });

      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: error instanceof Error ? error.message : '公開Web/RSS取得に失敗しました。',
      });
    }
  });
}

// ブラウザから OpenAI / Gemini を直接叩くと OpenAI は CORS で遮断され「Failed to fetch」になる。
// ローカル dev サーバーを中継にして、プロバイダ呼び出しをサーバー側で行う（キーはログ・保存しない）。
function providerProxyPlugin() {
  return {
    name: 'monogatari-provider-proxy',
    configureServer(server) {
      registerProviderProxyRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerProviderProxyRoute(server.middlewares);
    },
  };
}

export function registerProviderProxyRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/provider-generate')) {
      next();
      return;
    }
    const controller = new AbortController();
    const stop = () => { if (!response.writableEnded) controller.abort(); };
    request.once('aborted', stop); response.once('close', stop);
    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }
      const payload = await readJsonBody(request);
      const provider = String(payload?.provider ?? '');
      const model = String(payload?.model ?? '');
      const apiKey = String(payload?.apiKey ?? '');
      const body = payload?.body;
      if ((provider !== 'openai' && provider !== 'gemini') || !model || !apiKey || !body) {
        sendJson(response, 400, { ok: false, error: '中継リクエストの内容が不正です。' });
        return;
      }

      const upstream =
        provider === 'gemini'
          ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify(body),
            })
          : await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify(body),
            });

      const text = await upstream.text();
      controller.signal.throwIfAborted();
      // プロバイダのステータスとJSONをそのまま返す（クライアント側の callProviderModel が解釈する）。
      response.statusCode = upstream.status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(text || '{}');
    } catch (error) {
      if (controller.signal.aborted || response.destroyed) return;
      sendJson(response, 502, {
        ok: false,
        error: { message: error instanceof Error ? error.message : 'プロバイダ中継に失敗しました。' },
      });
    } finally { request.removeListener('aborted', stop); response.removeListener('close', stop); }
  });
}

function nativeSaveDialogPlugin() {
  return {
    name: 'monogatari-native-save-dialog',
    configureServer(server) {
      registerSaveDialogRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      registerSaveDialogRoute(server.middlewares);
    },
  };
}

function registerSaveDialogRoute(middlewares) {
  middlewares.use(async (request, response, next) => {
    if (!request.url?.startsWith('/api/save-file-dialog')) {
      next();
      return;
    }

    try {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: '許可されていないメソッドです。' });
        return;
      }

      const payload = await readJsonBody(request);
      const fileName = sanitizeFileName(payload?.fileName);
      const contentBase64 = String(payload?.contentBase64 ?? '');
      if (!contentBase64) throw new Error('保存内容が空です。');

      const filePath = await askUserForSavePath(fileName);
      if (!filePath) {
        sendJson(response, 200, { ok: true, cancelled: true, fileName });
        return;
      }

      ensureAllowedExtension(filePath);
      await writeFile(filePath, Buffer.from(contentBase64, 'base64'));
      sendJson(response, 200, { ok: true, cancelled: false, fileName: basename(filePath) });
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : '保存に失敗しました。',
      });
    }
  });
}

function askUserForSavePath(fileName) {
  const extension = extname(fileName).toLowerCase().replace(/^\./, '');
  const filter =
    extension === 'docx'
      ? 'Word document (*.docx)|*.docx|All files (*.*)|*.*'
      : 'JSON file (*.json)|*.json|All files (*.*)|*.*';
  const script = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.SaveFileDialog',
    "$dialog.Title = '保存先を選択'",
    `$dialog.FileName = ${psQuote(fileName)}`,
    `$dialog.Filter = ${psQuote(filter)}`,
    `$dialog.DefaultExt = ${psQuote(extension)}`,
    '$dialog.AddExtension = $true',
    '$dialog.OverwritePrompt = $true',
    "$dialog.InitialDirectory = [Environment]::GetFolderPath('MyDocuments')",
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($dialog.FileName) }',
  ].join('; ');

  return new Promise((resolvePath, rejectPath) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8', windowsHide: true, timeout: 0 },
      (error, stdout, stderr) => {
        if (error) {
          rejectPath(new Error(stderr?.trim() || error.message));
          return;
        }
        resolvePath(stdout.trim());
      },
    );
  });
}

function sanitizeFileName(fileName) {
  const clean = basename(String(fileName ?? '')).replace(/[^A-Za-z0-9._-]/g, '_');
  ensureAllowedExtension(clean);
  if (!clean.startsWith('monogatari-buzz-maker-')) {
    throw new Error('このアプリの出力ファイル名ではありません。');
  }
  return clean;
}

function ensureAllowedExtension(fileName) {
  const extension = extname(String(fileName ?? '')).toLowerCase();
  if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('保存できるファイルはDOCXまたはJSONだけです。');
  }
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        rejectBody(new Error('保存内容が大きすぎます。'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body || '{}'));
      } catch {
        rejectBody(new Error('保存内容のJSONを解析できません。'));
      }
    });
    request.on('error', rejectBody);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}
