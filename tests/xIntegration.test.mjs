import { createAiOperationManager } from '../src/lib/aiOperation.js';
import { newEvidenceOnly } from '../src/lib/searchHistory.js';
import { createPlanDesignRequest, runPlanDesignGeneration } from '../src/lib/providers.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, buildPlanDraftPrompt } from '../src/lib/reportEngine.js';
import { toJson, fromJson, toMarkdown } from '../src/lib/exporters.js';
import { toDocxArrayBuffer } from '../src/lib/docxExporter.js';
import { PUBLIC_OBSERVATIONS } from './helpers/publicObservations.mjs';

const observation = {
  ...PUBLIC_OBSERVATIONS[0], id: 'x-123', source: 'X API', sourceType: 'x-api',
  sourceUrl: 'https://x.com/i/status/123', title: '家事を見える化する工夫',
  snippet: '家事を見える化する工夫についての投稿です。',
  metrics: { likes: 0, reposts: 12, replies: 3, quotes: 1, impressions: 200, bookmarks: 0 },
};

test('X evidence and zero-valued public metrics survive report and JSON/Markdown export', () => {
  const report = buildReport({ categoryId: 'story-manga', observations: [observation] });
  assert.equal(report.evidenceCards.length, 1);
  assert.match(report.evidenceCards[0].metricsSummary, /いいね 0/);
  assert.match(report.evidenceCards[0].metricsSummary, /表示回数 200/);
  assert.doesNotMatch(report.evidenceCards[0].metricsSummary, /再生/);
  assert.equal(fromJson(toJson(report)).trendClusters[0].observations[0].metrics.likes, 0);
  assert.match(toMarkdown(report), /x\.com\/i\/status\/123/);
});

test('mixed source selection retains both RSS and X even when RSS fills first five slots', () => {
  const rss = Array.from({ length: 8 }, (_, i) => ({ ...PUBLIC_OBSERVATIONS[0], id: `rss-${i}` }));
  const report = buildReport({ categoryId: 'story-manga', observations: [...rss, observation] });
  assert.ok(report.sourcesUsed.includes('X API'));
  assert.ok(report.sourcesUsed.includes('Google News RSS'));
});


const fixtureSource = readFileSync(new URL('./providers.test.mjs', import.meta.url), 'utf8');
const start = fixtureSource.indexOf('function completeProviderPlan(');
const end = fixtureSource.indexOf("\ntest(", start);
const context = vm.createContext({ aiOperations: createAiOperationManager(),});
vm.runInContext(fixtureSource.slice(start, end), context);
const completePlan = (id) => context.completeProviderPlan(id);
const mixedReport = () => buildReport({categoryId:'story-manga', observations:[observation,...PUBLIC_OBSERVATIONS]});
const run = (report, synthesis) => runPlanDesignGeneration({provider:'openai', apiKey:'sk-fixture-only',report,fetchImpl:async()=>Response.json({output_text:JSON.stringify({plans:report.creativePlans.map(plan=>({...completePlan(plan.id),sourceSynthesis:synthesis}))})})});
const transfer = '公開Webの制度の背景とXに見える困りごとを比較し、架空の窓口で対応の優先順位を選ぶ主人公の対立へ変換する。';

test('mixed-source story plans cite both source types and preserve the transfer in every output',async()=>{
 const report=mixedReport();const x=report.evidenceCards.findIndex(card=>card.sourceType==='x-api');const web=report.evidenceCards.findIndex(card=>card.sourceType==='public-web-rss');
 const prompt=createPlanDesignRequest({provider:'openai',report}).input;assert.match(prompt,/sourceSynthesis/);assert.match(prompt,/食い違い/);
 const result=await run(report,{evidenceIndices:[x,web],creativeTransfer:transfer});
 for(const plan of result.plans){
  assert.deepEqual(new Set(plan.sourceSynthesis.evidence.map(item=>item.sourceType)),new Set(['x-api','public-web-rss']));
  assert.match(buildPlanDraftPrompt({...report.creativePlans[0],...plan},'story-manga'),/複合分析からの創作判断/);
 }
 report.creativePlans=report.creativePlans.map((plan,index)=>({...plan,...result.plans[index]}));
 const restored=fromJson(toJson(report));assert.match(toMarkdown(restored),/複合分析から物語への反映/);
 const docx=Buffer.from(toDocxArrayBuffer(restored)).toString('utf8');assert.equal(docx.split(transfer).length-1,3);
});

test('both advertised JSON shapes include the mandatory mixed-source fields',()=>{
 const prompt=createPlanDesignRequest({provider:'openai',report:mixedReport()}).input;
 const shapes=prompt.split('\n').filter(line=>line.startsWith('JSON shape: ')||line.startsWith('{"plans":')).map(line=>JSON.parse(line.replace('JSON shape: ','')));
 assert.equal(shapes.length,2);
 for(const shape of shapes) assert.ok(shape.plans[0].sourceSynthesis?.creativeTransfer);
});

test('fictional income choices and explicit limits are not private-life profiling',async()=>{
 const report=mixedReport();const x=report.evidenceCards.findIndex(card=>card.sourceType==='x-api');const web=report.evidenceCards.findIndex(card=>card.sourceType==='public-web-rss');
 const result=await run(report,{evidenceIndices:[x,web],creativeTransfer:'公開Webの障害の背景とXの転職の二択を比較し、架空の主人公が収入と人間関係の間で選ぶ対立に変える。投稿者の収入や心理状態を断定しない。'});
 assert.equal(result.plans.length,report.creativePlans.length);
});

test('invalid mixed output gets one correction on the same model, without exhausting cheaper models',async()=>{
 const calls=[];await assert.rejects(runPlanDesignGeneration({provider:'openai',apiKey:'sk-fixture-only',report:mixedReport(),fetchImpl:async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({output_text:JSON.stringify({plans:[]})});}}),/利用できる制作案/);
 assert.equal(calls.length,2);assert.equal(calls[0].model,calls[1].model);assert.match(calls[1].input,/前回の応答/);
});

test('network failures stop after three candidates and timeouts are not retried',async()=>{
 let calls=0;
 await assert.rejects(runPlanDesignGeneration({provider:'openai',apiKey:'sk-fixture-only',report:mixedReport(),fetchImpl:async(url,init)=>{calls++;assert.ok(init.signal);return Response.json({error:{message:'Unavailable'}},{status:503});}}),/HTTP 503/);
 assert.equal(calls,3);calls=0;
 await assert.rejects(runPlanDesignGeneration({provider:'openai',apiKey:'sk-fixture-only',report:mixedReport(),fetchImpl:async()=>{calls++;throw new DOMException('Response timed out','TimeoutError');}}),/timed out/);
 assert.equal(calls,1);
});

test('imported reports retain their source search round and accurate date labels',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ctx=vm.createContext({ aiOperations: createAiOperationManager(),state:{searchSeed:0,timeWindow:'24h',audience:'general'},loaded:{category:{id:'story-manga'},trendClusters:[{observations:[{sourceType:'public-web-rss',searchRound:2,publishedAt:'2026-11-12T23:00:00Z'}]}],creativePlans:[]},formatDataTimestamp:value=>String(value),escapeHtml:value=>String(value),latestObservationTimestamp:()=>''});
 vm.runInContext(main.slice(main.indexOf('function applyLoadedReport('),main.indexOf('async function saveExportFile(')),ctx);
 vm.runInContext(main.slice(main.indexOf('function renderResearchReceipt('),main.indexOf('function renderInsightDashboard(')),ctx);
 vm.runInContext('applyLoadedReport(loaded)',ctx);assert.equal(ctx.state.searchSeed,2);
 const text=vm.runInContext('renderResearchReceipt(loaded)',ctx);assert.match(text,/検索3回目/);assert.match(text,/RSS配信／X投稿/);
});

test('missing, one-sided or invalid references and absent transfer do not pass',async()=>{
 const report=mixedReport();const x=report.evidenceCards.findIndex(card=>card.sourceType==='x-api');const web=report.evidenceCards.findIndex(card=>card.sourceType==='public-web-rss');
 for(const bad of [undefined,{evidenceIndices:[x],creativeTransfer:transfer},{evidenceIndices:[x,999],creativeTransfer:transfer},{evidenceIndices:[x,web],creativeTransfer:''}]) await assert.rejects(run(report,bad),/複合分析|情報源|反映理由/);
});

test('obsolete X-post report imports cannot resurface as a creative category',()=>{
 const report=structuredClone(mixedReport());report.category.id='x-post';assert.throws(()=>fromJson(toJson(report)),/対応していない制作カテゴリ/);
});

test('X alone and empty supplemental evidence cannot pass the combined route',async()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');const a=main.indexOf('async function fetchTrendObservations(');const b=main.indexOf('function bindXControls(',a);
 const ctx=vm.createContext({ aiOperations: createAiOperationManager(),newEvidenceOnly,state:{x:{mode:'both'},historyByCategory:{},selectedCategoryId:'story-manga'},fetchXObservations:async()=>[],fetchRssObservations:async()=>PUBLIC_OBSERVATIONS});vm.runInContext(main.slice(a,b),ctx);
 await assert.rejects(vm.runInContext('fetchTrendObservations()',ctx),/0件/);ctx.state.x.mode='x';await assert.rejects(vm.runInContext('fetchTrendObservations()',ctx),/X単独/);ctx.state.x.mode='rss';assert.equal((await vm.runInContext('fetchTrendObservations()',ctx)).length,PUBLIC_OBSERVATIONS.length);
});

test('mixed report keeps recent Web context prominent alongside supplemental X evidence',()=>{
 const rss=Array.from({length:5},(_,i)=>({...PUBLIC_OBSERVATIONS[0],id:`fresh-${i}`,title:`公開資料${i}`,publishedAt:new Date(Date.UTC(2026,10,12,i)).toISOString()}));
 const report=buildReport({categoryId:'story-manga',observations:[...rss,observation,{...observation,id:'x-124',sourceUrl:'https://x.com/i/status/124'}]});
 assert.equal(report.trendClusters[0].observations[0].id,'fresh-4');assert.equal(report.evidenceCards.filter(card=>card.sourceType==='public-web-rss').length,3);
});

test('generated story manuscripts survive JSON, Markdown and every DOCX plan',()=>{
 const report=mixedReport();report.creativePlans.forEach((plan,i)=>{plan.sampleText=`案${i+1}の検証用本文。雨上がりの道を二人で歩き、夕食の約束を交わした。`;});
 const restored=fromJson(toJson(report));const md=toMarkdown(restored);const docx=Buffer.from(toDocxArrayBuffer(restored)).toString('utf8');
 for(const plan of restored.creativePlans){assert.ok(md.includes(plan.sampleText));assert.ok(docx.includes(plan.sampleText));}
});
