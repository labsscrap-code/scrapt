'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../frontend/landing-motion.js'),'utf8');
function setup(reduced=false){
  class Element {
    constructor(){this.children=[];this.dataset={};this.attributes={};this.className='';this.textContent='';this.listeners={};this.clientWidth=340;this.style={setProperty(){}};this.classList={add:c=>{this.className+=' '+c;},remove:c=>{this.className=this.className.replace(c,'');},toggle(){}};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(k,v){this.listeners[k]=v;}
    querySelectorAll(selector){return this.children.flatMap(c=>[...(c.className.split(' ').includes(selector.slice(1))?[c]:[]),...c.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0];}
    get scrollWidth(){return this.children.length*120+28;}
    getBoundingClientRect(){return {width:this.scrollWidth};}
    animate(frames,timing){this.animations=(this.animations||0)+1;this.animation={frames,timing,currentTime:0,state:'running',effect:{setKeyframes:f=>{this.animation.frames=f;},updateTiming:t=>{this.animation.timing=t;}},pause(){this.state='paused';},play(){this.state='running';},cancel(){this.state='cancelled';}};return this.animation;}
  }
  const viewport=new Element(),document={hidden:false,body:{classList:{toggle(){}}},listeners:{},querySelector(){return null;},getElementById(){return viewport;},createElement(){return new Element();},addEventListener(k,f){this.listeners[k]=f;}};
  const media={matches:reduced,addEventListener(k,f){this.change=f;}};
  const context={document,Intl,Map,Set,Math,Number,Event:class{},matchMedia:q=>q.includes('reduced')?media:{matches:true},cancelAnimationFrame(){},requestAnimationFrame(){throw new Error('Ambient motion must not start a JavaScript frame loop');},addEventListener(){},dispatchEvent(){}};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  return {ticker:context.ScraptTicker,viewport,document,media};
}
const quotes=price=>[['BTCUSDT',{precio:price,cambio_24h_pct:-1}],['ETHUSDT',{precio:2000,cambio_24h_pct:0}]];
test('price refresh retains animated track, animation and elapsed progress',()=>{
  const e=setup();e.ticker.update(quotes(60000));const track=e.viewport.children[0],animation=track.animation;animation.currentTime=1234;
  e.ticker.update(quotes(60001));assert.equal(e.viewport.children[0],track);assert.equal(track.animation,animation);assert.equal(animation.currentTime,1234);assert.equal(track.animations,1);
  assert.match(track.querySelector('.ticker-price').textContent,/60,001/);assert.match(track.querySelector('.ticker-change').className,/down/);
});
test('each seamless half covers viewport and duplicate half is hidden from assistive technology',()=>{
  const e=setup();e.ticker.update(quotes(60000));const cycles=e.viewport.children[0].children;
  assert.equal(cycles.length,2);assert.ok(cycles[0].scrollWidth>=e.viewport.clientWidth);assert.equal(cycles[1].attributes['aria-hidden'],'true');assert.equal(cycles[0].children.length,cycles[1].children.length);
});
test('hover, keyboard focus and hidden documents pause without discarding animation',()=>{
  const e=setup();e.ticker.update(quotes(60000));const a=e.viewport.children[0].animation;
  e.viewport.listeners.pointerenter();assert.equal(a.state,'paused');e.viewport.listeners.pointerleave();assert.equal(a.state,'running');
  e.viewport.listeners.focusin();assert.equal(a.state,'paused');e.viewport.listeners.focusout();assert.equal(a.state,'running');
  e.document.hidden=true;e.document.listeners.visibilitychange();assert.equal(a.state,'paused');
});
test('reduced-motion users receive live values with ticker animation paused',()=>{
  const e=setup(true);e.ticker.update(quotes(60000));assert.equal(e.viewport.children[0].animation.state,'paused');
  e.ticker.update(quotes(60001));assert.match(e.viewport.children[0].querySelector('.ticker-price').textContent,/60,001/);
});
test('unavailable data cancels moving quotes instead of retaining stale live values',()=>{
  const e=setup();e.ticker.update(quotes(60000));const a=e.viewport.children[0].animation;e.ticker.unavailable('Data unavailable');
  assert.equal(a.state,'cancelled');assert.equal(e.viewport.textContent,'Data unavailable');
});
