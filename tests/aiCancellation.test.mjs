import test from 'node:test';
import assert from 'node:assert/strict';
import {runProviderAnalysis} from '../src/lib/providers.js';
test('external stop aborts provider wait and blocks fallback even on late failure',async()=>{
 const controller=new AbortController();let calls=0,observed,finish;
 const pending=runProviderAnalysis({provider:'openai',apiKey:'sk-test-cancellation',report:{},signal:controller.signal,fetchImpl:async(_url,init)=>{calls++;observed=init.signal;if(calls>1)return Response.json({error:{message:"temporary"}},{status:503});return new Promise(resolve=>{finish=resolve;});}});
 await new Promise(r=>setImmediate(r));controller.abort();
 finish(Response.json({error:{message:'temporary'}},{status:503}));
 await assert.rejects(pending,error=>error.name==='AbortError');
 assert.equal(observed.aborted,true);assert.equal(calls,1);
});

import {createAiOperationManager,abortable} from '../src/lib/aiOperation.js';
test('fresh action remains active when canceled old output and finally arrive',async()=>{
 const manager=createAiOperationManager();assert.deepEqual(manager.state(),{active:false,stopped:false});const old=manager.begin();let finish;const pending=abortable(new Promise(resolve=>finish=resolve),old.signal);manager.stop();await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(manager.state().active,false);const fresh=manager.begin();old.finish();assert.equal(manager.state().active,true);finish('late');await new Promise(r=>setImmediate(r));assert.equal(await abortable(Promise.resolve('normal'),fresh.signal),'normal');fresh.finish();assert.equal(manager.state().active,false);
});
import {EventEmitter} from 'node:events';
import {registerProviderProxyRoute} from '../vite.config.js';
function proxyRequest(){let handler;registerProviderProxyRoute({use(fn){handler=fn;}});const req=Object.assign(new EventEmitter(),{url:'/api/provider-generate',method:'POST',setEncoding(){}});const res=Object.assign(new EventEmitter(),{writableEnded:false,destroyed:false,setHeader(){},end(text){this.text=text;this.writableEnded=true;}});return {req,res,run(){const result=handler(req,res,()=>assert.fail('wrong route'));req.emit('data',JSON.stringify({provider:'openai',model:'gpt-6.1-sol',apiKey:'test-key',body:{input:'test'}}));req.emit('end');return result;}};}
test('local proxy disconnect aborts upstream request and sends no late body',async()=>{
 const original=globalThis.fetch;let signal;
 globalThis.fetch=async(_url,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));};
 try{const request=proxyRequest();const pending=request.run();await new Promise(r=>setImmediate(r));request.res.destroyed=true;request.res.emit('close');await pending;assert.equal(signal.aborted,true);assert.equal(request.res.text,undefined);}finally{globalThis.fetch=original;}
});
test('normal local proxy response is returned unchanged',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({output_text:'normal response'});
 try{const request=proxyRequest();await request.run();assert.equal(request.res.statusCode,200);assert.equal(JSON.parse(request.res.text).output_text,'normal response');}finally{globalThis.fetch=original;}
});
