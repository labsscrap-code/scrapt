import type {Candidate,EdgeState} from './edge-discovery';
export type ResearchFeed={schemaVersion:1;symbol:'ETHUSDT';generatedAt:number;expiresAt:number;state:EdgeState;executionEnabled:false;statisticalValidation:'not_performed';candidates:Candidate[]};
const states=['scanning','candidate found','under validation','no verified edge','stale data','live observation'];
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function parseResearchFeed(value:unknown,now:number):ResearchFeed{
 const v=value as ResearchFeed;
 if(!v||v.schemaVersion!==1||v.symbol!=='ETHUSDT'||v.executionEnabled!==false||v.statisticalValidation!=='not_performed'||!states.includes(v.state)||!finite(v.generatedAt)||!finite(v.expiresAt)||v.generatedAt>now+5000||v.generatedAt>v.expiresAt||v.expiresAt<=now||v.expiresAt-v.generatedAt>10000||!Array.isArray(v.candidates)||v.candidates.length>3)throw Error('Invalid or stale research feed');
 const ids=new Set();
 for(const c of v.candidates){
  if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||c.asset!=='ETH/USDT'||!['LONG','SHORT'].includes(c.direction)||c.provenance!=='live observation'||c.validation!=='pending'||!finite(c.observedAt)||c.observedAt>now+5000||!finite(c.expiresAt)||c.expiresAt!>v.generatedAt+120000||!Array.isArray(c.prices)||c.prices.length>41||!c.prices.every(p=>finite(p)&&p>0)||[c.probability,c.edgeBps,c.confidence,c.edgeBasis,c.riskReward].some(x=>x!==null))throw Error('Invalid research candidate');
  for(const field of ['reason','structure','liquidity'] as const)if(typeof c[field]!=='string'||c[field].length>2000)throw Error('Invalid candidate context');
  if(c.regime!==null&&typeof c.regime!=='string')throw Error('Invalid regime');ids.add(c.id);
 }
 return v;
}
