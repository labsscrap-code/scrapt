'use strict';
const quotes=document.getElementById('landingQuotes'),statusLine=document.getElementById('tickerStatus');
let tickerPending=false;
async function updateTicker(){
  if(tickerPending||document.hidden)return;
  tickerPending=true;
  try{
    const s=await ScraptClient.snapshot();
    const entries=Object.entries(s.spot24h||{}).filter(([,v])=>Number.isFinite(v.precio));
    if(!entries.length){quotes.textContent='Market data unavailable — waiting for fresh scanner data.';statusLine.textContent='Awaiting snapshot';return}
    const fragment=document.createDocumentFragment();
    for(const [symbol,value] of entries){
      const row=document.createElement('span');row.className='quote';
      const label=document.createElement('b');label.textContent=symbol.replace(/USDT$/,'');
      const price=document.createElement('span');price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value.precio);
      const change=document.createElement('span');
      if(Number.isFinite(value.cambio_24h_pct)){
        change.className=value.cambio_24h_pct>=0?'up':'down';change.textContent=(value.cambio_24h_pct>=0?'+':'')+value.cambio_24h_pct.toFixed(2)+'%';
      }else change.textContent='—';
      row.append(label,price,change);fragment.append(row);
    }
    quotes.replaceChildren(fragment);statusLine.textContent='Snapshot: '+s.ts.replace('T',' ');
  }catch(error){
    quotes.textContent=error.kind==='login_required'?'Sign in to view live market data.':'Market data unavailable. Retrying…';
    statusLine.textContent=error.kind==='login_required'?'Controlled pilot access':error.kind==='rate_limited'?'Temporarily rate limited':'Connection unavailable';
  }finally{tickerPending=false;}
}
async function tick(){await updateTicker();setTimeout(tick,ScraptClient.retryMs());}tick();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTicker()});
const navLinks=document.querySelectorAll('nav a[href^="#"]');
window.addEventListener('hashchange',()=>{for(const link of navLinks){if(link.hash===location.hash)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}});
