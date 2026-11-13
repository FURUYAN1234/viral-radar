import { X_DEFAULTS, xSearchOptions, xCostEstimate, formatXMetrics } from './xSearch.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const opt = (value, label, selected) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;

export function canUseLocalApi(location = globalThis.location) {
  return location?.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
}

export function createXState() {
  return { ...X_DEFAULTS, mode: 'rss', token: '', editing: false, verified: false, busy: false, result: null, signature: '', error: '', history: new Map() };
}
export function renderXPanel(x, { local, busy, categoryId, searchSeed = 0 }) {
  if (!local) return `<p class="query-note local-x-guide">このデモではX連携は利用できません。<a href="https://github.com/FURUYAN1234/viral-radar/archive/refs/heads/main.zip">ZIPをダウンロード</a>してローカル起動すると利用できます。<a href="https://github.com/FURUYAN1234/viral-radar#local-setup" target="_blank" rel="noopener noreferrer">起動手順</a></p>`;
  const disabled = busy ? 'disabled' : '';
  const cost = xCostEstimate(x);
  const defaults = xSearchOptions({ categoryId, searchSeed });
  const selectedMode = x.mode === 'both' ? 'both' : 'rss';
  const enabled = selectedMode === 'both';
  return `<section class="panel x-panel" aria-label="創作に使う情報源">
    <div class="x-panel-heading"><h2>Xの追加接続（任意）</h2>
      <span class="version-badge">ローカル実行 · X利用可</span></div>
    <fieldset class="x-source-options"><legend class="visually-hidden">次回の取得元</legend>
      ${[['rss','Xを使わない','公開Webから分析'],['both','Xを使う','公開Webの背景情報 ＋ Xの反応']].map(([value,label,detail])=>`<label><input type="radio" name="x-source-mode" value="${value}" ${selectedMode === value ? 'checked' : ''} ${disabled}/><span><strong>${label}</strong><small>${detail}</small></span></label>`).join('')}
    </fieldset>
    <p class="query-note">${enabled ? '公開WebとXを生成AIが照合し、題材・人物・対立・展開へ反映します。' : '公開Webの情報を生成AIが分析し、物語の企画へ反映します。X APIへの通信・料金は発生しません。'}</p>
    <p class="query-note x-runtime-note">X連携はこのPC内で接続します。X・生成AIとも利用者自身のAPIキーを使い、作者の共通サーバーは使いません。</p>
    ${enabled ? `<div class="x-enabled-settings">
    <form id="x-token-form" autocomplete="off" class="x-token-form">
      ${!x.token || x.editing ? `<label for="x-token">Bearer Token（X API）</label><div class="api-connect-row">
        <input id="x-token" type="password" autocomplete="new-password" spellcheck="false" autocapitalize="off" data-lpignore="true" data-1p-ignore="true" placeholder="X Developer ConsoleのBearer Token" ${disabled} />
        <button class="secondary-action" type="submit" ${disabled}>トークンを設定</button></div>
        ${x.token ? `<button type="button" id="x-token-cancel" ${disabled}>変更をキャンセル</button>` : ''}` : `
        <label>Bearer Token <input type="password" value="" placeholder="設定済み" disabled autocomplete="off" /></label>
        <button type="button" class="secondary-action" id="x-token-edit" ${disabled}>トークンを変更</button>
        <button type="button" class="secondary-action" id="x-token-clear" ${disabled}>接続を解除</button>`}
    </form>
    <details class="x-auth-help"><summary>${x.verified ? '接続確認済み' : x.token ? '入力済み・未検証' : 'Bearer Token未設定'}・キーの説明と取得方法</summary>
      <p>キーはメモリだけで保持します。再読み込みで消え、AI・保存ファイルには渡しません。</p>
      <p>Consumer Key / API KeyとSecretはアプリの識別情報です。Access TokenとSecretはOAuth 1.0aでユーザーの権限を使うための組です。ここでは公開投稿の読み取り用のBearer Tokenを使います。</p>
      <p>Developer Consoleで対象アプリを開き、Keys and tokensのBearer Tokenを確認します。Bearer TokenもOAuth 2.0のアクセストークンの一種ですが、上記のOAuth 1.0aの組とは別です。</p>
      <a href="https://console.x.com/" target="_blank" rel="noopener noreferrer">X Developer Consoleを開く</a>
    </details>
    <details class="x-auth-help x-search-settings"><summary>検索条件：${esc(x.query || defaults.query)} ／ ${x.period === '24h' ? '24時間' : '7日'}・${x.sortOrder === 'recency' ? '新着順' : '関連度順'}・最大${x.maxResults}件</summary>
    <div class="x-controls">
      <label class="field-card x-query-field"><span>Xの検索語・検索演算子</span><input id="x-query" value="${esc(x.query)}" maxlength="440" placeholder="${esc(defaults.query)}" ${disabled} /></label>
      <label class="field-card"><span>Xの検索期間</span><select id="x-period" ${disabled}>${opt('24h','直近24時間',x.period)}${opt('7d','直近7日',x.period)}</select></label>
      <label class="field-card"><span>X検索の並び順</span><select id="x-sort" ${disabled}>${opt('relevancy','関連度順',x.sortOrder)}${opt('recency','新着順',x.sortOrder)}</select></label>
      <label class="field-card"><span>1検索の取得上限</span><select id="x-limit" ${disabled}>${[10,25,50,100].map(n=>opt(String(n),`${n}件`,String(x.maxResults))).join('')}</select></label>
    </div>
    <div class="x-checkboxes">
      <label><input id="x-exclude-replies" type="checkbox" ${x.excludeReplies ? 'checked' : ''} ${disabled} />返信を検索結果から除く</label>
      <label><input id="x-authors" type="checkbox" ${x.includeAuthors ? 'checked' : ''} ${disabled} />投稿者・フォロワー数も取得（追加料金）</label>
    </div></details>
    <div class="x-search-action"><p class="query-note">1検索最大${x.maxResults}件・参考上限 $${cost.toFixed(2)}。X API料金は生成AIと別。自動巡回・再試行なし。</p>
    </div>
    ${x.error ? `<p class="gate-warning" role="alert">${esc(x.error)}</p>` : ''}
    ${x.result ? `<details class="x-results"><summary>追加根拠の確認（X・${x.result.usableCount}件）</summary>
      <p>観測 ${esc(x.result.observedAt)} ／ 検索 ${esc(x.result.query)} ／ ${x.result.period === '24h' ? '24時間' : '7日'} ／ ${x.result.sortOrder === 'recency' ? '新着順' : '関連度順'}</p>
      ${x.result.warning ? `<p class="gate-warning">${esc(x.result.warning)}</p>` : ''}
      ${x.result.hasMore ? '<p>続きがありますが、取得上限で止めています。</p>' : ''}
      ${!x.result.usableCount ? '<p>条件に一致する投稿はありませんでした。検索語や期間を変えてください。</p>' : ''}
      ${x.result.observations.slice(0,10).map(o=>`<article class="x-post-evidence"><a href="${esc(o.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(o.authorOrChannel)} の元投稿</a><p>${esc(o.snippet)}</p><p class="x-metrics">${esc(formatXMetrics(o.metrics))}</p><small>投稿 ${esc(o.publishedAt || '時刻未取得')} ／ 観測 ${esc(o.observedAt)}</small></article>`).join('')}
      ${x.result.usableCount > 10 ? '<p>画面は先頭10件。企画の根拠は取得全件から選定します。</p>' : ''}
      <p class="query-note">未取得項目は省略しています。返信数や引用数だけでは賛同・批判は区別できません。増加速度は同じ投稿の1分以上離れた観測があるときだけ表示します。</p>
    </details>` : ''}
    </div>` : ''}
  </section>`;
}
