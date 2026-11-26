'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const approved=require('../approved-frontend.json');
fs.mkdirSync(path.join(root,'public'),{recursive:true});
for(const [name,hash] of Object.entries(approved.files)) {
  const data=fs.readFileSync(path.join(root,'frontend',name));
  if(crypto.createHash('sha256').update(data).digest('hex')!==hash) throw new Error('Approved asset changed: '+name);
  fs.mkdirSync(path.dirname(path.join(root,'public',name)),{recursive:true});
  fs.writeFileSync(path.join(root,'public',name),data);
}
console.log('Built '+Object.keys(approved.files).length+' approved assets; chat activation is server-guarded.');

require("./build-neural.cjs");

require("./build-field-notes.cjs").build();
