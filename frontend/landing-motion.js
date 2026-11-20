'use strict';
(() => {
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const svgNS='http://www.w3.org/2000/svg';
  const art=document.querySelector('.art'),module=art?.querySelector('.module');
  let visible=true,frame=0,lastTime=0,active=false,pointer={x:240,y:240};
  const pieces=module?[...module.children].map((shape,i)=>{
    const bounds=shape.getBBox(),outer=document.createElementNS(svgNS,'g'),inner=document.createElementNS(svgNS,'g');
    outer.classList.add('motion-piece');inner.classList.add('motion-ambient');
    inner.style.setProperty('--drift-duration',(6.8+i*.57)+'s');inner.style.setProperty('--drift-delay',(-i*1.35)+'s');
    inner.style.setProperty('--drift-x',((i%2?1:-1)*(6+i%3*2))+'px');
    inner.style.setProperty('--drift-y',((i%3?1:-1)*(7+i%2*3))+'px');
    inner.style.setProperty('--drift-r',(i%2?'1.7':'-1.4')+'deg');
    module.insertBefore(outer,shape);outer.append(inner);inner.append(shape);
    return {element:outer,cx:bounds.x+bounds.width/2,cy:bounds.y+bounds.height/2,x:0,y:0,vx:0,vy:0,rotation:0,vr:0};
  }):[];
  function resetArt(){
    cancelAnimationFrame(frame);frame=0;lastTime=0;active=false;
    for(const p of pieces){p.x=p.y=p.vx=p.vy=p.rotation=p.vr=0;p.element.removeAttribute('transform');}
  }
  function animate(now){
    frame=0;if(reduce.matches||!visible||document.hidden){resetArt();return;}
    const dt=lastTime?Math.min((now-lastTime)/1000,.032):1/60;lastTime=now;
    let moving=false;
    for(const p of pieces){
      const dx=pointer.x-p.cx,dy=pointer.y-p.cy,distance=Math.hypot(dx,dy);
      const influence=active?Math.max(0,1-distance/520):0;
      // A shared pull holds the sculpture together; nearby pieces gently repel.
      const polarity=Math.max(-.65,Math.min(1,(distance-115)/75));
      const tx=active?Math.max(-24,Math.min(24,dx*.105*influence*polarity+(pointer.x-240)*.035)):0;
      const ty=active?Math.max(-24,Math.min(24,dy*.105*influence*polarity+(pointer.y-240)*.035)):0;
      const targetRotation=active?Math.max(-3,Math.min(3,dx*.012*influence)):0;
      p.vx+=((tx-p.x)*95-p.vx*15)*dt;p.vy+=((ty-p.y)*95-p.vy*15)*dt;
      p.vr+=((targetRotation-p.rotation)*85-p.vr*15)*dt;p.rotation+=p.vr*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.element.setAttribute('transform',`translate(${p.x.toFixed(3)} ${p.y.toFixed(3)}) rotate(${p.rotation.toFixed(3)} ${p.cx} ${p.cy})`);
      if(Math.abs(tx-p.x)+Math.abs(ty-p.y)+Math.abs(p.vx)+Math.abs(p.vy)+Math.abs(targetRotation-p.rotation)+Math.abs(p.vr)>.015)moving=true;
    }
    if(moving)frame=requestAnimationFrame(animate);else lastTime=0;
  }
  function wake(){if(!frame&&!reduce.matches&&visible&&!document.hidden)frame=requestAnimationFrame(animate);}
  art?.addEventListener('pointermove',event=>{
    if(!fine.matches||reduce.matches||event.pointerType==='touch')return;
    const rect=art.getBoundingClientRect();pointer={x:(event.clientX-rect.left)/rect.width*480,y:(event.clientY-rect.top)/rect.height*480};
    active=true;wake();
  },{passive:true});
  art?.addEventListener('pointerleave',()=>{active=false;wake();});
  art?.addEventListener('pointercancel',()=>{active=false;wake();});
  if(art&&'IntersectionObserver' in window)new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;art.classList.toggle('is-resting',!visible);if(!visible)resetArt();
  }).observe(art);
  reduce.addEventListener('change',()=>{resetArt();window.dispatchEvent(new Event('scrapt-motion-change'));});
  document.addEventListener('visibilitychange',()=>{
    document.body.classList.toggle('motion-suspended',document.hidden);if(document.hidden)resetArt();
  });

  window.ScraptTicker=(()=>{
    const viewport=document.getElementById('landingQuotes');
    let track=null,cycles=[],animation=null,span=0,duration=0,hover=false,focused=false,inView=true,entries=[],symbols='';
    viewport.tabIndex=0;viewport.setAttribute('aria-label','Live market prices. Scrolling pauses on hover or keyboard focus.');
    function playback(){
      if(!animation)return;
      if(reduce.matches||document.hidden||hover||focused||!inView)animation.pause();else animation.play();
    }
    function row(symbol){
      const item=document.createElement('span');item.className='quote';item.dataset.symbol=symbol;
      const label=document.createElement('b');label.textContent=symbol.replace(/USDT$/,'');
      const price=document.createElement('span');price.className='ticker-price';
      const change=document.createElement('span');change.className='ticker-change';
      item.append(label,price,change);return item;
    }
    function values(){
      if(!track)return;
      const data=new Map(entries);
      for(const item of track.querySelectorAll('.quote')){
        const value=data.get(item.dataset.symbol);if(!value)continue;
        const price=item.querySelector('.ticker-price'),change=item.querySelector('.ticker-change');
        const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value.precio);
        if(price.textContent!==formatted)price.textContent=formatted;
        const delta=value.cambio_24h_pct;
        const text=Number.isFinite(delta)?(delta>=0?'+':'')+delta.toFixed(2)+'%':'—';
        if(change.textContent!==text)change.textContent=text;
        change.className='ticker-change'+(Number.isFinite(delta)?delta>=0?' up':' down':'');
      }
    }
    function measure(){
      if(!track)return;
      // Both halves contain enough actual quotes to cover the viewport completely.
      const unit=cycles[0].scrollWidth/(cycles[0].children.length/entries.length);
      const repeats=Math.max(1,Math.ceil(viewport.clientWidth/Math.max(1,unit)));
      if(cycles[0].children.length!==entries.length*repeats){
        for(const [index,cycle] of cycles.entries()){
          cycle.replaceChildren();
          for(let n=0;n<repeats;n++)for(const [symbol] of entries){const item=row(symbol);if(index||n)item.setAttribute('aria-hidden','true');cycle.append(item);}
        }
        values();
      }
      const next=cycles[0].getBoundingClientRect().width;if(!next||Math.abs(next-span)<.25)return;
      const offset=animation&&duration?((Number(animation.currentTime)||0)%duration)/duration*span:0;
      span=next;duration=span/28*1000;
      const keyframes=[{transform:'translateX(0px)'},{transform:`translateX(${-span}px)`}];
      if(!animation)animation=track.animate(keyframes,{duration,iterations:Infinity,easing:'linear'});
      else {animation.effect.setKeyframes(keyframes);animation.effect.updateTiming({duration});animation.currentTime=(offset%span)/28*1000;}
      playback();
    }
    function update(next){
      entries=next;const signature=entries.map(([symbol])=>symbol).join(',');
      if(!track||signature!==symbols){
        animation?.cancel();animation=null;span=duration=0;symbols=signature;
        track=document.createElement('div');track.className='ticker-track';
        cycles=[0,1].map(index=>{const cycle=document.createElement('div');cycle.className='ticker-cycle';if(index)cycle.setAttribute('aria-hidden','true');for(const [symbol] of entries)cycle.append(row(symbol));track.append(cycle);return cycle;});
        viewport.replaceChildren(track);viewport.classList.add('motion-ticker');
      }
      values();measure();
    }
    function unavailable(message){animation?.cancel();animation=null;track=null;cycles=[];span=duration=0;viewport.classList.remove('motion-ticker');viewport.textContent=message;}
    viewport.addEventListener('pointerenter',()=>{hover=true;playback();});viewport.addEventListener('pointerleave',()=>{hover=false;playback();});
    viewport.addEventListener('focusin',()=>{focused=true;playback();});viewport.addEventListener('focusout',()=>{focused=false;playback();});
    document.addEventListener('visibilitychange',playback);window.addEventListener('scrapt-motion-change',()=>{measure();playback();});
    if('ResizeObserver' in window)new ResizeObserver(measure).observe(viewport);else window.addEventListener('resize',measure,{passive:true});
    if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;playback();}).observe(viewport);
    return {update,unavailable};
  })();
})();
