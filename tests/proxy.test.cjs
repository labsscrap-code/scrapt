'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createHandler,sessionCookie}=require('../lib/proxy.cjs');
const ENV={SCRAPT_PUBLIC_ORIGIN:'https://scrapt.example.vercel.app',SCRAPT_UPSTREAM_IP:'203.0.113.10',
  SCRAPT_UPSTREAM_TLS_NAME:'api.scrapt.example',SCRAPT_UPSTREAM_ORIGIN:'https://api.scrapt.example'};
async function execute({path='/api/v1/snapshot',method='GET',headers={},body,env={},status=200,
  responseHeaders={'content-type':'application/json'},responseBody='{}',error=false,interpreter}={}) {
  const captured=[];
  const transport=(options,callback)=>{
    const request=new EventEmitter();request.destroy=()=>{};
    request.end=body=>{captured.push({options,body});queueMicrotask(()=>{
      if(error){request.emit('error',new Error('sensitive upstream detail'));return;}
      const response=new EventEmitter();response.statusCode=status;response.headers=responseHeaders;response.destroy=()=>{};
      callback(response);response.emit('data',Buffer.from(responseBody));response.emit('end');
    });};return request;
  };
  const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.body=String(value);this.writableEnded=true;}};
  await createHandler(transport,{...ENV,...env},interpreter)({url:path,method,headers:{host:'scrapt.example.vercel.app',...headers},body},res);
  return {res,captured};
}
test('read API forwards only session cookie with verified pinned TLS',async()=>{
  const {res,captured:[{options}]}=await execute({headers:{cookie:'other=private; __Host-scrapt=test_session',authorization:'secret','x-forwarded-for':'spoof'}});
  assert.equal(res.statusCode,200);assert.equal(options.hostname,'203.0.113.10');assert.equal(options.servername,'api.scrapt.example');
  assert.equal(options.rejectUnauthorized,true);assert.equal(options.headers.Cookie,'__Host-scrapt=test_session');
  assert.equal(options.headers.authorization,undefined);assert.equal(options.headers['x-forwarded-for'],undefined);
  assert.match(res.headers['cache-control'],/no-store/);assert.equal(res.headers['vercel-cdn-cache-control'],'no-store');
});
test('login validates frontend Origin before translating to backend Origin',async()=>{
  const {res,captured}=await execute({path:'/api/v1/login',method:'POST',headers:{origin:ENV.SCRAPT_PUBLIC_ORIGIN,'content-type':'application/json'},body:{name:'tester',password:'test-only-password'}});
  assert.equal(res.statusCode,200);assert.equal(captured[0].options.headers.Origin,'https://api.scrapt.example');
});
test('foreign and missing Origin denied without contacting backend',async()=>{
  for(const origin of [undefined,'https://evil.example']){const {res,captured}=await execute({path:'/api/v1/login',method:'POST',headers:{origin}});assert.equal(res.statusCode,403);assert.equal(captured.length,0);}
});
test('unconfigured Host denied',async()=>{const {res,captured}=await execute({headers:{host:'evil.example'}});assert.equal(res.statusCode,403);assert.equal(captured.length,0);});
test('preview accepts only exact platform deployment hostname',async()=>{
  const {res}=await execute({headers:{host:'preview.vercel.app'},env:{VERCEL_URL:'preview.vercel.app'}});assert.equal(res.statusCode,200);
  assert.equal((await execute({headers:{host:'other.vercel.app'}})).res.statusCode,403);
});
test('upstream configuration fails closed; cannot use DNS that later loops to Vercel',async()=>{
  for(const env of [{SCRAPT_UPSTREAM_IP:'api.scrapt.example'},{SCRAPT_UPSTREAM_TLS_NAME:'203.0.113.10'},{SCRAPT_UPSTREAM_ORIGIN:'http://api.scrapt.example'}]){
    const {res,captured}=await execute({env});assert.equal(res.statusCode,503);assert.equal(captured.length,0);
  }
});
test('unknown routes and methods cannot proxy arbitrary backend endpoints',async()=>{
  for(const path of ['/api/v1/config','/api/v1/snapshot/extra','/api/v1/../settings'])assert.equal((await execute({path})).res.statusCode,404);
  assert.equal((await execute({method:'POST'})).res.statusCode,405);
});
test('AI remains disabled without upstream request',async()=>{const {res,captured}=await execute({path:'/api/v1/scrappy',method:'POST'});assert.equal(res.statusCode,503);assert.equal(captured.length,0);});
test('explicitly enabled anonymous chat validates Origin, schema and bounded timeout',async()=>{
 const base={path:'/api/v1/scrappy',method:'POST',env:{SCRAPT_SCRAPPY_ENABLED:'enabled'},responseBody:JSON.stringify({ok:true,answer:'Available market observations do not guarantee future direction.'}),
   headers:{origin:ENV.SCRAPT_PUBLIC_ORIGIN,'content-type':'application/json',cookie:'__Host-scrappy=anonymous_session; unrelated=secret'},body:{message:'BTC?'}};
 const {res,captured}=await execute(base);assert.equal(res.statusCode,200);assert.equal(captured[0].options.timeout,23000);
 assert.equal(captured[0].options.headers.Cookie,'__Host-scrappy=anonymous_session');assert.equal(captured[0].options.headers.Origin,'https://api.scrapt.example');
 assert.equal((await execute({...base,headers:{...base.headers,origin:'https://evil.example'}})).res.statusCode,403);
 for(const body of [{message:'x'.repeat(2001)},{message:' '},{message:'BTC',messages:[]}])assert.equal((await execute({...base,body})).res.statusCode,422);
});
test('conversation cookie remains host-only, secure and HttpOnly',async()=>{
 const cookie='__Host-scrappy=conversation; HttpOnly; Path=/; SameSite=strict; Secure';
 const {res}=await execute({responseHeaders:{'content-type':'application/json','set-cookie':[cookie]}});
 assert.deepEqual(res.headers['set-cookie'],[cookie]);
 assert.equal(sessionCookie('__Host-scrapt=owner; __Host-scrappy=conversation'),'__Host-scrapt=owner; __Host-scrappy=conversation');
 assert.equal(sessionCookie('__Host-scrappy=one; __Host-scrappy=two'),'');
});
test('pagination preserved and arbitrary query rejected',async()=>{
  const {captured}=await execute({path:'/api/v1/alerts?limit=50&before=100'});assert.equal(captured[0].options.path,'/api/v1/alerts?limit=50&before=100');
  assert.equal((await execute({path:'/api/v1/snapshot?url=https://evil.example'})).res.statusCode,400);
});
test('logout requires CSRF and forwards exact validated token',async()=>{
  const base={path:'/api/v1/logout',method:'POST',headers:{origin:ENV.SCRAPT_PUBLIC_ORIGIN}};
  assert.equal((await execute(base)).res.statusCode,403);
  const {captured}=await execute({...base,headers:{...base.headers,'x-scrapt-csrf':'a'.repeat(64)}});
  assert.equal(captured[0].options.headers['X-Scrapt-CSRF'],'a'.repeat(64));
});
test('secure host-only cookie retained verbatim; insecure or domain cookie rejected',async()=>{
  const cookie='__Host-scrapt=test; HttpOnly; Path=/; SameSite=strict; Secure';
  const responseHeaders={'content-type':'application/json','set-cookie':[cookie]};
  const {res}=await execute({responseHeaders});assert.deepEqual(res.headers['set-cookie'],[cookie]);
  for(const bad of [cookie.replace('; Secure',''),cookie+'; Domain=api.scrapt.example'])assert.equal((await execute({responseHeaders:{...responseHeaders,'set-cookie':[bad]}})).res.statusCode,502);
});
test('authentication and rate-limit status retained without caching',async()=>{
  for(const status of [401,403,429,503]){const {res}=await execute({status,responseHeaders:{'content-type':'application/json','retry-after':'60'}});assert.equal(res.statusCode,status);assert.equal(res.headers['retry-after'],'60');}
});
test('non-JSON upstream response and network errors return safe errors',async()=>{
  for(const settings of [{responseHeaders:{'content-type':'text/html'},responseBody:'private exception'},{error:true}]){
    const {res}=await execute(settings);assert.equal(res.statusCode,502);assert.equal(res.body,'{"error":"upstream_unavailable"}');
  }
});
test('duplicate session cookies rejected',()=>{assert.equal(sessionCookie('__Host-scrapt=one; __Host-scrapt=two'),'');assert.equal(sessionCookie('unrelated=one'),'');});
test('login schema prevents forwarding extra fields',async()=>{
  const {res,captured}=await execute({path:'/api/v1/login',method:'POST',headers:{origin:ENV.SCRAPT_PUBLIC_ORIGIN,'content-type':'application/json'},body:{name:'tester',password:'test-only',role:'admin'}});
  assert.equal(res.statusCode,422);assert.equal(captured.length,0);
});

test('UI-only release leaves unvalidated research routing unavailable',async()=>{
 for(const method of ['GET','POST','PUT','DELETE']){const r=await execute({path:'/api/v1/edge',method});assert.equal(r.res.statusCode,404);assert.equal(r.captured.length,0);}
});


test('successful AI commentary is interpreted server-side without changing cookies or the contract',async()=>{let calls=0;const raw='Observaciones — Snapshot: test; scanner actualizado.\n• BTC: 60,000.00 USD.\n\nInterpretación:\nEl precio no garantiza una dirección futura.';const answer='Observations — Snapshot: test; scanner is fresh.\n• BTC: 60,000.00 USD.\n\nInterpretation:\nPrice does not guarantee future direction.';const result=await execute({path:'/api/v1/scrappy',method:'POST',env:{SCRAPT_SCRAPPY_ENABLED:'enabled'},headers:{origin:ENV.SCRAPT_PUBLIC_ORIGIN,'content-type':'application/json'},body:{message:'BTC?'},responseBody:JSON.stringify({ok:true,answer:raw}),interpreter:async(value)=>{calls++;assert.equal(value,raw);return answer;}});assert.equal(result.res.statusCode,200);assert.deepEqual(JSON.parse(result.res.body),{ok:true,answer});assert.equal(calls,1);});
