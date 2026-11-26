/* Existing Scrappy integration and read-only scanner bridge. No execution actions. */
(()=>{'use strict';
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

document.getElementById('scrappy').addEventListener('click',toggleChat);document.querySelector('.chat-head .x').addEventListener('click',toggleChat);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&chatOpen)toggleChat()});
let active=false;async function scanner(){if(active||document.hidden)return;active=true;const status=document.getElementById('scanner-status');try{const s=await ScraptClient.snapshot({details:true});document.dispatchEvent(new CustomEvent('scrapt:scanner-snapshot',{detail:s}));status.textContent=(s.workerFresh?'Scanner connected':'Scanner stale / unavailable')+' · Server-side BTC context for Scrappy · Historical alerts remain inspectable.';const root=document.getElementById('scanner-alerts');root.replaceChildren();for(const a of s.alertas.slice().sort((a,b)=>b.ts-a.ts).slice(0,20)){const row=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('p');title.textContent=new Date(a.ts*1000).toLocaleString('en-GB')+' · '+a.kind+' · urgency '+a.urgencia+'/5';body.textContent=a.msg+(a.meaning?' — '+a.meaning:'');row.append(title,body);root.append(row)}if(!root.children.length)root.textContent=s.alertsState==='ready'?'No recorded alerts.':'Alert history unavailable.';}catch(error){status.textContent=error.kind==='login_required'?'Scanner access requires an existing authorized session.':'Scanner API temporarily unavailable. Browser market observations remain independent.';}finally{active=false;}}
scanner();setInterval(scanner,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)scanner()});})();
