/* Same-origin production API client. No fixtures, fallback quotes or AI calls. */
'use strict';
window.ScraptClient = (() => {
  const fetcher = window.fetch.bind(window);
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const text = v => typeof v === 'string' ? v.slice(0, 3000) : '';
  const number = v => finite(v) ? v : null;
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TTL = Object.freeze({spot:90,funding:90,openInterest:90,trades:10,book:10,kline:90,fearGreed:300,defi:300});
  const REQUIRED = ['spot','funding','openInterest','trades','book','fearGreed'];
  let csrf = '', sessionPending = null, blockedUntil = 0;
  let history = null, historyAt = 0, alerts = null, alertsAt = 0;
  class ApiError extends Error {
    constructor(kind, status=0, retryAfter=0) { super(kind); this.kind=kind; this.status=status; this.retryAfter=retryAfter; }
  }
  const clock = () => performance.now();
  async function request(path, options={}) {
    if (location.protocol !== 'https:') throw new ApiError('https_required');
    if (!/^\/(login|logout|session|snapshot|history|alerts|news)(\?[^#]*)?$/.test(path)) throw new ApiError('route_not_allowed');
    if (Date.now() < blockedUntil) throw new ApiError('rate_limited',429,Math.ceil((blockedUntil-Date.now())/1000));
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),8000);
    try {
      const headers = {'Accept':'application/json',...(options.headers || {})};
      if (options.method === 'POST' && path !== '/login') {
        if (!csrf) await session();
        headers['X-SCRAPT-CSRF'] = csrf;
      }
      const response = await fetcher('/api/v1'+path,{...options,headers,
        credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
      if (response.status === 429) {
        const raw=Number(response.headers.get('Retry-After'));
        const retry=Number.isFinite(raw)&&raw>0?Math.min(raw,300):60;
        blockedUntil=Date.now()+retry*1000;throw new ApiError('rate_limited',429,retry);
      }
      if (response.status === 401) { csrf=''; throw new ApiError(path==='/login'?'invalid_login':'login_required',401); }
      if (!response.ok) throw new ApiError(response.status===403?'access_denied':response.status===503?'unavailable':'http_error',response.status);
      if (!(response.headers.get('Content-Type')||'').includes('application/json')) throw new ApiError('invalid_response');
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.name==='AbortError'?'timeout':'network_error');
    } finally { clearTimeout(timer); }
  }
  async function session() {
    if (!sessionPending) sessionPending=request('/session').then(data=>{
      if (typeof data.name!=='string'||typeof data.csrf!=='string') throw new ApiError('invalid_response');
      csrf=data.csrf;return {name:data.name};
    }).finally(()=>{sessionPending=null;});
    return sessionPending;
  }
  async function login(name,password) {
    const data=await request('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,password})});
    if (typeof data.csrf!=='string') throw new ApiError('invalid_response');
    csrf=data.csrf;return true;
  }
  async function logout() {
    await request('/logout',{method:'POST'});
    csrf='';history=null;alerts=null;historyAt=alertsAt=0;
  }
  function normalizeAlert(raw, persisted=false) {
    raw=record(raw);
    const ts=number(raw.ts), urgency=number(persisted?raw.urgency:raw.urgencia);
    if (ts===null||ts<=0||!Number.isInteger(urgency)||urgency<1||urgency>5) return null;
    return {ts,urgencia:urgency,kind:text(raw.kind),msg:text(persisted?raw.message:raw.msg),meaning:text(raw.meaning)};
  }
  function normalize(raw) {
    raw=record(raw);
    if (raw.schemaVersion!==1||typeof raw.ts!=='string'||!Number.isFinite(Date.parse(raw.ts))) throw new ApiError('invalid_snapshot');
    const s={ts:raw.ts,schemaVersion:1,workerFresh:raw.workerFresh===true,clockSynchronized:raw.clockSynchronized===true,
      spot24h:{},futures:{},fng:{},book:{},realtime_5m:{},vol:null,defi:{},sourceHealth:{},
      alertas:[],reglas:[],texto:null,windowWarming:raw.windowWarming!==false,
      windowCoverage:record(raw.windowCoverage),_receivedAt:clock()};
    for (const [key,row] of Object.entries(record(raw.sourceHealth))) {
      const r=record(row), status=['fresh','stale','unknown','unavailable'].includes(r.status)?r.status:'unknown';
      s.sourceHealth[key]={status,ageSeconds:number(r.ageSeconds),observedAt:text(r.observedAt)};
    }
    for (const symbol of ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT']) {
      const row=record(record(raw.spot24h)[symbol]);
      if (!Object.keys(row).length) continue;
      s.spot24h[symbol]={};
      for (const key of ['precio','cambio_24h_pct','volumen_usd_24h','high','low']) s.spot24h[symbol][key]=number(row[key]);
      if (!(s.spot24h[symbol].precio>0)) s.spot24h[symbol].precio=null;
    }
    for (const key of ['funding_pct','open_interest_btc','top_long_short_5m','top_long_short_15m','top_long_short_1h','taker_ratio_5m','taker_ratio_15m','taker_ratio_1h']) s.futures[key]=number(record(raw.futures)[key]);
    if (!(s.futures.open_interest_btc>=0)) s.futures.open_interest_btc=null;
    for (const key of ['valor','anterior']) {
      const value=number(record(raw.fng)[key]);s.fng[key]=value!==null&&value>=0&&value<=100?value:null;
    }
    s.fng.clase=text(record(raw.fng).clase);
    for (const key of ['bid','ask']) { const n=number(record(raw.book)[key]);s.book[key]=n!==null&&n>=0?n:null; }
    for (const key of ['precio_ultimo','precio_max_5m','precio_min_5m','precio_primer_5m','vol_usd_5m','ticks_5m','vwap_5m']) s.realtime_5m[key]=number(record(raw.realtime_5m)[key]);
    if (raw.vol) s.vol={last_1m:number(raw.vol.last_1m),avg_1m:number(raw.vol.avg_1m),x:number(raw.vol.x)};
    for (const key of ['tvl_total_usd','tvl_cambio_24h_pct']) s.defi[key]=number(record(raw.defi)[key]);
    s.alertas=(Array.isArray(raw.alertas)?raw.alertas:[]).map(a=>normalizeAlert(a)).filter(Boolean).slice(-80);
    s.reglas=(Array.isArray(raw.reglas)?raw.reglas:[]).map(record).filter(r=>finite(r.last)&&finite(r.cd)&&r.cd>0).map(r=>({kind:text(r.kind),last:r.last,cd:r.cd}));
    if (raw.texto) {
      const t=record(raw.texto);s.texto={ts:number(t.ts),nuevos:number(t.nuevos),alertas:number(t.alertas),
        persisted:number(t.persisted),enviadas:number(t.persisted),aiStatus:'disabled'};
    }
    return s;
  }
  function expire(value) {
    const s=JSON.parse(JSON.stringify(value)), elapsed=Math.max(0,(clock()-value._receivedAt)/1000);
    if (elapsed>=20) s.workerFresh=false;
    if (!s.workerFresh||!s.clockSynchronized) s.reglas=[];
    for (const [key,row] of Object.entries(s.sourceHealth)) {
      if (row.ageSeconds===null||row.ageSeconds+elapsed>(TTL[key]||90)) row.status='stale';
    }
    const fresh=key=>s.workerFresh&&s.clockSynchronized&&s.sourceHealth[key]?.status==='fresh';
    if (!fresh('spot')) s.spot24h={};
    if (!fresh('funding')) s.futures.funding_pct=null;
    if (!fresh('openInterest')) s.futures.open_interest_btc=null;
    for(const key of Object.keys(s.futures)) if (/^(top_long_short|taker_ratio)_/.test(key)&&!fresh(key)) s.futures[key]=null;
    if (!fresh('fearGreed')) s.fng={valor:null,anterior:null,clase:''};
    if (!fresh('book')) s.book={bid:null,ask:null};
    s.book_ratio=s.book.ask>0&&s.book.bid!==null?s.book.bid/s.book.ask:null;
    if (!fresh('trades')) s.realtime_5m={};
    if (!fresh('kline')) s.vol=null;
    if (!fresh('defi')) s.defi={};
    s.connectionFresh=REQUIRED.every(fresh);
    return s;
  }
  function normalizeHistory(raw) {
    raw=record(raw);
    return {price_history:(Array.isArray(raw.price_history)?raw.price_history:[]).filter(r=>r&&finite(r.t)&&finite(r.p)&&r.p>0).slice(-420),
      fut_history:(Array.isArray(raw.fut_history)?raw.fut_history:[]).filter(r=>r&&finite(r.t)).map(r=>({t:r.t,oi:number(r.oi),fp:number(r.fp)})).slice(-420)};
  }
  async function snapshot({details=false}={}) {
    const value=normalize(await request('/snapshot'));
    const now=clock();let historyState='not_requested',alertsState='not_requested';
    if (details) {
      const jobs=[];
      if (!history||now-historyAt>30000) jobs.push(request('/history').then(data=>{history=normalizeHistory(data);historyAt=clock();historyState='ready';}).catch(error=>{historyState='unavailable';history=null;}));
      else historyState='ready';
      if (!alerts||now-alertsAt>15000) jobs.push(request('/alerts?limit=80').then(data=>{
        if (!Array.isArray(data.items)) throw new ApiError('invalid_response');
        alerts=data.items.map(a=>normalizeAlert(a,true)).filter(Boolean).reverse();alertsAt=clock();alertsState='ready';
      }).catch(error=>{alertsState='unavailable';alerts=null;}));
      else alertsState='ready';
      await Promise.all(jobs);
      Object.assign(value,history||{price_history:[],fut_history:[]});
      if (alerts) value.alertas=alerts;
    }
    value.historyState=historyState;value.alertsState=alertsState;
    return expire(value);
  }
  function unavailable() {
    return {spot24h:{},futures:{},fng:{},book:{},realtime_5m:{},vol:null,defi:{},alertas:[],reglas:[],texto:null,
      price_history:[],fut_history:[],sourceHealth:{},workerFresh:false,clockSynchronized:false,
      connectionFresh:false,alertsState:'unavailable',historyState:'unavailable',windowWarming:true};
  }
  return Object.freeze({request,session,login,logout,snapshot,normalize,expire,unavailable,escapeText,ApiError,
    AI_ENABLED:false,pollMs:5000,retryMs:()=>Math.max(5000,blockedUntil-Date.now())});
})();
