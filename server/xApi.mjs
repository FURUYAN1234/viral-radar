import { xSearchOptions, xQuery, normalizeXResponse } from '../src/lib/xSearch.js';

export class XApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function searchX({ token, input, fetchImpl = fetch, now = Date.now() }) {
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token) || token.length > 4096) throw new XApiError(400, 'XのBearer Tokenを専用欄に入力してください。');
  let options;
  try { options = xSearchOptions(input); } catch (error) { throw new XApiError(400, error.message); }
  const url = new URL('https://api.x.com/2/tweets/search/recent');
  url.searchParams.set('query', xQuery(options));
  url.searchParams.set('max_results', String(options.maxResults));
  url.searchParams.set('sort_order', options.sortOrder);
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id,note_tweet');
  url.searchParams.set('start_time', new Date(now - (options.period === '24h' ? 86_400_000 : 604_740_000)).toISOString());
  if (options.includeAuthors) {
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'username,public_metrics');
  }
  let response;
  try {
    response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25_000), redirect: 'error' });
  } catch { throw new XApiError(502, 'X APIとの通信に失敗したか、25秒でタイムアウトしました。自動再試行はしていません。'); }
  if (!response.ok) {
    const messages = {
      400: 'Xの検索条件が受理されませんでした。検索語・演算子を確認してください。',
      401: 'Bearer Tokenが無効または失効しています。コンシューマーキーやOAuth 1.0aのアクセストークンとは別です。',
      402: 'X APIのクレジットが不足しています。Developer Consoleで残高を確認してください。',
      403: 'X APIの読み取り権限または利用資格がありません。Developer Consoleのアプリ設定を確認してください。',
      429: 'X APIの利用上限に達しました。時間を置いて再検索してください。自動再試行はしていません。',
    };
    throw new XApiError(response.status, messages[response.status] || `X APIエラー（HTTP ${response.status}）。自動再試行はしていません。`);
  }
  let payload;
  try { payload = await response.json(); } catch { throw new XApiError(502, 'X APIの応答をJSONとして読み取れませんでした。'); }
  try { return normalizeXResponse(payload, options, new Date(now).toISOString()); }
  catch (error) { throw new XApiError(502, error.message); }
}
export function xApiPlugin() {
  const configure = server => { server.middlewares.use(xApiMiddleware()); };
  return { name: 'monogatari-x-api', configureServer: configure, configurePreviewServer: configure };
}
export function xApiMiddleware({ fetchImpl = fetch } = {}) {
  let busy = false;
  return async (request, response, next) => {
    if (request.url?.split('?')[0] !== '/api/x-search') return next();
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    const host = request.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) || (request.headers.origin && request.headers.origin !== `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site') return send(403, { ok: false, error: 'このX検索は同じローカル画面からだけ利用できます。' });
    if (request.method !== 'POST') return send(405, { ok: false, error: 'POSTを使用してください。' });
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) return send(415, { ok: false, error: 'JSON形式で送信してください。' });
    if (busy) return send(409, { ok: false, error: 'X検索はすでに実行中です。完了後に操作してください。' });
    busy = true;
    try {
      let body = '';
      request.setEncoding('utf8');
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 16_384) throw new XApiError(413, 'X検索条件が大きすぎます。');
      }
      let input;
      try { input = JSON.parse(body); } catch { throw new XApiError(400, '検索条件のJSONを読み取れません。'); }
      const token = request.headers.authorization?.replace(/^Bearer /, '') || '';
      send(200, await searchX({ token, input, fetchImpl }));
    } catch (error) {
      send(error instanceof XApiError ? error.status : 500, { ok: false, error: error instanceof XApiError ? error.message : 'X検索を完了できませんでした。' });
    } finally { busy = false; }
  };
}
