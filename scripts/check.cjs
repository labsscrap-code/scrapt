'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
for(const dir of ['api','lib','scripts','tests','frontend']) for(const name of fs.readdirSync(path.join(__dirname,'..',dir))) {
  if(!/\.(js|cjs)$/.test(name))continue;
  const r=cp.spawnSync(process.execPath,['--check',path.join(__dirname,'..',dir,name)],{stdio:'inherit'});
  if(r.status!==0)process.exit(1);
}
console.log('JavaScript syntax checks passed.');
