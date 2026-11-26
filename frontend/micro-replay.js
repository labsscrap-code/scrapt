/* MICRO REPLAY DOM view. Historical candles only; no broker, wallet or account API. */
'use strict';
(()=>{
const M=window.MicroReplay,$=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}).format(n);
const qty=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(n);
const utc=t=>new Date(t).toISOString().replace('T',' ').replace('.000Z',' UTC').replace(/\.\d{3}Z$/,' UTC');
const pct=(price,start)=>(price/start-1)*100;
const pctText=n=>(n>=0?'+':'')+n.toFixed(3)+'%';
let storage;try{storage=window.localStorage}catch{storage=null}
const notes=new M.Notes(storage);let loading=false,request=null,generation=0,cooldownUntil=0,cooldownTimer=null,chartKey='',renderKey='',noteRevision=0,inspectedKey=null;
const replay=new M.Replay({onChange:render});
function controls(state){const disabled=loading||!state.count;$('play').disabled=disabled||!state.playing&&state.index===state.count-1;$('play').textContent=state.playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-label',state.playing?'Pause replay':'Play replay');$('restart').disabled=disabled;$('back').disabled=disabled||state.index===0;$('forward').disabled=disabled||state.index===state.count-1;$('timeline').disabled=disabled;document.querySelectorAll('[data-speed]').forEach(b=>{b.disabled=disabled;b.setAttribute('aria-pressed',String(+b.dataset.speed===state.speed));});}
function render(state){
 $('timelineProgress').style.transform='scaleX('+(state.count>1?(state.index+state.fraction)/(state.count-1):0)+')';
 const nextKey=[loading,state.index,state.selected,state.count,state.playing,state.speed,noteRevision].join(':');if(nextKey===renderKey)return;renderKey=nextKey;
 controls(state);$('playState').className='play-state'+(state.playing?' active':'');$('playState').replaceChildren();const lamp=document.createElement('i');$('playState').append(lamp,document.createTextNode(loading?'LOADING':!state.count?'NO SESSION':state.playing?'PLAYING / '+state.speed+'×':state.index===state.count-1?'SESSION COMPLETE':'PAUSED / '+state.speed+'×'));
 $('timeline').max=String(Math.max(0,state.count-1));$('timeline').value=String(state.index);$('position').textContent=state.count?(state.index+1)+' / '+state.count+' candles':'0 / 0 candles';$('timeline').setAttribute('aria-valuetext',state.count?'Candle '+(state.index+1)+' of '+state.count+'; '+utc(state.replayTime):'No session loaded');
 $('timelineProgress').style.transform='scaleX('+(state.count>1?(state.index+state.fraction)/(state.count-1):0)+')';
 const current=loading?null:state.current,selected=loading?null:state.inspected;
 $('chartEmpty').hidden=!!current;$('chart').toggleAttribute('hidden',!current);
 $('price').textContent=current?'$'+money(current.close):'—';$('change').textContent=current?pctText(pct(current.close,state.sessionOpen)):'—';$('change').className='delta'+(current?(current.close>=state.sessionOpen?' positive':' negative'):'');$('replayTime').textContent=current?utc(state.replayTime):'—';
 for(const field of ['open','high','low','close'])$(field).textContent=selected?'$'+money(selected[field]):'—';
 $('volume').textContent=selected?qty(selected.volume):'—';$('inspectChange').textContent=selected?pctText(pct(selected.close,state.sessionOpen)):'—';$('inspectTime').textContent=selected?'Closed '+utc(selected.closeTime):'Select a revealed candle.';
 $('note').disabled=$('saveNote').disabled=!selected;$('removeNote').disabled=!selected||!notes.has(selected.t);
 const key=selected?.t??null;if(inspectedKey!==key){inspectedKey=key;$('note').value=key===null?'':notes.get(key);$('noteStatus').textContent=notes.error||'Private to this browser. No account or cloud storage.';}
 $('saveNote').textContent=selected&&notes.has(selected.t)?'Save note':'Mark candle';
 const visible=replay.visible();$('markCount').textContent=visible.filter(c=>notes.has(c.t)).length+' visible marks';
 const version=[loading,state.index,state.selected,state.count].join(':');if(version!==chartKey){chartKey=version;draw(loading?[]:visible,state.selected);}
}
function draw(visible,selected){
 const svg=$('chart');if(!visible.length){svg.replaceChildren();return;}
 const rows=visible.slice(-60),offset=visible.length-rows.length,slots=Math.max(12,rows.length),low=Math.min(...rows.map(c=>c.low)),high=Math.max(...rows.map(c=>c.high)),pad=(high-low)*.12||high*.001,min=low-pad,max=high+pad,scale=max-min,volumeMax=Math.max(...rows.map(c=>c.volume),1),y=p=>28+(max-p)/scale*248;
 let html='';
 for(let i=0;i<5;i++){const yy=28+i*62;html+=`<line class="chart-grid" x1="20" x2="812" y1="${yy}" y2="${yy}"/><text class="axis" x="824" y="${yy+4}">${money(max-i/4*scale)}</text>`;}
 html+='<line class="chart-grid" x1="20" x2="812" y1="306" y2="306"/><text class="axis" x="20" y="319">VOL / ETH</text>';
 for(let i=0;i<rows.length;i++){
  const c=rows[i],index=offset+i,x=20+(i+.5)*792/slots,w=8,bodyY=Math.min(y(c.open),y(c.close)),bodyH=Math.max(1,Math.abs(y(c.open)-y(c.close))),volumeH=c.volume/volumeMax*43;
  html+=`<g class="candle ${c.close>=c.open?'up':'down'}${index===selected?' selected':''}${index===visible.length-1?' latest':''}" role="button" tabindex="0" data-index="${index}" aria-label="Inspect candle ${utc(c.closeTime)}"><title>O ${money(c.open)} · H ${money(c.high)} · L ${money(c.low)} · C ${money(c.close)} · Vol ${qty(c.volume)} ETH</title><rect class="hit" x="${x-6.5}" y="20" width="13" height="349"/><line class="wick" x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}"/><rect class="body" x="${x-w/2}" y="${bodyY}" width="${w}" height="${bodyH}"/><rect class="volume-bar" x="${x-w/2}" y="${368-volumeH}" width="${w}" height="${volumeH}"/>${notes.has(c.t)?`<circle class="research-mark" cx="${x}" cy="${Math.max(10,y(c.high)-7)}" r="3.5"/>`:''}</g>`;
 }
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].filter((i,n,a)=>n===0||(i-a[n-1])*792/slots>=130)){const x=20+(i+.5)*792/slots;html+=`<text class="axis" x="${x}" y="393" text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}">${new Date(rows[i].closeTime).toISOString().slice(11,19)} UTC</text>`;}
 svg.innerHTML=html;
}
function cooldown(){const remaining=Math.max(0,cooldownUntil-performance.now());$('loadSession').disabled=loading||remaining>0;if(remaining>0){$('loadSession').textContent='Retry in '+Math.ceil(remaining/1000)+'s';cooldownTimer=setTimeout(cooldown,1000);}else{$('loadSession').textContent='Load real session ↗';cooldownTimer=null;}}
async function load(event){event?.preventDefault();if(loading||performance.now()<cooldownUntil)return;
 let end;try{end=M.parseEnd($('sessionEnd').value)}catch(error){$('error').hidden=false;$('error').textContent=error.message;return;}
 const ticket=++generation;loading=true;request=new AbortController();const active=request;const timeout=setTimeout(()=>active.abort(),12000);$('error').hidden=true;$('feedLight').className='feed-light';$('dataStatus').textContent='Loading verified historical candles…';$('emptyText').textContent='Fetching real ETH/USDT candles from Binance…';$('sessionEnd').disabled=$('candleCount').disabled=true;replay.load([]);cooldown();
 try{
  const data=await M.fetchSession({count:+$('candleCount').value,end,signal:active.signal});if(ticket!==generation)return;
  loading=false;chartKey='';replay.load(data.candles);$('dataStatus').textContent=data.candles.length+' real candles / ETHUSDT / 1m';$('feedLight').className='feed-light ready';$('emptyText').textContent='Load an ETH/USDT session to begin.';
 }catch(error){if(ticket!==generation)return;loading=false;replay.load([]);$('emptyText').textContent='Historical data unavailable. Try loading again.';$('dataStatus').textContent='Provider unavailable / no substitute data';$('error').hidden=false;$('error').textContent=error.name==='AbortError'?'The data request timed out or was paused. Load the session again.':error instanceof M.DataError?error.message:'Binance could not be reached. Check your connection or regional provider availability.';if(error.retryMs)cooldownUntil=performance.now()+error.retryMs;
 }finally{clearTimeout(timeout);if(ticket===generation){loading=false;$('sessionEnd').disabled=$('candleCount').disabled=false;controls(replay.state());cooldown();}}
}
$('sessionForm').addEventListener('submit',load);$('play').addEventListener('click',()=>{if(replay.state().playing)replay.pause();else replay.play()});$('restart').addEventListener('click',()=>replay.restart());$('back').addEventListener('click',()=>replay.step(-1));$('forward').addEventListener('click',()=>replay.step(1));$('timeline').addEventListener('input',event=>replay.seek(+event.target.value));document.querySelectorAll('[data-speed]').forEach(button=>button.addEventListener('click',()=>replay.setSpeed(+button.dataset.speed)));
function inspect(event){const target=event.target.closest('[data-index]');if(!target)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;event.preventDefault();const index=+target.dataset.index;replay.inspect(index);if(event.type==='keydown')$('chart').querySelector(`[data-index="${index}"]`)?.focus();}
$('chart').addEventListener('click',inspect);$('chart').addEventListener('keydown',inspect);$('note').addEventListener('focus',()=>replay.pause());$('note').addEventListener('input',()=>{$('noteStatus').textContent='Unsaved research note.'});
$('saveNote').addEventListener('click',()=>{const c=replay.state().inspected;if(!c)return;try{notes.save(c.t,$('note').value);noteRevision++;chartKey='';render(replay.state());$('noteStatus').textContent='Research mark saved locally.';}catch(error){$('noteStatus').textContent=error.message;}});
$('removeNote').addEventListener('click',()=>{const c=replay.state().inspected;if(!c)return;try{notes.remove(c.t);noteRevision++;inspectedKey=null;chartKey='';render(replay.state());$('noteStatus').textContent='Research mark removed.';}catch(error){$('noteStatus').textContent=error.message;}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){replay.pause();if(loading)request?.abort();if(cooldownTimer){clearTimeout(cooldownTimer);cooldownTimer=null;}}else if(cooldownUntil>performance.now())cooldown();});
window.addEventListener('pagehide',()=>{replay.pause();request?.abort();if(cooldownTimer)clearTimeout(cooldownTimer)});
$('noteStatus').textContent=notes.error||'Private to this browser. No account or cloud storage.';render(replay.state());load();
})();
