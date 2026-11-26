'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=s=>escape(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
function parse(source){
 const blocks=source.replace(/\r\n/g,'\n').trim().split(/\n\s*\n/),sections=[];let intro='',closing='',current=null;
 for(const block of blocks){
  if(/^#{1,3} (?:SCRAPT|The Invisible|Research Paper)/.test(block)||block==='---')continue;
  const match=block.match(/^### ([IVX]+)\. (.+)$/);
  if(match){current={number:match[1],title:match[2],id:'section-'+match[1].toLowerCase(),paragraphs:[]};sections.push(current);continue;}
  if(block==='**SCRAPT // NEURAL FRONTIER**'){current=null;closing+='<p>'+inline(block)+'</p>';continue;}
  const paragraph='<p>'+inline(block)+'</p>';
  if(current)current.paragraphs.push(block);else if(!sections.length)intro+=paragraph;else closing+=paragraph;
 }
 if(sections.length!==10)throw Error('Research Paper 001 must contain exactly ten complete sections.');
 const text=blocks.filter(b=>b!=='---'&&!/^#/.test(b)).join(' ').replace(/\*/g,'');
 const words=text.trim().split(/\s+/u).length;
 return {sections,intro,closing,words,minutes:Math.ceil(words/220)};
}
function header(active){return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="SCRAPT home">SCRAPT</a><nav aria-label="Main navigation"><a href="/">Product</a><a href="/terminal">Dashboard</a><a href="/neural-frontier">Neural Frontier</a><a href="/micro-replay">Micro Replay</a><a href="/field-notes"${active?' aria-current="page"':''}>FIELD NOTES</a></nav><a class="terminal-link" href="/terminal">OPEN TERMINAL ↗</a></header>`;}
function shell(title,description,route,body,article=false){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — SCRAPT</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://www.scrapt.xyz${route}"><link rel="stylesheet" href="/field-notes.css">${article?'<script src="/field-notes.js" defer></script>':''}</head><body>${header(!article)}${body}<footer class="site-footer"><span>SCRAPT // FIELD NOTES</span><span>Engineering clarity in market chaos.</span><a href="/field-notes">Research library ↗</a></footer></body></html>`;}
function build(){
 const papers=JSON.parse(fs.readFileSync(path.join(root,'content/field-notes.json'),'utf8'));
 const target=path.join(root,'public');fs.mkdirSync(target,{recursive:true});
 const entries=papers.map(p=>{const source=fs.readFileSync(path.join(root,'content',p.file),'utf8');if(crypto.createHash('sha256').update(source).digest('hex')!==p.sha256)throw Error('Article integrity mismatch: '+p.file);return {...p,article:parse(source)};});
 const cards=entries.map(p=>`<article class="paper-card"><div class="paper-meta"><span>RESEARCH PAPER ${escape(p.number)}</span><span>${escape(p.category)}</span></div><h2><a href="/field-notes/${escape(p.slug)}">${escape(p.title)}</a></h2><p class="topics">Market Microstructure / Liquidity Dynamics / Computational Intelligence</p><div class="card-bottom"><span>${escape(p.date)} · ${p.article.minutes} MIN READ</span><a class="read-paper" href="/field-notes/${escape(p.slug)}">READ PAPER <span aria-hidden="true">↗</span></a></div></article>`).join('');
 fs.writeFileSync(path.join(target,'field-notes.html'),shell('Field Notes','Technical observations, computational research and market microstructure studies from the SCRAPT ecosystem.','/field-notes',`<main id="main" class="library"><div class="library-intro"><p class="eyebrow">SCRAPT // FIELD NOTES</p><h1>Researching the architecture<br class="desktop-break"> of digital markets.</h1><p class="lead">Technical observations, computational research and market microstructure studies from the SCRAPT ecosystem.</p></div><section aria-labelledby="publications-title"><div class="section-label"><h2 id="publications-title">PUBLICATIONS</h2><span>${String(entries.length).padStart(2,'0')} / RESEARCH LIBRARY</span></div>${cards}</section></main>`));
 for(const p of entries){
  const {article:a}=p,route='/field-notes/'+p.slug;
  const toc=a.sections.map(s=>`<li><a href="#${s.id}"><span>${s.number}.</span> ${escape(s.title)}</a></li>`).join('');
  const sections=a.sections.map(s=>`<section id="${s.id}" aria-labelledby="heading-${s.id}"><h2 id="heading-${s.id}"><span>${s.number}.</span> ${escape(s.title)}</h2>${s.paragraphs.map(b=>'<p>'+inline(b)+'</p>').join('')}</section>`).join('');
  const share='https://x.com/intent/post?'+new URLSearchParams({text:'SCRAPT // FIELD NOTES — '+p.title,url:'https://www.scrapt.xyz'+route});
  const body=`<div class="reading-progress" role="progressbar" aria-label="Article reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><main id="main" class="paper"><a class="back" href="/field-notes">← Back to Field Notes</a><header class="paper-header"><p class="eyebrow">SCRAPT // NEURAL FRONTIER</p><h1>${escape(p.title)}</h1><p class="subtitle">Research Paper ${escape(p.number)} — Market Microstructure, Liquidity Dynamics &amp; Computational Intelligence</p><div class="publication-meta"><time datetime="${escape(p.date)}">${escape(p.displayDate)}</time><span>${a.minutes} MIN READ / ${a.words.toLocaleString('en-US')} WORDS</span><a href="${escape(share)}" target="_blank" rel="noopener noreferrer" aria-label="Share this paper on X (opens in a new tab)">SHARE TO X ↗</a></div></header><div class="reading-layout"><aside class="contents" aria-label="Table of contents"><details open><summary>IN THIS PAPER <span aria-hidden="true">⌄</span></summary><ol>${toc}</ol></details></aside><article id="article-body" aria-label="Research Paper ${escape(p.number)}"><div class="abstract">${a.intro}</div>${sections}<div class="paper-closing">${a.closing}</div></article></div><div class="paper-end"><span>END OF PAPER / ${escape(p.number)}</span><a href="/field-notes">← Back to Field Notes</a></div></main>`;
  fs.writeFileSync(path.join(target,p.slug+'.html'),shell(p.title,p.subtitle,route,body,true));
 }
 console.log('Built Field Notes library and '+entries.length+' complete research paper(s).');
}
if(require.main===module)build();module.exports={build,parse,inline};
