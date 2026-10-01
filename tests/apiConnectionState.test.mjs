import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as models from '../src/lib/openaiModels.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function extract(name){ const start=source.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0);const next=source.slice(start+1).search(/\n(?:async )?function /);return source.slice(start,next<0?undefined:start+1+next); }
function harness(){
 let calls=0;
 const context=vm.createContext({...models,initialSettings:{apiKey:''},initialProviderStatus:{provider:{connected:false}},APP_VERSION:'1.2.7',API_SAVE_BUSY_MS:300,
 createReport:()=>({}),render:()=>{},clearActionMessage:()=>{},showActionMessage:()=>{},forgetPersistedSettings:()=>{},wait:async()=>{},focusApiInputSoon:()=>{},resetAnalysisSessionForApiChange:()=>{},isUiWorking:()=>false,escapeHtml:String,escapeAttr:String,disabledAttr:v=>v?'disabled':'',renderDataLabel:()=>'',normalizeEnteredApiKey:v=>String(v).trim(),refreshTrendObservations:()=>{calls++;},fetch:()=>{calls++;throw new Error('unexpected API');}});
 const start=source.indexOf('const state = {');const end=source.indexOf('\nstate.observations =',start);
 vm.runInContext(source.slice(start,end)+'\nlet apiInputUserTouched=false;',context);
 vm.runInContext("function currentProviderStatus(settings=state.settings){return {mode:settings.apiKey?.startsWith('sk-')?'openai':'none',provider:{connected:settings.apiKey?.startsWith('sk-')||false,label:'OpenAI'}};}",context);
 for(const name of ['isProviderConfigured','isApiReady','bootstrapApp','renderOpenAiModelControl','renderApiStartGate','renderApiConnectPanel','openApiSettings','closeApiSettings','connectApiKey']) vm.runInContext(extract(name),context);
 return {context,get state(){return vm.runInContext('state',context);},get calls(){return calls;}};
}
test('Sol actually selected on startup without automatic API',()=>{
 const h=harness();vm.runInContext('bootstrapApp()',h.context);assert.equal(h.state.openAiModelId,'gpt-6.1-sol');assert.equal(h.state.openAiModelConfirmed,true);assert.equal(h.state.analysisStartConfirmed,false);assert.equal(h.calls,0);
 const html=vm.runInContext("renderOpenAiModelControl({mode:'openai'},false)",h.context);assert.match(html,/value="gpt-6.1-sol" selected/);assert.doesNotMatch(html,/value=""/);
});
test('connect noneditable, explicit change, invalid input and cancel preserve old connection',async()=>{
 const h=harness();h.state.apiKeyDraft='sk-test-only-placeholder';await vm.runInContext('connectApiKey()',h.context);assert.equal(h.state.apiPanelOpen,false);assert.equal(h.state.analysisStartConfirmed,false);
 const panel=()=>vm.runInContext("renderApiConnectPanel({mode:'none',provider:{connected:false}},false)",h.context);
 let html=panel();assert.match(html,/APIキーを変更/);assert.match(html,/id="connected-api-key" type="password" value="" placeholder="••••••••" disabled/);assert.doesNotMatch(html,/sk-test-only-placeholder|入力待ち|id="api-key"/);
 vm.runInContext('openApiSettings()',h.context);assert.equal(h.state.apiPanelOpen,true);html=panel();assert.match(html,/id="api-key"[^>]*type="password"[^>]*value=""/);assert.doesNotMatch(html,/sk-test-only-placeholder/);
 h.state.apiKeyDraft='unrecognized';await vm.runInContext('connectApiKey()',h.context);assert.equal(h.state.settings.apiKey,'sk-test-only-placeholder');assert.equal(h.state.apiPanelOpen,true);
 vm.runInContext('closeApiSettings()',h.context);assert.equal(h.state.apiPanelOpen,false);assert.equal(h.state.apiKeyDraft,'');assert.equal(h.state.settings.apiKey,'sk-test-only-placeholder');assert.equal(h.calls,0);
});
