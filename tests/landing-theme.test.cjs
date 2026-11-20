'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../frontend');
test('landing theme changes only paint properties, never layout, typography or motion',()=>{
 const css=fs.readFileSync(path.join(root,'landing-theme.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const allowed=new Set(['color-scheme','color','background','border-color','outline-color','fill','stroke','stroke-opacity']);
 for(const block of css.matchAll(/\{([^}]+)\}/g))for(const declaration of block[1].split(';').filter(Boolean)){
  const property=declaration.split(':')[0].trim();assert.ok(property.startsWith('--')||allowed.has(property),'Unexpected theme property '+property);
 }
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/href="\/landing-theme.css"/);
});
function luminance(hex){const rgb=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
test('theme text and semantic market colors retain accessible contrast on navy surfaces',()=>{
 for(const [fg,bg] of [['F2F5FA','080D18'],['8794AD','111B2B'],['080D18','FF693B'],['50D68B','080D18'],['FF7A86','080D18'],['7AAFFF','111B2B']]){
  const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,fg+' / '+bg+' contrast '+ratio);
 }
});
