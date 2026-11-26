'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../frontend/api-client.js'),'utf8');
function setup(handler=async()=>new Response('{}',{headers:{'Content-Type':'application/json'}})){
 let now=1000;const requests=[];
 const c={Response,Headers,AbortController,setTimeout,clearTimeout,Date,console,
  performance:{now:()=>now},location:{protocol:'https:'},fetch:async(url,options)=>{requests.push({url,options});return handler(url,options)}};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return {client:c.ScraptClient,requests,context:c,advance:ms=>{now+=ms}};
}
function sample(){return {schemaVersion:1,ts:new Date().toISOString(),workerFresh:true,clockSynchronized:true,
 sourceHealth:Object.fromEntries(['spot','funding','openInterest','trades','book','kline','fearGreed','defi'].map(k=>[k,{status:'fresh',ageSeconds:0}])),
 spot24h:{BTCUSDT:{precio:123,cambio_24h_pct:0}},futures:{funding_pct:0,open_interest_btc:20},
 fng:{valor:0,anterior:1,clase:'Fear'},book:{bid:2,ask:1},vol:{x:1},realtime_5m:{ticks_5m:2},reglas:[],alertas:[]};}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
test('same-origin cookie credentials and no-store on production paths',async()=>{
 const e=setup(async()=>json({name:'user',csrf:'test-only-token'}));await e.client.session();
 assert.equal(e.requests[0].url,'/api/v1/session');assert.equal(e.requests[0].options.credentials,'same-origin');assert.equal(e.requests[0].options.cache,'no-store');assert.equal(e.requests[0].options.redirect,'error');
});
test('HTTP refused without issuing a network request',async()=>{
 const e=setup();e.context.location.protocol='http:';await assert.rejects(e.client.session(),e=>e.kind==='https_required');assert.equal(e.requests.length,0);
});
test('configuration and arbitrary provider endpoints remain blocked',async()=>{
 const e=setup();assert.equal(e.client.AI_ENABLED,true);
 for(const route of ['/config','https://provider.invalid/chat'])await assert.rejects(e.client.request(route),e=>e.kind==='route_not_allowed');
 assert.equal(e.requests.length,0);
});
test('anonymous chat uses one same-origin request without requesting an account session',async()=>{
 const e=setup(async()=>json({ok:true,answer:'Observed market data'}));assert.equal(await e.client.chat('BTC?'),'Observed market data');
 assert.equal(e.requests.length,1);assert.equal(e.requests[0].url,'/api/v1/scrappy');assert.equal(e.requests[0].options.credentials,'same-origin');
 assert.equal(e.requests[0].options.headers['X-SCRAPT-CSRF'],undefined);
});
test('chat rate limits do not pause independent market polling',async()=>{
 const e=setup(async url=>url.endsWith('/scrappy')?json({},429,{'Retry-After':'60'}):json(sample()));
 await assert.rejects(e.client.chat('BTC?'),e=>e.kind==='rate_limited');
 const market=await e.client.snapshot();assert.equal(market.spot24h.BTCUSDT.precio,123);assert.equal(e.client.retryMs(),5000);
});
test('zero funding and Fear/Greed are valid, missing price remains null',()=>{
 const e=setup();let s=sample();s.spot24h.BTCUSDT.precio=NaN;s=e.client.expire(e.client.normalize(s));
 assert.equal(s.futures.funding_pct,0);assert.equal(s.fng.valor,0);assert.equal(s.spot24h.BTCUSDT.precio,null);
});
test('string numeric values do not become fabricated market zeroes',()=>{
 const e=setup();const s=sample();s.futures.open_interest_btc='20';s.spot24h.BTCUSDT.cambio_24h_pct='bad';
 const data=e.client.normalize(s);assert.equal(data.futures.open_interest_btc,null);assert.equal(data.spot24h.BTCUSDT.cambio_24h_pct,null);
});
test('independent stale sources mask only their fields',()=>{
 const e=setup();const s=sample();s.sourceHealth.book.status='stale';const data=e.client.expire(e.client.normalize(s));
 assert.equal(data.book.bid,null);assert.equal(data.spot24h.BTCUSDT.precio,123);assert.equal(data.connectionFresh,false);
});
test('paused/background snapshots expire without network or new observations',()=>{
 const e=setup(),s=e.client.normalize(sample());e.advance(21000);const aged=e.client.expire(s);
 assert.equal(aged.workerFresh,false);assert.equal(Object.keys(aged.spot24h).length,0);assert.equal(aged.book.ask,null);assert.equal(aged.realtime_5m.ticks_5m,undefined);
});
test('unknown schema and invalid timestamp fail closed',()=>{
 const e=setup();for(const change of [{schemaVersion:99},{ts:'invalid'}])assert.throws(()=>e.client.normalize({...sample(),...change}),e=>e.kind==='invalid_snapshot');
});
test('session coalescing avoids redundant authenticated reads',async()=>{
 const e=setup(async()=>json({name:'user',csrf:'fixture-csrf'}));await Promise.all([e.client.session(),e.client.session()]);assert.equal(e.requests.length,1);
});
test('logout preserves CSRF and never stores browser tokens',async()=>{
 const e=setup(async(url,options)=>url.endsWith('/session')?json({name:'user',csrf:'fixture-csrf'}):json({ok:true}));await e.client.logout();
 assert.equal(e.requests[1].options.headers['X-SCRAPT-CSRF'],'fixture-csrf');assert.equal(e.requests[1].options.method,'POST');
});
test('401 classifies session expiry instead of fake data',async()=>{
 const e=setup(async()=>json({error:'unauthorized'},401));await assert.rejects(e.client.snapshot(),e=>e.kind==='login_required');
});
test('429 respects Retry-After and does not hammer retry',async()=>{
 const e=setup(async()=>json({error:'limited'},429,{'Retry-After':'2'}));await assert.rejects(e.client.snapshot(),e=>e.kind==='rate_limited');await assert.rejects(e.client.snapshot(),e=>e.kind==='rate_limited');assert.equal(e.requests.length,1);
});
test('HTML error page cannot masquerade as successful API JSON',async()=>{
 const e=setup(async()=>new Response('<html>error</html>',{headers:{'Content-Type':'text/html'}}));await assert.rejects(e.client.snapshot(),e=>e.kind==='invalid_response');
});
test('persisted alert DTO mapped from original backend schema',async()=>{
 const e=setup(async(url)=>url.endsWith('/snapshot')?json(sample()):url.includes('/alerts')?json({items:[{ts:1,urgency:4,kind:'noticia',message:'real endpoint fixture',meaning:'context'}]}):json({price_history:[],fut_history:[]}));
 const s=await e.client.snapshot({details:true});assert.equal(s.alertas[0].msg,'real endpoint fixture');assert.equal(s.alertas[0].urgencia,4);assert.equal(s.alertsState,'ready');
});
test('history failure does not invent chart points or lose real snapshot',async()=>{
 const e=setup(async(url)=>url.endsWith('/snapshot')?json(sample()):url.includes('/alerts')?json({items:[]}):json({error:'unavailable'},503));
 const s=await e.client.snapshot({details:true});assert.equal(s.spot24h.BTCUSDT.precio,123);assert.equal(s.price_history.length,0);assert.equal(s.historyState,'unavailable');
});
