import { createAiOperationManager } from '../src/lib/aiOperation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as models from '../src/lib/openaiModels.js';
import { createXState, canUseLocalApi } from '../src/lib/xPanel.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function extract(name){ const start=source.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0);const next=source.slice(start+1).search(/\n(?:async )?function /);return source.slice(start,next<0?undefined:start+1+next); }
function harness(){
 let calls=0;
 const context=vm.createContext({ aiOperations: createAiOperationManager(),...models,createXState,canUseLocalApi,location:new URL('https://furuyan1234.github.io/viral-radar/'),initialSettings:{apiKey:''},initialProviderStatus:{provider:{connected:false}},APP_VERSION:'1.4.1',API_SAVE_BUSY_MS:300,
 createReport:()=>({}),render:()=>{},clearActionMessage:()=>{},showActionMessage:()=>{},forgetPersistedSettings:()=>{},wait:async()=>{},focusApiInputSoon:()=>{},resetAnalysisSessionForApiChange:()=>{},isUiWorking:()=>false,escapeHtml:String,escapeAttr:String,disabledAttr:v=>v?'disabled':'',renderDataLabel:()=>'',normalizeEnteredApiKey:v=>String(v).trim(),refreshTrendObservations:()=>{calls++;},fetch:()=>{calls++;throw new Error('unexpected API');}});
 const start=source.indexOf('const state = ');assert.ok(start>=0);const end=source.indexOf('\n};',start)+3;
 vm.runInContext(source.slice(start,end).replace('import.meta.hot?.data.runtimeState','undefined')+'\nlet apiInputUserTouched=false;',context);
 vm.runInContext("function currentProviderStatus(settings=state.settings){return {mode:settings.apiKey?.startsWith('sk-')?'openai':'none',provider:{connected:settings.apiKey?.startsWith('sk-')||false,label:'OpenAI'}};}",context);
 for(const name of ['isProviderConfigured','isApiReady','bootstrapApp','renderOpenAiModelControl','renderApiStartGate','renderApiConnectPanel','openApiSettings','closeApiSettings','connectApiKey','selectCategory','fetchXObservations','suggestMore','isProviderAuthError','shouldUseLocalTrendApi']) vm.runInContext(extract(name),context);
 return {context,get state(){return vm.runInContext('state',context);},get calls(){return calls;}};
}
test('Sol actually selected on startup without automatic API',()=>{
 const h=harness();vm.runInContext('bootstrapApp()',h.context);assert.equal(h.state.openAiModelId,'gpt-6.1-sol');assert.equal(h.state.openAiModelConfirmed,true);assert.equal(h.state.analysisStartConfirmed,false);assert.equal(h.calls,0);
 const html=vm.runInContext("renderOpenAiModelControl({mode:'openai'},false)",h.context);assert.match(html,/value="gpt-6.1-sol" selected/);assert.doesNotMatch(html,/value=""/);
});
test('public runtime blocks X before any request even if its in-memory mode is changed', async()=>{
 const h=harness(); h.state.x.mode='both'; h.state.x.token='test-only-placeholder';
 await assert.rejects(vm.runInContext('fetchXObservations()',h.context),/ローカル版/);
 assert.equal(h.calls,0);
 assert.equal(h.state.x.token,'test-only-placeholder');
});
test('connect noneditable, explicit change, invalid input and cancel preserve old connection',async()=>{
 const h=harness();h.state.apiKeyDraft='sk-test-only-placeholder';await vm.runInContext('connectApiKey()',h.context);assert.equal(h.state.apiPanelOpen,false);assert.equal(h.state.analysisStartConfirmed,false);
 const panel=()=>vm.runInContext("renderApiConnectPanel({mode:'none',provider:{connected:false}},false)",h.context);
 let html=panel();assert.match(html,/APIキーを変更/);assert.match(html,/id="connected-api-key" type="password" value="" placeholder="••••••••" disabled/);assert.doesNotMatch(html,/sk-test-only-placeholder|入力待ち|id="api-key"/);
 vm.runInContext('openApiSettings()',h.context);assert.equal(h.state.apiPanelOpen,true);html=panel();assert.match(html,/id="api-key"[^>]*type="password"[^>]*value=""/);assert.doesNotMatch(html,/sk-test-only-placeholder/);
 h.state.apiKeyDraft='unrecognized';await vm.runInContext('connectApiKey()',h.context);assert.equal(h.state.settings.apiKey,'sk-test-only-placeholder');assert.equal(h.state.apiPanelOpen,true);
 vm.runInContext('closeApiSettings()',h.context);assert.equal(h.state.apiPanelOpen,false);assert.equal(h.state.apiKeyDraft,'');assert.equal(h.state.settings.apiKey,'sk-test-only-placeholder');assert.equal(h.calls,0);
});

test('category can be chosen before explicit start without any API call',()=>{
 const h=harness();
 vm.runInContext("selectCategory('story-manga')",h.context);
 assert.equal(h.state.selectedCategoryId,'story-manga');assert.equal(h.calls,0);
 h.state.settings.apiKey='sk-test-only-placeholder';
 vm.runInContext("selectCategory('long-novel')",h.context);
 assert.equal(h.state.selectedCategoryId,'long-novel');assert.equal(h.calls,0);
 h.state.analysisStartConfirmed=true;
 vm.runInContext("selectCategory('story-manga')",h.context);
 assert.equal(h.calls,1);
});

test('X off blocks X requests even if a token exists',async()=>{
 const h=harness(); h.state.x.token='fixture-only-token';
 await assert.rejects(vm.runInContext('fetchXObservations()',h.context),/Xを使わない設定/);
 assert.equal(h.calls,0);
});

test('re-search keeps the connected key and ready state and invalidates the X cache',()=>{
 const h=harness();h.state.settings.apiKey='sk-connected-fixture';h.state.analysisStartConfirmed=true;h.state.apiPanelOpen=false;h.state.x.signature='old-cache';
 const before=h.state.searchSeed;vm.runInContext('suggestMore()',h.context);
 assert.equal(h.state.settings.apiKey,'sk-connected-fixture');assert.equal(h.state.analysisStartConfirmed,true);assert.equal(h.state.apiPanelOpen,false);assert.equal(h.state.searchSeed,before+1);assert.equal(h.state.x.signature,'');assert.equal(h.calls,1);
});
test('content refusal and validation errors cannot erase authentication',()=>{
 const h=harness();for(const message of ['生成を拒否しました','認証を題材にした文章は不合格','HTTP 403 permission denied','HTTP 429 quota']) {h.context.testError=new Error(message);assert.equal(vm.runInContext('isProviderAuthError(testError)',h.context),false);}
 h.context.testError=Object.assign(new Error('HTTP 401'),{category:'authentication'});assert.equal(vm.runInContext('isProviderAuthError(testError)',h.context),true);
});
