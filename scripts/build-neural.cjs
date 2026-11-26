'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'neural-frontier'),out=path.join(root,'public/neural-frontier');
const original=JSON.parse(fs.readFileSync(path.join(source,'original-source.json'),'utf8').replace(/^\uFEFF/,''));
for(const [name,hash] of Object.entries(original)) {
  const data=fs.readFileSync(path.join(source,name));
  if(crypto.createHash('sha256').update(data).digest('hex')!==hash)throw new Error('Original HUD source changed: '+name);
}
fs.mkdirSync(out,{recursive:true});
process.env.GOMAXPROCS ||= '2';
const esbuild=require(path.join(source,'node_modules/esbuild'));
esbuild.buildSync({entryPoints:[path.join(source,'mount.tsx')],outfile:path.join(out,'hud.js'),bundle:true,minify:true,platform:'browser',target:['es2020'],jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},alias:{'@':source},legalComments:'linked'});
const tailwind=path.join(source,'node_modules/tailwindcss/lib/cli.js');
const result=cp.spawnSync(process.execPath,[tailwind,'-c','tailwind.config.ts','-i','app/globals.css','-o',path.join(out,'hud.css'),'--minify'],{cwd:source,stdio:'inherit'});
if(result.status!==0)throw new Error('HUD stylesheet build failed');
for(const name of ['index.html','host.css','edge-discovery.css','console-host.css','console-host.js','jetbrains-mono-latin.woff2'])fs.copyFileSync(path.join(source,name),path.join(out,name));
console.log('Built original Neural Frontier HUD with isolated React runtime and stylesheet.');
