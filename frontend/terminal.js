
const KINDS={"noticia":"📰 News","realtime:mov_1m":"1m price move","realtime:mov_5m":"5m price move",
 "realtime:vol_spike":"Volume spike","realtime:book_imbalance":"Order book imbalance",
 "realtime:candle_body":"Dominant 1m candle","metricas:funding":"Extreme funding",
 "metricas:oi":"Open interest jump","metricas:longshort":"Top traders L/S",
 "macro:fng":"Fear & Greed","macro:tvl":"TVL DeFi","social:viral":"Viral post","precio":"Price"};
// Display-only localization. Source DTOs and numeric text remain unchanged.
function sentimentLabel(value){
 const labels={'miedo extremo':'Extreme Fear','miedo':'Fear','neutralidad':'Neutral','codicia':'Greed','codicia extrema':'Extreme Greed'};
 return labels[String(value||'').toLowerCase()]||String(value||'');
}
function alertText(value){
 const text=String(value||'');
 return text.replace(/Book sesgado a compra \(bids\)/g,'Order book skewed toward buy-side liquidity (bids)')
 .replace(/Book sesgado a venta \(asks\)/g,'Order book skewed toward sell-side liquidity (asks)')
 .replace(/\(suavizado\)/g,'(smoothed)').replace(/Funding BTC extremo/g,'Extreme BTC funding')
 .replace(/longs pagan/g,'Long positions pay shorts').replace(/shorts pagan/g,'Short positions pay longs')
 .replace(/sesgo largo extremo/g,'extreme long bias').replace(/sesgo corto/g,'short bias')
 .replace(/Miedo&Codicia movio/g,'Fear & Greed moved').replace(/F&G en zona extrema/g,'F&G in extreme territory')
 .replace(/Volumen 1m/g,'1m volume').replace(/el promedio/g,'the average').replace(/Vela 1m/g,'1m candle')
 .replace(/Post viral/g,'Viral post').replace(/\ben (?=~?\d+(?:m|s|h)\b)/g,'over ')
 .replace(/Miedo extremo/gi,'Extreme Fear').replace(/Codicia extrema/gi,'Extreme Greed')
 .replace(/\bMiedo\b/gi,'Fear').replace(/\bCodicia\b/gi,'Greed');
}
const escText=ScraptClient.escapeText;
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
const quoteEntries=spot=>Object.entries(spot&&typeof spot==='object'&&!Array.isArray(spot)?spot:{}).filter(([k,v])=>k!=='error'&&v&&typeof v==='object'&&!Array.isArray(v));
const fmt=n=>!numeric(n)?'—':n.toLocaleString('en-US',{maximumFractionDigits:(n<100?2:1)});
const usd=n=>!numeric(n)?'—':'$'+n.toLocaleString('en-US',{maximumFractionDigits:0});
const hace=ts=>{if(!numeric(ts)||ts<=0)return 'Timestamp unavailable';const s=Math.max(1,Math.round(Date.now()/1000-ts));
 if(s<60)return s+'s ago';const m=Math.round(s/60);if(m<60)return m+' min ago';
 return Math.round(m/60)+' h ago';};
let PAUSED=false,SOUND=false,RANGE=60,lastAlertTs=0,FILTER=null,CURAL=[],lastTape='';
let priceHist=[],futHist=[],CHPTS=600,CHH=100;
const openAlertKeys=new Set();

let loadPending=false,lastSnapshot=null,lastFreshnessKey='';
const freshnessKey=s=>JSON.stringify([s.workerFresh,s.clockSynchronized,Object.entries(s.sourceHealth||{}).map(([k,v])=>[k,v.status])]);
function freshnessLabel(s){
 const missing=Object.entries(s.sourceHealth||{}).filter(([,v])=>v.status!=='fresh').map(([k])=>k);
 return (!s.workerFresh?'Scanner stale · ':'')+(!s.clockSynchronized?'Clock unverified · ':'')+
   (missing.length?'Unavailable sources: '+missing.join(', '):'Core sources are fresh')+
   (s.windowWarming?' · 5m window warming up':'');
}
async function load(){
 if(PAUSED||loadPending||document.hidden)return;
 loadPending=true;
 try{
  const s=await ScraptClient.snapshot({details:true});lastSnapshot=s;lastFreshnessKey=freshnessKey(s);
  setConn(s.connectionFresh);document.getElementById('stale').textContent=freshnessLabel(s);
  render(s);paintChart();
 }catch(error){
  lastSnapshot=null;render(ScraptClient.unavailable());paintChart();setConn(false);
  document.getElementById('stale').textContent=error.kind==='rate_limited'?
   'Rate limit reached. Retrying after the wait…':'Data unavailable. Retrying…';
 }finally{loadPending=false;}
}
function render(s){
 const btc=(s.spot24h||{}).BTCUSDT;
 document.getElementById('btcPrice').textContent=usd(btc&&btc.precio);
 {const change=btc&&btc.cambio_24h_pct;
  const ch=document.getElementById('btcChg');
  ch.textContent=numeric(change)?(change>=0?'+':'')+change.toFixed(2)+'% 24h':'Data unavailable';
  ch.className='badge'+(numeric(change)?' '+(change>=0?'up':'down'):'');}
 priceHist=(Array.isArray(s.price_history)?s.price_history:[]).filter(x=>x&&numeric(x.p)&&numeric(x.t));futHist=(Array.isArray(s.fut_history)?s.fut_history:[]).filter(x=>x&&numeric(x.t));
 const rt=s.realtime_5m||{};
 document.getElementById('vol5m').textContent=numeric(rt.vol_usd_5m)?'$'+fmt(rt.vol_usd_5m/1e6)+'M':'—';
 document.getElementById('ticks5m').textContent=numeric(rt.ticks_5m)?rt.ticks_5m+' trades':'Data unavailable';
 const v=s.vol;
 if(v&&numeric(v.x)){document.getElementById('volMark').style.visibility='visible';const x=Math.min(2,v.x);
  document.getElementById('volFill').style.right=(100-x/2*100)+'%';
  document.getElementById('volFill').style.background=v.x>3?'rgba(255,179,64,.5)':'rgba(196,203,213,.4)';
  document.getElementById('volMark').style.left=Math.min(98,x/2*100)+'%';
  document.getElementById('volX').textContent='1m vs average: '+v.x.toFixed(1)+'x'+(v.x>=4?' ⚡':'');}
 else{document.getElementById('volFill').style.right='100%';document.getElementById('volMark').style.visibility='hidden';document.getElementById('volX').textContent='Volume unavailable';}
 renderTiles(s);
 document.getElementById('radar').innerHTML=radar(s.reglas||[]);
 document.getElementById('radarSub').textContent=s.workerFresh?'('+(s.reglas||[]).filter(r=>!(r.last>0&&r.cd-(Date.now()/1000-r.last)>0)).length+' armed)':'(status unavailable)';
 document.getElementById('pipe').innerHTML=pipe(s.texto);
 renderVerdict(s);
 renderAlerts(s.alertas||[]);
 document.getElementById('alertsState').textContent=s.alertsState==='unavailable'?'Alert history unavailable. Showing only the latest received snapshot.':'';
 renderWL(quoteEntries(s.spot24h).filter(([k])=>k!=='BTCUSDT'));
 tape(s);

 soundCheck(s.alertas||[]);
}
function renderTiles(s){
 const f=s.futures||{},fng=s.fng||{},b=s.book;
 // F&G circular
 const fv=fng.valor;
 const fc=fv==null?'#949ba6':(fv<=25?'#ff5d6c':fv<=45?'#ffb340':fv<=65?'#c4cbd5':'#34e08a');
 const circ=Math.PI*50, dash=(fv??0)/100*circ;
 document.getElementById('fngTile').innerHTML=
  `<div class="gauge-arc">
   <svg viewBox="0 0 120 72" width="112" height="68">
    <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="9" stroke-linecap="round"/>
    <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="${fc}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${dash} ${circ}"/>
   </svg>
   <div><div class="val" style="color:${fc}">${fv==null?'—':fv}<span style="font-size:11px;color:var(--dim)">/100</span></div>
   <div class="sm" style="color:${fc}">${escText(sentimentLabel(fng.clase))}</div>
   ${fng.anterior!=null?`<div class="sm" style="font-size:10px">Previous: ${fng.anterior}</div>`:''}</div></div>`;
 // funding
 const fp=numeric(f.funding_pct)?f.funding_pct:null;
 const fpos=Math.max(0,Math.min(100,50+(fp||0)/0.05*50));
 document.getElementById('fundTile').innerHTML=
  `<div class="val ${fp==null?'':(Math.abs(fp)>=0.05?'c-red':'c-green')}">${fp==null?'—':fp.toFixed(4)+'%'}</div>
   <div class="sm">${fp==null?'':(fp>0?'Long positions pay shorts (positive funding)':'Short positions pay longs (non-positive funding)')}</div>
   <div class="meter"><div class="mark" style="left:${fpos}%;visibility:${fp==null?'hidden':'visible'}"></div></div>`;
 // oi
 const oi=f.open_interest_btc,oiH=futHist.filter(x=>numeric(x.oi));
 let spark='';
 if(oiH.length>2){const vs=oiH.map(x=>x.oi),mn=Math.min(...vs),mx=Math.max(...vs),r=(mx-mn)||1;
  const pts=vs.map((v,i)=>`${(i/(vs.length-1)*100).toFixed(1)},${(28-(v-mn)/r*26).toFixed(1)}`).join(' ');
  spark=`<svg class="mini" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#c4cbd5" stroke-width="1.5"/></svg>`;}
 document.getElementById('oiTile').innerHTML=
  `<div class="val c-blue">${fmt(oi)}<span style="font-size:11px;color:var(--dim)"> BTC</span></div>
   <div class="sm">Outstanding leveraged positions · ${numeric(f.top_long_short_5m)?'L/S '+f.top_long_short_5m.toFixed(2):''}</div>${spark}`;
 // book
 let bookHtml='<div class="empty" style="padding:4px">Order book unavailable</div>';
 if(b&&numeric(b.bid)&&numeric(b.ask)&&b.bid>=0&&b.ask>0){const bp=b.bid/(b.bid+b.ask)*100,br=b.bid/b.ask;
  bookHtml=`<div class="bookbar"><div class="b" style="width:${bp}%"></div><div class="a" style="width:${100-bp}%"></div></div>
   <div class="sm"><span class="c-green">bids ${fmt(b.bid)} BTC</span> · <span class="c-red">asks ${fmt(b.ask)} BTC</span></div>
   <div class="val" style="font-size:15px;margin-top:6px" class="${br>1?'c-green':'c-red'}">${br.toFixed(2)}x ${br>1?'Buy-side liquidity':'Sell-side liquidity'}</div>`;}
 document.getElementById('bookTile').innerHTML=bookHtml;
}
function radar(reglas){
 const now=Date.now()/1000;
 return reglas.map(r=>{
  const rem=r.cd-(now-r.last),cool=rem>0&&r.last>0;
  const led=cool?'background:#3a4557':'background:var(--green);box-shadow:0 0 6px var(--green)';
  return `<div class="rule ${cool?'':'armed'}"><span class="led" style="${led}"></span>${escText(KINDS[r.kind]||r.kind)}
   <span style="margin-left:auto;color:var(--dim)">${cool?('−'+Math.ceil(rem/60)+'m'):'ready'}</span></div>`;}).join('')
  ||'<div class="empty">Rule status unavailable</div>';
}
function pipe(t){
 if(!t)return '<div class="empty">News AI disabled · no news cycle yet</div>';
 return `<div class="pipe-grid">
  <div><div class="sm">Last cycle</div><div class="b">${hace(t.ts)}</div></div>
  <div><div class="sm">New headlines</div><div class="b">${t.nuevos??'—'}</div></div>
  <div><div class="sm">AI alerts</div><div class="b ${t.alertas==null?'c-red':t.alertas>0?'c-green':''}">${t.aiStatus==='disabled'?'disabled':(t.alertas==null?'unavailable':t.alertas)}</div></div>
  <div><div class="sm">Stored</div><div class="b c-green">${t.persisted??t.enviadas??0}</div></div></div>
  <div class="sm" style="margin-top:7px">News AI disabled · news ingestion runs independently</div>`;
}
function renderVerdict(s){
 const f=s.futures||{},fng=s.fng||{},b=s.book;
 const parts=[];
 if(fng.valor!=null)parts.push(fng.valor<=25?'😨 Extreme fear ('+fng.valor+'/100)':fng.valor>=75?'🤑 Extreme greed ('+fng.valor+'/100)':'🟡 Neutral sentiment ('+fng.valor+'/100)');
 if(b&&b.bid>0&&b.ask>0){const r=b.bid/b.ask;
  parts.push(r>2.2?'📗 Bid-heavy quoted liquidity ('+r.toFixed(1)+'x)':r<0.45?'📕 Ask-heavy quoted liquidity':'📘 Balanced order book');}
 if(numeric(f.funding_pct))parts.push(Math.abs(f.funding_pct)>=0.03?'⚡ Extreme funding':(f.funding_pct>0?'↗ Positive funding':'↘ Non-positive funding'));
 if(numeric(f.top_long_short_5m))parts.push('🏦 Top traders L/S '+f.top_long_short_5m.toFixed(2));
 const al=(s.alertas||[]).slice(-1)[0];
 document.getElementById('verdict').innerHTML=
  `<div style="line-height:1.65">${parts.join(' · ')||'No data yet'}${al?`<div class="sm" style="margin-top:8px">Latest alert recorded: ${escText(new Date(al.ts*1000).toUTCString())} · See Alerts for source details</div>`:''}
  <div class="sm" style="margin-top:8px;color:#949ba6">Quantitative dashboard summary · not AI-generated</div></div>`;
}
function renderAlerts(al){
 document.querySelectorAll('#alerts .al[data-alert-key]').forEach(row=>{
  if(row.getAttribute('aria-expanded')==='true')openAlertKeys.add(row.dataset.alertKey);else openAlertKeys.delete(row.dataset.alertKey);
 });
 const currentKeys=new Set(al.map(a=>a.kind+'|'+a.ts));
 for(const key of openAlertKeys)if(!currentKeys.has(key))openAlertKeys.delete(key);
 CURAL=al;
 const chips=document.getElementById('chips');
 chips.innerHTML=['todas',5,4,3,2].map(u=>`<button type="button" class="chip${(FILTER==null&&u=='todas')||FILTER==u?' on':''}" data-u="${u}" aria-pressed="${(FILTER==null&&u==='todas')||FILTER===u}">${u=='todas'?'All':'urg '+u}</button>`).join('');
 chips.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{FILTER=c.dataset.u=='todas'?null:+c.dataset.u;renderAlerts(CURAL)});
 const box=document.getElementById('alerts');
 if(!al.length){box.innerHTML='<div class="empty">Waiting for signals…</div>';return}
 const list=al.filter(a=>FILTER==null||a.urgencia===FILTER).slice(-30).reverse();
 box.innerHTML=list.map(a=>{
  const isNew=a.ts>lastAlertTs;
  const key=a.kind+'|'+a.ts,isOpen=openAlertKeys.has(key);
  const col=a.urgencia>=4?'var(--red)':a.urgencia>=3?'var(--amber)':'var(--blue)';
  return `<div class="al${isNew?' new':''}${isOpen?' open':''}" role="button" tabindex="0" aria-expanded="${isOpen}" data-alert-key="${escText(key)}">
   <span class="dotv" style="background:${col};box-shadow:0 0 7px ${col}"></span>
   <div style="flex:1"><div class="msg">${escText(alertText(a.msg))}</div>
   ${a.meaning?`<div class="mean">💡 ${escText(alertText(a.meaning))}</div>`:''}
   <div class="meta">${escText(KINDS[a.kind]||a.kind)} · ${hace(a.ts)} · urgency ${a.urgencia}/5</div></div></div>`;}).join('');
}
function renderWL(syms){
 const wl=document.getElementById('wl');
 if(!syms.length){wl.innerHTML='<tr><td class="empty" colspan="4">Market data unavailable</td></tr>';return}
 const maxC=Math.max(...syms.filter(([,v])=>numeric(v.cambio_24h_pct)).map(([,v])=>Math.abs(v.cambio_24h_pct)),0.01);
 wl.replaceChildren();
 for(const [symbol,value] of syms){
  const row=document.createElement('tr');
  const name=document.createElement('td');name.className='sym';name.textContent=symbol.replace('USDT','');
  const price=document.createElement('td');price.textContent=usd(value.precio);if(!numeric(value.precio))price.title='Price unavailable';
  const change=document.createElement('td');change.className='pct';
  const bar=document.createElement('td');bar.className='bar';
  if(numeric(value.cambio_24h_pct)){
   const up=value.cambio_24h_pct>=0;change.classList.add(up?'up':'down');
   change.textContent=(up?'+':'')+value.cambio_24h_pct.toFixed(2)+'%';
   const fill=document.createElement('i');fill.style.width=Math.abs(value.cambio_24h_pct)/maxC*100+'%';fill.style.background=up?'var(--green)':'var(--red)';bar.append(fill);
  }else{change.textContent='—';change.title='Change unavailable';bar.setAttribute('aria-label','Change unavailable')}
  row.append(name,price,change,bar);wl.append(row);
 }
}
function tape(s){
 const f=s.futures||{},fng=s.fng||{};
 const quotes=quoteEntries(s.spot24h);
 const target=document.getElementById('tapeTrack'),track=document.createElement('div');
 for(const [symbol,value] of quotes){
  const item=document.createElement('span');item.className='ti';
  const name=document.createElement('span');name.className='k';name.textContent=symbol.replace('USDT','');
  const price=document.createElement('span');price.textContent=usd(value.precio);
  const change=document.createElement('span');
  if(numeric(value.cambio_24h_pct)){change.className=value.cambio_24h_pct>=0?'up':'down';change.textContent=(value.cambio_24h_pct>=0?'+':'')+value.cambio_24h_pct.toFixed(2)+'%'}else{change.textContent='—';change.title='Change unavailable'}
  item.append(name,price,change);track.append(item);
 }
 if(!quotes.length){const empty=document.createElement('span');empty.className='ti';empty.textContent='Market data unavailable';track.append(empty)}
 for(const [label,value] of [['FEAR & GREED',numeric(fng.valor)?String(fng.valor)+' '+sentimentLabel(fng.clase):'—'],['FUNDING',numeric(f.funding_pct)?(f.funding_pct>=0?'+':'')+f.funding_pct.toFixed(4)+'%':'—'],['OI',fmt(f.open_interest_btc)+' BTC']]){
  const item=document.createElement('span');item.className='ti';const name=document.createElement('span');name.className='k';name.textContent=label;item.append(name,document.createTextNode(value));track.append(item);
 }
 if(track.innerHTML!==lastTape){lastTape=track.innerHTML;target.replaceChildren(...track.childNodes)}
}
// Chat uses the same-origin bounded server endpoint; market polling is independent.
let chatOpen=false;
function toggleChat(){
 chatOpen=!chatOpen;
 document.getElementById('scrappy').setAttribute('aria-expanded',String(chatOpen));
 document.getElementById('chatPanel').classList.toggle('open',chatOpen);
 if(chatOpen)document.querySelector('.chat-head .x').focus();else document.getElementById('scrappy').focus();
}
let chatPending=false;
async function sendChat(){
 const input=document.getElementById('chatInput'),message=input.value.trim();
 if(chatPending||!message)return;
 const status=document.querySelector('.chat-head .st'),button=document.querySelector('.chat-in button'),body=document.getElementById('chatBody');
 if(message.length>2000){status.textContent='Maximum 2000 characters';return;}
 const add=(text,kind)=>{const row=document.createElement('div');row.className='bm '+kind;row.textContent=text;body.append(row);while(body.children.length>20)body.firstElementChild.remove();body.scrollTop=body.scrollHeight;};
 chatPending=true;button.disabled=true;input.disabled=true;status.textContent='Checking live market data…';
 add(message,'user');input.value='';
 try{add(await ScraptClient.chat(message),'bot');status.textContent='Scrappy · context updated';}
 catch(error){
  const text=error.kind==='rate_limited'?`Rate limit reached or service busy. Try again in ${error.retryAfter||60} seconds.`:
   error.kind==='timeout'?'The AI response timed out. Market data remains available.':
   'Scrappy is temporarily unavailable. No answer was generated.';
  add(text,'bot');status.textContent='AI temporarily unavailable';input.value=message;
 }finally{chatPending=false;button.disabled=false;input.disabled=false;input.focus();}
}
document.querySelector('.chat-in button').addEventListener('click',sendChat);
document.getElementById('chatInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();sendChat();}});
function soundCheck(al){
 const hi=al.filter(a=>a.urgencia>=4&&a.ts>lastAlertTs);
 if(hi.length&&SOUND)beep();
 if(al.length)lastAlertTs=Math.max(lastAlertTs,...al.map(a=>a.ts));
}
function beep(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();
 const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
 o.frequency.value=880;o.type='sine';g.gain.setValueAtTime(.2,ctx.currentTime);
 g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.start();o.stop(ctx.currentTime+.5);}catch(e){}}
function setConn(ok){const dot=document.getElementById('dot');dot.className=ok?'dot':'dot off';dot.setAttribute('aria-label',ok?'Dashboard connected; check data timestamps':'Dashboard disconnected');if(!ok)document.getElementById('stale').textContent='Update failed. Retrying…'}
// chart
function paintChart(){
 const svg=document.getElementById('chart');const h=priceHist.slice(-RANGE);
 if(h.length<3){svg.innerHTML='';return}
 const ps=h.map(x=>x.p),mn=Math.min(...ps),mx=Math.max(...ps),rg=(mx-mn)||1;
 const pts=h.map((x,i)=>{const X=i/(h.length-1)*CHPTS;const Y=(CHH-6)-(x.p-mn)/rg*(CHH-14);
  return {t:x.t,p:x.p,X:+X.toFixed(1),Y:+Y.toFixed(1)};});
 const line=pts.map(p=>`${p.X},${p.Y}`).join(' ');
 const up=ps[ps.length-1]>=ps[0];
 svg.innerHTML=`<defs><linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#949ba6" stop-opacity="0"/>
  <stop offset="1" stop-color="#949ba6" stop-opacity="0"/></linearGradient></defs>
 <polygon points="0,${CHH} ${line} ${CHPTS},${CHH}" fill="url(#gfill)"/>
 <polyline points="${line}" fill="none" stroke="#c4cbd5" stroke-width="2.2"/>
 <line id="cross" x1="0" y1="0" x2="0" y2="${CHH}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 3" visibility="hidden"/>`;
 const cross=svg.querySelector('#cross');
 svg.onmousemove=e=>{const r=svg.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width*CHPTS;
  let best=pts[0];for(const p of pts)if(Math.abs(p.X-mx)<Math.abs(best.X-mx))best=p;
  cross.setAttribute('x1',best.X);cross.setAttribute('x2',best.X);cross.setAttribute('visibility','visible');
  const tip=document.getElementById('tip');tip.style.display='block';
  tip.style.left=Math.min(r.width-130,best.X/CHPTS*r.width)+'px';tip.style.top='2px';
  tip.innerHTML=`${usd(best.p)}<br><span style="color:var(--dim)">${new Date(best.t*1000).toLocaleTimeString()}</span>`;};
 svg.onmouseleave=()=>{cross.setAttribute('visibility','hidden');document.getElementById('tip').style.display='none';};
}
document.querySelectorAll('.rng button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.rng button').forEach(x=>x.classList.remove('on'));
 b.classList.add('on');RANGE=+b.dataset.r;paintChart();});
document.getElementById('btnPause').onclick=function(){
 PAUSED=!PAUSED;this.textContent=PAUSED?'▶ Resume':'⏸ Pause';this.classList.toggle('on',!PAUSED);if(!PAUSED)load();else{setConn(false);document.getElementById('stale').textContent='Updates paused · check the snapshot timestamp';}};
document.getElementById('btnSound').onclick=function(){
 SOUND=!SOUND;this.textContent=(SOUND?'🔔':'🔕')+' Sound';if(SOUND)beep();};


document.getElementById('scrappy').addEventListener('click',toggleChat);
document.querySelector('.chat-head .x').addEventListener('click',toggleChat);
document.getElementById('alerts').addEventListener('click',event=>{
 const row=event.target.closest('.al');if(row)row.setAttribute('aria-expanded',String(row.classList.toggle('open')));
});
document.getElementById('alerts').addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('al')){event.preventDefault();event.target.click();}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&chatOpen)toggleChat()});
document.getElementById('refreshData').addEventListener('click',load);
document.getElementById('accountStatus').textContent='Public read-only access · no account required';
document.getElementById('logout').hidden=true;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
setInterval(()=>{
 if(lastSnapshot&&!document.hidden){const aged=ScraptClient.expire(lastSnapshot),key=freshnessKey(aged);
  if(key!==lastFreshnessKey){render(aged);paintChart();lastFreshnessKey=key;}
  if(PAUSED||!aged.connectionFresh){setConn(false);document.getElementById('stale').textContent=PAUSED?'Updates paused · data expires independently by source':freshnessLabel(aged);}}
},1000);
async function poll(){await load();setTimeout(poll,ScraptClient.retryMs())}
render(ScraptClient.unavailable());document.getElementById('stale').textContent='Loading scanner data…';poll();

