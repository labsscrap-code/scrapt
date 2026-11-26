(()=>{'use strict';const frame=document.getElementById('eth-sentiment-frame'),status=document.getElementById('eth-console-message');if(!frame||!status)return;let timer;
const fail=()=>{status.textContent='Console unavailable. Open the standalone console or reload this page to retry.';};
function ready(){clearTimeout(timer);try{if(!frame.contentDocument?.getElementById('nf'))return fail();status.textContent='Console loaded. Individual source availability is shown inside the console.';}catch{fail();}}
frame.addEventListener('load',ready);frame.addEventListener('error',()=>{clearTimeout(timer);fail();});
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){timer=setTimeout(fail,20000);observer.disconnect();}},{rootMargin:'300px'});observer.observe(frame);}else timer=setTimeout(fail,20000);
})();
