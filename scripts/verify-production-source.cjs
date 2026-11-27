'use strict';
// Keep the immutable production snapshot distinct from engineering-only changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const BASELINE='eadb508d86a19f097759268dc5e2977a601ef7c5';
const ENGINEERING_SCRIPTS={verify:'node scripts/secret-scan.cjs && node scripts/verify-production-source.cjs && npm run lint && npm test && npm run build'};
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
function manifest(bytes,name){let m;try{m=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));}catch{throw Error('Invalid manifest: '+name);}
 if(!m||!m.files||Array.isArray(m.files)||typeof m.files!=='object'||!Object.keys(m.files).length)throw Error('Empty or missing manifest files: '+name);
 for(const [p,h]of Object.entries(m.files))if(!/^[a-zA-Z0-9_.\/-]+$/.test(p)||p.split('/').some(k=>!k||k==='..')||path.isAbsolute(p)||typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))throw Error('Invalid manifest entry: '+name);
 return m;
}
function verify(root,baselineReader){
 const realRoot=fs.realpathSync(root);
 const read=p=>{const abs=path.resolve(root,p);if(!abs.startsWith(path.resolve(root)+path.sep)||!fs.lstatSync(abs).isFile()||fs.lstatSync(abs).isSymbolicLink()||!fs.realpathSync(abs).startsWith(realRoot+path.sep))throw Error('Unsafe or missing source: '+p);return fs.readFileSync(abs);};
 const baseline=baselineReader||(p=>{const r=spawnSync('git',['show',BASELINE+':'+p],{cwd:root,maxBuffer:8*1024*1024});if(r.status!==0)throw Error('Production baseline unavailable; fetch full Git history.');return r.stdout;});
 const raw=read('docs/production-source.json');if(!raw.equals(baseline('docs/production-source.json')))throw Error('Historical production manifest changed.');
 const production=manifest(raw,'docs/production-source.json');const approved=manifest(read('approved-frontend.json'),'approved-frontend.json');
 let historical=0,working=0,metadata=0,frontend=0;
 for(const [p,h]of Object.entries(production.files)){
  const original=baseline(p);if(digest(original)!==h)throw Error('Historical hash mismatch: '+p);historical++;
  const current=read(p);if(digest(current)===h){working++;continue;}
  if(p!=='package.json')throw Error('Working source differs from production: '+p);
  const old=JSON.parse(original),updated=JSON.parse(current),expected={...old,scripts:{...old.scripts,...ENGINEERING_SCRIPTS}};
  if(JSON.stringify(canonical(updated))!==JSON.stringify(canonical(expected)))throw Error('Unapproved package metadata change.');metadata++;
 }
 for(const [p,h]of Object.entries(approved.files)){if(digest(read('frontend/'+p))!==h)throw Error('Frontend hash mismatch: '+p);frontend++;}
 return {baseline:BASELINE,historicalHashes:historical,approvedFrontendHashes:frontend,workingExact:working,engineeringMetadata:metadata};
}
if(require.main===module){try{const r=verify(path.resolve(__dirname,'..'));console.log('Historical production: '+r.historicalHashes+'/'+r.historicalHashes+' hashes; approved frontend: '+r.approvedFrontendHashes+'/'+r.approvedFrontendHashes+' hashes.');console.log('Current source: '+r.workingExact+' byte-identical; '+r.engineeringMetadata+' package-script-only metadata exception.');}catch(error){console.error('Integrity verification failed: '+error.message);process.exitCode=1;}}
module.exports={verify,manifest,BASELINE,ENGINEERING_SCRIPTS};
