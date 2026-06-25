import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeXml, itemMatchesCategory, buildCategoryRelevantPool, enrichTrendMetrics } from '../vite.config.js';

test('decodeXml decodes numeric and hex XML entities so RSS titles are not mojibake', () => {
  // はてな等のRSSは漢字・カナを16進実体参照で返すため、生の &#x...; が残ると文字化けに見える。
  assert.equal(decodeXml('&#x5CA1;&#x5D0E;'), '岡崎');
  assert.equal(decodeXml('&#x30AA;&#x30CA;'), 'オナ');
  assert.equal(decodeXml('A&#38;B'), 'A&B');
  // 二重エンコード（&amp;#x...;）も1回の呼び出しで復号する。
  assert.equal(decodeXml('&amp;#x5CA1;'), '岡');
  // 名前付き実体も従来通り。
  assert.equal(decodeXml('&lt;tag&gt; &quot;x&quot;'), '<tag> "x"');
});

test('itemMatchesCategory keeps emotional/societal story material and rejects pure-noise news', () => {
  // このアプリは「世の中で今ウケている感情・話題（＝ネタ）」を拾う。媒体名は判定に使わない。
  assert.equal(itemMatchesCategory({ title: '職場の人間関係に悩む投稿が共感を呼び話題' }), true);
  assert.equal(itemMatchesCategory({ title: '夫婦の家計をめぐるすれ違いが議論に' }), true);
  // 物語素材になりにくいニュースは除外。
  assert.equal(itemMatchesCategory({ title: '台風7号が沖縄に接近' }), false);
  assert.equal(itemMatchesCategory({ title: '日経平均株価が反発' }), false);
  // 業界の動静ニュース（漫画家のドラマ化など）は、それ自体ではネタにならないので素材扱いしない。
  assert.equal(itemMatchesCategory({ title: '人気縦読み漫画が実写ドラマ化決定' }), false);
  assert.equal(itemMatchesCategory({ title: '電話対応の言い間違いに「あるある」と共感【エッセイ漫画】' }), false);
  assert.equal(itemMatchesCategory({ title: '【漫画】生活時間が合わない夫婦のすれ違いを描いた読切が話題' }), false);
  assert.equal(itemMatchesCategory({ title: '原作を超える主人公のウザさが話題の秋ドラマ3作品' }), false);
  assert.equal(itemMatchesCategory({ title: '「本屋大賞」作品が売れ続ける理由。母娘の葛藤も共感しやすい' }), false);
  assert.equal(itemMatchesCategory({ title: '家族と宗教の伝統と、現代的生き方の葛藤に向き合うドラマ' }), false);
});

test('buildCategoryRelevantPool prioritizes angle-scoped and societal-material items, drops noise when enough material', () => {
  const items = [
    { title: '言えなかった本音が共感を呼ぶ', categoryScoped: true },
    { title: '介護と仕事の両立に悩む声が話題' },
    { title: '世代間の価値観ギャップが議論に' },
    { title: '理不尽な職場ルールにモヤモヤする人続出' },
    { title: '子育てと家計のリアルが共感を集める' },
    { title: '友人関係のすれ違いに後悔する投稿' },
    { title: '【漫画】生活時間が合わない夫婦のすれ違いを描いた読切が話題', categoryScoped: true },
    { title: '台風7号が沖縄に接近' },
    { title: '日経平均株価が反発' },
  ];
  const pool = buildCategoryRelevantPool(items, 'story-manga');
  const titles = pool.map((item) => item.title);
  assert.ok(titles.includes('言えなかった本音が共感を呼ぶ'));
  assert.ok(!titles.includes('台風7号が沖縄に接近'));
  assert.ok(!titles.includes('日経平均株価が反発'));
  assert.ok(!titles.some((title) => title.includes('読切')));
  // angle-scoped item must rank first via relevance weighting.
  assert.equal(pool[0].relevance, 2);
});

test('buildCategoryRelevantPool falls back to filler only when material is too few', () => {
  const items = [
    { title: '言えなかった本音が共感を呼ぶ', categoryScoped: true },
    { title: '台風7号が沖縄に接近' },
    { title: '日経平均株価が反発' },
  ];
  const pool = buildCategoryRelevantPool(items, 'story-manga');
  // 素材が1件 < minimum(6) なので、空にせず補助ニュースを末尾に加える。
  assert.equal(pool.length, 3);
  assert.equal(pool[0].title, '言えなかった本音が共感を呼ぶ');
});

test('enrichTrendMetrics adds real RSS-derived cooccurrence and source metrics', () => {
  const items = [
    { title: '職場の理不尽に共感が集まる', sourceLabel: 'Google News RSS', categoryScoped: true },
    { title: '理不尽な職場ルールにモヤモヤする人続出', sourceLabel: 'はてな 世の中' },
    { title: '家計の不安が議論に', sourceLabel: 'はてな 暮らし' },
  ];
  const enriched = enrichTrendMetrics(items);

  assert.equal(enriched[0].categoryMatchScore, 100);
  assert.ok(enriched[0].coOccurrenceScore > 0);
  assert.equal(enriched[1].hatenaHotEntryScore, 100);
  assert.equal(enriched[0].sourceDiversity, 3);
});
