/* MICRO REPLAY: deterministic closed-candle playback. No execution or synthetic data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MicroReplay=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BASE='https://data-api.binance.vision',MINUTE=60000,NOTE_KEY='scrapt.micro-replay.notes.v1.ETHUSDT.1m';
class DataError extends Error{constructor(message,retryMs=0){super(message);this.name='DataError';this.retryMs=retryMs;}}
function number(value){if(typeof value!=='number'&&(typeof value!=='string'||!value.trim()))throw new DataError('Invalid numeric market field.');const n=Number(value);if(!Number.isFinite(n))throw new DataError('Non-finite market field.');return n;}
function timestamp(value){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1500000000000||value>8640000000000000)throw new DataError('Invalid candle timestamp.');return value;}
function parseKlines(rows,asOf,endTime=asOf){
 timestamp(asOf);timestamp(endTime);
 if(!Array.isArray(rows)||!rows.length)throw new DataError('No historical candles are available for this session.');
 if(rows.length<2||rows.length>200)throw new DataError('Expected between 2 and 200 historical candles.');
 let previous=null;
 return Object.freeze(rows.map(row=>{
  if(!Array.isArray(row)||row.length<11)throw new DataError('Invalid Binance candle response.');
  const t=timestamp(row[0]),closeTime=timestamp(row[6]);
  if(t%MINUTE||closeTime!==t+MINUTE-1||closeTime>=asOf||closeTime>endTime)throw new DataError('Candle is incomplete or has an invalid timestamp.');
  if(previous!==null&&t!==previous+MINUTE)throw new DataError('Candles must be consecutive, chronological and unique.');previous=t;
  const [open,high,low,close,volume,quoteVolume,trades]=[row[1],row[2],row[3],row[4],row[5],row[7],row[8]].map(number);
  if(Math.min(open,high,low,close)<=0||low>Math.min(open,close)||high<Math.max(open,close)||high<low||volume<0||quoteVolume<0||!Number.isSafeInteger(trades)||trades<0)throw new DataError('Invalid OHLCV values.');
  return Object.freeze({t,closeTime,open,high,low,close,volume,quoteVolume,trades});
 }));
}
function retryAfter(value,reference){if(!value)return 60000;const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>=0)return Math.max(1000,seconds*1000);const at=Date.parse(value);return Number.isFinite(at)?Math.max(60000,at-reference):60000;}
async function json(response,reference){
 if(response.status===429||response.status===418)throw new DataError('Binance rate limit reached. Wait before loading another session.',retryAfter(response.headers.get('retry-after'),reference));
 if(!response.ok)throw new DataError('Binance historical data unavailable (HTTP '+response.status+').');
 if(!response.headers.get('content-type')?.includes('application/json'))throw new DataError('Unexpected provider response.');
 let text='';
 if(response.body?.getReader){const reader=response.body.getReader(),decoder=new TextDecoder();let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>256000){await reader.cancel();throw new DataError('Provider response exceeds the safe data limit.');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
 else{text=await response.text();if(text.length>256000)throw new DataError('Provider response exceeds the safe data limit.');}
 try{return JSON.parse(text)}catch{throw new DataError('Provider returned invalid JSON.');}
}
async function fetchSession({fetcher=globalThis.fetch.bind(globalThis),count=150,end=null,signal}={}){
 if(![100,150,200].includes(count))throw new DataError('Choose 100, 150 or 200 candles.');
 const options={method:'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal};
 const time=await json(await fetcher(BASE+'/api/v3/time',options),Date.now());const serverTime=timestamp(time.serverTime);
 const lastClosed=Math.floor(serverTime/MINUTE)*MINUTE-1;
 const requested=end===null?lastClosed:timestamp(end);
 if(requested>lastClosed)throw new DataError('Choose a completed historical time in UTC.');
 const url=new URL(BASE+'/api/v3/klines');url.search=new URLSearchParams({symbol:'ETHUSDT',interval:'1m',limit:String(count),endTime:String(requested)});
 const raw=await json(await fetcher(url.href,options),serverTime);
 return {candles:parseKlines(raw,serverTime,requested),serverTime,source:BASE,interval:'1m',symbol:'ETHUSDT'};
}
function parseEnd(value){if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new DataError('Enter a valid session end in UTC.');const t=Date.parse(value+':00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,16)!==value)throw new DataError('Invalid UTC date.');return t+MINUTE-1;}
class Replay{
 #data=[];#index=0;#selected=0;#playing=false;#speed=1;#fraction=0;#last=0;#frame=null;
 constructor({onChange=()=>{},requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),now=()=>performance.now()}={}){this.onChange=onChange;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.now=now;}
 state(){const current=this.#data[this.#index]||null;return {index:this.#index,selected:this.#selected,count:this.#data.length,playing:this.#playing,speed:this.#speed,fraction:this.#fraction,current,inspected:this.#data[this.#selected]||null,replayTime:current?.closeTime??null,sessionOpen:this.#data[0]?.open??null};}
 visible(){return this.#data.slice(0,this.#index+1);}
 candle(index){return Number.isInteger(index)&&index>=0&&index<=this.#index?this.#data[index]??null:null;}
 emit(){this.onChange(this.state());}
 load(data){this.pause();this.#data=data.slice();this.#index=this.#selected=0;this.#fraction=0;this.emit();}
 play(){if(this.#playing||!this.#data.length||this.#index>=this.#data.length-1)return;this.#playing=true;this.#last=this.now();this.emit();this.schedule();}
 schedule(){if(this.#playing&&this.#frame===null)this.#frame=this.requestFrame(t=>{this.#frame=null;this.advance(t);if(this.#playing)this.schedule();});}
 advance(t){if(!this.#playing)return;const delta=Math.max(0,t-this.#last);this.#last=t;this.#fraction+=delta*this.#speed/1000;while(this.#fraction>=1&&this.#index<this.#data.length-1){this.#fraction-=1;this.#index++;this.#selected=this.#index;}if(this.#index===this.#data.length-1){this.#fraction=0;this.#playing=false;if(this.#frame!==null)this.cancelFrame(this.#frame);this.#frame=null;}this.emit();}
 pause(){if(this.#frame!==null)this.cancelFrame(this.#frame);this.#frame=null;this.#playing=false;this.emit();}
 restart(){this.pause();this.seek(0);}
 step(direction){this.pause();this.seek(this.#index+(direction<0?-1:1));}
 seek(index){if(!Number.isFinite(index)||!this.#data.length)return;this.#index=Math.max(0,Math.min(this.#data.length-1,Math.trunc(index)));this.#selected=this.#index;this.#fraction=0;this.#last=this.now();if(this.#index===this.#data.length-1)this.pause();else this.emit();}
 inspect(index){if(!this.candle(index))return;this.pause();this.#selected=index;this.emit();}
 setSpeed(speed){if(![1,2,4].includes(speed))return;if(this.#playing)this.advance(this.now());this.#speed=speed;this.emit();}
 destroy(){this.pause();this.onChange=()=>{};}
}
class Notes{
 constructor(storage){this.storage=storage;this.items=Object.create(null);this.error='';try{const raw=storage?.getItem(NOTE_KEY);if(raw){if(raw.length>150000)throw Error('oversized');const value=JSON.parse(raw);if(value.schemaVersion!==1||!value.notes||typeof value.notes!=='object'||Array.isArray(value.notes)||Object.keys(value.notes).length>200)throw Error('schema');for(const [key,note] of Object.entries(value.notes)){if(!/^\d{13}$/.test(key)||typeof note!=='string'||note.length>240)throw Error('note');this.items[key]=note;}}if(!storage)this.error='Browser storage is unavailable. Notes will not persist.';}catch{this.error='Saved notes could not be read. Existing storage was left unchanged.';}}
 save(t,note){timestamp(t);if(typeof note!=='string'||note.length>240)throw new DataError('Research notes must be 240 characters or fewer.');if(!Object.hasOwn(this.items,t)&&Object.keys(this.items).length>=200)throw new DataError('The 200-note limit is reached. Remove a mark before adding another.');const next={...this.items,[t]:note.trim()};this.persist(next);}
 remove(t){timestamp(t);const next={...this.items};delete next[t];this.persist(next);}
 persist(next){if(!this.storage)throw new DataError('Browser storage is unavailable. Note was not saved.');try{this.storage.setItem(NOTE_KEY,JSON.stringify({schemaVersion:1,notes:next}));this.items=next;this.error='';}catch{throw new DataError('Note could not be saved. Browser storage may be full or blocked.');}}
 get(t){return this.items[t]??'';}
 has(t){return Object.hasOwn(this.items,t);}
}
return {BASE,MINUTE,NOTE_KEY,DataError,parseKlines,fetchSession,parseEnd,retryAfter,Replay,Notes};
});
