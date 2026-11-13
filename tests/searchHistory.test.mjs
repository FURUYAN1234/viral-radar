import test from 'node:test';
import assert from 'node:assert/strict';
import { searchTrendObservations } from '../src/lib/publicTrendSearch.js';
import { xSearchOptions } from '../src/lib/xSearch.js';
import { newEvidenceOnly, rememberCreativeReport, assertDifferentPlans } from '../src/lib/searchHistory.js';
const now=Date.parse('2026-11-13T00:00:00Z');
const item=(title,date,url)=>`<item><title>${title}</title><link>https://example.com/${url}</link>${date?`<pubDate>${date}</pubDate>`:''}<description>家族と仕事の悩み</description></item>`;
test('recent search excludes expired, unknown and future dates instead of dating them as now',async()=>{
 const xml='<rss><channel>'+item('家族の本音 今日','Fri, 13 Nov 2026 00:00:00 GMT','new')+item('職場のすれ違い 昨日','Thu, 12 Nov 2026 03:00:00 GMT','recent')+item('仕事の葛藤 古い','Sun, 01 Nov 2026 00:00:00 GMT','old')+item('家族の問題 不明','','unknown')+item('未来の仕事','Sat, 14 Nov 2026 00:00:00 GMT','future')+'</channel></rss>';
 const result=await searchTrendObservations({now,timeWindow:'24h',fetchImpl:async()=>new Response(xml)});
 assert.equal(result.observations.length,2);for(const o of result.observations){assert.ok(Date.parse(o.publishedAt)>=now-86400000);assert.ok(Date.parse(o.publishedAt)<=now);}
 const empty='<rss><channel>'+item('古い仕事の悩み','Sun, 01 Nov 2026 00:00:00 GMT','old')+'</channel></rss>';
 await assert.rejects(searchTrendObservations({now,timeWindow:'24h',fetchImpl:async()=>new Response(empty)}),/取得/);
});
test('X searches rotate angles by round while an explicit query stays intact',()=>{
 const first=xSearchOptions({categoryId:'story-manga',searchSeed:0});const second=xSearchOptions({categoryId:'story-manga',searchSeed:1});assert.notEqual(first.query,second.query);
 assert.equal(xSearchOptions({query:'指定語',searchSeed:4}).query,'指定語');
});
test('source history excludes repeats and mirrored titles without fabricating replacements',()=>{
 const history={};const old={sourceUrl:'https://example.com/one',title:'家族の本音と仕事のすれ違いから考える今日の新しい選択の話'};
 rememberCreativeReport(history,{category:{id:'story-manga'},trendClusters:[{observations:[old]}],creativePlans:[]});
 const mirror={...old,sourceUrl:'https://another.example.com/one'};const fresh={sourceUrl:'https://example.com/two',title:'職場で助け合う別の話題'};
 assert.deepEqual(newEvidenceOnly([old,mirror,fresh],history['story-manga'].evidenceKeys),[fresh]);assert.deepEqual(newEvidenceOnly([old],history['story-manga'].evidenceKeys),[]);
});
test('old story premise and title are rejected, distinct conflicts pass',()=>{
 const previous=[{title:'雨の窓口',premise:'新人が閉鎖直前の窓口で消えた受付記録を見つけて救う物語',conflict:'手続きを守るか同僚を守るか',payoff:'記録を取り戻し同僚を救う'}];
 assert.throws(()=>assertDifferentPlans([{titleCandidates:['別の名前'],premise:previous[0].premise,creatorBrief:{}}],previous),/前回/);
 assert.doesNotThrow(()=>assertDifferentPlans([{titleCandidates:['山の食堂'],premise:'山小屋の料理人が最後の食材を客と分け合う',creatorBrief:{conflict:'最後の夕食を誰と食べるか',payoff:'皆で持ち寄った料理を囲む'}}],previous));
});
