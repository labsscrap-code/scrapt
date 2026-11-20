'use strict';
const quotes=document.getElementById('landingQuotes'),statusLine=document.getElementById('tickerStatus');
let tickerPending=false;
async function updateTicker(){
  if(tickerPending||document.hidden)return;
  tickerPending=true;
  try{
    const s=await ScraptClient.snapshot();
    const entries=Object.entries(s.spot24h||{}).filter(([,v])=>Number.isFinite(v.precio));
    if(!entries.length){ScraptTicker.unavailable('Market data unavailable — waiting for fresh scanner data.');statusLine.textContent='Awaiting snapshot';return}
    ScraptTicker.update(entries);statusLine.textContent='Snapshot: '+s.ts.replace('T',' ');
  }catch(error){
    ScraptTicker.unavailable(error.kind==='login_required'?'Sign in to view live market data.':'Market data unavailable. Retrying…');
    statusLine.textContent=error.kind==='login_required'?'Controlled pilot access':error.kind==='rate_limited'?'Temporarily rate limited':'Connection unavailable';
  }finally{tickerPending=false;}
}
async function tick(){await updateTicker();setTimeout(tick,ScraptClient.retryMs());}tick();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTicker()});
const navLinks=document.querySelectorAll('nav a[href^="#"]');
window.addEventListener('hashchange',()=>{for(const link of navLinks){if(link.hash===location.hash)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}});
