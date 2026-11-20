'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hud=path.join(root,'neural-frontier');
test('original HUD components, simulation, styles and configuration remain byte-identical',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(hud,'original-source.json'),'utf8').replace(/^\uFEFF/,''));
 for(const [file,hash] of Object.entries(manifest))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(hud,file))).digest('hex'),hash,file);
});
test('HUD entry loads an isolated document and clearly identifies the intentional simulation',()=>{
 const html=fs.readFileSync(path.join(hud,'index.html'),'utf8');
 assert.match(html,/LOCAL SIMULATION/);assert.match(html,/href="\/terminal"/);
 assert.match(html,/defer src="\/neural-frontier\/hud.js"/);
 assert.doesNotMatch(html,/<script[^>]*>[^<]+<\/script>/);
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
 assert.ok(config.rewrites.some(r=>r.source==='/neural-frontier'&&r.destination==='/neural-frontier/index.html'));
});
test('landing and terminal expose the independent HUD route through their existing navigation',()=>{
 for(const file of ['index.html','terminal.html'])assert.match(fs.readFileSync(path.join(root,'frontend',file),'utf8'),/<a href="\/neural-frontier">Neural Frontier<\/a>/);
});
test('original simulation has no market/API network side effects',()=>{
 for(const dir of ['hooks','lib','components/dashboard'])for(const file of fs.readdirSync(path.join(hud,dir))){
  const text=fs.readFileSync(path.join(hud,dir,file),'utf8');
  assert.doesNotMatch(text,/\bfetch\s*\(|new\s+(?:WebSocket|EventSource)\s*\(/,file);
 }
});
