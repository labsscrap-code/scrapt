'use strict';
(() => {
  const canvas=document.createElement('canvas');
  const context=canvas.getContext?.('2d',{alpha:true});
  if(!context)return;
  canvas.className='motion-surface';canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const light=document.createElement('canvas'),field=light.getContext('2d');
  light.width=96;light.height=64;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width: 600px)');
  let width=0,height=0,scale=1,frame=0,timer=0,columns=[],rows=[];
  function resize(){
    scale=Math.min(1,1280/innerWidth,960/innerHeight);
    width=canvas.width=Math.ceil(innerWidth*scale);height=canvas.height=Math.ceil(innerHeight*scale);
    const pitch=Math.max(4,5*scale);columns=[];rows=[];
    for(let x=2;x<width;x+=pitch)columns.push(x);
    for(let y=2;y<height;y+=pitch)rows.push(y);
    if(reduced.matches||document.hidden)draw(0);
  }
  function draw(now){
    const t=now*.00012;
    const a={x:width*(.5+.3*Math.sin(t)),y:height*(.45+.28*Math.cos(t*.71))};
    const b={x:width*(.5+.36*Math.cos(t*.63+2)),y:height*(.5+.32*Math.sin(t*.81+1))};
    field.clearRect(0,0,96,64);
    for(const [point,color,peak,shoulder] of [[a,'45,125,255',.18,.06],[b,'255,105,59',.065,.022]]){
      const x=point.x/width*96,y=point.y/height*64;
      const gradient=field.createRadialGradient(x,y,0,x,y,44);
      gradient.addColorStop(0,`rgba(${color},${peak})`);gradient.addColorStop(.5,`rgba(${color},${shoulder})`);gradient.addColorStop(1,`rgba(${color},0)`);
      field.fillStyle=gradient;field.fillRect(0,0,96,64);
    }
    context.clearRect(0,0,width,height);context.imageSmoothingEnabled=true;
    context.drawImage(light,0,0,width,height);
    const paths=Array.from({length:8},()=>new Path2D());
    const sx=Math.max(1,width*.3),sy=Math.max(1,height*.36),dot=Math.max(1,scale*1.3);
    // Precompute the horizontal wave once per column rather than per pixel.
    const waves=columns.map(x=>{const phase=x/width*7+t*.73;return [Math.sin(phase),Math.cos(phase)];});
    const pulse=.04*Math.sin(t*2.3)+.02*Math.sin(t*5.1);
    for(const y of rows){
      const ay=((y-a.y)/sy)**2,by=((y-b.y)/sy)**2;
      const phase=y/height*4.5+Math.sin(t*.6)*1.8,sinY=Math.sin(phase),cosY=Math.cos(phase);
      const interference=Math.sin(y*.075+t*4.1)*.09*Math.sin(t*1.3);
      for(let column=0;column<columns.length;column++){
        const x=columns[column],wave=waves[column][0]*cosY+waves[column][1]*sinY;
        const da=((x-a.x)/sx)**2+ay,db=((x-b.x)/sx)**2+by;
        const energy=Math.min(.999,.2+.48/(1+da*da)+.25/(1+db*db)+wave*.17+interference+pulse);
        paths[Math.max(0,Math.floor(energy*8))].rect(x,y,dot,dot);
      }
    }
    for(let i=0;i<paths.length;i++){context.fillStyle=`rgba(79,128,203,${.22+i*.045})`;context.fill(paths[i]);}
  }
  function tick(now){
    frame=0;if(document.hidden||reduced.matches)return;
    draw(now);
    timer=setTimeout(()=>{timer=0;frame=requestAnimationFrame(tick);},1000/(mobile.matches?12:18));
  }
  function sync(){
    cancelAnimationFrame(frame);clearTimeout(timer);frame=timer=0;
    if(reduced.matches){draw(0);return;}
    if(!document.hidden)frame=requestAnimationFrame(tick);
  }
  let resizeFrame=0;
  window.addEventListener('resize',()=>{
    if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});
  },{passive:true});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  resize();draw(reduced.matches?0:performance.now());sync();
})();
