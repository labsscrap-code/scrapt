'use strict';
// Presentation boundary for the legacy VPS renderer. Never translate numbers,
// invent analysis, or call another provider. The VPS prompt still needs its fix.
const UNAVAILABLE='The AI interpretation is temporarily unavailable in English. The observations above are reported directly by the existing market service.';
const spanish=/[áéíóúüñ¿¡]|\b(?:observaciones|interpretación|el|los|las|del|una|unos|unas|mercado|precio|datos|muestra|puede|pueden|pero|aunque|sin|hay|son|esto|esta|está|indica|indican|refleja|reflejan|niveles|actuales|dirección|futura|aumento|caída|compradores|vendedores|liquidez|posiciones|abiertas|apalancamiento)\b/i;
const replacements=[
 ['scanner/reloj no verificado; datos actuales no disponibles.','scanner or clock is unverified; current data unavailable.'],
 ['scanner actualizado.','scanner is fresh.'],['sin fecha','timestamp unavailable'],
 ['historial reciente insuficiente o no verificado.','insufficient or unverified recent history.'],
 ['Ventana móvil de operaciones (no vela OHLC): último ','Rolling trade window (not an OHLC candle): last '],
 ['No demuestra compras o ventas ejecutadas.','This does not establish executed buying or selling.'],
 ['Mayor liquidez cotizada en ','More quoted liquidity on '],['Liquidez no disponible.','Liquidity unavailable.'],
 ['(ya expresado en porcentaje)','(already expressed as a percentage)'],[' BTC, no USD.',' BTC, not USD.'],
 ['cambio 24h: ','24h change: '],['Book top20: ','Top-20 order book: '],['equilibrio','balanced'],
 ['Precio en 15 min: ','Price over 15 minutes: '],['Open interest en 15 min: ','Open interest over 15 minutes: '],
 ['; cambio ','; change '],['; volumen ','; volume '],['sin clasificación','classification unavailable'],
 ['Miedo extremo','Extreme Fear'],['miedo extremo','Extreme Fear'],['Codicia extrema','Extreme Greed'],['codicia extrema','Extreme Greed'],
 ['Miedo','Fear'],['miedo','Fear'],['Codicia','Greed'],['codicia','Greed'],['no disponible','unavailable']
];
function localizeFact(line){
 if(/^• Alerta histórica /.test(line))return line.replace(/^• Alerta histórica (\S+):[\s\S]*$/,'• Historical alert $1: See recorded alerts; an English description is unavailable.');
 let out=line;for(const [from,to]of replacements)out=out.split(from).join(to);
 if(spanish.test(out))return null;
 return out;
}
function englishAnswer(answer){
 if(typeof answer!=='string'||answer.length>6000)throw Error('invalid_ai_answer');
 const legacy=answer.startsWith('Observaciones — '),modern=answer.startsWith('Observations — ');
 if(!legacy&&!modern){if(spanish.test(answer))throw Error('ai_language_unavailable');return answer;}
 const separator=legacy?'\n\nInterpretación:\n':'\n\nInterpretation:\n';
 const index=answer.indexOf(separator);if(index<0)throw Error('invalid_ai_answer');
 const observations=answer.slice(0,index).replace(/^Observaciones — /,'Observations — ').split('\n').map(localizeFact).filter(Boolean);
 if(!observations.length||!observations[0].startsWith('Observations — Snapshot:'))throw Error('ai_language_unavailable');
 const interpretation=answer.slice(index+separator.length).trim();
 // Legacy responses originate from the explicitly Spanish system prompt.
 // Do not guess the language of arbitrary prose using a keyword heuristic.
 return observations.join('\n')+'\n\nInterpretation:\n'+(!legacy&&interpretation&&!spanish.test(interpretation)?interpretation:UNAVAILABLE);
}
module.exports={englishAnswer,UNAVAILABLE};
