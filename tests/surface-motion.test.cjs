'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../frontend/surface-motion.js'),'utf8');
function setup({reduced=false,width=1440,height=900,hidden=false}={}){
  const frames=new Map(),timers=new Map(),listeners={},media={matches:reduced,addEventListener(k,f){this.change=f;}};let id=0,draws=0,rects=0;
  const ctx={clearRect(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){},drawImage(){draws++;},fill(){}};
  const canvases=[];const document={hidden,createElement(){const c={setAttribute(){},getContext(){return ctx;}};canvases.push(c);return c;},body:{prepend(c){this.canvas=c;}},addEventListener(k,f){listeners[k]=f;}};
  const c={document,innerWidth:width,innerHeight:height,performance:{now:()=>100},Path2D:class{rect(){rects++;}},matchMedia:q=>q.includes('reduced')?media:{matches:width<=600},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:n=>frames.delete(n),setTimeout:(f,ms)=>{timers.set(++id,{f,ms});return id;},clearTimeout:n=>timers.delete(n),addEventListener(){}};
  c.window=c;vm.createContext(c);vm.runInContext(source,c);
  return {frames,timers,listeners,media,document,canvases,get draws(){return draws;},get rects(){return rects;}};
}
test('large displays have a bounded canvas and bounded procedural work',()=>{
  const e=setup({width:3840,height:2160});assert.ok(e.canvases[0].width<=1280);assert.ok(e.canvases[0].height<=960);assert.ok(e.rects<80000);assert.equal(e.document.body.canvas.className,'motion-surface');
});
test('reduced motion draws a static surface without scheduling animation',()=>{
  const e=setup({reduced:true});assert.ok(e.draws>0);assert.equal(e.frames.size,0);assert.equal(e.timers.size,0);
});
test('background rendering is capped at mobile cadence and sleeps between frames',()=>{
  const e=setup({width:390,height:844});const [id,callback]=[...e.frames][0];e.frames.delete(id);callback(200);
  assert.equal(e.frames.size,0);assert.equal(e.timers.size,1);assert.ok([...e.timers.values()][0].ms>=1000/12);
});
test('hidden tabs cancel frame and timer work; reduced-motion changes cancel continuous work',()=>{
  const e=setup();e.document.hidden=true;e.listeners.visibilitychange();assert.equal(e.frames.size,0);assert.equal(e.timers.size,0);
  e.document.hidden=false;e.media.matches=true;e.media.change();assert.equal(e.frames.size,0);assert.equal(e.timers.size,0);
});
