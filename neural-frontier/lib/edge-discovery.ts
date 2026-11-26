export type EdgeState = 'scanning' | 'candidate found' | 'under validation' | 'no verified edge' | 'stale data' | 'live observation';
export type Candidate = {
 id: string; asset: string; direction: 'LONG' | 'SHORT'; observedAt: number;
 provenance: 'live observation' | 'simulated'; validation: 'pending' | 'verified' | 'rejected';
 probability: number | null; edgeBps: number | null; confidence: number | null;
 regime: string | null; reason: string; structure: string; liquidity: string;
 edgeBasis: string | null; riskReward: number | null; prices: number[];
 priority?: boolean; expiresAt?: number;
};
export const FILTERS = ['All','Long','Short','High confidence','ETH only'] as const;
export type Filter = typeof FILTERS[number];
export type Sort = 'Highest probability' | 'Highest edge' | 'Most recent';
export const STALE_MS = 120000;
export function isFresh(c:Candidate, now:number){return (c.expiresAt===undefined||Number.isFinite(c.expiresAt)&&now<=c.expiresAt)&&Number.isFinite(c.observedAt)&&now>=c.observedAt&&now-c.observedAt<=STALE_MS;}
export function measured(c:Candidate, field:'probability'|'edgeBps'|'confidence'|'riskReward', now:number){
 const value=c[field];
 if(c.validation!=='verified'||c.provenance!=='live observation'||!isFresh(c,now)||!c.edgeBasis?.trim()||typeof value!=='number'||!Number.isFinite(value))return null;
 if((field==='probability'||field==='confidence')&&(value<0||value>1))return null;
 if(field==='riskReward'&&value<=0)return null;
 return value;
}
export function selectCandidates(candidates:Candidate[],filter:Filter,sort:Sort,now:number){
 const rows=candidates.filter(c=>filter==='All'||filter==='Long'&&c.direction==='LONG'||filter==='Short'&&c.direction==='SHORT'||filter==='ETH only'&&/^ETH(?:[\/_-]|USDT|$)/i.test(c.asset)||filter==='High confidence'&&(measured(c,'confidence',now)??-1)>=.8);
 const field=sort==='Highest probability'?'probability':sort==='Highest edge'?'edgeBps':null;
 return [...rows].sort((a,b)=>field?(measured(b,field,now)??-Infinity)-(measured(a,field,now)??-Infinity)||b.observedAt-a.observedAt:b.observedAt-a.observedAt).slice(0,3);
}
export function candidateState(c:Candidate,now:number):EdgeState{
 if(!isFresh(c,now))return 'stale data';
 if(c.validation==='rejected')return 'no verified edge';
 if(c.validation==='pending')return 'under validation';
 return c.provenance==='live observation'?'live observation':'candidate found';
}
