import {useEffect,useState} from 'react';
import EdgeDiscovery from './edge-discovery';
import {parseResearchFeed,type ResearchFeed} from '../lib/edge-feed';
const empty:ResearchFeed={schemaVersion:1,symbol:'ETHUSDT',generatedAt:0,expiresAt:0,state:'no verified edge',executionEnabled:false,statisticalValidation:'not_performed',candidates:[]};
export default function EdgeDiscoveryFeed(){
 const [feed,setFeed]=useState<ResearchFeed>(empty);
 useEffect(()=>{
  let disposed=false,generation=0,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
  const schedule=()=>{if(!disposed&&!document.hidden)timer=setTimeout(load,5000)};
  const load=async()=>{
   if(disposed||document.hidden)return;
   const ticket=++generation,active=new AbortController();controller=active;const timeout=setTimeout(()=>active.abort(),6000);
   try{
    const response=await fetch('/api/v1/edge',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:active.signal});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Research feed unavailable');
    const raw=await response.text();if(raw.length>100000)throw Error('Research feed too large');
    const next=parseResearchFeed(JSON.parse(raw),Date.now());
    if(!disposed&&!document.hidden&&ticket===generation)setFeed(next);
   }catch{if(!disposed&&!document.hidden)setFeed(old=>({...old,state:old.generatedAt?'stale data':'no verified edge',candidates:old.candidates.map(c=>({...c,expiresAt:Math.min(c.expiresAt??0,Date.now()-1)}))}));}
   finally{clearTimeout(timeout);if(ticket===generation)schedule()}
  };
  const visibility=()=>{generation++;if(timer)clearTimeout(timer);controller?.abort();if(!document.hidden)load()};
  document.addEventListener('visibilitychange',visibility);load();
  return()=>{disposed=true;generation++;if(timer)clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility)};
 },[]);
 return <EdgeDiscovery candidates={feed.candidates} feedState={feed.state} feedConnected={feed.generatedAt>0}/>;
}
