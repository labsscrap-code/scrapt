'use strict';
const handler=require('../lib/proxy.cjs').createHandler();
module.exports=(req,res)=>{
  // Vercel's explicit rewrite supplies the endpoint; the proxy still enforces
  // its own route/method/origin allowlist before making any upstream request.
  const url=new URL(req.url,'https://request.invalid');
  const endpoint=req.query?.endpoint || url.searchParams.get('endpoint');
  if(typeof endpoint!=='string'||! /^[a-z]+$/.test(endpoint)){
    res.statusCode=404;res.setHeader('Cache-Control','no-store');res.end();return;
  }
  url.searchParams.delete('endpoint');
  return handler({url:'/api/v1/'+endpoint+url.search,method:req.method,headers:req.headers,body:req.body},res);
};
