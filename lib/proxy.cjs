'use strict';
const https=require('node:https');
const net=require('node:net');
const READ=new Set(['session','snapshot','history','alerts','news']);
const WRITE=new Set(['login','logout','scrappy']);
function origins(env) {
  const values=[env.SCRAPT_PUBLIC_ORIGIN,env.VERCEL_URL&&'https://'+env.VERCEL_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL&&'https://'+env.VERCEL_PROJECT_PRODUCTION_URL];
  return new Set(values.filter(Boolean).filter(value=>{
    try {const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password;}catch{return false;}
  }));
}
function sessionCookie(value) {
  if(typeof value!=='string')return '';
  const matches=value.split(';').map(x=>x.trim()).filter(x=>/^__Host-scrap(?:t|py)=/.test(x));
  if(matches.some(x=>!/^__Host-scrap(?:t|py)=[A-Za-z0-9_-]{1,100}$/.test(x))||
      new Set(matches.map(x=>x.split('=')[0])).size!==matches.length)return '';
  return matches.join('; ');
}
function createHandler(transport=https.request,env=process.env) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const fail=(status,error)=>{if(!res.writableEnded){res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error}));}};
    let upstream;
    try {
      const url=new URL(req.url,'https://request.invalid');
      const match=/^\/api\/v1\/([a-z]+)$/.exec(url.pathname);
      if(!match||req.url.length>1024)return fail(404,'route_not_found');
      const route=match[1],method=req.method;
      if(route==='scrappy'&&env.SCRAPT_SCRAPPY_ENABLED!=='enabled')return fail(503,'ai_disabled');
      if(!READ.has(route)&&!WRITE.has(route))return fail(404,'route_not_found');
      if(!(method==='GET'&&READ.has(route)||method==='POST'&&WRITE.has(route)))return fail(405,'method_not_allowed');
      const allowed=origins(env),host=req.headers.host;
      if(typeof host!=='string'||!allowed.has('https://'+host))return fail(403,'host_denied');
      if(method==='POST'&&(req.headers.origin!=='https://'+host||!allowed.has(req.headers.origin)||
          req.headers['sec-fetch-site']==='cross-site'))return fail(403,'origin_denied');
      const ip=env.SCRAPT_UPSTREAM_IP,tlsName=env.SCRAPT_UPSTREAM_TLS_NAME;
      const upstreamOrigin=env.SCRAPT_UPSTREAM_ORIGIN;
      if(!net.isIP(ip||'')||net.isIP(tlsName||'')||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(tlsName||'')||
          upstreamOrigin!=='https://'+tlsName)return fail(503,'upstream_not_configured');
      if([...url.searchParams.keys()].some(k=>!['before','limit'].includes(k))||
          (url.search&& !['history','alerts','news'].includes(route)))return fail(400,'invalid_query');
      let body=Buffer.alloc(0);
      if(method==='POST'&&route==='login') {
        if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return fail(415,'json_required');
        let input=req.body;
        if(Buffer.isBuffer(input)||typeof input==='string')input=JSON.parse(String(input));
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='name,password'||
            typeof input.name!=='string'||! /^[a-zA-Z0-9_-]{3,40}$/.test(input.name)||
            typeof input.password!=='string'||input.password.length<1||input.password.length>128)return fail(422,'invalid_request');
        body=Buffer.from(JSON.stringify(input));
      }
      if(method==='POST'&&route==='scrappy') {
        if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return fail(415,'json_required');
        let input=req.body;
        if(Buffer.isBuffer(input)||typeof input==='string')input=JSON.parse(String(input));
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).join(',')!=='message'||
            typeof input.message!=='string'||!input.message.trim()||input.message.length>2000)return fail(422,'invalid_request');
        body=Buffer.from(JSON.stringify({message:input.message.trim()}));
      }
      if(body.length>8192)return fail(413,'request_too_large');
      const cookie=sessionCookie(req.headers.cookie);
      const headers={'Host':tlsName,'Accept':'application/json','Accept-Encoding':'identity',
        'Content-Type':'application/json','Content-Length':body.length};
      if(cookie)headers.Cookie=cookie;
      if(method==='POST')headers.Origin=upstreamOrigin;
      if(route==='logout') {
        const csrf=req.headers['x-scrapt-csrf'];
        if(typeof csrf!=='string'||! /^[a-f0-9]{64}$/.test(csrf))return fail(403,'csrf_denied');
        headers['X-Scrapt-CSRF']=csrf;
      }
      await new Promise(resolve=>{
        let done=false;
        const finish=()=>{if(!done){done=true;resolve();}};
        const error=()=>{fail(502,'upstream_unavailable');finish();};
        upstream=transport({hostname:ip,port:443,servername:tlsName,rejectUnauthorized:true,
          method,path:url.pathname+url.search,headers,timeout:route==='scrappy'?23000:7000},response=>{
          const chunks=[];let size=0;
          response.on('data',chunk=>{size+=chunk.length;if(size>2*1024*1024){response.destroy();error();}else chunks.push(chunk);});
          response.on('error',error);
          response.on('aborted',error);
          response.on('end',()=>{
            if(done)return;
            if(!String(response.headers['content-type']||'').includes('application/json')){error();return;}
            res.statusCode=response.statusCode;
            res.setHeader('Content-Type','application/json');
            if(response.headers['retry-after'])res.setHeader('Retry-After',response.headers['retry-after']);
            // Host-only cookies acquire the frontend host while retaining backend security flags.
            const cookies=response.headers['set-cookie']||[];
            if(cookies.length) {
              if(!cookies.every(c=>/^__Host-scrap(?:t|py)=/.test(c)&&/;\s*Secure(?:;|$)/i.test(c)&&
                  /;\s*HttpOnly(?:;|$)/i.test(c)&&/;\s*SameSite=Strict(?:;|$)/i.test(c)&&
                  /;\s*Path=\/(?:;|$)/i.test(c)&&! /;\s*Domain=/i.test(c))){error();return;}
              res.setHeader('Set-Cookie',cookies);
            }
            res.end(Buffer.concat(chunks));finish();
          });
        });
        upstream.on('error',error);
        upstream.on('timeout',()=>{upstream.destroy();error();});
        upstream.end(body);
      });
    } catch {if(upstream)upstream.destroy();fail(502,'upstream_unavailable');}
  };
}
module.exports={createHandler,origins,sessionCookie};
