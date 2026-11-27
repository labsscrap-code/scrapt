'use strict';
// Adapted from the reviewed HERMES package. Findings never include matched values.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const RULES=[
 ['private-key',/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY(?: BLOCK)?-----/],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
 ['provider-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
 ['aws-key',/\bAKIA[0-9A-Z]{16}\b/],
 ['slack-token',/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
 ['google-key',/\bAIza[0-9A-Za-z_-]{35}\b/],
 ['telegram-token',/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/],
 ['jwt',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
 ['credential-url',/\b(?:postgres(?:ql)?|mysql|rediss?):\/\/[^\s:@]+:[^\s@]+@/i],
 ['private-ipv4',/\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/],
 ['inline-secret',/\b(?:api[_-]?key|access[_-]?token|secret|password|passwd|token)\b\s*[:=]\s*['"]([^'"\s]{12,})['"]/i]
];
const FORBIDDEN=/(?:^|\/)(?:\.env(?:\.|$)|\.git\/|\.vercel\/|node_modules\/|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$|(?:credentials|secrets)\.(?:json|ya?ml|ini|toml)$)|\.(?:key|pem|p12|pfx|keystore|jks|db|sqlite3?|log|exe|whl|zip|rar|7z|tar\.gz)$/i;
function scanText(file,text){
 const found=[];text.split('\n').forEach((line,i)=>{for(const [rule,re]of RULES){const m=re.exec(line);if(!m)continue;
  // Only exact, clearly artificial fixtures are exempt from generic assignment
  // detection; real token/key rules apply everywhere, including tests and docs.
  if(rule==='inline-secret'&&(/^(?:test-only-password|example|placeholder|dummy|changeme)$/.test(m[1])||/^0x[0-9a-fA-F]{40}$/.test(m[1])))continue;
  found.push({file,line:i+1,rule});
 }});return found;
}
function scan(root,staged=false){
 const args=staged?['diff','--cached','--name-only','--diff-filter=ACMR','-z']:['ls-files','--cached','--others','--exclude-standard','-z'];
 const listing=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 if(listing.status!==0)throw Error('Cannot enumerate repository files. Use a trusted Git checkout.');
 const files=[...new Set(listing.stdout.split('\0').filter(Boolean))],findings=[];
 for(const rel of files){
  if(path.isAbsolute(rel)||rel.split(/[\\/]/).some(p=>p==='..'||p===''))throw Error('Unsafe repository path.');
  if(FORBIDDEN.test(rel))findings.push({file:rel,line:0,rule:'forbidden-file'});
  const abs=path.resolve(root,rel),stat=fs.lstatSync(abs);
  if(stat.isSymbolicLink()||!stat.isFile()){findings.push({file:rel,line:0,rule:'non-regular-file'});continue;}
  if(!fs.realpathSync(abs).startsWith(fs.realpathSync(root)+path.sep))throw Error('File escapes checkout.');
  if(stat.size>16*1024*1024){findings.push({file:rel,line:0,rule:'oversized-review-required'});continue;}
  let data;
  if(staged){const result=spawnSync('git',['show',':'+rel],{cwd:root,maxBuffer:16*1024*1024});if(result.status!==0)throw Error('Cannot read staged file.');data=result.stdout;}
  else data=fs.readFileSync(abs);
  findings.push(...scanText(rel,data.toString('utf8')));
 }
 return {files:files.length,findings};
}
if(require.main===module){
 try{const args=process.argv.slice(2);let root=path.resolve(__dirname,'..'),staged=false;for(let i=0;i<args.length;i++){if(args[i]==='--root'&&args[i+1])root=path.resolve(args[++i]);else if(args[i]==='--staged')staged=true;else throw Error('Unknown scanner option.');}
  const result=scan(root,staged);console.log('Secret scan: '+result.files+' files; '+result.findings.length+' findings.');
  for(const f of result.findings.slice(0,50))console.error(f.file+':'+f.line+' ['+f.rule+']');
  if(result.findings.length)process.exitCode=1;
 }catch{console.error('Secret scan failed closed: checkout or file could not be inspected.');process.exitCode=2;}
}
module.exports={scanText,scan};
